import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildKeymap, parseKeymap } from './keymap.js';

try {
  const input = 'keymap.yaml';
  const output = 'dist/launcher.json';
  const keymap = buildKeymap(parseKeymap(await readFile(input, 'utf8')));
  // Validate/compile completely before opening the output file.
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(keymap) + '\n');
  console.log(`Built ${output} from ${input} (8 visible layers, MD5 ${keymap.MD5}).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
