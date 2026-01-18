/**
 * @file Tests for text operator handlers
 */

import {
  textHandlers,
  TEXT_HANDLERS,
  createInitialTextState,
  calculateTextDisplacement,
  calculateEffectiveFontSize,
  getGlyphWidth,
} from "./text-handlers";
import type { ParserContext, GraphicsStateOps, ParsedText } from "./types";
import { createDefaultGraphicsState, IDENTITY_MATRIX, type PdfMatrix, type FontMetrics } from "../../domain";

// Mock GraphicsStateOps for testing with tracking
function createMockGfxOps(overrides: Partial<ReturnType<typeof createDefaultGraphicsState>> = {}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const state = { value: { ...createDefaultGraphicsState(), ...overrides } };

  return {
    calls,
    state,
    ops: {
      push: () => {},
      pop: () => {},
      get: () => state.value,
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
      setFillGray: () => {},
      setStrokeGray: () => {},
      setFillRgb: () => {},
      setStrokeRgb: () => {},
      setFillCmyk: () => {},
      setStrokeCmyk: () => {},
      setFillAlpha: (a: number) => { state.value = { ...state.value, fillAlpha: a }; calls.push({ method: "setFillAlpha", args: [a] }); },
      setStrokeAlpha: (a: number) => { state.value = { ...state.value, strokeAlpha: a }; calls.push({ method: "setStrokeAlpha", args: [a] }); },
      setCharSpacing: (s: number) => { state.value = { ...state.value, charSpacing: s }; calls.push({ method: "setCharSpacing", args: [s] }); },
      setWordSpacing: (s: number) => { state.value = { ...state.value, wordSpacing: s }; calls.push({ method: "setWordSpacing", args: [s] }); },
      setHorizontalScaling: (s: number) => { state.value = { ...state.value, horizontalScaling: s }; calls.push({ method: "setHorizontalScaling", args: [s] }); },
      setTextLeading: (l: number) => { state.value = { ...state.value, textLeading: l }; calls.push({ method: "setTextLeading", args: [l] }); },
      setTextRenderingMode: (m: number) => { state.value = { ...state.value, textRenderingMode: m as 0 }; calls.push({ method: "setTextRenderingMode", args: [m] }); },
      setTextRise: (r: number) => { state.value = { ...state.value, textRise: r }; calls.push({ method: "setTextRise", args: [r] }); },
    } as GraphicsStateOps,
  };
}

function createContext(
  operandStack: (number | string | (number | string)[])[] = [],
  options: Partial<ParserContext> = {}
): ParserContext {
  return {
    operandStack,
    currentPath: [],
    elements: [],
    inTextObject: false,
    textState: createInitialTextState(),
    fontMappings: new Map(),
    ...options,
    extGState: options.extGState ?? new Map(),
  };
}

