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
const WATCHED_DIRS = ['background', 'content', 'shared', 'popup', 'options', 'icons'];
const WATCHED_FILES = ['manifest.json', 'manifest.firefox.json'];

function rebuild() {
  try {
    buildAll(['chrome', 'edge', 'firefox'], OUT);
  } catch (e) {
    console.error('build failed:', e.message);
  }
}

rebuild();
let timer = null;
function scheduleRebuild() {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 150);
}
for (const dir of WATCHED_DIRS) fs.watch(path.join(SRC, dir), { recursive: true }, scheduleRebuild);
// The manifests through their folder: editors that save by replacing the file would end a watch on it
fs.watch(SRC, (_, name) => {
  if (WATCHED_FILES.includes(name)) scheduleRebuild();
});

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
