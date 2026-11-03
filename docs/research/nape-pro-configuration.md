# Nape Pro configuration inventory and priorities

Research date: **2026-11-02**. Status: **source-backed inventory; P0 and P1 implemented; P1 hardware verification pending**.

## Summary

- The ultimate goal is a **standalone tool that configures Nape Pro keymaps directly**, without Keychron Launcher, starting on macOS. Text-based configuration and reliable backup remain central. Direct device access is planned, not implemented; standalone executable packaging is a separate, deferred decision.
- The first deliverable is an **offline YAML-to-Launcher-JSON generator**. The human-maintained keymap source in Git is authoritative; Launcher applies generated import files. Tap/hold, both encoder directions, combinations, hidden raw data, and unknown keycodes must remain faithfully represented from day one.
- Launcher’s version-2 keymap export is **not a whole-device backup**. It contains key assignments, encoder assignments, active tap/hold records, combinations, and combination names. It omits macro bodies, gesture actions, orientation, DPI, polling, sleep, and most browser metadata. [K, P]
- The remaining device configuration exposed by the inspected Nape routes is: orientation; DPI slot count, values and selection; custom DPI; polling rate; four gesture actions; forced gesture/scroll modes; sleep; and macro sequences. Quick Start additionally depends on Launcher Assistant. [D, A, M, Q, P]
- Device and layer nicknames, diagram color, and “keep layer” are browser settings. “Keep layer” controls whether the editor follows/switches the active device layer; it is not evidence of a firmware startup-layer setting. [L, A]
- No implemented Nape profile-bank UI/API, independent per-layer DPI switch, sensor acceleration/debounce/LOD controls, RGB configuration, or configurable scroll-speed setting was found in these routes. Generic Launcher code and unused constants must not be mistaken for supported Nape features. [R, P, A]

The user has settled **text editing + backup as most essential**, **macOS/Nape first**, **complete all-layer configuration**, and **offline YAML-to-Launcher-JSON generation as the first milestone**. YAML under Git is the source of truth; normal keymap edits happen there, followed by generation and import through Launcher. The milestone priorities are approved and the first milestone is implemented; later milestones still require detailed design.

Additional agreed choices:

- **YAML** for editable configuration; the agreed structure is implemented in `schema/keymap.schema.json` and demonstrated in `keymap.yaml`.
- Use **visible layer numbers 0–7**, translating to raw 1–8, and preserve the additional raw layer separately.
- Use stable **device diagram identifiers** for buttons, rather than orientation-dependent position names; exact YAML field spelling remains undecided.
- Include readable **tap/hold editing in the first milestone**, alongside button and encoder editing and lossless combination preservation.
- Use **Node.js and JavaScript**; a runtime dependency is acceptable for the initial installation. Standalone executable packaging is deferred.
- Provide only the **YAML → importable JSON** operation initially. Input validation belongs in generation; standalone validation, diff, and JSON-to-YAML commands are outside this scope. Git supplies change review and history.
- The generation operation is named **build**, exposed through **npm scripts**. Approved defaults: `npm run validate` checks `keymap.yaml` with Ajv CLI and `schema/keymap.schema.json`; `npm run build` validates and generates `dist/launcher.json`.
- Generation must work **entirely offline after installation**, using bundled, verified device/keycode mappings.
- Once YAML syntax is settled, migrate the existing Launcher export into the initial keymap source **once**, including the extra raw layer and unexplained slot values. Subsequent edits happen in YAML; no reverse-conversion CLI command is required.
- Use **ZMK keycode vocabulary** in the source. Keychron officially identifies Nape Pro as ZMK-based; verified names are translated to Launcher's protocol-12 assignment values rather than copied as ZMK integers. See [ZMK compatibility research](./zmk-keycode-compatibility.md) for sources, mappings, and representability limits. The exact Nape firmware revision remains unverified; approved action syntax is recorded below.
- Accept verified ZMK aliases for supported keys, using consistent spelling in the initial migration. **build reports errors for unmappable symbolic expressions** while permitting explicit raw Launcher values for preservation.
- Represent visible layers as an **ordered sequence**, using zero-based position as the visible layer number. **Omit layer names**: Launcher does not restore its browser-local nicknames through keymap import, and the user does not want source-only name/uniqueness handling.
- Define the configuration in **`schema/keymap.schema.json` using JSON Schema**, alongside the agreed syntax. Use **Ajv CLI as a project development dependency** for independent YAML validation before `build`; reuse the same schema within `build` and perform additional semantic checks there. This does not require a separate validation command in the Nape CLI.
- Use **compact binding notation**: scalar ZMK names/expressions for ordinary actions, `{tap: <action>, hold: <action>}` for tap/hold, `{mo: n}`, `{tog: n}`, and `{to: n}` for visible layers, `none`, `trans`, `{macro: n}`, `{nape: gesture_mode}`, `{nape: scroll_mode}`, and `{raw: n}`. Macro indexes retain Launcher numbering; raw numbers are Launcher assignment values.
- Require **eight complete visible layers**, each with a `buttons` mapping for all six stable identifiers and `encoder.clockwise` / `encoder.counterclockwise`. Numeric button identifiers are quoted strings. Missing bindings are errors; disabling uses explicit `none`.
- Keep the **extra raw layer, seventh slots, and raw combination records in a dedicated section of the same YAML file**, populated during one-time migration. Build needs no original export.
- Use the approved header **`version: 1`, `device: nape-pro`**. `preserved.raw_layer_0` contains a seven-value `keymap` ordered by column, numeric `encoder.clockwise` / `encoder.counterclockwise`, and raw `tap_hold` records. `preserved.column_6` holds eight numeric values ordered by visible layer. `preserved.combinations` and `preserved.combination_names` preserve Launcher combination data. The source format version is independent of Launcher export version 2.

