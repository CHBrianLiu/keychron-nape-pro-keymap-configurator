# Nape Pro keymap builder

Maintain a Keychron Nape Pro keymap in YAML and Git, then generate a JSON file
that Keychron Launcher can import. The builder runs offline after installation.

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

`validate` runs Ajv CLI against **`schema/keymap.schema.json`**. `build` also
checks the schema, resolves keycode expressions, validates raw record identities,
and calculates Launcher's checksum. An unsuccessful build exits with status 1
and does not replace the existing output. There is no device connection or
network request in either operation.

The migrated initial configuration reproduces the supplied export's keymap data
and MD5 **`4e85f3706edd95ff697a183c1a5acb8a`**. Subsequent source edits are expected
to change that checksum. Generated JSON is ignored by Git; commit the YAML and
the tool's version/lockfile to retain a reproducible configuration.

## YAML format

The document has four required fields:

- `version: 1`: this project's source format version, independent of Launcher v2.
- `device: nape-pro`: selects the bundled Nape mapping and product identity.
- `layers`: exactly **eight ordered layers**, corresponding to Launcher's 0–7.
- `preserved`: additional raw data needed to produce the complete import file.

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
| `{ macro: 0 }` | Trigger Launcher macro 0; does not supply its body |
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

### Preserved data

`preserved` is populated from the original export and lives in the same source
file. It contains:

- `raw_layer_0.keymap`: seven raw values ordered by column 0–6.
- `raw_layer_0.encoder`: numeric `clockwise` and `counterclockwise` values.
- `raw_layer_0.tap_hold`: raw `{col, tap, held}` records.
- `column_6`: eight raw values ordered by **visible** layer 0–7.
- `combinations`: raw `{index, timeout, layer, cols, tap, held}` records.
- `combination_names`: the corresponding Launcher name map.

The raw layer and column 6 have unverified firmware purposes. Their values are
retained exactly, not renamed as ordinary controls. Combination `layer` values
are **raw** values and are not shifted; their exact firmware scope is unverified.
Sparse combination indexes and explicit timeouts are retained. Additional fields
on raw combination/tap-hold records are passed through. Missing preserved fields
are errors; empty lists are explicit, meaningful values.

Source v1 supports the observed nine raw layers and seven columns. Other device
layouts, or tap/hold on the unmapped seventh slot, need a schema extension rather
than silently dropping their extra data.

## Validation and restore scope

JSON Schema handles types, required fields, layer counts, ranges, action shapes,
and simple symbol names. `build` additionally checks modifier-expression meaning,
balanced nesting, duplicate raw slot identities, and required tap/hold records.
Ajv validation alone is not a guarantee that every expression is representable.

This is a **keymap** configuration and backup workflow. Launcher keymap imports
exclude macro bodies, gesture-direction assignments, DPI values, orientation,
polling rates, sleep settings, and browser nicknames. Preserving a feature's
trigger does not preserve its settings.

Source inspection also found a conditional Launcher import event path that can
clear gesture actions when the gesture component is mounted. See the
[configuration research](docs/research/nape-pro-configuration.md#completeness-hazards-visible-in-the-source).
Hardware import and persistence have not been tested by this project.

## Development

```sh
npm test
```

The tests use fixed fixtures, independent of your editable `keymap.yaml`, and
cover migration fidelity, aliases and HID-page distinctions, invalid expressions,
raw-data preservation, schema validation, standalone Ajv execution, and build
file behavior.

- `src/keycodes.js`: verified Launcher mapping and ZMK expression resolution.
- `src/keymap.js`: source validation and complete Launcher document generation.
- `src/build.js`: default input/output file handling for the npm build script.
- `data/zmk-keycodes.json`: pinned upstream vocabulary, source URLs and hashes.
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
[ZMK compatibility](docs/research/zmk-keycode-compatibility.md),
[glossary](GLOSSARY.md).
