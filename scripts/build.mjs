// Builds the browser packages from this repo: chrome (also used for Edge) and
// firefox. Firefox's manifest is manifest.json plus manifest.firefox.json, with
// the service worker's importScripts list as its background scripts.
// Usage: node scripts/build.mjs [chrome|edge|firefox|all] [out-dir]   (default: all ../dist)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = {
  background: ['service-worker.js'],
  content: (f) => /\.(js|css)$/.test(f),
  shared: (f) => f.endsWith('.js'),
  popup: ['popup.html', 'popup.js', 'popup.css'],
  options: ['options.html', 'options.js', 'options.css'],
  icons: (f) => f.endsWith('.png'),
};

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(SRC, file), 'utf8'));

/** The worker's importScripts files, as manifest paths ('../shared/x.js' → 'shared/x.js'). */
function workerImports() {
  const code = fs.readFileSync(path.join(SRC, 'background/service-worker.js'), 'utf8');
  const call = code.match(/importScripts\(([^)]*)\)/);
  if (!call) throw new Error('service-worker.js has no importScripts call');
  return [...call[1].matchAll(/'([^']+)'/g)].map((m) => path.posix.normalize(path.posix.join('background', m[1])));
}

/** Compares dotted versions ('1.2.1.1' > '1.2.1'). */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function manifestFor(browser) {
  const manifest = readJson('manifest.json');
  if (browser !== 'firefox') return manifest;
  // Firefox has no extension service workers: it runs the same files as a background page
  manifest.background = { scripts: [...workerImports(), 'background/service-worker.js'] };
  const firefox = readJson('manifest.firefox.json');
  // A Firefox-only release (1.2.1.1) keeps its number until manifest.json moves past it
  if (firefox.version && compareVersions(firefox.version, manifest.version) <= 0) delete firefox.version;
  return { ...manifest, ...firefox };
}

/** Every file a manifest names, which the package must contain. */
function referencedFiles(m) {
  return [
    ...(m.background.scripts || [m.background.service_worker]),
    m.action && m.action.default_popup,
    m.options_page,
    ...(m.content_scripts || []).flatMap((c) => [...(c.js || []), ...(c.css || [])]),
    ...Object.values(m.icons || {}),
    ...Object.values((m.action && m.action.default_icon) || {}),
  ].filter(Boolean);
}

/** Writes the package into `dest` in place, removing files that are no longer part of it. */
function build(browser, dest) {
  const wanted = new Map();
  for (const [folder, pick] of Object.entries(FOLDERS)) {
    const files = Array.isArray(pick) ? pick : fs.readdirSync(path.join(SRC, folder)).filter(pick);
    for (const f of files) wanted.set(`${folder}/${f}`, fs.readFileSync(path.join(SRC, folder, f)));
  }
  const manifest = manifestFor(browser);
  wanted.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));

  const missing = referencedFiles(manifest).filter((f) => !wanted.has(f));
  if (missing.length) throw new Error(`${browser}: manifest names files not in the package: ${missing.join(', ')}`);

  for (const [rel, data] of wanted) {
    const file = path.join(dest, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(data)) fs.writeFileSync(file, data);
  }
  // In place rather than wiped, so a running `web-ext run` keeps watching the folder
  for (const rel of fs.readdirSync(dest, { recursive: true })) {
    const key = rel.split(path.sep).join('/');
    const file = path.join(dest, rel);
    if (!wanted.has(key) && fs.statSync(file).isFile()) fs.rmSync(file);
  }
  return manifest.version;
}

export function buildAll(targets, out) {
  for (const browser of targets) {
    const version = build(browser === 'edge' ? 'chrome' : browser, path.join(out, browser));
    console.log(`${browser.padEnd(8)} v${version} -> ${path.join(out, browser)}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] || 'all';
  const out = path.resolve(process.argv[3] || path.join(SRC, '..', 'dist'));
  const targets = target === 'all' ? ['chrome', 'edge', 'firefox'] : [target];
  if (!targets.every((t) => ['chrome', 'edge', 'firefox'].includes(t))) {
    console.error('usage: node scripts/build.mjs [chrome|edge|firefox|all] [out-dir]');
    process.exit(1);
  }
  buildAll(targets, out);
}