## Evidence, coverage, and limits

Applicable instructions were checked: no workspace/ancestor project `AGENTS.md` was found; the supplied global OpenCode rules apply. Inspection originals were read only. Public JS was fetched as text and inspected without executing it. No HID, USB, Bluetooth, or Assistant interaction was performed.

Source labels used throughout:

| Label | Exact source and useful anchors |
|---|---|
| H | `inspection/Keychron Launcher.html`, saved from `https://launcher.keychron.com/#/trackball/key`; supplied saved-page version **1.5.3**. |
| R | `inspection/Keychron Launcher_files/runtime.f2931049c638e400.js`, chunk filename mapping; `inspection/Keychron Launcher_files/main.f6e30fd5066dd94a.js`, route table and `this.trackball=[...]` menu. |
| P | Same local main bundle, **module 58618**, trackball model, protocol methods, and `bn` public API. Constants in **23125**; key translation in **44148** with protocol configuration through **13814**; static Nape key palette in **33550**. |
| K | <https://launcher.keychron.com/44.19ea2266d5e97184.js>, **module 97044**: remapping components, `exportData`, `exportMd5`, `validateImportJson`, `readAllSimult`, `pickSimultNames`, `mergeSimultNames`. |
| L | <https://launcher.keychron.com/431.471bd8e9f2a4df42.js>, **modules 61971/72157**: shared Nape layout/header, layer selector, orientation, nicknames, color cache, `currentLayerChange`. |
| C | <https://launcher.keychron.com/143.68138bd9a9527dad.js>, **modules 25183, 74334, 15711, 50477**: shortcut/modifier and tap/hold/combo palettes. Supporting key UI: <https://launcher.keychron.com/212.36e13af66b5c0ecf.js> (**7212**) and <https://launcher.keychron.com/659.208eb2c283aef699.js> (**74554/47659**). |
| D | <https://launcher.keychron.com/468.bb7a75fdbfbd2ff7.js>, **module 13468**: `dpiScope`, `dpiStep`, `switchDpiLevelNum`, `saveCumstemDPI`, `initPollRate`, `setPollingRate`. |
| A | <https://launcher.keychron.com/112.9e1e8c2e4bf72713.js>, **module 56112**: sleep, forced modes, `KEEP_LAYER`, unused `onTackballModeDPI`. Shared time picker: local main **module 6595**. |
| M | <https://launcher.keychron.com/144.fcdf2a230aca0a0e.js>, **module 85144**: shared macro page, `initWithKb`, `submitKbMarco`, `importMacro`, `export`, `updateName`. Nape macro transport: P; codecs referenced from local main **52411**. |
| Q | <https://launcher.keychron.com/145.df28fe670c9c31ee.js>, **module 51145**: Nape Quick Start/Assistant. Base class in <https://launcher.keychron.com/common.e275151a2d0a85fc.js>, **module 12462**. |
| F | <https://launcher.keychron.com/311.5af65826e606f7b7.js>, **module 97311**: firmware route and children `flash`, `bluetooth`, `frequency`, `kld`, `telink`; `kld` and `telink` share a component. |
| J | <https://launcher.keychron.com/static/device/875824192/json/v3.json>, fetched successfully: Nape definition, diagram positions and custom-key metadata. |
| V | <https://launcher.keychron.com/vapi/v2/product/875824192>, fetched successfully: product, firmware and image metadata. |
| S | `inspection/TrackballKeymap-Nape Pro-2026-11-02.json`, user-supplied current example. |
| G | Local main **module 66868**, global `setting` component: language, device information, logs; keyboard-only debounce gate. |

All six Nape-specific route families were inspected: `trackball/key`, `trackball/dpi`, `trackball/assist`, `trackball/advance`, `trackball/macro`, `trackball/firmware`. The shared Nape layout and global settings page were also inspected. The Nape menu additionally links the shared receiver-firmware route `firmware/frequency`; that is maintenance, not a Nape settings bank. [R, F]

**Confidence rule:** a device read/write method establishes an intended device-side setting, not successful support on the user's firmware or nonvolatile persistence after disconnect/power cycle. A UI initializer is not a verified factory default. A packet without a layer/profile argument establishes the scope of the exposed API; firmware may internally associate it with the active mode. Public metadata may change independently of the saved Launcher version.

## Observed device and sample shape

- Product ID is the **string** `875824192`; metadata identifies VID `0x3434`, PID `0x0440`, name `Nape Pro`, type `trackball`, bootloader `telink`. [J, V, S]
- Sample top-level fields: `id`, `version`, `keymap`, `knob`, `tapHold`, `simult`, `simultNames`, `MD5`; `version` is `2`. [S]
- `keymap` has **nine raw layers**, each containing **seven `{col, val}` records**, with columns `0..6`: 63 assignments total. `val` is a numeric keycode. [S]
- `knob` has **nine `{cw, ccw}` records**: 18 directional assignments, one pair per raw layer. This does not mean nine physical encoders. [S, P]
- `tapHold` has nine layer arrays and **five `{col, tap, held}` records**: two in raw layer 1 and three in raw layer 4. Empty layer arrays are meaningful and must survive conversion. [S]
- `simult` is `[]`, and `simultNames` is `{}`. The user's example cannot establish populated-combination behavior; that schema comes from K/P. [S]
- The sample's `MD5` was recomputed from the source-defined version-2 payload and **matches**. The user's assignments are intentionally not reproduced in this document.
- Visible layers **0..7 map to raw 1..8**. The selector uses `t+1` as the layer value and `t` as the default label. Export enumerates `0..currentLayerCount-1`; the sample includes raw layer 0 as well. Preserve raw 0 even though it is absent from the visible layer selector. Its firmware role is not established here. [L, K, S]
- Diagram metadata maps `col 0→03`, `1→04`, `2→01`, `3→02`, `4→m1`, `5→m2`. The encoder has separate `knob-ccw`/`knob-cw` labels. **Column 6 is present in device keymap reads and the sample but absent from the six-button diagram; do not discard it or invent a physical label such as “encoder press.”** [J, P, S]

