# Nape Pro Configuration

Language for text-based keymap editing and configuration backups for the Nape Pro trackball.

## Language

**Layer**:
A set of control assignments available together on the device.

**Gateway layer**:
A layer whose bindings select other layers. In this keymap, layer 0 is the gateway layer.

**Combination**:
A group of buttons pressed together to invoke a shared tap or hold action.

**Macro**:
An ordered sequence of input events invoked by a binding.

**Macro slot**:
An indexed location for a macro, shared by its triggers across layers.

**Externally managed macro**:
A macro whose contents are maintained outside the keymap source, while its slot may still be referenced by source bindings.

**Macro bundle**:
The macro definitions and names accompanying a keymap. It complements the keymap's macro triggers without constituting a whole-device backup.

**Binding**:
An action assigned to a control on a particular layer, including a button or an encoder direction.

**Keymap**:
The bindings across all layers, including associated tap/hold actions and simultaneous-button combinations.
_Avoid_: Device configuration when referring only to key assignments.

**Keymap snapshot**:
A complete representation of the keymap across all layers at a particular point in time, suitable for editing or retaining as a backup.
_Avoid_: Patch when referring to a complete snapshot.

**Keymap source**:
The authoritative, human-maintained definition of the intended keymap across all layers and any included macro definitions. Its contents describe what should be applied to the device, rather than asserting what is currently on the device.
_Avoid_: Device snapshot when referring to intended configuration.

**Launcher import file**:
A generated representation of a keymap source that Launcher can load for application to the device. Key assignments and macro definitions use separate import files.
_Avoid_: Keymap source when referring to generated output.

**Keymap backup**:
A retained keymap snapshot for restoring key assignments and their included supporting actions. It does not imply preservation of macro contents or other device settings.
_Avoid_: Device backup when only the keymap is preserved.

**Device backup**:
A backup covering the broader device configuration, including settings and action definitions outside the keymap.
