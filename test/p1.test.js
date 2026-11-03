import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { stringify } from 'yaml';
import { buildConfiguration, buildKeymap, parseKeymap, validateKeymap } from '../src/keymap.js';

const fixtureText = readFileSync(new URL('./fixtures/migrated.yaml', import.meta.url), 'utf8');
const fixture = () => parseKeymap(fixtureText);
const combo = (overrides = {}) => ({
  index: 0, buttons: ['03', '04'], raw_layer: 0, timeout: 200,
  tap: { to: 0 }, hold: 'none', name: 'Gateway', ...overrides,
});
const withEvents = (events, options = {}) => ({
  ...fixture(), macros: { slot_count: 1, slots: [{ index: 0, name: 'Example', events }], ...options },
});

test('gateway combination compiles exact columns, output, raw scope, and name without unrelated edits', () => {
  const source = fixture();
  const before = buildKeymap(source);
  source.combinations = [combo()];
  const output = buildKeymap(source);
  assert.deepEqual(output.simult, [{ index: 0, timeout: 200, layer: 0, cols: 3, tap: 20993, held: 0 }]);
  assert.deepEqual(output.simultNames, { '0304': 'Gateway' });
  for (const field of ['keymap', 'knob', 'tapHold', 'id', 'version']) assert.deepEqual(output[field], before[field]);
  assert.notEqual(output.MD5, before.MD5);
});

test('visible combination layers translate without changing explicit raw layers or member order', () => {
  const source = fixture();
  const entry = combo({ buttons: ['04', '03'], layer: 7 });
  delete entry.raw_layer;
  source.combinations = [entry];
  const original = structuredClone(source);
  assert.equal(buildKeymap(source).simult[0].layer, 8);
  assert.deepEqual(source, original);
  delete entry.layer;
  entry.raw_layer = 255;
  assert.equal(buildKeymap(source).simult[0].layer, 255);
});

test('duplicate member sets fail across layers, names, ordering, and raw representation', () => {
  for (const duplicate of [
    combo({ index: 1, buttons: ['04', '03'], raw_layer: 8, name: 'Other' }),
    { raw: { index: 29, timeout: 0, layer: 255, cols: 3, tap: 0, held: 0 } },
  ]) {
    const source = fixture();
    source.combinations = [combo(), duplicate];
    assert.throws(() => buildKeymap(source), /duplicate member set/);
  }
});

test('readable combinations enforce established Launcher constraints; raw is an escape', () => {
  for (const invalid of [
    combo({ buttons: ['03', '04', '01', '02'] }),
    combo({ tap: { mo: 0 } }),
    combo({ tap: { nape: 'gesture_mode' } }),
    combo({ tap: { raw: 21025 } }),
    combo({ tap: 'MB1', hold: 'MB2' }),
    combo({ tap: { nape: 'wheel_up' }, hold: { nape: 'left_click_lock' } }),
  ]) {
    const source = fixture();
    source.combinations = [invalid];
    assert.throws(() => buildKeymap(source), /Launcher/);
  }
  const source = fixture();
  const raw = { index: 29, timeout: 0, layer: 255, cols: 15, tap: 209, held: 210, extra: [1, 2] };
  source.combinations = [{ raw }];
  assert.deepEqual(buildKeymap(source).simult, [raw]);
});

test('preserved names merge without dropping orphans or silently overwriting conflicts', () => {
  const source = fixture();
  source.preserved.combination_names = { orphan: 'Retained', '0304': 'Gateway' };
  source.combinations = [combo()];
  assert.deepEqual(buildKeymap(source).simultNames, source.preserved.combination_names);
  source.combinations[0].name = 'Different';
  assert.throws(() => buildKeymap(source), /conflicts with preserved name/);
});

test('v2 schema rejects old syntax and malformed combination scope and members', () => {
  const mutations = [
    (s) => { s.version = 1; },
    (s) => { s.preserved.combinations = []; },
    (s) => { s.combinations = [combo({ layer: 0 })]; },
    (s) => { const c = combo(); delete c.raw_layer; s.combinations = [c]; },
    (s) => { s.combinations = [combo({ buttons: ['03', '03'] })]; },
    (s) => { s.combinations = [combo({ buttons: ['03'] })]; },
    (s) => { s.combinations = [combo({ buttons: ['03', 'knob-cw'] })]; },
    (s) => { const c = combo(); delete c.timeout; s.combinations = [c]; },
  ];
  for (const mutate of mutations) {
    const source = fixture();
    mutate(source);
    assert.throws(() => validateKeymap(source), /Invalid keymap/);
  }
});

test('macro import matches independent active-route fixture and exact checksum', () => {
  const source = withEvents([{ down: 'A' }, { up: 'A' }, { delay_ms: 200 }, { text: 'Hi' }]);
  const expected = JSON.parse(readFileSync(new URL('./fixtures/macro-export.json', import.meta.url), 'utf8'));
  const output = buildConfiguration(source);
  assert.deepEqual(output.macro, expected);
  assert.equal(output.macroBytes, 15);
  assert.match(output.warnings.join('\n'), /capacity is unverified/);
});

