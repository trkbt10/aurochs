/**
 * @file Tests for color operator handlers
 */

import { colorHandlers, COLOR_HANDLERS } from "./color-handlers";
import type { ParserContext, GraphicsStateOps } from "./types";
import { createInitialTextState } from "./text-handlers";
import { createDefaultGraphicsState } from "../../domain";

// Mock GraphicsStateOps for testing with tracking
function createMockGfxOps() {
  const calls: { method: string; args: unknown[] }[] = [];
  const state = createDefaultGraphicsState();

  return {
    calls,
    ops: {
      push: () => {},
      pop: () => {},
      get: () => state,
      concatMatrix: () => {},
      setClipBBox: () => {},
      setBlendMode: () => {},
      setSoftMaskAlpha: () => {},
      setSoftMask: () => {},
      setLineWidth: () => {},
      setLineCap: () => {},
      setLineJoin: () => {},
      setMiterLimit: () => {},
      setDashPattern: () => {},
      setFillGray: (g: number) => calls.push({ method: "setFillGray", args: [g] }),
      setStrokeGray: (g: number) => calls.push({ method: "setStrokeGray", args: [g] }),
      setFillRgb: (r: number, g: number, b: number) => calls.push({ method: "setFillRgb", args: [r, g, b] }),
      setStrokeRgb: (r: number, g: number, b: number) => calls.push({ method: "setStrokeRgb", args: [r, g, b] }),
      setFillCmyk: (c: number, m: number, y: number, k: number) => calls.push({ method: "setFillCmyk", args: [c, m, y, k] }),
      setStrokeCmyk: (c: number, m: number, y: number, k: number) => calls.push({ method: "setStrokeCmyk", args: [c, m, y, k] }),
      setFillAlpha: () => {},
      setStrokeAlpha: () => {},
      setCharSpacing: () => {},
      setWordSpacing: () => {},
      setHorizontalScaling: () => {},
      setTextLeading: () => {},
      setTextRenderingMode: () => {},
      setTextRise: () => {},
    } as GraphicsStateOps,
  };
}

function createContext(operandStack: (number | string | (number | string)[])[] = []): ParserContext {
  return {
    operandStack,
    currentPath: [],
    elements: [],
    inTextObject: false,
    textState: createInitialTextState(),
    fontMappings: new Map(),
    extGState: new Map(),
  };
}

describe("color-handlers", () => {
  describe("handleFillGray", () => {
    it("sets fill gray color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.5]);
      colorHandlers.handleFillGray(ctx, ops);

      expect(calls).toEqual([{ method: "setFillGray", args: [0.5] }]);
    });
  });

  describe("handleStrokeGray", () => {
    it("sets stroke gray color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.8]);
      colorHandlers.handleStrokeGray(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeGray", args: [0.8] }]);
    });
  });

  describe("handleFillRgb", () => {
    it("sets fill RGB color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0]);
      colorHandlers.handleFillRgb(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [1, 0, 0] }]);
    });
  });

  describe("handleStrokeRgb", () => {
    it("sets stroke RGB color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, 0, 1]);
      colorHandlers.handleStrokeRgb(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 0, 1] }]);
    });
  });

  describe("handleFillCmyk", () => {
    it("sets fill CMYK color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0, 0]);
      colorHandlers.handleFillCmyk(ctx, ops);

      expect(calls).toEqual([{ method: "setFillCmyk", args: [1, 0, 0, 0] }]);
    });
  });

  describe("handleStrokeCmyk", () => {
    it("sets stroke CMYK color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, 1, 0, 0]);
      colorHandlers.handleStrokeCmyk(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeCmyk", args: [0, 1, 0, 0] }]);
    });
  });

  describe("handleColorSpace", () => {
    it("consumes color space name from stack", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/DeviceRGB"]);
      const update = colorHandlers.handleColorSpace(ctx, ops);

      expect(update.operandStack).toEqual([]);
      expect(calls).toEqual([]); // No color operation called
    });
  });

  describe("handleFillColorN", () => {
    it("infers gray from 1 component", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.5]);
      colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillGray", args: [0.5] }]);
    });

    it("infers RGB from 3 components", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0.5, 0]);
      colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [1, 0.5, 0] }]);
    });

    it("infers CMYK from 4 components", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.1, 0.2, 0.3, 0.4]);
      colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillCmyk", args: [0.1, 0.2, 0.3, 0.4] }]);
    });

    it("stops at non-numeric values", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/CS", 1, 0, 0]);
      const update = colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [1, 0, 0] }]);
      expect(update.operandStack).toEqual(["/CS"]);
    });
  });

  describe("handleFillColorNWithOptionalName (scn)", () => {
    it("consumes trailing pattern name operand", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.25, "/P1"]);
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("consumes name even when there are no numeric components", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/P1"]);
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("consumes numeric components for uncolored patterns and still falls back to black", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0, "/P1"]);
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });
  });

  describe("handleStrokeColorNWithOptionalName (SCN)", () => {
    it("consumes trailing pattern name operand", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0, "/P1"]);
      const update = colorHandlers.handleStrokeColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("consumes name even when there are no numeric components", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/P1"]);
      const update = colorHandlers.handleStrokeColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });
  });

  describe("handleStrokeColorN", () => {
    it("infers color space from component count", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, 1, 0]);
      colorHandlers.handleStrokeColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 1, 0] }]);
    });
  });

  describe("COLOR_HANDLERS registry", () => {
    it("contains all expected operators", () => {
      expect(COLOR_HANDLERS.has("g")).toBe(true);
      expect(COLOR_HANDLERS.has("G")).toBe(true);
      expect(COLOR_HANDLERS.has("rg")).toBe(true);
      expect(COLOR_HANDLERS.has("RG")).toBe(true);
      expect(COLOR_HANDLERS.has("k")).toBe(true);
      expect(COLOR_HANDLERS.has("K")).toBe(true);
      expect(COLOR_HANDLERS.has("cs")).toBe(true);
      expect(COLOR_HANDLERS.has("CS")).toBe(true);
      expect(COLOR_HANDLERS.has("sc")).toBe(true);
      expect(COLOR_HANDLERS.has("scn")).toBe(true);
      expect(COLOR_HANDLERS.has("SC")).toBe(true);
      expect(COLOR_HANDLERS.has("SCN")).toBe(true);
    });

    it("all handlers have correct category", () => {
      for (const [, entry] of COLOR_HANDLERS) {
        expect(entry.category).toBe("color");
      }
    });
  });
});
