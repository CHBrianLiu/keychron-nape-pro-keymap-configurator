import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseDocument } from 'yaml';
import { compileAction } from './keycodes.js';
import { buildCombinations, buttonColumns } from './combinations.js';
import { buildMacros } from './macros.js';

const schema = JSON.parse(readFileSync(new URL('../schema/keymap.schema.json', import.meta.url), 'utf8'));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const tapHoldMarker = 32297;

export function parseKeymap(text) {
  const document = parseDocument(text, { version: '1.2', uniqueKeys: true });
  if (document.errors.length || document.warnings.length) {
    throw new Error([...document.errors, ...document.warnings].map((error) => error.message).join('\n'));
  }
  return document.toJS();
}

export function validateKeymap(source) {
  if (!validate(source)) {
    const errors = validate.errors.map(({ instancePath, message, params }) =>
      `${instancePath || '/'}: ${message}${params.missingProperty ? ` (${params.missingProperty})` : ''}`);
    throw new Error(`Invalid keymap:\n${errors.join('\n')}`);
  }
}

function at(path, action) {
  try {
    const value = compileAction(action);
    if (value === tapHoldMarker) throw new Error('Use a {tap, hold} binding instead of a bare tap/hold marker');
    return value;
  } catch (error) {
    throw new Error(`${path}: ${error.message}`, { cause: error });
  }
}

function assertUnique(records, field, path) {
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record[field])) throw new Error(`${path}: duplicate ${field} ${record[field]}`);
    seen.add(record[field]);
  }
}

export function launcherChecksum({ keymap, knob, tapHold, simult }) {
  return createHash('md5').update(JSON.stringify({ keymap, knob, tapHold, simult })).digest('hex');
}

function compileKeymap(source) {
  validateKeymap(source);
  const { raw_layer_0: raw, column_6: extraColumns } = source.preserved;
  const { records: combinations, names } = buildCombinations(source);
  assertUnique(raw.tap_hold, 'col', '/preserved/raw_layer_0/tap_hold');
  for (const [col, value] of raw.keymap.entries()) {
    if (value === tapHoldMarker && !raw.tap_hold.some((record) => record.col === col)) {
      throw new Error(`/preserved/raw_layer_0: column ${col} has a tap/hold marker but no action record`);
    }
  }
  if (extraColumns.includes(tapHoldMarker)) {
    throw new Error('/preserved/column_6: tap/hold records for the unmapped slot are not supported by source v2');
  }

  const keymap = [raw.keymap.map((val, col) => ({ col, val }))];
  const knob = [{ cw: raw.encoder.clockwise, ccw: raw.encoder.counterclockwise }];
  const tapHold = [structuredClone(raw.tap_hold)];
  for (const [layerIndex, layer] of source.layers.entries()) {
    const holds = [];
    const keys = buttonColumns.map((button, col) => {
      const binding = layer.buttons[button];
      const path = `/layers/${layerIndex}/buttons/${button}`;
      if (typeof binding === 'object' && Object.hasOwn(binding, 'tap')) {
        holds.push({ col, tap: at(`${path}/tap`, binding.tap), held: at(`${path}/hold`, binding.hold) });
        return { col, val: tapHoldMarker };
      }
      return { col, val: at(path, binding) };
    });
    keys.push({ col: 6, val: extraColumns[layerIndex] });
    keymap.push(keys);
    knob.push({
      cw: at(`/layers/${layerIndex}/encoder/clockwise`, layer.encoder.clockwise),
      ccw: at(`/layers/${layerIndex}/encoder/counterclockwise`, layer.encoder.counterclockwise),
    });
    tapHold.push(holds);
  }
  const output = {
    id: '875824192', version: 2, keymap, knob, tapHold,
    simult: structuredClone(combinations), simultNames: structuredClone(names),
  };
  const defined = new Set(source.macros?.slots.map(({ index }) => index) ?? source.external_macros ?? []);
  const assignments = [
    ...keymap.flat().map(({ val }) => val),
    ...knob.flatMap(({ cw, ccw }) => [cw, ccw]),
    ...tapHold.flat().flatMap(({ tap, held }) => [tap, held]),
    ...combinations.flatMap(({ tap, held }) => [tap, held]),
  ];
  for (const value of assignments) {
    if (value >= 30464 && value <= 30479 && !defined.has(value - 30464)) {
      throw new Error(`Macro slot ${value - 30464} is referenced but has no definition or external_macros declaration`);
    }
  }
  output.MD5 = launcherChecksum(output);
  return output;
}

export function buildConfiguration(source) {
  const keymap = compileKeymap(source);
  const macros = buildMacros(source);
  return { keymap, ...macros };
}

export function buildKeymap(source) {
  return buildConfiguration(source).keymap;
}