test('tap chords lower to ordered down/up events, never dropped Tap tuples', () => {
  const output = buildConfiguration(withEvents([{ tap: 'LG(LS(A))' }, { tap: 'EXCL' }, { tap: 'RG(A)' }]));
  assert.deepEqual(output.macro.macro[0].slice(0, 6).map(([tag, , key]) => [tag, key]), [
    [2, 'KC_LSFT'], [2, 'KC_LGUI'], [2, 'KC_A'], [3, 'KC_A'], [3, 'KC_LGUI'], [3, 'KC_LSFT'],
  ]);
  assert.deepEqual(output.macro.macro[0].slice(6, 10).map(([tag, , key]) => [tag, key]), [
    [2, 'KC_LSFT'], [2, 'KC_1'], [3, 'KC_1'], [3, 'KC_LSFT'],
  ]);
  assert.equal(output.macro.macro[0][10][2], 'KC_RGUI');
  assert.ok(output.macro.macro[0].every(([tag, display]) => tag !== 1 && display));
});

test('macro mappings distinguish byte consumer/mouse/modifier enums and reject unrepresentable keys', () => {
  const output = buildConfiguration(withEvents([{ tap: 'C_VOLUME_UP' }, { tap: 'MB4' }, { tap: 'LEFT_GUI' }]));
  assert.deepEqual(output.macro.macro[0].filter(([tag]) => tag === 2).map(([, , key]) => key), ['KC_VOLU', 'KC_MS_BTN4', 'KC_LGUI']);
  assert.match(output.warnings.join('\n'), /mouse events/);
  for (const expression of ['none', 'trans', 'K_VOLUME_UP', 'K_MUTE', 'K_VOLUME_DOWN', 'RETURN2']) {
    assert.throws(() => buildConfiguration(withEvents([{ tap: expression }])), /mapping|Invalid keymap/, expression);
  }
  assert.throws(() => buildConfiguration(withEvents([{ down: 'LG(A)' }])), /individual unmodified key/);
});

test('readable macros reject held-key mistakes and tap conflicts without inserting events', () => {
  for (const events of [
    [{ up: 'A' }], [{ down: 'A' }], [{ down: 'A' }, { down: 'A' }],
    [{ down: 'A' }, { tap: 'A' }, { up: 'A' }],
    [{ down: 'LEFT_GUI' }, { tap: 'LG(A)' }, { up: 'LEFT_GUI' }],
  ]) assert.throws(() => buildConfiguration(withEvents(events)), /release|held|Repeated/);
  const output = buildConfiguration(withEvents([{ down: 'LEFT_GUI' }, { tap: 'A' }, { up: 'LEFT_GUI' }]));
  assert.equal(output.macro.macro[0].length, 4);
});

test('safe text and delays are explicit, with reserved bytes and unsupported Unicode rejected', () => {
  const safe = buildConfiguration(withEvents([{ text: 'Hi\t\n\r|{}' }, { delay_ms: 9999 }]));
  assert.equal(safe.macroBytes, 16);
  for (const event of [
    { text: '' }, { text: '\0' }, { text: '\x01' }, { text: '\x02' }, { text: 'é' },
    { delay_ms: 0 }, { delay_ms: 10000 }, { delay_ms: 1.5 },
  ]) assert.throws(() => buildConfiguration(withEvents([event])), /Invalid keymap/);
});

test('raw macro tuples are preserved, with explicit normalization and safety warnings', () => {
  const events = [
    [1, 'A', 'KC_A'], [6, 'KC_MS_BTN1', 'Mouse Btn1'], [4, 10000, null], [5, '\x02Hi', null], [2, '', 'KC_A'], [5, ''],
  ];
  const source = withEvents(events.map((raw) => ({ raw })));
  const original = structuredClone(source);
  const output = buildConfiguration(source);
  assert.deepEqual(output.macro.macro[0], events);
  assert.deepEqual(source, original);
  const warnings = output.warnings.join('\n');
  assert.match(warnings, /drops raw Tap/);
  assert.match(warnings, /immediate down\/up/);
  assert.match(warnings, /bypass held-key/);
  assert.match(warnings, /Empty raw display/);
  assert.match(warnings, /Empty raw text/);
});

test('raw aliases remain exact while readable keys use the decoder-canonical enum', () => {
  const output = buildConfiguration(withEvents([{ raw: [2, 'Clear', 'KC_CLR'] }, { tap: 'CLEAR' }]));
  assert.equal(output.macro.macro[0][0][2], 'KC_CLR');
  assert.equal(output.macro.macro[0][1][2], 'KC_CLEAR');
});

test('malformed and unencodable raw macro data cannot silently truncate keycodes or split slots', () => {
  for (const raw of [
    [2, 'A', 4], [2, 'A', '4'], [2, 'Lock', 'KC_MS_BTN1_LOCK'],
    [2, 'Unknown', 'KC_FAKE'], [2, 'A'], [7, 'Mouse', 'KC_MS_BTN1'],
    [4, 0], [4, 1.5], [4, 1, 'unexpected'], [5, '\0'], [5, '\x01'],
    [5, 'é'], [6, 'KC_A', 'Not mouse'], [6, ['KC_MS_BTN1'], 'Mouse'],
  ]) assert.throws(() => buildConfiguration(withEvents([{ raw }])), /\/macros\/slots\/0\/events\/0/, JSON.stringify(raw));
});

