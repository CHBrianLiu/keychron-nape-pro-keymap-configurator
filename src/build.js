import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildConfiguration, parseKeymap } from './keymap.js';

try {
  const input = 'keymap.yaml';
  const output = 'dist/launcher.json';
  const { keymap, macro, warnings, macroBytes } = buildConfiguration(parseKeymap(await readFile(input, 'utf8')));
  // Validate/compile completely before opening the output file.
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(keymap) + '\n');
  console.log(`Built ${output} from ${input} (8 visible layers, MD5 ${keymap.MD5}).`);
  if (macro) {
    await writeFile('dist/macro.json', JSON.stringify(macro) + '\n');
    console.log(`Built dist/macro.json (${macro.macro.length} slots, ${macroBytes} encoded bytes, MD5 ${macro.md5}).`);
  } else {
    console.log('No macro bundle defined; dist/macro.json was not generated or updated. Do not import an older macro file.');
  }
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
