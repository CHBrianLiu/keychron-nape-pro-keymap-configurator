import { compileAction } from './keycodes.js';

export const buttonColumns = ['03', '04', '01', '02', 'm1', 'm2'];

export function buildCombinations(source) {
  const names = structuredClone(source.preserved.combination_names);
  const indexes = new Set();
  const masks = new Set();
  const records = source.combinations.map((entry, position) => {
    const path = `/combinations/${position}`;
    let record;
    if (Object.hasOwn(entry, 'raw')) {
      record = structuredClone(entry.raw);
    } else {
      const cols = entry.buttons.reduce((mask, button) => mask | (1 << buttonColumns.indexOf(button)), 0);
      if (cols === 15) throw new Error(`${path}: columns 0, 1, 2, 3 together are prohibited by Launcher`);
      const action = (field) => {
        try {
          const value = compileAction(entry[field]);
          if (value === 32297) throw new Error('Bare tap/hold markers are not actions');
          return value;
        } catch (error) {
          throw new Error(`${path}/${field}: ${error.message}`, { cause: error });
        }
      };
      const tap = action('tap');
      const held = action('hold');
      if (tap >= 21025 && tap <= 21034) throw new Error(`${path}/tap: momentary-layer/mode tap actions are not supported by Launcher`);
      const isMouse = (value) => (value >= 205 && value <= 223) || value === 32304;
      if (isMouse(tap) && isMouse(held)) throw new Error(`${path}: Launcher rejects mouse actions on both tap and hold`);
      record = {
        index: entry.index, timeout: entry.timeout,
        layer: Object.hasOwn(entry, 'layer') ? entry.layer + 1 : entry.raw_layer,
        cols, tap, held,
      };
    }
    if (indexes.has(record.index)) throw new Error(`${path}: duplicate index ${record.index}`);
    if (masks.has(record.cols)) throw new Error(`${path}: duplicate member set (cols ${record.cols})`);
    indexes.add(record.index);
    masks.add(record.cols);
    if (!Object.hasOwn(entry, 'raw') && Object.hasOwn(entry, 'name')) {
      const key = [...entry.buttons].sort().join('');
      if (Object.hasOwn(names, key) && names[key] !== entry.name) {
        throw new Error(`${path}/name: conflicts with preserved name for ${key}`);
      }
      names[key] = entry.name;
    }
    return record;
  });
  return { records, names };
}
