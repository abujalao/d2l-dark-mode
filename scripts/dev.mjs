// Live development: rebuilds ../dist/{chrome,edge,firefox} whenever a source file
// changes, and runs Firefox with DarkSpace through web-ext, which reloads it after
// every rebuild. Firefox keeps its profile in ../.firefox-dev-profile, so sign-ins stay.
// Chrome still needs its reload button on chrome://extensions after a change.
// Usage: node scripts/dev.mjs [start-url]

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { buildAll } from './build.mjs';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(SRC, '..', 'dist');
const PROFILE = path.join(SRC, '..', '.firefox-dev-profile');
const WATCHED = ['background', 'content', 'shared', 'popup', 'options', 'icons', 'manifest.json', 'manifest.firefox.json'];

function rebuild() {
  try {
    buildAll(['chrome', 'edge', 'firefox'], OUT);
  } catch (e) {
    console.error('build failed:', e.message);
  }
}

rebuild();
let timer = null;
for (const entry of WATCHED) {
  const file = path.join(SRC, entry);
  fs.watch(file, { recursive: fs.statSync(file).isDirectory() }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}

const args = [
  '--yes', 'web-ext@10.7.0', 'run',
  '--source-dir', path.join(OUT, 'firefox'),
  '--firefox-profile', PROFILE, '--profile-create-if-missing', '--keep-profile-changes',
  // A temporary add-on gets its site access without asking, as an installed one does
  '--pref', 'extensions.originControls.grantByDefault=true',
];
if (process.argv[2]) args.push('--start-url', process.argv[2]);
// npx is a .cmd script on Windows, which only runs through a shell: quote every argument
const firefox = spawn('npx', args.map((a) => JSON.stringify(a)), { stdio: 'inherit', shell: true });
firefox.on('exit', (code) => process.exit(code || 0));
