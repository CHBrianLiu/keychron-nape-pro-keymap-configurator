# ZMK keycode vocabulary for Nape Pro

Research date: **2026-11-02**. Status: **primary-source findings; source format approved and first milestone implemented**.

## Conclusion

**The user's ZMK premise is supported by Keychron:** the official Nape Pro product page explicitly says **“Powered by ZMK and supported by the Keychron Launcher web app”** and advertises “ZMK Customization.” Use ZMK symbolic key names in the editable source, translating them to **Nape's Launcher protocol-12 assignment values** when building JSON. ZMK's encoded integers cannot be copied directly into Launcher assignments. [K1, L1, Z1–Z3]

This fits the agreed deliverable: authoritative YAML in Git → one offline **build** operation in **Node.js/JavaScript** → importable Launcher v2 JSON. It does not require compiling firmware. The existing [configuration inventory](nape-pro-configuration.md) remains the reference for export structure, checksum, complete setting coverage, and approved milestones.

## Firmware lineage: what is established

- **Manufacturer statement:** Keychron's product-specific customization section explicitly identifies ZMK. The official quick-start guide directs firmware updates and customization through Launcher. This is sufficient to describe Nape Pro as **ZMK-based according to Keychron**. [K1, K2]
- **Public source corroborates coexistence of ZMK and Launcher encoding:** Keychron's `zmk` repository, `rtl8762g` branch at `7f8d16732a3782e237915bff30a1f67de09268b7`, has `app/src/launcher/map_keycode.c`. It explicitly translates 16-bit Launcher assignments into ZMK behavior bindings, including consumer usages, modifiers, `momentary_layer`, `transparent`, and `none`. Thus QMK/VIA-style names or transport commands are **not evidence against ZMK lineage**. [K3]
- **Exact Nape firmware source remains unverified:** no Nape/trackball-named target appeared in the inspected complete file trees of Keychron ZMK `main`, `keychron_bpro`, or `rtl8762g`. The product page did not supply a Nape-specific source revision. The mapping source above is evidence about Keychron's integration architecture, **not an identified source tree for the user's installed Nape firmware**. [K4]
- **No Nape-specific official contradictory firmware claim was found** in the product/guide and source material inspected. Shared site navigation mentions QMK keyboards; Nape metadata's `bootloader: "telink"` identifies its update path, not its firmware framework. Neither contradicts the product statement. Keychron's separate ZGM README describes a future gaming-mouse platform in early setup and does not identify Nape as a target. [K1, K5, L2]

Accordingly, adopt the requested vocabulary without claiming that every upstream ZMK feature is available through Nape's installed firmware or Launcher importer.

## Names, usages, assignment values, and behaviors

### ZMK key names and aliases

ZMK's `keys.h` supplies names such as `A`, `C`, `NUMBER_1`/`N1`, `ESCAPE`/`ESC`, `LEFT_GUI`/`LGUI`/`LEFT_COMMAND`/`LCMD`, and `C_VOLUME_UP`/`C_VOL_UP`. Aliases resolve to the same definition; their spelling does not change the output action. `EXCLAMATION`/`EXCL` already incorporates left Shift. These are key usages, not literal text strings to type independently of host keyboard layout. [Z1, Z4]

Keyboard and consumer variants must retain their identity. For example, `K_VOLUME_UP` and `C_VOLUME_UP` use different HID pages; similar labels do not make them aliases. ZMK documents that OS/application compatibility can differ between these variants. [Z1, Z5]

### ZMK's numeric representation

The pinned upstream headers define: [Z2, Z3]

```text
ZMK_HID_USAGE(page, id) = (page << 16) | id
keyboard/keypad page = 0x07; consumer page = 0x0C
usage ID = bits 0–15; usage page = bits 16–23
modifier mask = bits 24–31
APPLY_MODS(mods, keycode) = (mods << 24) | keycode
```

ZMK modifiers use eight independent bits: left Control/Shift/Alt/GUI = `01/02/04/08`, right Control/Shift/Alt/GUI = `10/20/40/80` (hex). `LC`, `LS`, `LA`, `LG`, `RC`, `RS`, `RA`, `RG` wrap a keycode, and wrappers can nest. A modifier **key** such as `LEFT_GUI` is distinct from a modifier **wrapper** such as `LG(C)`. [Z3, Z6]

### Launcher's assignment representation

