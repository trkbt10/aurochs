/** @file path bounds tests */
import { getPathBounds } from "./bounds";
import { createDefaultGraphicsState } from "../graphics-state";
import type { PdfPath } from "./types";

function makePath(operations: PdfPath["operations"]): PdfPath {
  return { type: "path", operations, paintOp: "fill", graphicsState: createDefaultGraphicsState() };
}

describe("getPathBounds", () => {
  it("returns zero bounds for empty path", () => {
    expect(getPathBounds(makePath([]))).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("computes bounds from rect operations", () => {
    const path = makePath([{ type: "rect", x: 10, y: 20, width: 100, height: 50 }]);
    expect(getPathBounds(path)).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("computes bounds from point operations", () => {
    const path = makePath([
      { type: "moveTo", point: { x: 0, y: 0 } },
      { type: "lineTo", point: { x: 50, y: 30 } },
    ]);
    expect(getPathBounds(path)).toEqual({ x: 0, y: 0, width: 50, height: 30 });
  });

  it("computes bounds from end-point operations", () => {
    const path = makePath([
      { type: "moveTo", point: { x: 10, y: 10 } },
      { type: "curveTo", cp1: { x: 20, y: 20 }, cp2: { x: 30, y: 30 }, end: { x: 40, y: 5 } },
    ]);
    const bounds = getPathBounds(path);
    expect(bounds.x).toBe(10);
    expect(bounds.y).toBe(5);
    expect(bounds.width).toBe(30);
    expect(bounds.height).toBe(5);
  });

  it("handles mixed operation types", () => {
    const path = makePath([
      { type: "rect", x: 100, y: 100, width: 50, height: 50 },
      { type: "moveTo", point: { x: 0, y: 0 } },
    ]);
    expect(getPathBounds(path)).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it("handles closePath operations (no coordinates)", () => {
    const path = makePath([
      { type: "moveTo", point: { x: 10, y: 20 } },
      { type: "closePath" },
    ]);
    expect(getPathBounds(path)).toEqual({ x: 10, y: 20, width: 0, height: 0 });
  });
});
