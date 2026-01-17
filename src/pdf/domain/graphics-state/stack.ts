/**
 * @file PDF graphics state stack
 *
 * Manages the graphics state stack for PDF rendering.
 */

import type { PdfBBox, PdfMatrix } from "../coordinate";
import { multiplyMatrices } from "../coordinate";
import { createDefaultGraphicsState } from "./defaults";
import type { PdfGraphicsState, PdfLineCap, PdfLineJoin, PdfTextRenderingMode } from "./types";

// =============================================================================
// Graphics State Stack
// =============================================================================











export type GraphicsStateStack = Readonly<{
  /** Reset internal state (testing/debugging helper) */
  reset(initial?: PdfGraphicsState): void;
  /** q operator: save graphics state */
  push(): void;
  /** Q operator: restore graphics state */
  pop(): void;
  /** Get current state (copy) */
  get(): PdfGraphicsState;
  /** cm operator: concatenate matrix to CTM */
  concatMatrix(matrix: PdfMatrix): void;
  setClipBBox(bbox: PdfBBox): void;
  setFillGray(gray: number): void;
  setStrokeGray(gray: number): void;
  setFillRgb(r: number, g: number, b: number): void;
  setStrokeRgb(r: number, g: number, b: number): void;
  setFillCmyk(c: number, m: number, y: number, k: number): void;
  setStrokeCmyk(c: number, m: number, y: number, k: number): void;
  setLineWidth(width: number): void;
  setLineCap(cap: PdfLineCap): void;
  setLineJoin(join: PdfLineJoin): void;
  setMiterLimit(limit: number): void;
  setDashPattern(array: readonly number[], phase: number): void;
  setFillAlpha(alpha: number): void;
  setStrokeAlpha(alpha: number): void;
  setCharSpacing(spacing: number): void;
  setWordSpacing(spacing: number): void;
  setHorizontalScaling(scale: number): void;
  setTextLeading(leading: number): void;
  setTextRenderingMode(mode: PdfTextRenderingMode): void;
  setTextRise(rise: number): void;
}>;

/**
 * Create a new graphics state stack.
 *
 * @param initial - Optional initial graphics state (used for Form/XObject scopes)
 */