## Complete setting inventory

In the tables, **device** means a device-facing setting with observed transport; persistence is unverified. **Export** means inclusion in the **keymap version-2 export**, not in some other file format. “Global API” means no explicit layer/profile selector in its packet.

### 1. Key assignments and associated data

| Individual configurable item | Scope/storage | Values, constraints, dependencies | Export |
|---|---|---|---|
| Each button/raw matrix assignment | Device; raw layer + column, row fixed at 0 | Seven 16-bit values per layer in P; six buttons drawn by J. Preserve raw column 6. Standard, special, custom, shortcut, layer and macro-reference keycodes described below. | Yes: `keymap[layer][]` |
| Encoder clockwise action | Device; raw layer, encoder index 0 | Independent 16-bit keycode. The UI rejects tap/hold and its dedicated layer/orientation assignment controls for encoder selections. Other keycode assignments use the normal setter. | Yes: `knob[layer].cw` |
| Encoder counterclockwise action | Same as clockwise | Independent of clockwise; preserve by named direction, not visual position. | Yes: `knob[layer].ccw` |
| Single-button tap action | Device; raw layer + column | Main assignment is the `CUSTOM(41)` tap/hold marker; side table supplies the tap action. Empty action is `KC_NO`/0. UI rejects `MO(...)` as tap action. | Yes: `tapHold[layer][].tap` |
| Single-button held action | Device; same side-table record | Basic, special, mouse, modifier shortcut, layer/mode palette. UI rejects combinations where **both tap and held start with `KC_MS`**; encoder tap/hold is rejected. No per-button tap/hold timeout control found. | Yes: `.held` |
| Combination member buttons | Device; indexed table, `cols` bitmask | UI chooses **2–4 of six drawn buttons**, excludes encoder, rejects exact columns `[0,1,2,3]` for anti-ghosting, and limits its list to **30**. | Yes: `simult[].cols` |
| Combination slot/index | Device; indexed table | Reader scans slots `0..29`; deletion uses index, and import clears with index 255. Preserve slot IDs, not just array position. | Yes: `.index` |
| Combination layer field | Device record has explicit `layer` | **Ambiguous UI behavior:** UI constructs a row with current layer but omits `layer` when invoking `setSimultCommand`; wrapper defaults omitted layer to 0. Raw import/export preserves it. Do not promise per-layer combination creation matches the selected UI layer. | Yes: `.layer` |
| Combination tap action | Device; combination record | Same no-`MO` tap restriction, and same both-actions-`KC_MS` restriction as single tap/hold. | Yes: `.tap` |
| Combination held action | Device; combination record | Independent held output, including layer behavior in the palette. | Yes: `.held` |
| Combination timeout | Device record; 16-bit `timeout` | Raw setter accepts it; default argument **200**. No editable timeout field found in the combo UI and no verified unit/range beyond the encoded field. Normal symbolic combo setter drops it; `setRaw` preserves it. | Yes: `.timeout` |
| Combination display name | Browser; `trackballSimuNames[device.id]` | Key is sorted member-button IDs concatenated together; names are not firmware keycodes or slot IDs. Export picks names corresponding to exported combinations; import merges them. | Yes: `simultNames` |

Sources: [K, C, P, J]. Constraints above are observed UI constraints, not hardware guarantees.

### 2. Assignment vocabulary

These are **actions assignable to a key**, not additional independent device settings. Their numeric assignments are included in `keymap`, `knob`, tap/hold or combinations as applicable. An assignment to change DPI does not export the DPI values themselves; a macro trigger does not export its macro body. Palette presence does not prove a generic keyboard action is meaningful on Nape. [K, C, P]

**Standard/basic palette (main module 33550):**

- Nothing `KC_NO`; transparent/pass-through `KC_TRNS`.
- `KC_A..KC_Z`, `KC_0..KC_9`; minus, equals, grave, brackets, backslash, semicolon, quote, comma, dot, slash.
- Escape, Tab, Backspace, Enter, Space, Insert, Delete, Home, End, Page Up/Down, arrows, Print Screen, Scroll Lock, Pause, Caps Lock, Num Lock.
- Keypad 0–9, divide, multiply, minus, plus, decimal, Enter.
- Left/right Control, Shift, Alt/Option and GUI/Command; shortcut composition uses `C`, `S`, `A`, `G` wrappers. The general shortcut UI offers all four; the gesture/trackball shortcut UI limits modifier selection to two. [C, K]
- F1–F12; volume down/up/mute, Mission Control (the abbreviated `KC_MIC`), Launchpad, play/pause, stop, previous/next, rewind/fast-forward, media select, eject. The verified ZMK counterpart for Launcher's eject assignment is `C_STOP_EJECT`, not `C_EJECT`.

**Mouse/trackball actions:** left/right/middle/back/forward; wheel up/down/left/right; double left click `CUSTOM(46)`; left-click lock `KC_MS_BTN1_LOCK`; gesture-mode trigger `MO(9)`; scroll-mode trigger `MO(10)`; orientation cycle; eight fixed orientations; previous/next/cycle DPI; custom DPI; previous/next/cycle polling rate. The generic special palette also contains mouse movement directions, buttons 6–8 and mouse-key acceleration 0/1/2. These latter entries are assignment codes, not sensor-acceleration configuration. [K, P]