The saved Nape model initializes `protocol=12` in main-bundle module **58618**. Module **13814** selects export `xV` from **44040**, whose enum is local variable `I`; this is the table used below. Module **44148** translates symbolic Launcher codes. The Nape model reads/writes two-byte assignment values. [L1]

These numbers are a compact action namespace, not unmodified HID usages. Some ordinary keyboard values equal their usage IDs, but consumer, mouse, layer and custom actions have explicit assignments. Modifier shortcuts use the base key in the low byte, modifier kinds in bits 8–11, and a shared right-side flag in bit 12. [L1]

For example, module 44148 has `QK_LGUI:2048` and ORs wrapper values with the base key. Its decoder extracts the base using `255 & value` and chooses either its left or right modifier table using `QK_RMODS_MIN:4096`. Keychron's public mapper independently shows `QK_MODS_GET_MODS(kc) = ((kc >> 8) & 0x1F)` and `mod_to_zmk(mod) = (mod & 0x10) ? (mod << 4) : mod`. [L1, K3]

## Verified example crosswalk

ZMK expressions below illustrate upstream meaning, **not proposed YAML syntax**. ZMK numbers are calculated from the cited pinned headers; Launcher numbers are verified against protocol 12's table and translation code, not inferred solely from the sample. These establish encoding correspondence, not hardware-tested execution. [Z1–Z3, Z7, L1]

| Intended action | ZMK vocabulary / binding context | ZMK encoded value or parameter | Launcher assignment |
|---|---|---|---|
| Ordinary A key | `A`, normally `&kp A` | `0x00070004` | `KC_A` = **4**, `0x0004` |
| Left Command+C on macOS | `LG(C)`, normally `&kp LG(C)` | `0x08070006` | `LGUI(KC_C)` / `G(KC_C)` = `2048 OR 6` = **2054**, `0x0806` |
| Consumer volume up | `C_VOLUME_UP` / `C_VOL_UP` | page `0x0C`, usage `0xE9` → `0x000C00E9` | `KC_VOLU` = **169**, `0x00A9`; not usage ID 233 |
| Mouse left | `MB1` / `LCLK`, normally `&mkp LCLK` | button bitmask **1** | `KC_MS_BTN1` = **209**, `0x00D1` |
| Mouse right | `MB2` / `RCLK`, normally `&mkp RCLK` | button bitmask **2** | `KC_MS_BTN2` = **210**, `0x00D2` |
| Mouse button 4, usually Back | `MB4`, normally `&mkp MB4` | button bitmask **8** | `KC_MS_BTN4`, palette label “Backward” = **212**, `0x00D4` |
| Consumer browser Back, a distinct action | `C_AC_BACK` | page `0x0C`, usage `0x0224` → `0x000C0224` | `KC_WWW_BACK` = **182**, `0x00B6` |
| Momentary visible layer 0 | ZMK concept `&mo 0`; layer behavior, not a keycode | layer parameter **0**, no universal scalar keycode | Nape raw layer 1: `MO(1)` = `21024 + 1` = **21025**, `0x5221` |
| Transparent/pass to lower active layer | `&trans` behavior | no `keys.h` keycode | `KC_TRNS` = **1** |
| None/block this position | `&none` behavior | no `keys.h` keycode | `KC_NO` = **0** |
| Existing unexplained seventh-column value | No justified ZMK name | unknown device purpose | **21035**, `0x522B`; numerically decodes as `MO(11)`, but its Nape meaning is unverified |

Mouse Back and consumer browser Back must not be collapsed into a single action. ZMK documents mouse button 4 as *typically* Back, while Launcher explicitly labels its button-4 action “Backward.” A host can still assign different behavior to that mouse button. [Z7, L1]

The sample has **21035 in column 6 on every raw layer**, including raw 0. Its numeric `MO(11)` decoding does not authorize exposing another ordinary layer, renumbering it, or inventing a button name. Preserve it exactly. Other unknown values likewise require an explicit raw Launcher-value representation; never treat a raw value as a ZMK integer or silently replace it with zero. [L1, S1]

## Representability boundaries