export function createGraphicsStateStack(initial?: PdfGraphicsState): GraphicsStateStack {
  const stack: PdfGraphicsState[] = [];
  const current = { value: cloneState(initial ?? createDefaultGraphicsState()) };

  const reset = (initial?: PdfGraphicsState): void => {
    stack.length = 0;
    current.value = cloneState(initial ?? createDefaultGraphicsState());
  };

  const push = (): void => {
    stack.push({
      ...current.value,
      clipBBox: current.value.clipBBox ? cloneBBox(current.value.clipBBox) : undefined,
    });
  };

  const pop = (): void => {
    const prev = stack.pop();
    if (prev) {
      current.value = prev;
    }
  };

  const get = (): PdfGraphicsState => ({
    ...current.value,
    clipBBox: current.value.clipBBox ? cloneBBox(current.value.clipBBox) : undefined,
  });

  const concatMatrix = (matrix: PdfMatrix): void => {
    current.value = {
      ...current.value,
      ctm: multiplyMatrices(matrix, current.value.ctm),
    };
  };

  const setClipBBox = (bbox: PdfBBox): void => {
    const [x1, y1, x2, y2] = bbox;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const prev = current.value.clipBBox;
    const next = intersectBBoxOrDefault(prev, minX, minY, maxX, maxY);

    current.value = {
      ...current.value,
      clipBBox: next,
    };
  };

  const setFillGray = (gray: number): void => {
    current.value = {
      ...current.value,
      fillColor: {
        colorSpace: "DeviceGray",
        components: [gray],
      },
    };
  };

  const setStrokeGray = (gray: number): void => {
    current.value = {
      ...current.value,
      strokeColor: {
        colorSpace: "DeviceGray",
        components: [gray],
      },
    };
  };

  const setFillRgb = (r: number, g: number, b: number): void => {
    current.value = {
      ...current.value,
      fillColor: {
        colorSpace: "DeviceRGB",
        components: [r, g, b],
      },
    };
  };

  const setStrokeRgb = (r: number, g: number, b: number): void => {
    current.value = {
      ...current.value,
      strokeColor: {
        colorSpace: "DeviceRGB",
        components: [r, g, b],
      },
    };
  };

  const setFillCmyk = (c: number, m: number, y: number, k: number): void => {
    current.value = {
      ...current.value,
      fillColor: {
        colorSpace: "DeviceCMYK",
        components: [c, m, y, k],
      },
    };
  };

  const setStrokeCmyk = (c: number, m: number, y: number, k: number): void => {
    current.value = {
      ...current.value,
      strokeColor: {
        colorSpace: "DeviceCMYK",
        components: [c, m, y, k],
      },
    };
  };

  const setLineWidth = (width: number): void => {
    current.value = {
      ...current.value,
      lineWidth: width,
    };
  };

  const setLineCap = (cap: PdfLineCap): void => {
    current.value = {
      ...current.value,
      lineCap: cap,
    };
  };

  const setLineJoin = (join: PdfLineJoin): void => {
    current.value = {
      ...current.value,
      lineJoin: join,
    };
  };

  const setMiterLimit = (limit: number): void => {
    current.value = {
      ...current.value,
      miterLimit: limit,
    };
  };

  const setDashPattern = (array: readonly number[], phase: number): void => {
    current.value = {
      ...current.value,
      dashArray: [...array],
      dashPhase: phase,
    };
  };

  const setFillAlpha = (alpha: number): void => {
    current.value = {
      ...current.value,
      fillAlpha: alpha,
    };
  };

  const setStrokeAlpha = (alpha: number): void => {
    current.value = {
      ...current.value,
      strokeAlpha: alpha,
    };
  };

  const setCharSpacing = (spacing: number): void => {
    current.value = {
      ...current.value,
      charSpacing: spacing,
    };
  };

  const setWordSpacing = (spacing: number): void => {
    current.value = {
      ...current.value,
      wordSpacing: spacing,
    };
  };

  const setHorizontalScaling = (scale: number): void => {
    current.value = {
      ...current.value,
      horizontalScaling: scale,
    };
  };

  const setTextLeading = (leading: number): void => {
    current.value = {
      ...current.value,
      textLeading: leading,
    };
  };

  const setTextRenderingMode = (mode: PdfTextRenderingMode): void => {
    current.value = {
      ...current.value,
      textRenderingMode: mode,
    };
  };

  const setTextRise = (rise: number): void => {
    current.value = {
      ...current.value,
      textRise: rise,
    };
  };

  return {
    reset,
    push,
    pop,
    get,
    concatMatrix,
    setClipBBox,
    setFillGray,
    setStrokeGray,
    setFillRgb,
    setStrokeRgb,
    setFillCmyk,
    setStrokeCmyk,
    setLineWidth,
    setLineCap,
    setLineJoin,
    setMiterLimit,
    setDashPattern,
    setFillAlpha,
    setStrokeAlpha,
    setCharSpacing,
    setWordSpacing,
    setHorizontalScaling,
    setTextLeading,
    setTextRenderingMode,
    setTextRise,
  };
}

function cloneState(state: PdfGraphicsState): PdfGraphicsState {
  return {
    ...state,
    clipBBox: state.clipBBox ? cloneBBox(state.clipBBox) : undefined,
    fillColor: {
      ...state.fillColor,
      components: [...state.fillColor.components],
    },
    strokeColor: {
      ...state.strokeColor,
      components: [...state.strokeColor.components],
    },
    dashArray: [...state.dashArray],
  };
}

function cloneBBox(bbox: PdfBBox): PdfBBox {
  const [x1, y1, x2, y2] = bbox;
  return [x1, y1, x2, y2];
}

function intersectBBoxOrDefault(
  prev: PdfBBox | undefined,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): PdfBBox {
  if (!prev) {
    return [minX, minY, maxX, maxY];
  }
  return [
    Math.max(prev[0], minX),
    Math.max(prev[1], minY),
    Math.min(prev[2], maxX),
    Math.min(prev[3], maxY),
  ];
}
