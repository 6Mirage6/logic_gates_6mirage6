# Logic Gate Builder

A simple in-browser environment for assembling logic circuits.

- **Palette**: choose between `INPUT`, `OUTPUT` and gates `AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`. Click the active tool again to clear the selection.
- **Workspace**: click to place the selected component. A translucent ghost previews placement.
- **Connections**: click an output port then an input port to draw a wire. Wires carrying a signal glow red. While linking, a ghost line follows the cursor.
- **Simulation**: toggle an `INPUT` switch to send a signal. Outputs show a green lamp when they receive a signal through the circuit.
- **Auto-deselect**: after placing a component or completing a wire, the selection clears to prevent accidental extra placements.
- **Drag & drop**: move any placed block by dragging it inside the workspace.
- **Delete**: the bottom 🗑️ button in the palette removes blocks along with attached wires.
- **Variable inputs**: gates (except `NOT`) have `+` and `-` buttons to adjust their number of input ports.
- **Grid**: hold `Shift` to show a grid and snap placement or dragging to it.
- **Wire anchors**: while drawing a wire, click empty space to add a bend and continue routing from there without extra ports.

Use this environment for quick experiments with logic gates directly in the browser.
