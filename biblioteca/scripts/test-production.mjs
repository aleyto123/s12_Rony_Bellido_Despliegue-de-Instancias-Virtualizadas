import { spawn } from 'node:child_process';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

// Cada ejecución usa un archivo temporal propio; no modifica Supabase ni el catálogo local.
const folder = await mkdtemp(path.join(os.tmpdir(), 'folio-production-test-'));
const file = path.join(folder, 'library.json');
const port = '3107';
const base = 'http://127.0.0.1:' + port;
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port],
  {
    env: { ...process.env, LIBRARY_DEMO: 'true', LIBRARY_DATA_FILE: file, VERCEL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
const stopped = new Promise((resolve) => server.once('exit', resolve));
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error('El servidor de prueba no pudo arrancar.');
    if (!serverOutput.includes('Ready in')) {
      await delay(250);
      continue;
    }
    try {
      const response = await fetch(base + '/api/catalog', { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* El servidor puede tardar en iniciar. */
    }
    await delay(250);
  }
  if (!ready) throw new Error('No se pudo abrir el servidor de prueba en ' + base);
  const runner = spawn(process.execPath, ['scripts/check-api.mjs'], {
    env: { ...process.env, BASE_URL: base },
    stdio: 'inherit',
  });
  const status = await new Promise((resolve) => runner.once('exit', resolve));
  if (status !== 0) throw new Error('La prueba HTTP de producción falló.');
  console.log('Prueba de producción OK con datos temporales aislados.');
} catch (error) {
  console.error(error.message);
  // Este servidor siempre se inicia en modo demo sin conexiones a bases externas.
  console.error(serverOutput);
  process.exitCode = 1;
} finally {
  if (server.exitCode === null) server.kill();
  await stopped;
  await unlink(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  await rmdir(folder);
}