**Layer actions:** `MO`, `TG`, `TO`, each for raw layers 1–8, displayed as 0–7. Read/display code also recognizes `TT`, `OSL`, `DF` in some layer-valued outputs; do not rewrite an existing raw value just because the current palette omits it. Gesture/scroll `MO(9)`/`MO(10)` are special mode actions, outside the eight ordinary visible layers. [K, C, P]

**Macro triggers:** static palette `MACRO(0)..MACRO(15)`. Actual macro count and byte capacity are read from firmware; 16 palette entries are not a verified device-capacity limit. [P, M]

**Special palette (main module 33550), in addition to the categories above:**

- Shifted punctuation wrappers `S(KC_...)` for US symbol keys.
- `KC_NUHS`, `KC_NUBS`, `KC_RO`, `KC_JYEN`, `KC_HENK`, `KC_MHEN`, `KC_HANJ`, `KC_HAEN`.
- `KC_GESC`, `SC_LSPO`, `SC_RSPC`, `SC_LCPO`, `SC_RCPC`, `SC_LAPO`, `SC_RAPC`, `SC_SFTENT`.
- `RESET`, `DEBUG`, `MAGIC_TOGGLE_NKRO`, `QK_MAGIC_TOGGLE_GUI`.
- `KC_LNUM`, `KC_LCAP`, `KC_LSCR`, `KC_PWR`, `KC_POWER`, `KC_SLEP`, `KC_WAKE`.
- `KC_CALC`, `KC_MAIL`, `KC_HELP`, `KC_STOP`, `KC_ERAS`, `KC_AGAIN`, `KC_MENU`, `KC_UNDO`, `KC_SELECT`, `KC_EXECUTE`, `KC_CUT`, `KC_COPY`, `KC_PASTE`, `KC_FIND`, `KC_MYCM`.
- `KC_WWW_HOME`, `KC_WWW_BACK`, `KC_WWW_FORWARD`, `KC_WWW_STOP`, `KC_WWW_REFRESH`, `KC_WWW_FAVORITES`, `KC_WWW_SEARCH`.
- `KC_BRIU`, `KC_BRID`, F13–F24.
- `AU_ON`, `AU_OFF`, `AU_TOG`; `CLICKY_TOGGLE`, `CLICKY_ENABLE`, `CLICKY_DISABLE`, `CLICKY_UP`, `CLICKY_DOWN`, `CLICKY_RESET`; `MU_ON`, `MU_OFF`, `MU_TOG`, `MU_MOD`.
- macOS lock `LCTL(LGUI(KC_Q))`, Windows lock `LGUI(KC_L)`.

The audio/music/clicky/debug/keyboard-magic entries are shared-palette evidence only. They must not be advertised as working Nape hardware features without testing. A lossless converter should still preserve them if encountered.

**Custom indices:** these index positions matter more than display labels. [J, P/module 33550]

| `CUSTOM(n)` | Metadata meaning / short name |
|---|---|
| 0, 1, 2 | Bluetooth host 1, 2, 3 (`BTH1`, `BTH2`, `BTH3`) |
| 3 | Bootloader (`Boot`) |
| 4 | 2.4 GHz pairing (`2.4G`) |
| 5 | macOS screen lock (`SCRLOCK`) |
| 6 | Front application's preferences (`Cmd-Comma`) |
| 7, 8 | Left/right Option (both displayed `Opt`) |
| 9, 10 | Left/right Command (both displayed `Cmd`) |
| 11, 12 | macOS desktop left/right (`DESKTOP_L-m`, `DESKTOP_R-m`) |
| 13 | macOS emoji (`Emoji-m`) |
| 14 | Windows Task View (`Task`) |
| 15, 16 | Windows desktop left/right (`DESKTOP_L-w`, `DESKTOP_R-w`) |
| 17 | Windows File Explorer (`File`) |
| 18 | Windows lock (`WinLock`) |
| 19 | Windows Settings (`Set`) |
| 20 | Windows emoji (`Emoji-w`) |
| 21, 22 | Windows/macOS screenshot (`PrtSc-w`, `PrtSc-m`) |
| 23 | Show battery (`Batt`) |
| 24, 25 | Siri, Cortana |
| 26, 27 | Orientation increase/decrease (`ORI+`, `ORI-`) |
| 28–35 | 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315° (`ORI0`…`ORI315`) |
| 36 | Bluetooth select/clear (`SEL/CLR`), exact firmware behavior unknown |
| 37, 38 | DPI increase/decrease (`DPI+`, `DPI-`) |
| 39, 40 | Metadata says report-rate increase/decrease (`RPT+`, `RPT-`); P's display map labels these previous/next respectively, an inconsistency |
| 41 | Tap/hold keypress marker (`TH-KP`), used by active tap/hold editor/export |
| 42 | Tap/hold mouse keypress (`TH-MKP`), metadata present; no equivalent side-table editor/export discovery path found |
| 43 | Orientation cycle (`ORI-LP`) |
| 44 | DPI cycle (`DPI-LP`) |
| 45 | Polling-rate cycle (`RPT-LP`) |
| 46 | Double left click (`DB-LCLK`) |
| 47 | Custom DPI (`CUSTOM-DPI`) in saved main palette and K/P; **absent from fetched J**, which ends at 46 |

Duplicate short names (`Opt`, `Cmd`), conflicting report-rate labels, different protocol keycode tables, and missing custom index 47 in current device metadata are concrete reasons to use **unambiguous canonical symbols plus a raw numeric escape**, and to pin decoding to the inspected Nape/protocol mapping. Never regenerate numeric codes from human labels alone.

### 3. Orientation and layer selection

