# Nape Pro keymap builder

Maintain a Keychron Nape Pro keymap, combinations, and optional macros in YAML
and Git, then generate import files for Keychron Launcher. The builder runs
offline after installation.

## Use

Requires **Node.js 22 or newer** and npm.

```sh
npm ci
npm run validate
npm run build
```

1. Edit **`keymap.yaml`**, the authoritative configuration.
2. Review the changes with Git and run `npm run validate`.
3. Run `npm run build` to generate **`dist/launcher.json`**.
4. Import that file through the Nape keymap page in
    [Keychron Launcher](https://launcher.keychron.com/#/trackball/key).
5. When `macros` is defined, build also generates **`dist/macro.json`**. Import
   it through Launcher's macro page, then **submit** it to the device. Importing
   alone only loads the editor. Macro submission replaces the whole macro buffer.

`validate` runs Ajv CLI against **`schema/keymap.schema.json`**. `build` also
checks the schema, resolves keycode expressions, validates raw record identities,
and calculates Launcher's checksums. Validation failure exits with status 1
and does not replace either existing output. There is no device connection or
network request in either operation.

Without `macros`, build does not generate or update `dist/macro.json`. It warns
not to import an older file that may still exist there.

The migrated initial configuration reproduces the supplied export's keymap data
and MD5 **`4e85f3706edd95ff697a183c1a5acb8a`**. Subsequent source edits are expected
to change that checksum. Generated JSON is ignored by Git; commit the YAML and
the tool's version/lockfile to retain a reproducible configuration.

## YAML format

The document has five required fields:

- `version: 2`: this project's source format version, independent of Launcher v2.
- `device: nape-pro`: selects the bundled Nape mapping and product identity.
- `layers`: exactly **eight ordered layers**, corresponding to Launcher's 0–7.
- `combinations`: readable or raw combination records; use `[]` for none.
- `preserved`: additional raw data needed to produce the complete import file.

Optional fields are `macros` and `external_macros`. Source v1 is no longer
accepted: change the version and move `preserved.combinations` into top-level
`combinations`, wrapping each existing record as `{raw: <record>}`. Keep
`preserved.combination_names` unchanged.

Every visible layer requires all six button IDs under `buttons` and both
`encoder.clockwise` / `encoder.counterclockwise`. Numeric IDs are strings: write
`"01"`, `"02"`, `"03"`, `"04"`. The other two IDs are `m1` and `m2`.
These are device diagram identifiers, independent of the diagram's orientation.

For example, these are selected bindings from visible layer 0:

```yaml
buttons:
  "03":
    tap: LG(C)
    hold: LG(V)
  m1:
    tap: MB4
    hold: { mo: 1 }
  m2: RCLK
encoder:
  clockwise: LG(KP_PLUS)
  counterclockwise: LG(KP_MINUS)
```

This excerpt omits other required buttons; `keymap.yaml` is the complete example.
The encoder uses **keypad** plus/minus, matching the original export.

### Actions

| Source | Meaning |
|---|---|
| `A`, `ESC`, `ESCAPE`, `C_VOLUME_UP` | Supported ZMK key/consumer names and aliases |
| `LG(C)` | Left GUI/Command + C |
| `LG(LS(N2))` | Left GUI/Command + left Shift + 2 |
| `LCLK`, `RCLK`, `MCLK`, `MB1`–`MB5` | Individual mouse buttons |
| `none` | Disable the binding |
| `trans` | Transparent/pass-through binding |
| `{ mo: 1 }` | Momentarily activate visible layer 1 |
| `{ tog: 1 }` | Toggle visible layer 1 |
| `{ to: 1 }` | Switch to visible layer 1 |
| `{ macro: 0 }` | Trigger slot 0; requires a source definition or external declaration |
| `{ nape: gesture_mode }` | Gesture-mode trigger |
| `{ nape: scroll_mode }` | Scroll-mode trigger |
| `{ nape: orientation_cycle }` | Cycle orientation |
| `{ nape: dpi_cycle }` | Cycle DPI |
| `{ nape: left_click_lock }` | Nape left-click lock |
| `{ raw: 21035 }` | Exact 16-bit **Launcher** assignment, not a ZMK integer |
| `{ tap: MB4, hold: { mo: 1 } }` | Button tap/hold actions |

Tap/hold is supported for buttons, with one action each for `tap` and `hold`.
Nested tap/hold and encoder tap/hold are not supported. The builder generates
the required marker and side-table record together; do not use a bare raw
tap/hold marker in an editable binding.

Modifier wrappers are ZMK's `LC`, `LS`, `LA`, `LG`, `RC`, `RS`, `RA`, `RG`.
They may nest for verified same-side keyboard shortcuts. The builder rejects
mixed left/right wrappers, modifiers on consumer or mouse actions, wrappers on
modifier keys, and expressions without a verified Launcher representation.
Implicit Shift in a name such as `EXCL` also participates in this check.

ZMK symbols are translated by HID usage and action type. For example, `MB4`
(mouse Back) and `C_AC_BACK` (consumer browser Back) are different actions.
Likewise `K_VOLUME_UP` and `C_VOLUME_UP` are different HID usages. The schema's
symbol enum lists supported names; its `nape` enum lists all named Nape actions.
Custom polling indices 39/40 have conflicting source labels and require raw
values rather than a guessed direction name.

### Combinations

```yaml
combinations:
  - index: 0
    buttons: ["03", "04"]
    raw_layer: 0
    timeout: 200
    tap: { to: 0 }
    hold: none
    name: Gateway
```

Each readable record requires an explicit `index` (0–29), `timeout` (0–65535),
2–4 distinct drawn `buttons`, `tap`, `hold`, and exactly one layer field:

- `layer: 0..7` selects a visible layer, translated to raw 1..8.
- `raw_layer: 0..255` retains the exact Launcher field.

`name` is optional. Names use sorted button IDs concatenated together, as
Launcher does, and must not conflict with `preserved.combination_names`.
Indexes are neither allocated nor reordered. Duplicate indexes and duplicate
member sets are errors across **all** records, even on different layers or with
different button order/names.

The initial `03+04` combination is intended to return to visible layer 0 on tap,
with no held action, from every layer. Raw layer 0 matches Launcher's observed
creation path, but **its scope is unverified**: test the combination from all
eight layers after importing. Timeout 200 is the observed default; its units
are not established, so it is not called milliseconds.

Readable records reject the four-button set `03+04+01+02`, momentary-layer/mode
tap actions, and Launcher mouse actions on both tap and hold. To retain data
outside these UI constraints, use an exact raw record:

```yaml
combinations:
  - raw: { index: 4, timeout: 0, layer: 255, cols: 15, tap: 209, held: 210 }
```

Raw records retain extra fields and bypass UI-specific restrictions, but still
require valid field ranges and unique indexes/member masks. No silent defaults
or normalization are applied. `combinations: []` generates `simult: []`, which
**clears** device combinations during Launcher keymap import.

### Macros

Define the whole intended macro bundle in the same source:

```yaml
macros:
  slot_count: 16 # Example only: verify your device's actual count.
  # capacity_bytes: 1024 # Optional example: only supply a verified limit.
  slots:
    - index: 0
      name: Select all and type
      events:
        - tap: LG(A)
        - delay_ms: 200
        - text: "Hello"
```

`slot_count` is required (1–256); the trigger palette's 16 entries do **not**
prove device capacity. Slot indexes must be unique and within that count. Names
are optional. Unlisted slots are padded with empty bodies and empty names, and
**submission erases any device macros currently in those slots**. A trigger
needs an explicit slot definition, even when the intended body is empty.

| Event | Meaning |
|---|---|
| `{ tap: A }` | Explicit key down/up pair, not Launcher's dropped Tap tuple |
| `{ tap: LG(A) }` | Ordered modifier/key presses, then reverse-order releases |
| `{ down: LEFT_GUI }`, `{ up: LEFT_GUI }` | Individual key press/release |
| `{ delay_ms: 200 }` | Integer delay, 1–9999 milliseconds |
| `{ text: "Hello" }` | Nonempty printable ASCII, also allowing tab/newline/carriage return |
| `{ raw: [2, "A", "KC_A"] }` | Exact Launcher event tuple |

Macros use a separate pinned **single-byte** mapping. Basic keys, supported
consumer keys, mouse buttons, and modifiers use verified enum strings, not
16-bit binding assignments. Down/up cannot take shortcut expressions; layer,
Nape custom, recursive macro, `none`, and `trans` actions are not readable macro
events. Some keymap symbols have no macro-byte counterpart and are rejected.
Byte representability does not prove execution on your firmware.

Readable sequences reject unmatched releases, duplicate presses, taps that
conflict with already-held keys, and keys left held at the end. No releases are
silently inserted. Raw events bypass held-key checks for their containing slot,
with an explicit warning; readable events there still need valid mappings.

Raw tuples preserve their exact JSON representation. Supported forms are
`[1|2|3, displayName, canonicalLauncherKey]` (tap/down/up), `[4, delay]`,
`[5, text]`, and `[6, canonicalMouseKey, displayName]` (editor mouse click).
Text/delay tuples may retain a null third field from the editor. The verified
`KC_CLR` alias is also accepted without rewriting it. Raw delays can
exceed the UI range but must be positive safe integers. Raw text may retain other
ASCII controls except reserved NUL/U+0001. Malformed tuples, unknown enum names,
numeric key operands, and unencodable actions are errors.

Warnings identify known Launcher losses: Nape submit **drops raw Tap tuples**,
converts editor mouse clicks into immediate down/up pairs, and device-read
editing can normalize mouse hold/release timing. Empty raw display names can
also prevent current-slot submission, as can empty raw text. Raw JSON fidelity is not exact firmware
backup fidelity.

Build reports encoded size including every slot terminator, and enforces
`capacity_bytes` when provided. Without it, device capacity is explicitly
unverified. Raw Tap size is counted conservatively despite Launcher's dropping
behavior. Generated macro format is `{md5, macro, name}` with parallel slot/name
arrays; `md5 = MD5(JSON.stringify(macro) + "875824192")`. Names are not hashed.

For a keymap-only workflow referencing existing device macros, omit `macros`
and declare their slots:

```yaml
external_macros: [0, 1]
```

This acknowledges that their bodies are outside the source. Nonempty
`external_macros` **cannot** accompany a macro bundle: without those bodies,
whole-buffer submission could erase them. Reference checks also inspect raw
assignments, encoders, tap/hold, hidden slots, and combination outputs.

### Preserved data

`preserved` is populated from the original export and lives in the same source
file. It contains:

- `raw_layer_0.keymap`: seven raw values ordered by column 0–6.
- `raw_layer_0.encoder`: numeric `clockwise` and `counterclockwise` values.
- `raw_layer_0.tap_hold`: raw `{col, tap, held}` records.
- `column_6`: eight raw values ordered by **visible** layer 0–7.
- `combination_names`: the retained Launcher name map, including raw/orphan names.

The raw layer and column 6 have unverified firmware purposes. Their values are
retained exactly, not renamed as ordinary controls. Raw combination `layer`
values are not shifted; their exact firmware scope is unverified.
Sparse combination indexes and explicit timeouts are retained. Additional fields
on raw combination/tap-hold records are passed through. Missing preserved fields
are errors; empty lists are explicit, meaningful values.

Source v2 supports the observed nine raw layers and seven columns. Other device
layouts, or tap/hold on the unmapped seventh slot, need a schema extension rather
than silently dropping their extra data.

## Validation and restore scope

JSON Schema handles types, required fields, layer counts, ranges, action shapes,
and simple symbol names. `build` additionally checks modifier-expression meaning,
balanced nesting, combination uniqueness/restrictions, macro byte mappings and
references, held-key safety, capacity, and required tap/hold records.
Ajv validation alone is not a guarantee that every expression is representable.

This is a **keymap and optional macro bundle**, not a whole-device backup.
Launcher keymap imports exclude macro bodies; those need the separate macro
import/submission workflow. Both files exclude gesture-direction assignments, DPI values, orientation,
polling rates, sleep settings, and browser nicknames. Preserving a feature's
trigger does not preserve its settings.

Source inspection also found a conditional Launcher import event path that can
clear gesture actions when the gesture component is mounted. See the
[configuration research](docs/research/nape-pro-configuration.md#completeness-hazards-visible-in-the-source).
The user has tested P0 keymap generation/import successfully. P1 combination
scope, macro execution, and hardware persistence remain unverified.

## Development

```sh
npm test
```

The tests use fixed fixtures, independent of your editable `keymap.yaml`, and
cover migration fidelity, aliases and HID-page distinctions, invalid expressions,
raw-data preservation, schema validation, standalone Ajv execution, and build
file behavior, combinations, macro tuples/checksums, safety, and cross-references.

- `src/keycodes.js`: verified Launcher mapping and ZMK expression resolution.
- `src/keymap.js`: source validation and complete Launcher document generation.
- `src/combinations.js`: readable/raw combinations and name preservation.
- `src/macros.js`: macro event lowering, safety, checksum, size, and warnings.
- `src/build.js`: default input/output file handling for the npm build script.
- `data/zmk-keycodes.json`: pinned upstream vocabulary, source URLs and hashes.
- `data/launcher-macro-keycodes.json`: statically verified protocol-12 macro enum.
- `schema/keymap.schema.json`: checked-in JSON Schema, usable without this builder.

To regenerate the schema after intentional mapping changes:

```sh
node scripts/generate-schema.js
```

`scripts/vendor-zmk.js` is a **development-only, networked** tool for regenerating
the catalog from the pinned ZMK headers. It parses constant definitions without
executing upstream code. It is never invoked by `validate`, `build`, or tests.
See [third-party notices](THIRD_PARTY_NOTICES.md).

Ajv CLI's `glob` and `fast-json-patch` dependencies are overridden to patched
versions. The standalone validation test exercises filename patterns and change
reporting to check compatibility with those overrides.

Protocol evidence and roadmap:
[configuration inventory](docs/research/nape-pro-configuration.md),
[P1 design](docs/design/p1.md),
[ZMK compatibility](docs/research/zmk-keycode-compatibility.md),
[glossary](GLOSSARY.md).