1. **Consumer usages above 255 are not categorically unsupported.** `C_AC_BACK` has usage `0x224` yet maps to Launcher 182. Translation needs an explicit `(page, usage)` crosswalk. Truncating to eight bits would instead produce `0x24`, a different keyboard assignment. An arbitrary consumer usage without a verified Launcher counterpart is unsupported by the initial mapper; no general arithmetic conversion has been established. Keychron's mapper uses explicit consumer switch tables returning zero for unlisted usages. [Z1, Z2, K3, L1]
2. **Mixed-side modifier wrappers on an ordinary key cannot be faithfully represented by the inspected compact shortcut format.** ZMK permits `LC(RA(B))`, independently left Control + right Alt + B. Launcher has one shared side flag for all wrapper modifiers. Naively ORing Launcher left-Control and right-Alt wrappers makes the Control right-sided too. Keychron's reverse mapper also selects left modifiers when any are present, otherwise right modifiers; it cannot preserve that mixed mask. Support same-side wrapper combinations and reject unsupported mixed-side shortcuts rather than silently changing their meaning. This limitation concerns the wrapper mask around an ordinary key; modifier-key bases are a separate case requiring deliberate validation. [Z3, Z6, K3, L1]
3. **Consumer-plus-modifier combinations need separate evidence.** ZMK can encode modifiers above a consumer usage, but Keychron's inspected `QK_MODS` import path forces the keyboard usage page, and its consumer export path does not carry modifiers. This is not the identified Nape firmware, so it establishes a compatibility concern, not a measured Nape limitation. Initially permit wrappers on verified keyboard usages only. [Z3, K3]
4. **Mouse constants are behavior parameters.** `MB1=1` is not Launcher transparent, despite the equal integer. ZMK's `&mkp` accepts a bitmask; Launcher's inspected palette assigns individual mouse actions. No single-word equivalent for arbitrary multi-button masks was established. Movement/scroll definitions additionally encode velocities; a direction-name resemblance does not establish equivalent speed/acceleration settings. [Z7, L1]
5. **Encoding equivalence does not prove timing equivalence.** Upstream ZMK documents implicit modifier rollover behavior, layer-stack rules and layer locking. No Nape-specific firmware revision was identified to verify those details. Promise the verified target action, not full behavioral identity under overlapping presses. [Z6, Z8, K4]

## Behaviors and Nape-specific actions

- **Layers:** upstream `&mo n` activates a layer while held and deactivates it on release; layers are zero-based. Launcher names its equivalent intended operation `MO` (“Momentary turn layer on”). Preserve the agreed **visible 0–7 → raw 1–8** translation for Nape, including action targets. Upstream `&mo 1` means its second layer; copying that parameter directly into Nape `MO(1)` would target visible layer 0. `&tog` and `&to` are also behaviors, not key names. Their exact overlap/locking semantics must not be inferred from matching labels. [Z8, L1, L3]
- **Tap/hold:** ZMK `&mt`, `&lt`, and custom hold-tap behaviors include bindings, tapping terms and decision flavors. Nape's observed active tap/hold representation is `CUSTOM(41)` (**32297**, `0x7E29`) plus a per-layer `{col, tap, held}` side record. It does not expose the full ZMK hold-tap model. Continue supporting readable Nape tap/held actions in P0; do not reinterpret the user request as importing arbitrary ZMK behavior definitions. [Z9, L1, L4]
- **Macros:** a ZMK macro is a behavior with an ordered binding sequence. Nape's Launcher JSON exports macro **references**, while bodies use a separate macro export. The keycode-vocabulary choice does not add macro bodies to the current keymap export or expand the approved milestone. [Z10, L4]
- **Proprietary actions:** orientation, DPI, polling, double-click, left-click lock, and gesture/scroll mode triggers need Nape-specific identities backed by the device table. In particular, `MO(9)` and `MO(10)` are labeled gesture and scroll modes in the Nape model; they are not ordinary visible layers 8 and 9. These actions do not acquire upstream ZMK names simply because the firmware is ZMK-based. Preserve custom indices and unknown raw assignments, even where a custom action's label resembles a standard shortcut. [L1, L2]

## Vocabulary scope and approved policies

**Implemented vocabulary scope:** a pinned ZMK-name/alias catalog and an explicit Nape/protocol-12 mapping. Accepted aliases resolve to typed meanings (keyboard usage, consumer usage, modifier composition, mouse button), then emit verified Launcher values. Coverage includes supported keyboard keys, standalone modifiers, representable same-side keyboard shortcuts, mapped media/consumer and system keys, and individual mouse buttons. Nape layer/tap-hold/custom actions and transparent/none are explicit action categories. Accepting ZMK names does not require a devicetree parser, C preprocessor, firmware build, or support for every ZMK behavior. The checked-in schema enumerates the implemented names; unsupported upstream names remain errors.

