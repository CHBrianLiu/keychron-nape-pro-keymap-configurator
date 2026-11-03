import { readFileSync } from 'node:fs';

// Vocabulary: pinned upstream ZMK. Values: Launcher protocol 12.
// See docs/research/zmk-keycode-compatibility.md for the crosswalk and limits.
const catalog = JSON.parse(readFileSync(new URL('../data/zmk-keycodes.json', import.meta.url), 'utf8'));
const modifiers = { LC: 1, LS: 2, LA: 4, LG: 8, RC: 16, RS: 32, RA: 64, RG: 128 };
const mouse = { MB1: 209, LCLK: 209, MB2: 210, RCLK: 210, MB3: 211, MCLK: 211, MB4: 212, MB5: 213 };
const consumer = new Map([
  [0xe2, 168], [0xe9, 169], [0xea, 170], [0xb5, 171], [0xb6, 172],
  [0xb7, 173], [0xcd, 174], [0x183, 175], [0xcc, 176], [0x18a, 177],
  [0x192, 178], [0x194, 179], [0x221, 180], [0x223, 181], [0x224, 182],
  [0x225, 183], [0x226, 184], [0x227, 185], [0x22a, 186], [0xb3, 187],
  [0xb4, 188], [0x6f, 189], [0x70, 190], [0x29f, 193], [0x2a0, 194],
]);

export const napeActions = Object.freeze({
  gesture_mode: 21033,
  scroll_mode: 21034,
  bluetooth_1: 32256, bluetooth_2: 32257, bluetooth_3: 32258,
  bootloader: 32259, pair_2_4ghz: 32260,
  macos_lock: 32261, application_preferences: 32262,
  left_option: 32263, right_option: 32264, left_command: 32265, right_command: 32266,
  macos_desktop_left: 32267, macos_desktop_right: 32268, macos_emoji: 32269,
  windows_task_view: 32270, windows_desktop_left: 32271, windows_desktop_right: 32272,
  windows_explorer: 32273, windows_lock: 32274, windows_settings: 32275,
  windows_emoji: 32276, windows_screenshot: 32277, macos_screenshot: 32278,
  battery: 32279, siri: 32280, cortana: 32281,
  orientation_increase: 32282, orientation_decrease: 32283,
  orientation_0: 32284, orientation_45: 32285, orientation_90: 32286,
  orientation_135: 32287, orientation_180: 32288, orientation_225: 32289,
  orientation_270: 32290, orientation_315: 32291,
  bluetooth_select_clear: 32292, dpi_increase: 32293, dpi_decrease: 32294,
  // Custom 39/40 have conflicting polling labels. Use raw values for those.
  // Custom 41 is emitted only through the structured tap/hold binding.
  orientation_cycle: 32299, dpi_cycle: 32300, polling_cycle: 32301,
  double_left_click: 32302, custom_dpi: 32303, left_click_lock: 32304,
  // Directional Launcher wheel assignments, not ZMK velocity expressions.
  wheel_up: 217, wheel_down: 218, wheel_left: 219, wheel_right: 220,
});

function keyboardUsage(usage) {
  return (usage >= 4 && usage <= 0xa4) || (usage >= 0xe0 && usage <= 0xe7);
}

function encodeUsage(key, extraModifiers, expression) {
  const mask = key.modifiers | extraModifiers;
  if ((mask & 15) && (mask & 240)) {
    throw new Error(`${expression}: mixed left/right modifier wrappers cannot be represented by Launcher`);
  }
  if (key.page === 7 && keyboardUsage(key.usage)) {
    if (mask && key.usage >= 0xe0) {
      throw new Error(`${expression}: wrappers on a modifier key are not verified; use an explicit raw value`);
    }
    const launcherModifiers = mask & 240 ? 16 | (mask >> 4) : mask;
    return (launcherModifiers << 8) | key.usage;
  }
  if (mask) throw new Error(`${expression}: modifier wrappers require a supported keyboard key`);
  if (key.page === 12 && consumer.has(key.usage)) return consumer.get(key.usage);
  if (key.page === 1 && key.usage >= 0x81 && key.usage <= 0x83) return key.usage + 36;
  throw new Error(`${expression}: no verified Launcher mapping for HID page ${key.page}, usage 0x${key.usage.toString(16)}`);
}

export function compileSymbol(expression) {
  if (typeof expression !== 'string' || expression.length > 256) throw new Error('Expected a key expression of at most 256 characters');
  let text = expression.trim();
  let mask = 0;
  let wrapped = false;
  let match;
  while ((match = /^(LC|LS|LA|LG|RC|RS|RA|RG)\(\s*(.+)\s*\)$/.exec(text))) {
    wrapped = true;
    mask |= modifiers[match[1]];
    text = match[2].trim();
  }
  if (!wrapped && Object.hasOwn(mouse, text)) return mouse[text];
  if (!wrapped && text === 'none') return 0;
  if (!wrapped && text === 'trans') return 1;
  if (!Object.hasOwn(catalog.keys, text)) throw new Error(`${expression}: unknown key name or malformed modifier expression`);
  return encodeUsage(catalog.keys[text], mask, expression);
}

export const symbolNames = Object.freeze([
  'none', 'trans', ...Object.keys(mouse),
  ...Object.keys(catalog.keys).filter((name) => {
    try { compileSymbol(name); return true; } catch { return false; }
  }),
].sort());

export function compileAction(action) {
  if (typeof action === 'string') return compileSymbol(action);
  const [kind, value] = Object.entries(action)[0];
  switch (kind) {
    case 'mo': return 21024 + value + 1;
    case 'tog': return 21088 + value + 1;
    case 'to': return 20992 + value + 1;
    case 'macro': return 30464 + value;
    case 'nape': return napeActions[value];
    case 'raw': return value;
    default: throw new Error(`Unknown action type: ${kind}`);
  }
}
