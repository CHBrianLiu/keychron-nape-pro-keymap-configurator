import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildKeymap, parseKeymap, validateKeymap } from '../src/keymap.js';
import { compileSymbol } from '../src/keycodes.js';

const fixtureText = readFileSync(new URL('./fixtures/migrated.yaml', import.meta.url), 'utf8');
const expected = JSON.parse(readFileSync(new URL('./fixtures/launcher-export.json', import.meta.url), 'utf8'));
const fixture = () => parseKeymap(fixtureText);

test('initial migration reproduces the independent Launcher export, including the exact checksum', () => {
  const output = buildKeymap(fixture());
  assert.deepEqual(output, expected);
  assert.equal(JSON.stringify(output), JSON.stringify(expected));
  assert.equal(output.MD5, '4e85f3706edd95ff697a183c1a5acb8a');
});

test('generation is deterministic and does not mutate the authoritative source', () => {
  const source = fixture();
  const original = structuredClone(source);
  assert.deepEqual(buildKeymap(source), buildKeymap(source));
  assert.deepEqual(source, original);
});

test('a single edit changes only its intended raw binding and checksum', () => {
  const source = fixture();
  source.layers[4].buttons.m2 = 'LC(A)';
  const output = buildKeymap(source);
  const wanted = structuredClone(expected);
  wanted.keymap[5][5].val = 260;
  delete wanted.MD5;
  assert.notEqual(output.MD5, expected.MD5);
  delete output.MD5;
  assert.deepEqual(output, wanted);
});

test('adding and removing tap/hold updates the marker and side table together', () => {
  const source = fixture();
  source.layers[0].buttons.m1 = 'MB4';
  source.layers[0].buttons.m2 = { tap: 'A', hold: { mo: 7 } };
  const output = buildKeymap(source);
  assert.equal(output.keymap[1][4].val, 212);
  assert.equal(output.keymap[1][5].val, 32297);
  assert.deepEqual(output.tapHold[1], [
    { col: 0, tap: 2054, held: 2073 },
    { col: 5, tap: 4, held: 21032 },
  ]);
});

test('structured layer, macro, special and empty actions target the correct numeric namespace', () => {
  const source = fixture();
  source.layers[7].buttons = {
    '03': { mo: 0 }, '04': { tog: 7 }, '01': { to: 0 },
    '02': { macro: 15 }, m1: 'none', m2: 'trans',
  };
  source.layers[7].encoder = { clockwise: { nape: 'left_click_lock' }, counterclockwise: { nape: 'gesture_mode' } };
  source.external_macros = [15];
  const output = buildKeymap(source);
  assert.deepEqual(output.keymap[8].map(({ val }) => val), [21025, 21096, 20993, 30479, 0, 1, 21035]);
  assert.deepEqual(output.knob[8], { cw: 32304, ccw: 21033 });
});

test('unknown raw words survive in visible bindings, hidden layer, and every extra slot', () => {
  const source = fixture();
  source.layers[2].buttons.m2 = { raw: 65535 };
  source.preserved.raw_layer_0.keymap[1] = 65000;
  source.preserved.column_6 = [65001, 65002, 65003, 65004, 65005, 65006, 65007, 65008];
  const output = buildKeymap(source);
  assert.equal(output.keymap[3][5].val, 65535);
  assert.equal(output.keymap[0][1].val, 65000);
  assert.deepEqual(output.keymap.slice(1).map((layer) => layer[6].val), source.preserved.column_6);
});

test('sparse combination slots, raw layer values, timeout zero, names, and unknown fields are preserved', () => {
  const source = fixture();
  source.combinations = [
    { raw: { index: 4, timeout: 0, layer: 0, cols: 5, tap: 4, held: 65535, extra: { revision: 9 } } },
    { raw: { index: 29, timeout: 65535, layer: 8, cols: 48, tap: 212, held: 21026 } },
  ];
  source.preserved.combination_names = { '0103': 'Example', m1m2: 'Pair' };
  const output = buildKeymap(source);
  assert.deepEqual(output.simult, source.combinations.map(({ raw }) => raw));
  assert.deepEqual(output.simultNames, source.preserved.combination_names);
  assert.notEqual(output.MD5, expected.MD5);
});

test('raw layer tap/hold and its extra metadata survive unchanged', () => {
  const source = fixture();
  source.preserved.raw_layer_0.keymap[0] = 32297;
  source.preserved.raw_layer_0.tap_hold = [{ col: 0, tap: 212, held: 227, note: 'retained' }];
  assert.deepEqual(buildKeymap(source).tapHold[0], source.preserved.raw_layer_0.tap_hold);
});

