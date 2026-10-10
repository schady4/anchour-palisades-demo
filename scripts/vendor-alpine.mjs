import {copyFile, mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ['node_modules/alpinejs/dist/cdn.min.js', 'assets/alpine.min.js'],
];

for (const [src, dest] of files) {
  const to = resolve(root, dest);
  await mkdir(dirname(to), {recursive: true});
  await copyFile(resolve(root, src), to);
  console.log('vendored ->', dest);
}