| Individual configurable item | Scope/storage | Supported evidence | Export |
|---|---|---|---|
| Orientation associated with an ordinary layer | Device; explicit raw-layer argument | Eight choices **0..315° in 45° steps**. `getLayerAngle(layer)` and `setLayerAngle(angle, layer)`; normal UI calls `switchAngle` with current editing layer. | No |
| Current/global orientation | Device; global API | Separate get/set orientation commands; wrapper selects this path when layer is falsy/0. Same 45° encoding. Relationship to raw layer 0 and startup persistence unknown. | No |
| Active device layer | Device runtime action | `switchLayer(layer)` writes a device command; eight visible choices map to raw 1–8. It is not a proven persistent startup preference. | No |
| Editor-selected layer / follow-active behavior | Browser/editor | With `KEEP_LAYER=1`, layer selection calls `switchLayer(layer,false)` and only changes the editing target; otherwise it writes a device layer switch and follows reported changes. | No |

Sources: [L, P, A]. No separate editable hardware profile bank is established; see unresolved findings.

### 4. DPI and polling

| Individual configurable item | Scope/storage | Range/default evidence | Export |
|---|---|---|---|
| Enabled DPI gear/slot count | Device; global API | UI **1–5**, `getDpiGearValue`/`setDpiGearValue`; if reducing count below active slot, UI selects last remaining slot. | No |
| DPI value for slot 0 | Device; slot index | UI **400–4000 DPI**, slider/arrows step **50**. Initial UI value 800, overwritten by read. | No |
| DPI value for slot 1 | Same | Same UI range/step; initial UI value 1200. | No |
| DPI value for slot 2 | Same | Same UI range/step; initial UI value 1600. | No |
| DPI value for slot 3 | Same | Same UI range/step; initial UI value 2400. | No |
| DPI value for slot 4 | Same | Same UI range/step; initial UI value 3200. | No |
| Current DPI slot | Device runtime/device-facing selection | Zero-based index; UI constrained by enabled count; setter has no explicit layer. Preserve all five stored slot values even when fewer are enabled. | No |
| Custom DPI value | Device; separate global API value | UI **400–4000**, digit input up to four characters, initial value 800 then device read; distinct from the five slots. Action `CUSTOM(47)` uses the custom-DPI feature, but precise hold/toggle/release semantics are not established. | No |
| USB/direct polling rate | Device; transport-specific rate field | Supported values come from device capability mask over **125, 250, 500, 1000, 2000, 4000, 8000 Hz**. This is a protocol candidate set, **not a claim that Nape supports 8 kHz**. | No |
| Receiver polling rate | Device/receiver-related second field | Separate `supportLevelForFr`/`levelForFr`; page writes the **same chosen rate to both fields** via `setPollRate(n,n)`. Independent UI editing was not found. | No |

Sources: [D, P]. UI initial DPI values and 1000-Hz initializer/fallbacks are not verified factory defaults. Slider step 50 does not prove the numeric-entry path or firmware rejects other integer DPI values.

DPI changes are previewed by immediate device setters. The page's confirm/revert timer is **15 seconds**, auto-confirming on expiry; it is editor workflow, not a stored device timeout. The displayed “reset” method in D re-runs `Init()`/reads—it does not issue a factory-DPI reset command. DPI colors are hard-coded UI decoration. A dormant polling-gears path (`pollingGearsSupport=false`) is not evidence of separately configurable polling presets. [D]

### 5. Gestures, scroll mode and advanced settings

| Individual configurable item | Scope/storage | Values/dependencies | Export |
|---|---|---|---|
| Upward gesture action | Device; global API, `up_fun` | One encoded action; UI supports up to **two modifiers + one ordinary key**, or empty. | No |
| Downward gesture action | Device; `down_fun` | Same; separate from upward. | No |
| Leftward gesture action | Device; `left_fun` | Same; separate from other directions. | No |
| Rightward gesture action | Device; `right_fun` | Same. All four actions are written together. | No |
| Forced/always-on gesture mode | Device; global API `gesture` flag | UI boolean; enabling requires at least one configured gesture action and disables forced scroll. Gesture activation by assigned `MO(9)` is a separate key assignment. | No |
| Forced/always-on scroll mode | Device; global API `scroll` flag | UI boolean; enabling disables forced gesture. Assigned `MO(10)` is a separate activation action. No scroll speed/direction/inertia editor found. | No |
| Sleep timeout | Device; global API `sleep` | Seconds encoded in a 16-bit field; UI uses hours/minutes/seconds and enforces **at least 60 seconds when sleep support is detected**. Detection is a successful read with `sleep > 0`. No factory default or reliable “disable sleep” sentinel established. | No |
| Keep selected editing layer | Browser-global `KEEP_LAYER` | Boolean string `"1"`/`"0"`; absent means ordinary syncing. See layer semantics above. | No |

Sources: [K, A, P]. The time picker's `maxHour=13` and modulo increment are UI implementation details, not a validated device maximum. Shared sleep packets also carry `backlight` and `magnetScan`; the Nape page edits **only sleep**. Their presence must not become invented Nape controls.

### 6. Macros

Nape is routed through the macro component's **keyboard-style path** (`deviceType="kb"`, `isTrackball=true`), using Nape macro-buffer reads/writes. The shared mouse-only loop and storage behavior is not evidence of Nape support. [M]