test('ZMK names and aliases use verified namespaces, including shifted and keypad keys', () => {
  const cases = {
    A: 4, ESC: 41, ESCAPE: 41, N1: 30, NUMBER_1: 30,
    'LG(C)': 2054, 'LG(LS(N2))': 2591, 'LG(KP_PLUS)': 2135, 'LG(KP_MINUS)': 2134,
    EXCL: 542, 'LS(N1)': 542, 'RC(A)': 4356, LEFT_GUI: 227,
    C_VOLUME_UP: 169, C_VOL_UP: 169, K_VOLUME_UP: 128,
    C_AC_BACK: 182, MB4: 212, LCLK: 209, MB1: 209, RCLK: 210,
    C_STOP_EJECT: 176, SYSTEM_POWER: 165,
  };
  for (const [name, value] of Object.entries(cases)) assert.equal(compileSymbol(name), value, name);
});

test('unsupported usages cannot collide with compact Launcher assignments', () => {
  for (const name of ['KP_LPAR', 'KP_CLEAR', 'C_EJECT']) {
    assert.throws(() => compileSymbol(name), /no verified Launcher mapping/, name);
  }
});

test('incompatible and malformed expressions fail with a useful binding path', () => {
  for (const expression of ['LC(RA(A))', 'RG(EXCL)', 'LG(C_VOL_UP)', 'LG(LEFT_GUI)', 'LG(BOGUS)', 'LC(A))']) {
    const source = fixture();
    source.layers[0].buttons.m2 = expression;
    assert.throws(() => buildKeymap(source), /\/layers\/0\/buttons\/m2/, expression);
  }
});

test('schema rejects incomplete snapshots, unknown fields, bad ranges and nested hold-tap', () => {
  const mutations = [
    (s) => s.layers.pop(),
    (s) => delete s.layers[0].buttons['03'],
    (s) => delete s.layers[0].encoder.counterclockwise,
    (s) => { s.layers[0].name = 'unsupported'; },
    (s) => { s.layers[0].buttons.m2 = 209; },
    (s) => { s.layers[0].buttons.m2 = { mo: 8 }; },
    (s) => { s.layers[0].buttons.m2 = { macro: 16 }; },
    (s) => { s.layers[0].buttons.m2 = { raw: 65536 }; },
    (s) => { s.layers[0].buttons.m2 = { raw: 1, mo: 0 }; },
    (s) => { s.layers[0].buttons.m2 = { tap: { tap: 'A', hold: 'B' }, hold: 'C' }; },
    (s) => { s.layers[0].encoder.clockwise = { tap: 'A', hold: 'B' }; },
    (s) => delete s.combinations,
    (s) => s.preserved.column_6.pop(),
  ];
  for (const mutate of mutations) {
    const source = fixture();
    mutate(source);
    assert.throws(() => validateKeymap(source), /Invalid keymap/);
  }
});

test('duplicate raw slot identities and incomplete tap/hold markers fail semantic validation', () => {
  const source = fixture();
  const record = { index: 3, layer: 0, cols: 3, timeout: 200, tap: 4, held: 5 };
  source.combinations = [{ raw: record }, { raw: { ...record } }];
  assert.throws(() => buildKeymap(source), /duplicate index 3/);
  source.combinations = [];
  source.preserved.raw_layer_0.keymap[0] = 32297;
  assert.throws(() => buildKeymap(source), /no action record/);
  const visible = fixture();
  visible.layers[0].buttons.m2 = { raw: 32297 };
  assert.throws(() => buildKeymap(visible), /tap, hold/);
});

test('YAML duplicate keys and unknown tags are rejected rather than silently normalized', () => {
  assert.throws(() => parseKeymap('version: 1\nversion: 2\n'), /unique/);
  assert.throws(() => parseKeymap('version: !mystery 1\n'), /Unresolved tag/);
});

test('standalone Ajv CLI validates YAML without running the build', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  for (const file of ['migrated.yaml', '*.yaml']) {
    const result = spawnSync(process.execPath, [
      join(root, 'node_modules/ajv-cli/dist/index.js'), 'validate', '--spec=draft2020',
      '-s', join(root, 'schema/keymap.schema.json'), '-d', join(root, 'test/fixtures', file), '--changes',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /valid/);
    assert.match(result.stdout, /no changes/);
  }
});

test('build entry point writes the expected output and leaves it intact on validation failure', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'nape-build-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'keymap.yaml'), fixtureText);
  const script = fileURLToPath(new URL('../src/build.js', import.meta.url));
  const run = () => spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const output = await readFile(join(directory, 'dist/launcher.json'), 'utf8');
  assert.deepEqual(JSON.parse(output), expected);
  await writeFile(join(directory, 'keymap.yaml'), fixtureText.replace('m2: RCLK', 'm2: LC(RA(A))'));
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /mixed left\/right/);
  assert.equal(await readFile(join(directory, 'dist/launcher.json'), 'utf8'), output);
});
