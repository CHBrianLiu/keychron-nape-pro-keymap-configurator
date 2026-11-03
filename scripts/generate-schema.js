// Development-only generation of the checked-in schema from the offline catalog.
import { mkdir, writeFile } from 'node:fs/promises';
import { napeActions, symbolNames } from '../src/keycodes.js';

const ref = (name) => ({ $ref: `#/$defs/${name}` });
const integer = (minimum, maximum) => ({ type: 'integer', minimum, maximum });
const word = integer(0, 65535);
const object = (properties, extra = false) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: extra,
});
const array = (items, count) => ({ type: 'array', items, minItems: count, maxItems: count });
const oneField = (name, value) => object({ [name]: value });
const rawTapHold = object({ col: integer(0, 6), tap: word, held: word }, true);
const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Nape Pro keymap source v1',
  description: 'Eight complete visible layers plus preserved Launcher data. See README.md for semantic build checks.',
  ...object({
    version: { const: 1 },
    device: { const: 'nape-pro' },
    layers: array(ref('layer'), 8),
    preserved: object({
      raw_layer_0: object({
        keymap: array(word, 7),
        encoder: object({ clockwise: word, counterclockwise: word }),
        tap_hold: { type: 'array', items: rawTapHold, maxItems: 7 },
      }),
      column_6: array(word, 8),
      combinations: {
        type: 'array', maxItems: 30,
        items: object({
          index: integer(0, 29), timeout: word, layer: integer(0, 255),
          cols: integer(1, 255), tap: word, held: word,
        }, true),
      },
      combination_names: { type: 'object', additionalProperties: { type: 'string' } },
    }),
  }),
  $defs: {
    symbol: {
      type: 'string', maxLength: 256,
      anyOf: [
        { enum: symbolNames },
        {
          description: 'ZMK modifier expressions. Build checks balanced nesting, key support, and modifier compatibility.',
          pattern: '^(?:(?:LC|LS|LA|LG|RC|RS|RA|RG)\\(\\s*)+[A-Z][A-Z0-9_]*(?:\\s*\\))+$',
        },
      ],
    },
    action: {
      oneOf: [
        ref('symbol'),
        ...['mo', 'tog', 'to'].map((name) => oneField(name, integer(0, 7))),
        oneField('macro', integer(0, 15)),
        oneField('nape', { enum: Object.keys(napeActions).sort() }),
        oneField('raw', word),
      ],
    },
    binding: {
      oneOf: [ref('action'), object({ tap: ref('action'), hold: ref('action') })],
    },
    layer: object({
      buttons: object(Object.fromEntries(['01', '02', '03', '04', 'm1', 'm2'].map((id) => [id, ref('binding')]))),
      encoder: object({ clockwise: ref('action'), counterclockwise: ref('action') }),
    }),
  },
};
await mkdir(new URL('../schema/', import.meta.url), { recursive: true });
await writeFile(new URL('../schema/keymap.schema.json', import.meta.url), JSON.stringify(schema, null, 2) + '\n');
console.log(`Generated schema with ${symbolNames.length} supported symbols and aliases.`);