| Individual configurable item | Scope/storage | Values/dependencies | Export |
|---|---|---|---|
| Macro body for each slot | Device; global macro buffer, slot referenced by keycode | Slot count and total capacity queried with `getMacroCount`/`getMacroSize`; all-slot buffer serialization. | No; separate macro file |
| Ordered key-down event | Device macro event | Explicit keycode; keyboard recording or text/event editing. | No |
| Ordered key-up event | Device macro event | Independent release event; ordering matters. | No |
| Mouse-button/movement-style macro entry | Device macro event via keyboard-style codec | Shared palette includes mouse actions. Nape submit normalizes mouse-button entries into key-down/up pairs; faithful raw preservation requires checking codec behavior rather than blindly using displayed events. | No |
| Delay event | Device macro event | UI delay editor **1–9999 ms**; zero can occur in temporary editor state. Nape model protocol is initialized to **12** and delay support is `protocol>=11`. | No |
| Text/character-stream event | Device macro event | Text input explicitly checks ASCII `^[\x00-\x7F]*$`; sequence editing/reordering/deletion and text-code mode are available. | No |
| Recording delay mode | Browser/editor workflow | None, dynamic (elapsed), fixed. Fixed-delay initializer **200 ms**; affects inserted delay events, not an independent Nape device setting. | No |
| Macro name | Browser; `macro_names_<device.id>` | Per-slot display names. | No; included in separate macro file |
| Key/encoder assignment to a macro slot | Device; assignment scope | `MACRO(n)` trigger; body shared across assignments/layers. | Yes, trigger only |

The actual shared macro-page export is `{md5, macro, name}`, filename `macro.json`, with `md5 = MD5(JSON.stringify(macro) + device.id)`. Import checks that checksum and loads editor data; submitting is a separate device write. An older component in the same chunk exports a bare array, so the active route/component matters. [M]

Macro repeat has a shared **1–100** UI but is enabled only through `Support_Macro_Repeat`/`feature.macroRepeat`; those are not supplied by the inspected Nape model. Mouse loop-until-release/second-press/count controls likewise belong to the other branch. Do not list either as a confirmed Nape setting. [M, P]

### 7. Quick Start / Launcher Assistant

| Individual configurable item | Scope/storage | Values/dependencies | Export |
|---|---|---|---|
| Quick Start slot | Browser + companion registration | **Five slots**, F16–F20. The list is device-filtered by `vp_id`; `LAYER_SCOPED_LIST=false` means slots are shared across the displayed layer list, not five new slots per layer. | No |
| Trigger target | Device key/encoder assignment + browser target metadata | Target includes physical ID, column, raw layer, previous code/name. Device is programmed to the slot's `KC_F16..KC_F20`. | **Only the F-key assignment** |
| Action type | Companion | **Application** or **URL** in the Nape UI. No AI-key creation button; cached AI entries are explicitly filtered out. | No |
| Application target | Companion + browser cache | Application name/path/icon selection from Assistant's app list. Registration uses `opt_type`, `opt_data:{name,path,icon,icon_path}`. | No |
| URL target | Companion + browser cache | URL input; page validates nonempty URL and a restricted HTTP(S)-style pattern before registration. | No |
| Display title/name | Browser metadata | Editable title and associated app/URL labels; target/icon/path metadata cached in `keyConf`. | No |

Sources: [Q, L]. `keyConf`, `assist_vpid`, and previous-key restoration are not firmware-only state. Assistant version/connection checks gate the page. Its `launcherassist://` launch link, installed-app listing/add/remove, and companion key-bind registration are companion operations. Deleting/moving a binding may restore `prevCode` or a built-in fallback physical-key code. A JSON-only keymap backup preserves the F-key but cannot make it open the same app/URL on another installation.

### 8. Browser/editor metadata and app preferences

| Individual configurable item | Scope/storage | Evidence/limits | Export |
|---|---|---|---|
| Device nickname | Browser; `DEVICE_NIKENAME[chipId]` | Header trims to **10 characters**; displayed name, not product identity. | No |
| Layer nickname | Browser; `LAYER_NICKNAME[chipId][rawLayer]` | Visible editor trims to **5 characters**; parent also has a 10-character guard. Raw layer identity must remain separate. | No |
| Device diagram/body color | Browser; `PAIRED_DEVICE_COLOR_CACHE[productId]` | Selects product image variant; fetched metadata has white/black images. Not LED/RGB color. | No |
| Combination names | Browser; device-ID keyed | Included because K explicitly adds them. | Yes |
| Macro names | Browser; device-ID keyed | Included only in macro export. | No |
| Assistant binding metadata | Browser and companion | See above. | No |
| Keep layer / follow-active preference | Browser-global | See above. | No |
| Launcher language | Browser-global `lang` | Global settings updates language and local storage. | No |
| Theme, zoom/scale, search/filter, selected tab/key, editor recording state | Browser/UI | Presentation/workflow; not Nape device configuration. Global settings' theme tab is hidden in its initializer; theme services are shared elsewhere. | No |

Sources: [L, K, M, Q, A, G]. Chip-ID keyed nicknames and product-ID keyed names/caches have different portability and multi-device behavior; a future metadata backup should preserve that distinction.

### 9. Status and maintenance, not additional configuration

- **Status:** battery percentage/charging, connection/work mode, current active layer, current DPI, current angle, current/supported polling rates, firmware version, device chip ID, VID/PID/product ID, receiver paired-device status; macro capacity/usage. Getter/watch methods do not imply editable settings. [P, L, M, G]
- **Keymap reset:** device `DYNAMIC_KEYMAP_CLEAR_ALL`; emits `KEYS_RESET`. Single-key reset transport exists but the Nape model initializes `supportSingleKeyReset=false`; do not assume UI availability. [P, K]
- **Macro clear/reset:** individual macro editing and whole-buffer reset/write paths; maintenance operations, not extra snapshot fields. [P, M]
- **Firmware:** latest-version/changelog display, download/select firmware, bootloader connection, flash/progress; Nape menu points to `trackball/firmware/kld`, with `telink` using the same component. Related receiver firmware is separately linked. [R, F]
- Fetched metadata reports `support_update:1`, `support_bluetooth_update:0`, latest firmware **1.3.0**, updated **2026-08-31**, with notes: fix more-than-eight simultaneous keys, increased DPI settings, customizable left-click locking. This is advertised latest metadata, **not the user's installed version**. [V]
- Bluetooth host switching/clearing, 2.4-GHz pairing, battery display and bootloader entry also appear as custom **key actions**, already listed above; they do not establish exportable pairing credentials or a pairing-settings schema. [J, P]
- Global log/update-log/device-information pages are diagnostics. Its debounce “other” tab is gated on a keyboard instance and keyboard debounce feature; it is not a Nape setting. [G]

