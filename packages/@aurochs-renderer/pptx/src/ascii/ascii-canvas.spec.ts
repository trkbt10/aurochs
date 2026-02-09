/**
 * @file Tests for ASCII canvas re-exports from drawing-ml
 */
import { createCanvas, setCell, drawBox, drawText, renderCanvas, BOX_CHARS } from "@aurochs-renderer/drawing-ml/ascii";

describe("ascii-canvas (pptx re-export)", () => {
  it("re-exports canvas primitives from drawing-ml", () => {
    const canvas = createCanvas(4, 3);
    expect(canvas.width).toBe(4);
    expect(canvas.height).toBe(3);
    setCell({ canvas, col: 0, row: 0, char: "X", z: 1 });
    expect(canvas.cells[0]![0]!.char).toBe("X");
    drawBox({ canvas, col: 0, row: 0, w: 4, h: 3, z: 1 });
    const result = renderCanvas(canvas);
    expect(result).toContain(BOX_CHARS.topLeft);
  });

  it("draws text correctly", () => {
    const canvas = createCanvas(10, 1);
    drawText({ canvas, col: 0, row: 0, text: "Hello", maxLen: 10, z: 1 });
    expect(renderCanvas(canvas)).toBe("Hello");
  });
});