test('slot indexes, padding, parallel names, and capacity include empty-slot terminators', () => {
  const source = withEvents([], {
    slot_count: 3, capacity_bytes: 9,
    slots: [{ index: 2, events: [{ tap: 'A' }] }],
  });
  const output = buildConfiguration(source);
  assert.deepEqual(output.macro.macro.slice(0, 2), [[], []]);
  assert.deepEqual(output.macro.name, ['', '', '']);
  assert.equal(output.macroBytes, 9);
  assert.deepEqual(output.warnings, []);
  source.macros.capacity_bytes = 8;
  assert.throws(() => buildConfiguration(source), /encoded size 9 exceeds/);
  source.macros.capacity_bytes = 9;
  source.macros.slots[0].index = 3;
  assert.throws(() => buildConfiguration(source), /outside slot_count/);
  source.macros.slots = [{ index: 0, events: [] }, { index: 0, events: [] }];
  assert.throws(() => buildConfiguration(source), /duplicate index/);
});

test('macro names are outside checksum; generation is deterministic without source mutation', () => {
  const source = withEvents([{ tap: 'A' }]);
  const original = structuredClone(source);
  const first = buildConfiguration(source);
  assert.deepEqual(buildConfiguration(source), first);
  assert.deepEqual(source, original);
  source.macros.slots[0].name = 'Other';
  const second = buildConfiguration(source);
  assert.equal(first.macro.md5, second.macro.md5);
  assert.equal(first.keymap.MD5, second.keymap.MD5);
});

test('all macro triggers, including raw preserved words and combination outputs, require definitions', () => {
  const mutations = [
    (s) => { s.layers[0].buttons.m2 = { macro: 0 }; },
    (s) => { s.layers[0].encoder.clockwise = { macro: 0 }; },
    (s) => { s.layers[0].buttons.m2 = { tap: { macro: 0 }, hold: 'A' }; },
    (s) => { s.preserved.raw_layer_0.keymap[0] = 30464; },
    (s) => { s.preserved.raw_layer_0.encoder.clockwise = 30464; },
    (s) => { s.preserved.raw_layer_0.tap_hold = [{ col: 0, tap: 30464, held: 0 }]; },
    (s) => { s.preserved.column_6[0] = 30464; },
    (s) => { s.combinations = [combo({ tap: { macro: 0 } })]; },
    (s) => { s.combinations = [{ raw: { index: 0, timeout: 200, layer: 0, cols: 3, tap: 0, held: 30464 } }]; },
  ];
  for (const mutate of mutations) {
    const source = fixture();
    mutate(source);
    assert.throws(() => buildConfiguration(source), /Macro slot 0 is referenced/);
    source.external_macros = [0];
    assert.equal(buildConfiguration(source).macro, null);
    delete source.external_macros;
    source.macros = { slot_count: 1, slots: [{ index: 0, events: [] }] };
    assert.ok(buildConfiguration(source).macro);
    source.macros.slots = [];
    assert.throws(() => buildConfiguration(source), /Macro slot 0 is referenced/);
  }
});

test('external declarations cannot silently clear externally managed macro bodies', () => {
  const source = withEvents([{ tap: 'A' }]);
  source.external_macros = [0];
  assert.throws(() => buildConfiguration(source), /replaces the whole buffer/);
  source.external_macros = [0, 0];
  assert.throws(() => validateKeymap(source), /Invalid keymap/);
});

test('build writes both outputs only after validation and warns about an older macro file in keymap-only mode', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'nape-p1-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = withEvents([{ tap: 'LG(A)' }]);
  await writeFile(join(directory, 'keymap.yaml'), stringify(source));
  const script = fileURLToPath(new URL('../src/build.js', import.meta.url));
  const run = () => spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
  assert.equal(run().status, 0);
  const keymap = await readFile(join(directory, 'dist/launcher.json'), 'utf8');
  const macro = await readFile(join(directory, 'dist/macro.json'), 'utf8');
  assert.deepEqual(JSON.parse(macro), buildConfiguration(source).macro);
  source.layers[0].buttons.m2 = 'B';
  source.macros.slots[0].events = [{ up: 'A' }];
  await writeFile(join(directory, 'keymap.yaml'), stringify(source));
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Unmatched release/);
  assert.equal(await readFile(join(directory, 'dist/launcher.json'), 'utf8'), keymap);
  assert.equal(await readFile(join(directory, 'dist/macro.json'), 'utf8'), macro);
  delete source.macros;
  await writeFile(join(directory, 'keymap.yaml'), stringify(source));
  const keymapOnly = run();
  assert.equal(keymapOnly.status, 0);
  assert.match(keymapOnly.stdout, /Do not import an older macro file/);
  assert.equal(await readFile(join(directory, 'dist/macro.json'), 'utf8'), macro);
});