## Backup fidelity and implementation-relevant findings

### Exact current keymap boundary

```text
version 2 payload:
  id: string/number product identity (preserve original representation)
  keymap[rawLayer][]: { col, val }
  knob[rawLayer]: { cw, ccw }
  tapHold[rawLayer][]: { col, tap, held }
  simult[]: { index, timeout, layer, cols, tap, held }
  simultNames: { [sortedConcatenatedButtonIds]: displayName }
  MD5: lowercase hex

MD5 = MD5(JSON.stringify({ keymap, knob, tapHold, simult }))
```

The property ordering shown in the checksum object is source-defined. `id`, `version`, `simultNames`, orientation, macro bodies, etc. are not in that checksum. Legacy validation for versions below 2 hashes `JSON.stringify(keymap)` only. Import numerically compares the device ID. Missing optional fields and explicitly empty arrays are not interchangeable import instructions. [K]

Short source excerpts, useful anchors in minified files:

```js
// K: all raw layers, including raw 0
Array.from({length:e.currentLayerCount||1},(o,r)=>r)

// K: checksum field order
const {keymap:i,knob:n,tapHold:o,simult:r}=e;
return E.MD5(JSON.stringify({keymap:i,knob:n,tapHold:o,simult:r})).toString()

// P: combo timeout is preserved by raw setter
timeout:ge.timeout??200

// D: polling UI writes both transport fields
this.device.setPollRate(n,n)

// A: browser-only keep-layer preference
localStorage.setItem("KEEP_LAYER",n?"1":"0")

// Q: five companion-trigger slots
Array.from({length:5},(c,_)=>({name:`KC_F${16+_}`,code:`F${16+_}`}))
```

### Completeness hazards visible in the source

1. **An all-layer file is not necessarily a complete hardware read.** K exports tap/hold side records only for keys decoded as `CUSTOM(41)` or its numeric equivalent. A failed tap/hold read times out after 2 seconds and is converted to `null`, then filtered out. Dormant side records and `CUSTOM(42)`-related behavior are not established by this exporter.
2. **Combination enumeration can stop early.** P's `getSimultRaw` accepts only replies with nonzero `cols`, with a 500-ms timeout. K catches errors around the sequential scan of 30 slots and returns accumulated results. An empty/missing early slot can therefore end discovery before later occupied slots. Whether firmware guarantees packed slots is unknown.
3. **Import is sequential, not transactional.** When `simult` is an array (including `[]`), import first clears combinations with index 255, then writes combinations, keymap, knob and tap/hold data. Missing `simult` does not issue that clear. A failed write can leave partial state; successful offline conversion does not establish successful restore.
4. **Import has an indirect gesture side-effect path.** K emits `KEYS_RESET` after import. Its gesture/trackball component subscribes to that event and calls `resetSlideGroups()`, which writes four empty gesture actions and disables forced gesture while preserving the scroll flag. If that component is mounted when import finishes, importing a file that contains no gesture data can still clear gestures. Static inspection establishes this event path, not every runtime tab/lifecycle condition.
5. **Layer/encoder/combination information cannot be reconstructed from six visible buttons.** The sample has nine layers and a seventh raw column. Encoders and tap/hold values live outside the main assignment list; combination names are outside firmware.
6. **Canonical symbols require the correct translation table.** Main contains multiple protocol-era keycode tables, and Nape initializes protocol 12. Custom short names collide. Preserve unknown numeric codes and ambiguous values rather than guessing from generic QMK/VIA names.
7. **Gesture UI is a potentially lossy view.** Raw gesture words are four 16-bit values; the UI decomposes shortcuts into left-sided modifiers and limits new selection to two modifiers. A full-settings backup should preserve raw words, not only normalized display shortcuts.
8. **Macro editing also normalizes.** M transforms mouse-related macro entries for display and submit. A future lossless macro converter needs codec-level validation and a separate preservation contract; keymap-only support must not claim macro-body coverage.

Sources: [K, P, M]. These are concrete fidelity considerations for the requested backup/conversion task, not a request to implement transport now.

## Unresolved or unsupported claims

- **Hardware persistence:** no power-cycle, reconnect, read-after-write, receiver or Bluetooth tests were performed. None of the setters alone proves persistence or hardware support.
- **Profile banks:** enum names `KC_USER_CMD_NAPE_SET_PROFILE=43` and `...GET_PROFILE=44` exist in P's constant dependency, but no implementation/use in the Nape model or Nape route inventory was found. Profile count, layout and persistence are unknown; do not model eight layers as eight profiles.
- **Independent DPI by layer/mode:** A has `indepDPIEnabled=false` and `onTackballModeDPI(t){this.indepDPIEnabled=t.target.checked}`, but its template does not bind the control and no read/write method backs it. It is not an implemented setting in this source. Firmware-internal per-mode DPI behavior remains unknown.
- **Raw layer 0, column 6 and extra firmware layers:** preserve them; physical meanings and firmware-reserved ranges are unresolved.
- **Combination layer/timeout semantics:** preserve exact raw fields. UI omission of layer and timeout, unknown timeout units, and early-stop enumeration prevent stronger claims.
- **Macro limits:** actual count/capacity and support for generic mouse/media/text codes require firmware evidence. No Nape repeat feature established.
- **Custom keys:** current public JSON lacks index 47 despite source support; left/right `Opt`/`Cmd` collide; report-rate previous/next labels conflict with metadata. Firmware key behavior needs validation.
- **Full settings export:** no aggregate Nape export covering all device/browser/companion state was found. Keymap and macro files are separate. Firmware images are not settings snapshots.
- **Other mouse features:** shared Launcher mouse routes provide other products with profile, lighting, angle, HE and scroll controls. Those routes are not in the Nape menu and are not evidence of Nape acceleration, angle snapping, LOD, debounce, RGB, independent X/Y DPI, scroll inertia/reversal/speed or per-application automatic profile switching.

