# Nape Pro keymap builder

Edit your Keychron Nape Pro configuration as text, keep it under Git.

## Vision

Build a standalone tool to configure Nape Pro keymaps directly, without
Keychron Launcher, starting on macOS. Text-based configuration and reliable
backups make changes easy to review, restore, and share across all eight layers.

## Progress

For now, YAML in Git is the source of truth, and generated JSON is imported
through Launcher. Direct device access is planned, not yet implemented.

- **P0 — Keymap generation:** implemented and successfully tested through
  Launcher. Buttons, both encoder directions, tap/hold, and preserved raw data
  are included for all layers.
- **P1 — Combinations and macros:** implemented, including readable combinations
  and an optional separate macro bundle. Combination scope across layers and
  macro submission/execution still need hardware verification. An imported
  combination appeared with a blank name in Launcher; see the
  [name-display pitfall](docs/keymap-guide.md#combinations).
- **P2 — Broader settings and native access:** planned. Orientation, DPI,
  polling, gestures, sleep, and native macOS device reads/writes are not
  implemented. Browser metadata and optional Assistant integration are later work.

This is **not a whole-device backup**. Keymap imports do not contain macro
bodies or the broader settings above. Launcher import is not transactional and
may conditionally clear gesture actions; review the
[restore scope and hazards](docs/keymap-guide.md#validation-and-restore-scope)
before importing.

## Workflow

For example, to add mute to button `"02"` on the media layer (visible layer 5),
edit its entry in `keymap.yaml`:

```diff
-      "02": none
+      "02": C_MUTE
```

Then review, validate, and build:

```sh
git diff -- keymap.yaml
npm run validate
npm run build
```

Import `dist/launcher.json` through the Nape keymap page in
[Keychron Launcher](https://launcher.keychron.com/#/trackball/key), then test the
change on the device. Commit the YAML and tool version/lockfile to keep the
configuration and its history; generated files in `dist/` are ignored by Git.

If `macros` is defined, build also creates `dist/macro.json`. Import it on
Launcher's macro page **and submit it to the device**: import alone only loads
the editor, and submission replaces the entire macro buffer, including unlisted
slots. If `macros` is absent, an old `dist/macro.json` may remain; do not import
it. See the [macro guide](docs/keymap-guide.md#macros) before submitting.

## Documentation

- [Keymap format, actions, combinations, macros, validation, and development](docs/keymap-guide.md)
- [Configuration inventory and roadmap](docs/research/nape-pro-configuration.md)
- [P1 design](docs/design/p1.md) and [ZMK compatibility research](docs/research/zmk-keycode-compatibility.md)
- [Glossary](GLOSSARY.md) and [third-party notices](THIRD_PARTY_NOTICES.md)
