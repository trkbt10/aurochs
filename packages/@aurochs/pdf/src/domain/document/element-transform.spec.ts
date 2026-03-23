/** @file element-transform tests */
import type { PdfText } from "../text";
import type { PdfPath } from "../path";
import { createDefaultGraphicsState } from "../graphics-state";
import { getElementRotationRad, getElementRotationDeg, rotateElement, moveElement } from "./element-transform";

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
});
