// Small PHP 8.3 CLI adapter for the existing standings runtime regression test.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHP } from '@php-wasm/universal';
import { loadNodeRuntime, createNodeFsMountHandler } from '@php-wasm/node';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: process.pid } }));
php.mkdir(root);
php.mount(root, createNodeFsMountHandler(root));
try {
  const result = await php.run({ scriptPath: path.resolve(process.argv[2]) });
  process.stdout.write(result.text);
  process.stderr.write(result.errors);
  process.exitCode = result.exitCode;
} catch (error) {
  process.stderr.write(error.response?.errors || String(error));
  process.exitCode = 1;
} finally { php.exit(); }