## Approved milestone priorities

### P0 — Offline all-layer keymap generation

**Goal:** maintain the complete intended keymap as text under Git, and generate a Launcher import file without native device transport.

- Accept the authoritative YAML keymap source and generate Launcher v2 JSON. Account for all nine observed raw layers, all seven columns, both encoder directions, tap/hold records, combination fields and names, identity/version, unknown raw data, and meaningful empty collections.
- Use stable device diagram identifiers and visible layer numbering in the human-maintained source. Preserve the extra raw layer separately and retain unknown codes without guessing their meaning. The implemented syntax is defined in `schema/keymap.schema.json`.
- The **build** operation generates valid Launcher JSON with its required checksum, entirely offline, validating the source as part of generation.
- Include readable button, encoder, and tap/hold editing. **Lossless preservation of combinations and every other exported field is a P0 requirement**; convenient combination editing follows in P1.
- Fidelity means generated output faithfully represents the keymap source, including explicitly retained raw data. The initial source will be migrated from the sample and its output should reproduce that sample's keymap data. A reverse-conversion command is not required. This does not certify that Launcher's original hardware read was complete or that browser import restores unrelated device settings.
- Meaningful eventual checks: source-to-expected-JSON fixtures; deterministic generation; unknown-key/raw-column retention; nonempty/sparse combination records and timeouts; absent versus empty optional fields; checksum compatibility; one intentional edit leaves unrelated data intact.

### P1 — Convenient combination editing and macro bundle

- Add convenient combination editing: member identifiers, tap/held outputs, layer/timeout/index, and combination names, preserving uncertain raw semantics.
- Validate established constraints while retaining an explicit raw representation for data outside current UI knowledge. Do not silently normalize an unsupported/unknown configuration.
- Extend source-based configuration to macro definitions and Launcher's separate **macro.json** format, with cross-references from `MACRO(n)` assignments; settle the detailed workflow after codec investigation. This is a coherent addition because keymap triggers alone are incomplete for users who use macros.
- Optionally store descriptive layer/device names in project-side metadata; make clear they will not be restored by the Launcher keymap importer.

### P2 — Native device access and broader settings

- Add per-layer orientation plus global/current orientation; all five DPI values, enabled count, active slot, custom DPI; both polling fields/capabilities; four raw gesture actions; forced mode flags; sleep.
- Add native macOS keymap reads and writes so the tool can capture and apply keymaps directly without Launcher. Also capture and apply settings outside Launcher's keymap and macro exports. Keep runtime status separate from restorable configuration.
- Resolve firmware support, global-versus-layer semantics and restore ordering. Full-device completeness requires additional reads beyond either Launcher JSON file, so a schema alone does not provide a full backup.
- User can move a specific high-value setting (for example orientation/DPI/gesture) ahead of the broader phase after seeing this inventory.

### Later — Browser metadata and optional Assistant integration

- Browser metadata needs explicitly sourced backup sections: device/layer nicknames, editor preferences, and companion registration data are not firmware settings.
- Companion-backed app/URL actions need their own optional integration or metadata backup. Firmware flashing, pairing management, diagnostics and UI cosmetics are lower priority than the user's text/backup workflow.

## Implementation status

**2026-11-03 runtime follow-up:** the generated gateway combination appeared in
Launcher after import, but its display name was blank despite
`simultNames: {"0304": "Gateway"}` in the generated file. The user renamed it
in the UI and supplied `TrackballKeymap-Nape Pro-2026-11-03.json`; inspection
confirmed `simultNames: {"0304": "gateway"}` and unchanged keymap, knob,
tap/hold, combinations, and checksum relative to generation. Combination names
are exportable; their successful UI display after import remains unreliable in
this observed workflow, with the cause unresolved. Name support is retained.
Names are excluded from the keymap checksum, so a matching checksum alone is
not evidence of name fidelity. See the [combination guide](../keymap-guide.md#combinations).

P1's detailed design is confirmed and implemented. Source v2 adds top-level
readable/raw combinations, including the user's `03+04` gateway return, and an
optional separately generated macro bundle. The earlier source-v1 choices below
describe P0 history; current syntax and limitations are documented in
[keymap guide](../keymap-guide.md) and [P1 design](../design/p1.md). The user reports
successful P0 testing; combination raw-layer-0 scope and macro submission still
need hardware verification.

The user confirmed the consolidated first-milestone design. Implemented in Node.js/JavaScript with npm scripts, a checked-in JSON Schema, an offline pinned ZMK catalog, and one-time sample migration to `keymap.yaml`. See the [keymap guide](../keymap-guide.md) for source syntax, supported mappings, static-versus-semantic validation, and development commands.

The initial build reproduces the original sample's complete exported document and checksum. Automated fixtures remain independent of the user's editable source so subsequent intentional keymap changes do not invalidate migration tests. Broader device settings and native transport remain later milestones.

The research findings establish intended protocol operations, not hardware verification. Future native transport work needs capability checks, readback, and persistence verification.

The inventory above is research evidence; the implementation lives in `src/`, `schema/`, and `data/`.