describe("text-handlers", () => {
  describe("createInitialTextState", () => {
    it("creates text state with identity matrices", () => {
      const state = createInitialTextState();
      expect(state.textMatrix).toEqual(IDENTITY_MATRIX);
      expect(state.textLineMatrix).toEqual(IDENTITY_MATRIX);
      expect(state.currentFontSize).toBe(12);
      expect(state.textRuns).toEqual([]);
    });
  });

  describe("getGlyphWidth", () => {
    it("returns width from font metrics", () => {
      const metrics: FontMetrics = {
        widths: new Map([[65, 600]]),
        defaultWidth: 500,
        ascender: 800,
        descender: -200,
      };
      expect(getGlyphWidth(65, metrics)).toBe(600);
    });

    it("returns default width for unknown character", () => {
      const metrics: FontMetrics = {
        widths: new Map(),
        defaultWidth: 500,
        ascender: 800,
        descender: -200,
      };
      expect(getGlyphWidth(65, metrics)).toBe(500);
    });
  });

  describe("calculateTextDisplacement", () => {
    const defaultMetrics: FontMetrics = {
      widths: new Map([
        [65, 600],  // 'A'
        [66, 700],  // 'B'
        [32, 300],  // space
      ]),
      defaultWidth: 500,
      ascender: 800,
      descender: -200,
    };

    it("calculates displacement for single character", () => {
      // 'A' width=600, fontSize=10
      // displacement = 600 * 10 / 1000 = 6
      const displacement = calculateTextDisplacement("A", 10, 0, 0, 100, defaultMetrics, 1);
      expect(displacement).toBeCloseTo(6);
    });

    it("applies character spacing", () => {
      // 'AB': A=600, B=700, fontSize=10, Tc=2
      // displacement = (6 + 2) + (7 + 2) = 17
      const displacement = calculateTextDisplacement("AB", 10, 2, 0, 100, defaultMetrics, 1);
      expect(displacement).toBeCloseTo(17);
    });

    it("applies word spacing only to spaces", () => {
      // 'A B': A=600, space=300, B=700, fontSize=10, Tw=5
      // displacement = 6 + (3 + 5) + 7 = 21
      const displacement = calculateTextDisplacement("A B", 10, 0, 5, 100, defaultMetrics, 1);
      expect(displacement).toBeCloseTo(21);
    });

    it("applies horizontal scaling", () => {
      // 'A' width=600, fontSize=10, Tz=200
      // displacement = 6 * 2 = 12
      const displacement = calculateTextDisplacement("A", 10, 0, 0, 200, defaultMetrics, 1);
      expect(displacement).toBeCloseTo(12);
    });

    it("handles 2-byte CID fonts", () => {
      const cidMetrics: FontMetrics = {
        widths: new Map([[256, 1000]]), // CID 256 = high byte 1, low byte 0
        defaultWidth: 500,
        ascender: 800,
        descender: -200,
      };
      // Two-byte text: high=1, low=0 -> CID=256
      const text = String.fromCharCode(1, 0);
      const displacement = calculateTextDisplacement(text, 10, 0, 0, 100, cidMetrics, 2);
      expect(displacement).toBeCloseTo(10); // 1000 * 10 / 1000 = 10
    });
  });

  describe("calculateEffectiveFontSize", () => {
    it("returns fontSize when matrices are identity", () => {
      const effectiveSize = calculateEffectiveFontSize(12, IDENTITY_MATRIX, IDENTITY_MATRIX);
      expect(effectiveSize).toBe(12);
    });

    it("scales by text matrix Y-scale", () => {
      const textMatrix: PdfMatrix = [1, 0, 0, 2, 0, 0]; // Y-scale = 2
      const effectiveSize = calculateEffectiveFontSize(12, textMatrix, IDENTITY_MATRIX);
      expect(effectiveSize).toBeCloseTo(24);
    });

    it("scales by CTM Y-scale", () => {
      const ctm: PdfMatrix = [1, 0, 0, 3, 0, 0]; // Y-scale = 3
      const effectiveSize = calculateEffectiveFontSize(10, IDENTITY_MATRIX, ctm);
      expect(effectiveSize).toBeCloseTo(30);
    });

    it("combines text matrix and CTM scaling", () => {
      const textMatrix: PdfMatrix = [2, 0, 0, 2, 0, 0];
      const ctm: PdfMatrix = [1.5, 0, 0, 1.5, 0, 0];
      const effectiveSize = calculateEffectiveFontSize(10, textMatrix, ctm);
      expect(effectiveSize).toBeCloseTo(30); // 10 * 2 * 1.5 = 30
    });
  });

  describe("handleBeginText", () => {
    it("initializes text object state", () => {
      const ctx = createContext();
      const update = textHandlers.handleBeginText(ctx, createMockGfxOps().ops);

      expect(update.inTextObject).toBe(true);
      expect(update.textState?.textMatrix).toEqual(IDENTITY_MATRIX);
      expect(update.textState?.textRuns).toEqual([]);
    });
  });

  describe("handleEndText", () => {
    it("emits text element if there are runs", () => {
      const gs = createDefaultGraphicsState();
      const textRun = {
        text: "Hello",
        textMatrix: IDENTITY_MATRIX,
        x: 0,
        y: 0,
        fontSize: 12,
        fontName: "F1",
        baseFont: undefined,
        endX: 50,
        effectiveFontSize: 12,
        textRise: 0,
        charSpacing: 0,
        wordSpacing: 0,
        horizontalScaling: 100,
        graphicsState: gs,
      };
      const ctx = createContext([], {
        inTextObject: true,
        textState: {
          ...createInitialTextState(),
          textRuns: [textRun],
        },
      });

      const update = textHandlers.handleEndText(ctx, createMockGfxOps().ops);

      expect(update.inTextObject).toBe(false);
      expect(update.elements).toHaveLength(1);
      expect((update.elements![0] as ParsedText).type).toBe("text");
      expect((update.elements![0] as ParsedText).runs).toEqual([textRun]);
    });

    it("does not emit element if no runs", () => {
      const ctx = createContext([], { inTextObject: true });
      const update = textHandlers.handleEndText(ctx, createMockGfxOps().ops);

      expect(update.inTextObject).toBe(false);
      expect(update.elements).toBeUndefined();
    });
  });

  describe("handleSetFont", () => {
    it("sets font name and size", () => {
      const ctx = createContext(["/F1", 12]);
      const update = textHandlers.handleSetFont(ctx, createMockGfxOps().ops);

      expect(update.textState?.currentFont).toBe("/F1");
      expect(update.textState?.currentFontSize).toBe(12);
    });
  });

  describe("handleTextMove (Td)", () => {
    it("translates text position", () => {
      const ctx = createContext([100, 50], { inTextObject: true });
      const update = textHandlers.handleTextMove(ctx, createMockGfxOps().ops);

      expect(update.textState?.textMatrix[4]).toBe(100); // e component
      expect(update.textState?.textMatrix[5]).toBe(50);  // f component
    });
  });

  describe("handleTextMoveSetLeading (TD)", () => {
    it("moves text and sets leading to -ty", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, -14], { inTextObject: true });
      textHandlers.handleTextMoveSetLeading(ctx, ops);

      expect(calls).toContainEqual({ method: "setTextLeading", args: [14] });
    });
  });

  describe("handleTextMatrix (Tm)", () => {
    it("sets text matrix", () => {
      const ctx = createContext([2, 0, 0, 2, 100, 200], { inTextObject: true });
      const update = textHandlers.handleTextMatrix(ctx, createMockGfxOps().ops);

      expect(update.textState?.textMatrix).toEqual([2, 0, 0, 2, 100, 200]);
      expect(update.textState?.textLineMatrix).toEqual([2, 0, 0, 2, 100, 200]);
    });
  });

  describe("handleTextNextLine (T*)", () => {
    it("moves by negative text leading", () => {
      const { ops } = createMockGfxOps({ textLeading: 14 });
      const ctx = createContext([], {
        inTextObject: true,
        textState: {
          ...createInitialTextState(),
          textLineMatrix: [1, 0, 0, 1, 100, 700],
        },
      });

      const update = textHandlers.handleTextNextLine(ctx, ops);

      expect(update.textState?.textMatrix[5]).toBe(686); // 700 - 14
    });
  });

  describe("handleShowText (Tj)", () => {
    it("creates text run with position", () => {
      const ctx = createContext(["Hello"], { inTextObject: true });
      const update = textHandlers.handleShowText(ctx, createMockGfxOps().ops);

      expect(update.textState?.textRuns).toHaveLength(1);
      expect(update.textState?.textRuns[0].text).toBe("Hello");
    });

    it("does nothing outside text object", () => {
      const ctx = createContext(["Hello"], { inTextObject: false });
      const update = textHandlers.handleShowText(ctx, createMockGfxOps().ops);

      expect(update.textState).toBeUndefined();
    });
  });

  describe("handleShowTextArray (TJ)", () => {
    it("handles string and number elements", () => {
      const ctx = createContext([["A", 50, "B"]], { inTextObject: true });
      const update = textHandlers.handleShowTextArray(ctx, createMockGfxOps().ops);

      expect(update.textState?.textRuns).toHaveLength(2);
      expect(update.textState?.textRuns[0].text).toBe("A");
      expect(update.textState?.textRuns[1].text).toBe("B");
    });
  });

  describe("TEXT_HANDLERS registry", () => {
    it("contains all expected operators", () => {
      const expectedOps = [
        "BT", "ET", "Tf", "Tc", "Tw", "Tz", "TL", "Tr", "Ts",
        "Td", "TD", "Tm", "T*", "Tj", "TJ", "'", '"',
      ];
      for (const op of expectedOps) {
        expect(TEXT_HANDLERS.has(op)).toBe(true);
      }
    });

    it("all handlers have text category", () => {
      for (const [, entry] of TEXT_HANDLERS) {
        expect(entry.category).toBe("text");
      }
    });
  });
});
