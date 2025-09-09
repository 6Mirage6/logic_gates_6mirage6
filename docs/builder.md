# Logic Gate Builder

A simple in-browser environment for assembling logic circuits.

- **Palette**: choose between `INPUT`, `OUTPUT` and gates `AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`.
- **Workspace**: click to place the selected component. A translucent ghost previews placement.
- **Connections**: click an output port then an input port to draw a wire. Wires carrying a signal glow red. While linking, a ghost line follows the cursor.
- **Simulation**: toggle an `INPUT` switch to send a signal. Outputs show a green lamp when they receive a signal through the circuit.
- **Auto-deselect**: after placing a component or completing a wire, the selection clears to prevent accidental extra placements.

Use this environment for quick experiments with logic gates directly in the browser.
