import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compileSymbol } from './keycodes.js';

// Exact canonical Launcher protocol-12 enum strings, not 16-bit assignments.
const catalog = JSON.parse(readFileSync(new URL('../data/launcher-macro-keycodes.json', import.meta.url), 'utf8'));
const codes = { ...catalog.keys, ...Object.fromEntries(Object.entries(catalog.aliases).map(([alias, name]) => [alias, catalog.keys[name]])) };
const byByte = new Map(Object.entries(catalog.keys).map(([name, value]) => [value, name]));
const modifierBytes = [224, 225, 226, 227, 228, 229, 230, 231];

export function macroChecksum(macro) {
  return createHash('md5').update(JSON.stringify(macro) + '875824192').digest('hex');
}

function keyTuple(type, byte, display) {
  const name = byByte.get(byte);
  if (!name || byte < 4) throw new Error(`No verified macro-byte mapping for ${display}`);
  return [type, display || name, name];
}

function symbolKeys(expression, chord) {
  const value = compileSymbol(expression);
  const byte = value & 255;
  let mask = value >> 8;
  if (!chord && mask) throw new Error('down/up require an individual unmodified key');
  const right = Boolean(mask & 16);
  mask &= 15;
  const modifiers = modifierBytes.slice(right ? 4 : 0, right ? 8 : 4)
    .filter((_, bit) => mask & (1 << bit));
  // Validate the actual enum entry, including unsupported specials and sentinels.
  keyTuple(2, byte, expression);
  return [...modifiers, byte];
}

function textBytes(text, raw = false) {
  const valid = raw ? /^[\x02-\x7f]*$/ : /^[\x20-\x7e\t\n\r]*$/;
  if (typeof text !== 'string' || !valid.test(text)) {
    throw new Error('Text must be safe ASCII; NUL, U+0001, and non-ASCII are not representable');
  }
  return [...text].map((character) => character.charCodeAt(0));
}

function encodeTuple(tuple, warn) {
  const [type, value, key] = tuple;
  if ([1, 2, 3].includes(type)) {
    if (tuple.length !== 3 || typeof value !== 'string' || typeof key !== 'string' || !Object.hasOwn(codes, key)) {
      throw new Error('Key tuples require [1|2|3, displayName, canonical Launcher key]');
    }
    if (!value) warn('Empty raw display names can prevent current-slot submission in Launcher');
    if (type === 1) warn('Launcher Nape submission drops raw Tap events; use readable tap for down/up expansion');
    if (codes[key] >= 205 && codes[key] <= 216) warn('Launcher device-read editing normalizes mouse events and can lose hold/release timing');
    return [1, type, codes[key]];
  }
  if (type === 4 || type === 5) {
    if (tuple.length !== 2 && !(tuple.length === 3 && key === null)) throw new Error('Delay/text tuples require two fields (or a null editor suffix)');
    if (type === 5) {
      if (value === '') warn('Empty raw text can prevent current-slot submission in Launcher');
      return textBytes(value, true);
    }
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Raw delays must be positive safe integers');
    return [1, 4, ...[...String(value)].map((character) => character.charCodeAt(0)), 124];
  }
  if (type === 6) {
    if (tuple.length !== 3 || typeof value !== 'string' || typeof key !== 'string' || !Object.hasOwn(codes, value)
      || codes[value] < 205 || codes[value] > 216) {
      throw new Error('Mouse editor tuples require [6, canonical mouse key, displayName]');
    }
    warn('Launcher converts raw mouse editor events into immediate down/up pairs');
    return [1, 2, codes[value], 1, 3, codes[value]];
  }
  throw new Error(`Unsupported/unencodable raw event type ${type}`);
}

export function buildMacros(source) {
  if (!source.macros) return { macro: null, warnings: [], macroBytes: null };
  if (source.external_macros?.length) throw new Error('external_macros cannot be combined with a macro bundle: submission replaces the whole buffer');
  const { slot_count: count, slots, capacity_bytes: capacity } = source.macros;
  const macro = Array.from({ length: count }, () => []);
  const name = Array(count).fill('');
  const indexes = new Set();
  const warnings = new Set();
  let bytes = count; // Every slot, including an empty slot, has a NUL terminator.
  for (const [position, slot] of slots.entries()) {
    const path = `/macros/slots/${position}`;
    if (slot.index >= count) throw new Error(`${path}/index: outside slot_count ${count}`);
    if (indexes.has(slot.index)) throw new Error(`${path}: duplicate index ${slot.index}`);
    indexes.add(slot.index);
    name[slot.index] = slot.name ?? '';
    const held = new Set();
    const rawSequence = slot.events.some((event) => Object.hasOwn(event, 'raw'));
    if (rawSequence) warnings.add(`${path}: raw events bypass held-key safety checks for this slot`);
    const warn = (message) => warnings.add(`${path}: ${message}`);
    for (const [eventIndex, event] of slot.events.entries()) {
      const eventPath = `${path}/events/${eventIndex}`;
      try {
        let tuples;
        if (Object.hasOwn(event, 'raw')) {
          tuples = [structuredClone(event.raw)];
        } else if (Object.hasOwn(event, 'delay_ms')) {
          tuples = [[4, event.delay_ms]];
        } else if (Object.hasOwn(event, 'text')) {
          textBytes(event.text);
          tuples = [[5, event.text]];
        } else {
          const [kind, expression] = Object.entries(event)[0];
          const keys = symbolKeys(expression, kind === 'tap');
          if (!rawSequence) {
            for (const byte of keys) {
              if (kind === 'up') {
                if (!held.has(byte)) throw new Error(`Unmatched release of ${expression}`);
                held.delete(byte);
              } else {
                if (held.has(byte)) throw new Error(`Repeated press/tap conflicts with an already-held key: ${expression}`);
                if (kind === 'down') held.add(byte);
              }
            }
          }
          tuples = kind === 'tap'
            ? [...keys.map((byte) => keyTuple(2, byte, byByte.get(byte))),
              ...[...keys].reverse().map((byte) => keyTuple(3, byte, byByte.get(byte)))]
            : [keyTuple(kind === 'down' ? 2 : 3, keys[0], expression)];
        }
        for (const tuple of tuples) bytes += encodeTuple(tuple, warn).length;
        macro[slot.index].push(...tuples);
      } catch (error) {
        throw new Error(`${eventPath}: ${error.message}`, { cause: error });
      }
    }
    if (held.size) throw new Error(`${path}: keys left held at the end of the macro`);
  }
  if (capacity !== undefined && bytes > capacity) throw new Error(`/macros: encoded size ${bytes} exceeds capacity_bytes ${capacity}`);
  if (capacity === undefined) warnings.add(`/macros: encoded size ${bytes} bytes; device capacity is unverified`);
  return { macro: { md5: macroChecksum(macro), macro, name }, warnings: [...warnings], macroBytes: bytes };
}