Preserve the approved complete export boundary: nine raw layers, all seven columns, both encoder directions, tap/hold side records, combinations/names, unknown codes, meaningful empty collections, identity/version and source-defined checksum. Use diagram identifiers `03`, `04`, `01`, `02`, `m1`, `m2` for the six visible buttons; preserve raw 0 and unmapped column 6 separately. Build must be offline after installation; mapping updates are explicit development changes, not network lookups during generation. Perform the agreed one-time sample migration only after syntax is settled. [L2–L4, S1]

Approved by the user:

- **Alias policy:** accept verified upstream ZMK aliases for supported keys. Use consistent spelling in the initial migrated source; the particular spellings remain to be chosen.
- **Compatibility/validation policy:** `build` reports an error for symbolic expressions without a verified Launcher representation. Explicit raw Launcher values remain supported for preservation; do not approximate unsupported expressions or silently replace them. Raw preservation guarantees file fidelity, not that an unknown assignment performs a useful action.
- **Schema tooling:** use a checked-in JSON Schema and Ajv CLI for independent pre-build YAML validation. Reuse that schema within `build`, with additional semantic checks for action compatibility.
- **Compact binding notation:** ordinary keyboard/consumer/mouse actions are scalar ZMK names or supported modifier expressions, such as `RCLK`, `MB4`, and `LG(C)`. Tap/hold uses `{tap: <action>, hold: <action>}`; momentary layer switching uses `{mo: <visible-layer-number>}`. Button bindings use stable identifiers under `buttons`; quote numeric identifiers such as `"03"` to retain their spelling.
- **Additional actions:** `{tog: n}` toggles a visible layer, `{to: n}` switches to one, `none` disables a binding, `trans` is transparent, `{macro: n}` references a Launcher macro index, `{nape: gesture_mode}` and `{nape: scroll_mode}` assign the Nape triggers, and `{raw: n}` carries an explicit Launcher value. Other verified Nape-specific actions use the same `nape` form with documented names.
- **Complete layers:** require eight visible layers, each with all six named buttons and `encoder.clockwise` / `encoder.counterclockwise`. Omitted bindings are validation errors; disabled bindings must explicitly use `none`.
- **Self-contained preservation:** store the extra raw layer, unexplained seventh slots, and raw combination records in a dedicated section of the same YAML file, populated during initial migration. Builds do not consult the original export.
- **Header and preservation shape:** source `version: 1` and `device: nape-pro`; `preserved.raw_layer_0` contains a seven-value `keymap` ordered by raw column, numeric `encoder.clockwise` / `encoder.counterclockwise`, and raw `tap_hold` records. `preserved.column_6` contains eight numeric values ordered by visible layer. `preserved.combinations` and `preserved.combination_names` retain the corresponding Launcher records and names. Source version 1 is separate from generated Launcher version 2.

The consolidated design and defaults are approved and implemented. `npm run validate` checks `keymap.yaml` against `schema/keymap.schema.json`; `npm run build` performs schema and semantic checks and writes `dist/launcher.json`. The initial migrated source reproduces the original exported document and MD5 `4e85f3706edd95ff697a183c1a5acb8a`. Hardware behavior remains untested. See [README](../../README.md) for usage and the exact validation boundary.

### Implementation verification notes

- Source inspection during implementation confirmed sample encoder values 2135/2134 mean `LG(KP_PLUS)` / `LG(KP_MINUS)`, not ordinary plus/minus or cursor keys.
- Launcher consumer 176 corresponds to ZMK `C_STOP_EJECT` (usage 0xCC), not `C_EJECT` (0xB8). The latter is rejected without an established mapping.
- Launcher `KC_MIC` (193) is labeled **Mission Control**, not microphone. Consumer usage 0x29F maps to it; the similarly named field must not be interpreted from its abbreviation alone.
- The pinned Keychron mapper corroborates basic keyboard identity 0x04–0xA4 plus modifiers 0xE0–0xE7, including keyboard-volume usages distinct from the consumer-volume codes. Keyboard values outside those ranges are rejected instead of colliding with compact consumer/mouse assignments.

## Sources and reproducibility

Context7 was consulted first (`/zmkfirmware/zmk`); first-party headers and documentation were then read directly. Public source text was inspected without executing downloaded JavaScript or interacting with hardware. Only this research document was created.

### Keychron

