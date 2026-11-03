// Development-only regeneration. Normal validation/builds never fetch anything.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const revision = '4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85';
const base = `https://raw.githubusercontent.com/zmkfirmware/zmk/${revision}/app/include/dt-bindings/zmk/`;
const files = ['hid_usage.h', 'hid_usage_pages.h', 'keys.h'];
const sources = await Promise.all(files.map(async (file) => {
  const response = await fetch(base + file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return { file, text: await response.text() };
}));
const definitions = new Map();
const keyNames = [];
for (const { file, text } of sources) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\\\r?\n/g, ' ');
  for (const match of clean.matchAll(/^#define[ \t]+([A-Z][A-Z0-9_]*)[ \t]+(.+)$/gm)) {
    definitions.set(match[1], match[2].trim());
    if (file === 'keys.h') keyNames.push(match[1]);
  }
}

const modifiers = { LC: 1, LS: 2, LA: 4, LG: 8, RC: 16, RS: 32, RA: 64, RG: 128 };
function resolve(expression, visited = new Set()) {
  let text = expression.trim();
  if (text.startsWith('(') && text.endsWith(')')) return resolve(text.slice(1, -1), visited);
  if (/^(?:0x[\da-f]+|\d+)$/i.test(text)) return Number(text);
  const usage = /^ZMK_HID_USAGE\(([^,]+),\s*([^,]+)\)$/.exec(text);
  if (usage) return resolve(usage[1], visited) * 65536 + resolve(usage[2], visited);
  const modifier = /^(LC|LS|LA|LG|RC|RS|RA|RG)\((.+)\)$/.exec(text);
  if (modifier) return (resolve(modifier[2], visited) | (modifiers[modifier[1]] << 24)) >>> 0;
  if (visited.has(text) || !definitions.has(text)) throw new Error(`Cannot resolve ZMK definition: ${text}`);
  return resolve(definitions.get(text), new Set([...visited, text]));
}

const keys = Object.fromEntries(keyNames.map((name) => {
  const value = resolve(name);
  return [name, { page: (value >>> 16) & 255, usage: value & 65535, modifiers: value >>> 24 }];
}));
const catalog = {
  revision,
  license: 'MIT',
  copyright: 'Copyright (c) 2020 The ZMK Contributors',
  sources: sources.map(({ file, text }) => ({
    url: base + file,
    sha256: createHash('sha256').update(text).digest('hex'),
  })),
  keys,
};
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/zmk-keycodes.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n');
console.log(`Vendored ${keyNames.length} ZMK names and aliases at ${revision}.`);
