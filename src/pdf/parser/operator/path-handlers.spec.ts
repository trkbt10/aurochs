/**
 * @file Tests for path operator handlers
 */

import { pathHandlers, PATH_CONSTRUCTION_HANDLERS, PATH_PAINTING_HANDLERS } from "./path-handlers";
import type { ParserContext, GraphicsStateOps, ParsedPath } from "./types";
import { createInitialTextState } from "./text-handlers";
import { createDefaultGraphicsState } from "../../domain";

// Mock GraphicsStateOps for testing
function createMockGfxOps(): GraphicsStateOps {
  let state = createDefaultGraphicsState();
  const clipCalls: unknown[] = [];
  return {
    push: () => {},
    pop: () => {},
    get: () => state,
    concatMatrix: () => {},
    setClipBBox: (bbox) => {
      clipCalls.push(bbox);
      state = { ...state, clipBBox: bbox };
    },
    setLineWidth: () => {},
    setLineCap: () => {},
    setLineJoin: () => {},
    setMiterLimit: () => {},
    setDashPattern: () => {},
    setFillGray: () => {},
    setStrokeGray: () => {},
    setFillRgb: () => {},
    setStrokeRgb: () => {},
    setFillCmyk: () => {},
    setStrokeCmyk: () => {},
    setFillAlpha: () => {},
    setStrokeAlpha: () => {},
    setCharSpacing: () => {},
    setWordSpacing: () => {},
    setHorizontalScaling: () => {},
    setTextLeading: () => {},
    setTextRenderingMode: () => {},
    setTextRise: () => {},
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

describe("path-handlers", () => {
  describe("handleMoveTo", () => {
    it("creates moveTo operation", () => {
      const ctx = createContext([100, 200]);
      const update = pathHandlers.handleMoveTo(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([
        { type: "moveTo", point: { x: 100, y: 200 } },
      ]);
      expect(update.operandStack).toEqual([]);
    });
  });

  describe("handleLineTo", () => {
    it("creates lineTo operation", () => {
      const ctx = createContext([300, 400]);
      const update = pathHandlers.handleLineTo(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([
        { type: "lineTo", point: { x: 300, y: 400 } },
      ]);
    });
  });

  describe("handleCurveTo", () => {
    it("creates curveTo operation with two control points", () => {
      const ctx = createContext([10, 20, 30, 40, 50, 60]);
      const update = pathHandlers.handleCurveTo(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([
        {
          type: "curveTo",
          cp1: { x: 10, y: 20 },
          cp2: { x: 30, y: 40 },
          end: { x: 50, y: 60 },
        },
      ]);
    });
  });

  describe("handleCurveToV", () => {
    it("creates curveToV operation", () => {
      const ctx = createContext([30, 40, 50, 60]);
      const update = pathHandlers.handleCurveToV(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([
        {
          type: "curveToV",
          cp2: { x: 30, y: 40 },
          end: { x: 50, y: 60 },
        },
      ]);
    });
  });

  describe("handleCurveToY", () => {
    it("creates curveToY operation", () => {
      const ctx = createContext([10, 20, 50, 60]);
      const update = pathHandlers.handleCurveToY(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([
        {
          type: "curveToY",
          cp1: { x: 10, y: 20 },
          end: { x: 50, y: 60 },
        },
      ]);
    });
  });

  describe("handleClosePath", () => {
    it("creates closePath operation", () => {
      const ctx = createContext();
      const update = pathHandlers.handleClosePath(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([{ type: "closePath" }]);
    });
  });

  describe("handleRectangle", () => {
    it("creates rect operation", () => {
      const ctx = createContext([10, 20, 100, 50]);
      const update = pathHandlers.handleRectangle(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([
        { type: "rect", x: 10, y: 20, width: 100, height: 50 },
      ]);
    });
  });

  describe("handleStroke", () => {
    it("finishes path with stroke paint op", () => {
      const ctx = {
        ...createContext(),
        currentPath: [{ type: "moveTo" as const, point: { x: 0, y: 0 } }],
      };
      const update = pathHandlers.handleStroke(ctx, createMockGfxOps());

      expect(update.currentPath).toEqual([]);
      expect(update.elements).toHaveLength(1);
      expect((update.elements![0] as ParsedPath).paintOp).toBe("stroke");
    });

    it("does nothing for empty path", () => {
      const ctx = createContext();
      const update = pathHandlers.handleStroke(ctx, createMockGfxOps());

      expect(update.elements).toBeUndefined();
    });
  });

  describe("handleFill", () => {
    it("finishes path with fill paint op", () => {
      const ctx = {
        ...createContext(),
        currentPath: [{ type: "moveTo" as const, point: { x: 0, y: 0 } }],
      };
      const update = pathHandlers.handleFill(ctx, createMockGfxOps());

      expect((update.elements![0] as ParsedPath).paintOp).toBe("fill");
    });
  });

  describe("handleFillStroke", () => {
    it("finishes path with fillStroke paint op", () => {
      const ctx = {
        ...createContext(),
        currentPath: [{ type: "moveTo" as const, point: { x: 0, y: 0 } }],
      };
      const update = pathHandlers.handleFillStroke(ctx, createMockGfxOps());

      expect((update.elements![0] as ParsedPath).paintOp).toBe("fillStroke");
    });
  });

  describe("handleClip", () => {
    it("sets clipBBox for `re W` and clears current path without emitting elements", () => {
      const ops = createMockGfxOps();
      const ctx: ParserContext = {
        ...createContext(),
        currentPath: [{ type: "rect" as const, x: 10, y: 20, width: 30, height: 40 }],
      };

      const update = pathHandlers.handleClip(ctx, ops);
      expect(update.currentPath).toEqual([]);
      expect(update.elements).toBeUndefined();

      const clipBBox = ops.get().clipBBox;
      expect(clipBBox).toEqual([10, 20, 40, 60]);
    });
  });

  describe("handler registries", () => {
    it("PATH_CONSTRUCTION_HANDLERS contains expected operators", () => {
      expect(PATH_CONSTRUCTION_HANDLERS.has("m")).toBe(true);
      expect(PATH_CONSTRUCTION_HANDLERS.has("l")).toBe(true);
      expect(PATH_CONSTRUCTION_HANDLERS.has("c")).toBe(true);
      expect(PATH_CONSTRUCTION_HANDLERS.has("v")).toBe(true);
      expect(PATH_CONSTRUCTION_HANDLERS.has("y")).toBe(true);
      expect(PATH_CONSTRUCTION_HANDLERS.has("h")).toBe(true);
      expect(PATH_CONSTRUCTION_HANDLERS.has("re")).toBe(true);
    });

    it("PATH_PAINTING_HANDLERS contains expected operators", () => {
      expect(PATH_PAINTING_HANDLERS.has("S")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("s")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("f")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("F")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("f*")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("B")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("B*")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("b")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("b*")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("n")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("W")).toBe(true);
      expect(PATH_PAINTING_HANDLERS.has("W*")).toBe(true);
    });
  });
});
