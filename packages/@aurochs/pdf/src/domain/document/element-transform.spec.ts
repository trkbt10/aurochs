/** @file element-transform tests */
import type { PdfText } from "../text";
import type { PdfPath } from "../path";
import { createDefaultGraphicsState } from "../graphics-state";
import { getElementRotationRad, getElementRotationDeg, rotateElement, moveElement, scaleElement } from "./element-transform";

function createTextElement(overrides?: Partial<PdfText>): PdfText {
  return {
    type: "text",
    text: "Hello",
    x: 100,
    y: 200,
    width: 50,
    height: 12,
    fontSize: 12,
    fontName: "Helvetica",
    baseFont: "Helvetica",
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  } as PdfText;
}

function createPathElement(): PdfPath {
  return {
    type: "path",
    operations: [
      { type: "moveTo", point: { x: 10, y: 20 } },
      { type: "lineTo", point: { x: 30, y: 40 } },
    ],
    paintOp: "stroke",
    graphicsState: createDefaultGraphicsState(),
  };
}

describe("element-transform", () => {
  describe("getElementRotationRad", () => {
    it("returns 0 for identity CTM", () => {
      const el = createTextElement();
      expect(getElementRotationRad(el)).toBeCloseTo(0);
    });
  });

  describe("getElementRotationDeg", () => {
    it("returns 0 for identity CTM", () => {
      const el = createTextElement();
      expect(getElementRotationDeg(el)).toBe(0);
    });
  });

  describe("rotateElement", () => {
    it("applies rotation delta", () => {
      const el = createTextElement();
      const rotated = rotateElement(el, Math.PI / 2);
      expect(getElementRotationRad(rotated)).toBeCloseTo(Math.PI / 2);
    });

    it("preserves translation", () => {
      const el = createTextElement();
      const ctmBefore = el.graphicsState.ctm;
      const rotated = rotateElement(el, Math.PI / 4);
      expect(rotated.graphicsState.ctm[4]).toBe(ctmBefore[4]);
      expect(rotated.graphicsState.ctm[5]).toBe(ctmBefore[5]);
    });

    it("is immutable", () => {
      const el = createTextElement();
      const rotated = rotateElement(el, Math.PI);
      expect(rotated).not.toBe(el);
      expect(getElementRotationRad(el)).toBeCloseTo(0);
    });
  });

  describe("moveElement", () => {
    it("moves text element (SVG dy convention: positive = down → PDF negative)", () => {
      const el = createTextElement({ x: 100, y: 200 });
      const moved = moveElement(el, 10, 20);
      expect(moved.type).toBe("text");
      if (moved.type === "text") {
        expect(moved.x).toBe(110);
        expect(moved.y).toBe(180); // 200 - 20 (SVG down → PDF up)
      }
    });

    it("moves path operations", () => {
      const el = createPathElement();
      const moved = moveElement(el, 5, 10);
      if (moved.type === "path") {
        const moveTo = moved.operations[0];
        if (moveTo.type === "moveTo") {
          expect(moveTo.point.x).toBe(15); // 10 + 5
          expect(moveTo.point.y).toBe(10); // 20 - 10
        }
      }
    });

    it("moves image via CTM translation", () => {
      const gs = createDefaultGraphicsState();
      const el = { type: "image" as const, graphicsState: { ...gs, ctm: [100, 0, 0, 50, 200, 300] as const }, data: new Uint8Array(), width: 100, height: 50, bitsPerComponent: 8, colorSpace: "DeviceRGB" as const };
      const moved = moveElement(el, 10, 20);
      expect(moved.graphicsState.ctm[4]).toBe(210); // 200 + 10
      expect(moved.graphicsState.ctm[5]).toBe(280); // 300 - 20
    });

    it("moves table element", () => {
      const gs = createDefaultGraphicsState();
      const el = { type: "table" as const, x: 50, y: 100, columns: [{ width: 80 }], rows: [{ height: 20, cells: [{ text: "A" }] }], graphicsState: gs };
      const moved = moveElement(el, 10, 5);
      if (moved.type === "table") {
        expect(moved.x).toBe(60);
        expect(moved.y).toBe(95); // 100 - 5
      }
    });

    it("is immutable", () => {
      const el = createTextElement({ x: 100, y: 200 });
      const moved = moveElement(el, 10, 20);
      expect(moved).not.toBe(el);
      if (el.type === "text") {
        expect(el.x).toBe(100);
        expect(el.y).toBe(200);
      }
    });
  });

  describe("scaleElement", () => {
    describe("path elements", () => {
      it("scales rect operation coordinates and dimensions", () => {
        const el: PdfPath = {
          type: "path",
          operations: [{ type: "rect", x: 50, y: 100, width: 200, height: 100 }],
          paintOp: "fill",
          graphicsState: createDefaultGraphicsState(),
        };
        const oldBounds = { x: 50, y: 100, width: 200, height: 100 };
        const newBounds = { x: 50, y: 100, width: 400, height: 200 }; // 2x scale, same origin
        const scaled = scaleElement(el, oldBounds, newBounds);
        if (scaled.type === "path" && scaled.operations[0].type === "rect") {
          const r = scaled.operations[0];
          expect(r.x).toBe(50);
          expect(r.y).toBe(100);
          expect(r.width).toBe(400);
          expect(r.height).toBe(200);
        }
      });

      it("scales moveTo and lineTo points", () => {
        const el = createPathElement();
        // Path has moveTo(10,20) lineTo(30,40) → bounds: x=10, y=20, w=20, h=20
        const oldBounds = { x: 10, y: 20, width: 20, height: 20 };
        const newBounds = { x: 10, y: 20, width: 40, height: 40 }; // 2x scale
        const scaled = scaleElement(el, oldBounds, newBounds);
        if (scaled.type === "path") {
          const moveTo = scaled.operations[0];
          const lineTo = scaled.operations[1];
          if (moveTo.type === "moveTo") {
            expect(moveTo.point.x).toBe(10); // origin stays
            expect(moveTo.point.y).toBe(20);
          }
          if (lineTo.type === "lineTo") {
            expect(lineTo.point.x).toBe(50); // (30-10)*2 + 10 = 50
            expect(lineTo.point.y).toBe(60); // (40-20)*2 + 20 = 60
          }
        }
      });

      it("scales with position offset (move + scale)", () => {
        const el = createPathElement();
        const oldBounds = { x: 10, y: 20, width: 20, height: 20 };
        const newBounds = { x: 20, y: 30, width: 20, height: 20 }; // same size, moved by (10, 10)
        const scaled = scaleElement(el, oldBounds, newBounds);
        if (scaled.type === "path") {
          const moveTo = scaled.operations[0];
          const lineTo = scaled.operations[1];
          if (moveTo.type === "moveTo") {
            expect(moveTo.point.x).toBe(20); // 10 + 10 offset
            expect(moveTo.point.y).toBe(30); // 20 + 10 offset
          }
          if (lineTo.type === "lineTo") {
            expect(lineTo.point.x).toBe(40); // 30 + 10 offset
            expect(lineTo.point.y).toBe(50); // 40 + 10 offset
          }
        }
      });

      it("scales curveTo control points and end point", () => {
        const el: PdfPath = {
          type: "path",
          operations: [
            { type: "moveTo", point: { x: 0, y: 0 } },
            { type: "curveTo", cp1: { x: 10, y: 0 }, cp2: { x: 20, y: 10 }, end: { x: 20, y: 20 } },
          ],
          paintOp: "stroke",
          graphicsState: createDefaultGraphicsState(),
        };
        const oldBounds = { x: 0, y: 0, width: 20, height: 20 };
        const newBounds = { x: 0, y: 0, width: 40, height: 60 }; // 2x horizontal, 3x vertical
        const scaled = scaleElement(el, oldBounds, newBounds);
        if (scaled.type === "path") {
          const curve = scaled.operations[1];
          if (curve.type === "curveTo") {
            expect(curve.cp1.x).toBe(20);  // 10 * 2
            expect(curve.cp1.y).toBe(0);   // 0 * 3
            expect(curve.cp2.x).toBe(40);  // 20 * 2
            expect(curve.cp2.y).toBe(30);  // 10 * 3
            expect(curve.end.x).toBe(40);  // 20 * 2
            expect(curve.end.y).toBe(60);  // 20 * 3
          }
        }
      });

      it("scales stroke width proportionally", () => {
        const gs = createDefaultGraphicsState();
        const el: PdfPath = {
          type: "path",
          operations: [{ type: "rect", x: 0, y: 0, width: 100, height: 100 }],
          paintOp: "stroke",
          graphicsState: { ...gs, lineWidth: 2 },
        };
        const oldBounds = { x: 0, y: 0, width: 100, height: 100 };
        const newBounds = { x: 0, y: 0, width: 400, height: 400 }; // 4x scale
        const scaled = scaleElement(el, oldBounds, newBounds);
        // strokeScale = sqrt(4 * 4) = 4
        expect(scaled.graphicsState.lineWidth).toBe(8);
      });

      it("preserves closePath operations", () => {
        const el: PdfPath = {
          type: "path",
          operations: [
            { type: "moveTo", point: { x: 0, y: 0 } },
            { type: "lineTo", point: { x: 10, y: 0 } },
            { type: "closePath" },
          ],
          paintOp: "fill",
          graphicsState: createDefaultGraphicsState(),
        };
        const oldBounds = { x: 0, y: 0, width: 10, height: 0 };
        const newBounds = { x: 0, y: 0, width: 20, height: 0 };
        const scaled = scaleElement(el, oldBounds, newBounds);
        if (scaled.type === "path") {
          expect(scaled.operations[2].type).toBe("closePath");
        }
      });

      it("returns unchanged element when old bounds have zero dimensions", () => {
        const el = createPathElement();
        const zeroBounds = { x: 0, y: 0, width: 0, height: 0 };
        const newBounds = { x: 0, y: 0, width: 100, height: 100 };
        const scaled = scaleElement(el, zeroBounds, newBounds);
        expect(scaled).toBe(el);
      });

      it("is immutable", () => {
        const el = createPathElement();
        const oldBounds = { x: 10, y: 20, width: 20, height: 20 };
        const newBounds = { x: 10, y: 20, width: 40, height: 40 };
        const scaled = scaleElement(el, oldBounds, newBounds);
        expect(scaled).not.toBe(el);
        // Original unchanged
        if (el.type === "path" && el.operations[0].type === "moveTo") {
          expect(el.operations[0].point.x).toBe(10);
        }
      });
    });

    describe("text elements", () => {
      it("updates position and dimensions to match new bounds", () => {
        const el = createTextElement({ x: 100, y: 200, width: 50, height: 12 });
        const oldBounds = { x: 100, y: 200, width: 50, height: 12 };
        const newBounds = { x: 120, y: 180, width: 100, height: 24 };
        const scaled = scaleElement(el, oldBounds, newBounds);
        if (scaled.type === "text") {
          expect(scaled.x).toBe(120);
          expect(scaled.y).toBe(180);
          expect(scaled.width).toBe(100);
          expect(scaled.height).toBe(24);
        }
      });
    });
  });
});