- **K1:** <https://www.keychron.com/products/keychron-nape-pro-wireless-trackball-mouse> — “More Customization on The Keychron Launcher” and “ZMK Customization,” fetched 2026-11-02.
- **K2:** <https://www.keychron.com/pages/keychron-nape-pro-quick-start-guide> — firmware update and button customization instructions.
- **K3:** <https://github.com/Keychron/zmk/blob/7f8d16732a3782e237915bff30a1f67de09268b7/app/src/launcher/map_keycode.c> — `KEYCODE2CONSUMER`, `mod_to_zmk`, `mod_to_launcher`, `set_zmk_keymap`, `generate_launcher_keymaps`. Public keyboard integration, not a verified Nape target.
- **K4:** Inspected repository trees: [main](https://api.github.com/repos/Keychron/zmk/git/trees/ead91ca094c6cd778574f73b9ae011ddab611c66?recursive=1), [keychron_bpro](https://api.github.com/repos/Keychron/zmk/git/trees/c284513085c005edf5f9a52b28c8090cc6ed01d2?recursive=1), [rtl8762g](https://api.github.com/repos/Keychron/zmk/git/trees/7f8d16732a3782e237915bff30a1f67de09268b7?recursive=1). Scope of the negative source-target finding is these trees, not all possible public/private branches.
- **K5:** <https://github.com/Keychron/zgm/blob/e77d7383750c3b10bf0d52a354886962e7698ec0/README.md> — “Status” and planned gaming-mouse scope.

### Pinned upstream ZMK

All ZMK source links below use commit **`4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85`**, upstream `main` resolved during this research (commit date 2026-10-09). This is a vocabulary reference, not a claim about Nape's upstream base revision.

- **Z1:** [keys.h](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/app/include/dt-bindings/zmk/keys.h) — names, aliases, keyboard/consumer distinction and implicit Shift.
- **Z2:** [hid_usage_pages.h](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/app/include/dt-bindings/zmk/hid_usage_pages.h) and [hid_usage.h](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/app/include/dt-bindings/zmk/hid_usage.h) — encoding, pages, usage IDs.
- **Z3:** [modifiers.h](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/app/include/dt-bindings/zmk/modifiers.h) — modifier masks and wrapper definitions.
- **Z4:** [Key press behaviors](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/behaviors/key-press.md).
- **Z5:** [List of keycodes](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/list-of-keycodes.mdx) — keyboard versus consumer compatibility.
- **Z6:** [Modifiers](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/modifiers.mdx) — nesting, modifier keys and rollover.
- **Z7:** [pointing.h](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/app/include/dt-bindings/zmk/pointing.h) and [mouse emulation](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/behaviors/mouse-emulation.md).
- **Z8:** [Layer behaviors](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/behaviors/layers.md) and [transparent/none](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/behaviors/misc.md).
- **Z9:** [Hold-tap](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/behaviors/hold-tap.mdx).
- **Z10:** [Macros](https://github.com/zmkfirmware/zmk/blob/4dd95d7840eb3d5a3f59bb29fbf1ab054715ef85/docs/docs/keymaps/behaviors/macros.md).

### Launcher and local evidence

- **L1:** Saved `inspection/Keychron Launcher_files/main.f6e30fd5066dd94a.js`, public URL <https://launcher.keychron.com/main.f6e30fd5066dd94a.js>. Modules **44040**, **13814**, **44148**, **33550**, **58618**. Local bytes SHA-256: **`5fcd8acf6933918a482a29ebc05c9663d5d36ffb01f3f58943754ad625e47002`**. Saved Launcher page identifies version **1.5.3**; module IDs/hash distinguish this mapping from other protocol-era tables in the same bundle.
- **L2:** <https://launcher.keychron.com/static/device/875824192/json/v3.json> — device diagram, custom indices, Telink bootloader metadata.
- **L3:** <https://launcher.keychron.com/431.471bd8e9f2a4df42.js>, modules **61971/72157**, visible/raw layer selector; documented in the existing inventory.
- **L4:** <https://launcher.keychron.com/44.19ea2266d5e97184.js>, module **97044**, keymap export/import and tap/hold; <https://launcher.keychron.com/144.fcdf2a230aca0a0e.js>, module **85144**, separate macro export. See [existing source-backed inventory](nape-pro-configuration.md) for full schemas and source anchors.
- **S1:** `inspection/TrackballKeymap-Nape Pro-2026-11-02.json` — observed all-layer sample, used for preservation requirements and the unexplained column-6 value.
