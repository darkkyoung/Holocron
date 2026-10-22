import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {build} from 'vite';
import {loadSimulator, root} from './load.mjs';
import {replayHandler} from './http.mjs';

// An offline laboratory, not a Production route. No accounts, D1 or providers.
const args = process.argv.slice(2);
let seed = 'vesper-007', port = 4173, host = '127.0.0.1';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed' && args[i + 1]) seed = args[++i];
  else if (args[i] === '--port' && args[i + 1]) port = Number(args[++i]);
  // The managed QA gateway needs its container interface; normal CLI is loopback.
  else if (args[i] === '--host' && ['127.0.0.1','0.0.0.0'].includes(args[i + 1])) host = args[++i];
  else if (args[i] === '--strictPort') continue;
  else throw Error('Usage: pnpm racing:prototype [--seed ASCII_SEED] [--port PORT]');
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('INVALID_PORT');
const sim = await loadSimulator();
let record;
try { record = Buffer.from(JSON.stringify(sim.simulateRace(seed))); }
finally { await sim.dispose(); }
const digest = createHash('sha256').update(record).digest('hex');
const outDir = resolve(root, 'out/galactic-racing');
await build({
  configFile: false, root: resolve(root, 'prototypes/galactic-racing'),
  build: {outDir, emptyOutDir: true}, logLevel: 'warn',
});
const files = new Map();
async function collect(dir, prefix = '') {
  for (const item of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, item.name), url = `${prefix}/${item.name}`;
    if (item.isDirectory()) await collect(path, url);
    else if (item.isFile()) files.set(url, await readFile(path));
  }
}
await collect(outDir);
files.set('/', files.get('/index.html'));
files.set('/race.json', record);
const server = createServer(replayHandler(files, digest));
server.on('error', error => {console.error(error.message); process.exitCode = 1;});
server.listen(port, host, () => {
  console.log(`Galactic Racing local replay: http://127.0.0.1:${port}/`);
  console.log(`Frozen record ${seed} / SHA-256 ${digest}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
