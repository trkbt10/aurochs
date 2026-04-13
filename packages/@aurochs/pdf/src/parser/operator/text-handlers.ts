/**
 * @file PDF text operator handlers
 *
 * Handles text operators:
 * - BT/ET: Begin/end text object
 * - Tf: Set font and size
 * - Tc/Tw/Tz/TL/Tr/Ts: Text state parameters
 * - Td/TD/Tm/T*: Text positioning
 * - Tj/TJ/'/": Text showing
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate related operations (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Lookup objects instead of switch (Rule 1)
 * - Split complex calculations into testable helpers
 */

import type { PdfBBox, PdfMatrix, PdfGraphicsState, FontMetrics, FontInfo, FontMappings } from "../../domain";
import { IDENTITY_MATRIX, transformPoint, multiplyMatrices, DEFAULT_FONT_METRICS } from "../../domain";
import { decodeTextWithFontInfo } from "../../domain/font/decoding/text-decoder";
import type {
  OperatorHandler,
  OperatorHandlerEntry,
  TextObjectState,
  TextRun,
  ParsedText,
} from "./types";
import { popNumber, popString, popArray } from "./stack-ops";

// =============================================================================
// Text Object State Helpers
// =============================================================================

/**
 * Create initial text object state.
 */
export function createInitialTextState(): TextObjectState {
  return {
    textMatrix: IDENTITY_MATRIX,
    textLineMatrix: IDENTITY_MATRIX,
    currentFont: "",
    currentBaseFont: undefined,
    currentFontInfo: undefined,
    currentFontSize: 12,
    currentFontMetrics: DEFAULT_FONT_METRICS,
    currentCodeByteWidth: 1,
    textRuns: [],
  };
}

/**
 * Get glyph width for a character code from font metrics.
 * Returns width in 1/1000 em units.
 */
export function getGlyphWidth(charCode: number, metrics: FontMetrics): number {
  const width = metrics.widths.get(charCode);
  return width ?? metrics.defaultWidth;
}

function forEachCharCode(
  text: string,
  codeByteWidth: 1 | 2,
  visit: (charCode: number, isSpace: boolean) => void,
): void {
  if (codeByteWidth === 2) {
    for (let i = 0; i + 1 < text.length; i += 2) {
      const highByte = text.charCodeAt(i);
      const lowByte = text.charCodeAt(i + 1);
      const cid = highByte * 256 + lowByte;
      visit(cid, cid === 32 || cid === 1);
    }
    return;
  }

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    visit(charCode, charCode === 32);
  }
}

/**
 * Calculate text displacement per PDF Reference 9.4.4.
 *
 * Formula: tx = ((w0 - Tj/1000) * Tfs + Tc + Tw) * Th
 *
 * @param text - The raw text string
 * @param fontSize - Current font size (Tfs)
 * @param charSpacing - Character spacing (Tc)
 * @param wordSpacing - Word spacing (Tw)
 * @param horizontalScaling - Horizontal scaling percentage (Tz)
 * @param metrics - Font metrics for glyph widths
 * @param codeByteWidth - 1 for single-byte, 2 for CID fonts
 * @param tjAdjustment - Optional TJ adjustment in 1/1000 em (default 0)
 */
export type TextDisplacementParams = {
  readonly text: string;
  readonly fontSize: number;
  readonly charSpacing: number;
  readonly wordSpacing: number;
  readonly horizontalScaling: number;
  readonly metrics: FontMetrics;
  readonly codeByteWidth: 1 | 2;
  readonly tjAdjustment?: number;
};
















/** Calculate horizontal text displacement for writing mode 0 (horizontal text). */
export function calculateTextDisplacement(p: TextDisplacementParams): number {
  const tjAdj = p.tjAdjustment ?? 0;
  const Th = p.horizontalScaling / 100;
  const totalDisplacement = { value: 0 };

  forEachCharCode(p.text, p.codeByteWidth, (charCode, isSpace) => {
    const w0 = getGlyphWidth(charCode, p.metrics);
    const glyphWidth = (w0 - tjAdj) * p.fontSize / 1000;
    const charDisplacement = (glyphWidth + p.charSpacing + (isSpace ? p.wordSpacing : 0)) * Th;
    totalDisplacement.value += charDisplacement;
  });

  return totalDisplacement.value;
}

/**
 * Calculate text displacement for writing mode 1 (vertical text).
 *
 * Uses vertical metrics (`w1`) when available. If no explicit per-glyph
 * vertical displacement is present, falls back to `defaultVerticalDisplacement`.
 */
export type VerticalTextDisplacementParams = {
  readonly text: string;
  readonly fontSize: number;
  readonly charSpacing: number;
  readonly wordSpacing: number;
  readonly codeByteWidth: 1 | 2;
  readonly verticalDisplacements?: ReadonlyMap<number, number>;
  readonly defaultVerticalDisplacement?: number;
  readonly tjAdjustment?: number;
};
















/** Calculate text displacement for writing mode 1 (vertical text). */
export function calculateVerticalTextDisplacement(p: VerticalTextDisplacementParams): number {
  const defaultW1 = p.defaultVerticalDisplacement ?? -1000;
  const tjAdj = p.tjAdjustment ?? 0;
  const totalDisplacement = { value: 0 };

  forEachCharCode(p.text, p.codeByteWidth, (charCode, isSpace) => {
    const w1 = p.verticalDisplacements?.get(charCode) ?? defaultW1;
    const glyphDisplacement = (w1 - tjAdj) * p.fontSize / 1000;
    const charDisplacement = glyphDisplacement + p.charSpacing + (isSpace ? p.wordSpacing : 0);
    totalDisplacement.value += charDisplacement;
  });

  return totalDisplacement.value;
}

function resolveRunDisplacement(args: {
  readonly text: string;
  readonly fontSize: number;
  readonly charSpacing: number;
  readonly wordSpacing: number;
  readonly horizontalScaling: number;
  readonly metrics: FontMetrics;
  readonly codeByteWidth: 1 | 2;
  readonly writingMode: 0 | 1;
  readonly verticalDisplacements?: ReadonlyMap<number, number>;
  readonly defaultVerticalDisplacement?: number;
}): number {
  const {
    text,
    fontSize,
    charSpacing,
    wordSpacing,
    horizontalScaling,
    metrics,
    codeByteWidth,
    writingMode,
    verticalDisplacements,
    defaultVerticalDisplacement,
  } = args;
  if (writingMode === 1) {
    return calculateVerticalTextDisplacement({
      text,
      fontSize,
      charSpacing,
      wordSpacing,
      codeByteWidth,
      verticalDisplacements,
      defaultVerticalDisplacement: defaultVerticalDisplacement ?? -1000,
    });
  }
  return calculateTextDisplacement({
    text,
    fontSize,
    charSpacing,
    wordSpacing,
    horizontalScaling,
    metrics,
    codeByteWidth,
  });
}

function getTextAdvance(args: {
  readonly writingMode: 0 | 1;
  readonly tmA: number;
  readonly tmB: number;
  readonly tmC: number;
  readonly tmD: number;
  readonly displacement: number;
}): Readonly<{ advanceUserX: number; advanceUserY: number }> {
  const { writingMode, tmA, tmB, tmC, tmD, displacement } = args;
  if (writingMode === 1) {
    return { advanceUserX: tmC * displacement, advanceUserY: tmD * displacement };
  }
  return { advanceUserX: tmA * displacement, advanceUserY: tmB * displacement };
}

function applyTextAdjustmentToMatrix(
  matrix: PdfMatrix,
  adjustment: number,
  writingMode: 0 | 1,
): PdfMatrix {
  const [a, b, c, d, e, f] = matrix;
  if (writingMode === 1) {
    return [a, b, c, d, e + c * adjustment, f + d * adjustment];
  }
  return [a, b, c, d, e + a * adjustment, f + b * adjustment];
}

/**
 * Calculate effective font size from text matrix and CTM.
 *
 * PDF Reference 9.4.4: The rendering matrix Trm = Tm × CTM
 * determines the actual size of rendered glyphs.
 */
export function calculateEffectiveFontSize(
  fontSize: number,
  textMatrix: PdfMatrix,
  ctm: PdfMatrix
): number {
  const compositeMatrix = multiplyMatrices(textMatrix, ctm);
  // Y-scale from composite matrix: sqrt(c² + d²) where matrix is [a,b,c,d,e,f]
  const [, , compC, compD] = compositeMatrix;
  const yScale = Math.sqrt(compC * compC + compD * compD);
  return fontSize * yScale;
}

// =============================================================================
// Text Object Handlers (BT/ET)
// =============================================================================

/**
 * BT operator: Begin text object
 */
const handleBeginText: OperatorHandler = (ctx) => {
  return {
    inTextObject: true,
    textState: {
      ...ctx.textState,
      textMatrix: IDENTITY_MATRIX,
      textLineMatrix: IDENTITY_MATRIX,
      textRuns: [],
    },
  };
};

/**
 * ET operator: End text object
 *
 * Emits ParsedText element if there are any text runs.
 */
const handleEndText: OperatorHandler = (ctx, gfxOps) => {
  const textRuns = ctx.textState.textRuns;

  if (textRuns.length === 0) {
    return {
      inTextObject: false,
      textState: { ...ctx.textState, textRuns: [] },
    };
  }

  const textElement: ParsedText = {
    type: "text",
    runs: textRuns,
    graphicsState: gfxOps.get(),
  };

  return {
    inTextObject: false,
    textState: { ...ctx.textState, textRuns: [] },
    elements: [...ctx.elements, textElement],
  };
};

// =============================================================================
// Text State Parameter Handlers
// =============================================================================

/**
 * Tf operator: Set font and size
 */
const handleSetFont: OperatorHandler = (ctx) => {
  const [size, stack1] = popNumber(ctx.operandStack);
  const [name, stack2] = popString(stack1);

  // Load font metrics for glyph width calculations
  const cleanName = name.startsWith("/") ? name.slice(1) : name;
  const fontInfo = getFontInfo(ctx.fontMappings, cleanName);

  return {
    operandStack: stack2,
    textState: {
      ...ctx.textState,
      currentFont: name,
      currentFontSize: size,
      currentFontMetrics: fontInfo?.metrics ?? DEFAULT_FONT_METRICS,
      currentCodeByteWidth: fontInfo?.codeByteWidth ?? 1,
      currentBaseFont: fontInfo?.baseFont,
      currentFontInfo: fontInfo,
    },
  };
};

function getFontInfo(fontMappings: FontMappings, cleanName: string): FontInfo | undefined {
  const direct = fontMappings.get(cleanName);
  if (direct) {return direct;}

  // Try without subset prefix (e.g., "XGIAKD+Arial" → "Arial")
  const plusIndex = cleanName.indexOf("+");
  if (plusIndex > 0) {
    return fontMappings.get(cleanName.slice(plusIndex + 1));
  }

  return undefined;
}

/**
 * Tc operator: Set character spacing
 */
const handleSetCharSpacing: OperatorHandler = (ctx, gfxOps) => {
  const [charSpace, newStack] = popNumber(ctx.operandStack);
  gfxOps.setCharSpacing(charSpace);
  return { operandStack: newStack };
};

/**
 * Tw operator: Set word spacing
 */
const handleSetWordSpacing: OperatorHandler = (ctx, gfxOps) => {
  const [wordSpace, newStack] = popNumber(ctx.operandStack);
  gfxOps.setWordSpacing(wordSpace);
  return { operandStack: newStack };
};

/**
 * Tz operator: Set horizontal scaling (percentage)
 */
const handleSetHorizontalScaling: OperatorHandler = (ctx, gfxOps) => {
  const [scale, newStack] = popNumber(ctx.operandStack);
  gfxOps.setHorizontalScaling(scale);
  return { operandStack: newStack };
};

/**
 * TL operator: Set text leading
 */
const handleSetTextLeading: OperatorHandler = (ctx, gfxOps) => {
  const [leading, newStack] = popNumber(ctx.operandStack);
  gfxOps.setTextLeading(leading);
  return { operandStack: newStack };
};

/**
 * Tr operator: Set text rendering mode
 */
const handleSetTextRenderingMode: OperatorHandler = (ctx, gfxOps) => {
  const [mode, newStack] = popNumber(ctx.operandStack);
  if (mode >= 0 && mode <= 7) {
    gfxOps.setTextRenderingMode(mode as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
  }
  return { operandStack: newStack };
};

/**
 * Ts operator: Set text rise
 */
const handleSetTextRise: OperatorHandler = (ctx, gfxOps) => {
  const [rise, newStack] = popNumber(ctx.operandStack);
  gfxOps.setTextRise(rise);
  return { operandStack: newStack };
};

// =============================================================================
// Text Positioning Handlers
// =============================================================================

/**
 * Td operator: Move text position
 *
 * Translates the text position by (tx, ty) in text space.
 */
const handleTextMove: OperatorHandler = (ctx) => {
  const [ty, stack1] = popNumber(ctx.operandStack);
  const [tx, stack2] = popNumber(stack1);

  const [a, b, c, d, e, f] = ctx.textState.textLineMatrix;
  const newLineMatrix: PdfMatrix = [a, b, c, d, e + a * tx + c * ty, f + b * tx + d * ty];

  return {
    operandStack: stack2,
    textState: {
      ...ctx.textState,
      textLineMatrix: newLineMatrix,
      textMatrix: newLineMatrix,
    },
  };
};

/**
 * TD operator: Move to next line and set leading to -ty
 */
const handleTextMoveSetLeading: OperatorHandler = (ctx, gfxOps) => {
  const [ty, stack1] = popNumber(ctx.operandStack);
  const [tx, stack2] = popNumber(stack1);

  // Set text leading to -ty per PDF spec
  gfxOps.setTextLeading(-ty);

  // Move text position
  const [a, b, c, d, e, f] = ctx.textState.textLineMatrix;
  const newLineMatrix: PdfMatrix = [a, b, c, d, e + a * tx + c * ty, f + b * tx + d * ty];

  return {
    operandStack: stack2,
    textState: {
      ...ctx.textState,
      textLineMatrix: newLineMatrix,
      textMatrix: newLineMatrix,
    },
  };
};

/**
 * Tm operator: Set text matrix (replaces current)
 */
const handleTextMatrix: OperatorHandler = (ctx) => {
  const [f, stack1] = popNumber(ctx.operandStack);
  const [e, stack2] = popNumber(stack1);
  const [d, stack3] = popNumber(stack2);
  const [c, stack4] = popNumber(stack3);
  const [b, stack5] = popNumber(stack4);
  const [a, stack6] = popNumber(stack5);

  const newMatrix: PdfMatrix = [a, b, c, d, e, f];

  return {
    operandStack: stack6,
    textState: {
      ...ctx.textState,
      textMatrix: newMatrix,
      textLineMatrix: newMatrix,
    },
  };
};

/**
 * T* operator: Move to start of next line using stored leading
 */
const handleTextNextLine: OperatorHandler = (ctx, gfxOps) => {
  // T* is equivalent to: 0 -TL Td
  const leading = gfxOps.get().textLeading;
  const [a, b, c, d, e, f] = ctx.textState.textLineMatrix;
  const tx = 0;
  const ty = -leading;
  const newLineMatrix: PdfMatrix = [a, b, c, d, e + a * tx + c * ty, f + b * tx + d * ty];

  return {
    textState: {
      ...ctx.textState,
      textLineMatrix: newLineMatrix,
      textMatrix: newLineMatrix,
    },
  };
};

// =============================================================================
// Text Showing Handlers
// =============================================================================

/**
 * Convert raw PDF text string to byte array.
 * PDF text strings are stored as Latin-1 encoded bytes.
 */
function rawTextToBytes(rawText: string): Uint8Array {
  const bytes = new Uint8Array(rawText.length);
  for (let i = 0; i < rawText.length; i++) {
    bytes[i] = rawText.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Create a TextRun from current text state.
 *
 * Pure function that computes text position and metrics.
 */
export function createTextRun(
  text: string,
  textState: TextObjectState,
  gfxState: {
    readonly ctm: PdfMatrix;
    readonly textRise: number;
    readonly charSpacing: number;
    readonly wordSpacing: number;
    readonly horizontalScaling: number;
    readonly graphicsState: PdfGraphicsState;
  }
): { run: TextRun; newTextMatrix: PdfMatrix } {
  const { ctm, textRise, charSpacing, wordSpacing, horizontalScaling, graphicsState } = gfxState;
  const { textMatrix, currentFont, currentBaseFont, currentFontInfo, currentFontSize, currentFontMetrics, currentCodeByteWidth } = textState;
  const writingMode = currentFontInfo?.writingMode ?? 0;

  // Text matrix [a b c d e f] maps text-space (x,y) to user-space:
  // x' = a*x + c*y + e
  // y' = b*x + d*y + f
  const [tmA, tmB, tmC, tmD, tmE, tmF] = textMatrix;
  const startUserX = tmE + tmC * textRise;
  const startUserY = tmF + tmD * textRise;
  const startPos = transformPoint({ x: startUserX, y: startUserY }, ctm);

  // Calculate text displacement
  const effectiveDisplacement = resolveRunDisplacement({
    text,
    fontSize: currentFontSize,
    charSpacing,
    wordSpacing,
    horizontalScaling,
    metrics: currentFontMetrics,
    codeByteWidth: currentCodeByteWidth,
    writingMode,
    verticalDisplacements: currentFontInfo?.verticalDisplacements,
    defaultVerticalDisplacement: currentFontInfo?.defaultVerticalDisplacement,
  });

  // Writing mode 0: advance in text x-axis, writing mode 1: advance in text y-axis.
  const { advanceUserX, advanceUserY } = getTextAdvance({
    writingMode,
    tmA,
    tmB,
    tmC,
    tmD,
    displacement: effectiveDisplacement,
  });
  const newTmE = tmE + advanceUserX;
  const newTmF = tmF + advanceUserY;
  const newTextMatrix: PdfMatrix = [tmA, tmB, tmC, tmD, newTmE, newTmF];

  const endUserX = startUserX + advanceUserX;
  const endUserY = startUserY + advanceUserY;
  const endPos = transformPoint({ x: endUserX, y: endUserY }, ctm);

  // Calculate effective font size
  const effectiveFontSize = calculateEffectiveFontSize(currentFontSize, textMatrix, ctm);

  // Decode text to Unicode when font info is available
  const decodedText = currentFontInfo ? decodeTextWithFontInfo(text, currentFontInfo) : text;

  const run: TextRun = {
    text: decodedText,
    rawText: text,
    rawBytes: rawTextToBytes(text),
    codeByteWidth: currentCodeByteWidth,
    textMatrix,
    x: startPos.x,
    y: startPos.y,
    fontSize: currentFontSize,
    fontName: currentFont,
    baseFont: currentBaseFont,
    fontInfo: currentFontInfo,
    endX: endPos.x,
    endY: endPos.y,
    effectiveFontSize,
    textRise,
    charSpacing,
    wordSpacing,
    horizontalScaling,
    graphicsState,
  };

  return { run, newTextMatrix };
}

function maybeApplyTextClipBBox(
  textRun: TextRun,
  textState: TextObjectState,
  gfxOps: Readonly<{ get: () => { textRenderingMode: number }; setClipBBox: (bbox: PdfBBox) => void }>,
): void {
  const mode = gfxOps.get().textRenderingMode;
  if (mode < 4 || mode > 7) {return;}

  const metrics = textState.currentFontMetrics;
  const ascender = metrics.ascender;
  const descender = metrics.descender;
  const size = textRun.effectiveFontSize;
  if (!Number.isFinite(size) || size <= 0) {return;}

  const textHeight = ((ascender - descender) * size) / 1000;
  const dx = textRun.endX - textRun.x;
  const dy = textRun.endY - textRun.y;
  const baselineLength = Math.hypot(dx, dy);
  const ux = baselineLength > 1e-6 ? dx / baselineLength : 1;
  const uy = baselineLength > 1e-6 ? dy / baselineLength : 0;
  const nx = -uy;
  const ny = ux;
  const descOffset = (descender * size) / 1000;
  const ascOffset = descOffset + textHeight;
  const corners = [
    { x: textRun.x + nx * descOffset, y: textRun.y + ny * descOffset },
    { x: textRun.endX + nx * descOffset, y: textRun.endY + ny * descOffset },
    { x: textRun.x + nx * ascOffset, y: textRun.y + ny * ascOffset },
    { x: textRun.endX + nx * ascOffset, y: textRun.endY + ny * ascOffset },
  ];
  const x1 = Math.min(...corners.map((point) => point.x));
  const x2 = Math.max(...corners.map((point) => point.x));
  const y1 = Math.min(...corners.map((point) => point.y));
  const y2 = Math.max(...corners.map((point) => point.y));

  if (!Number.isFinite(x1) || !Number.isFinite(x2) || !Number.isFinite(y1) || !Number.isFinite(y2)) {return;}

  gfxOps.setClipBBox([x1, y1, x2, y2]);
}

/**
 * Tj operator: Show text
 */
const handleShowText: OperatorHandler = (ctx, gfxOps) => {
  if (!ctx.inTextObject) {
    return {};
  }

  const [text, newStack] = popString(ctx.operandStack);
  const state = gfxOps.get();

  const { run, newTextMatrix } = createTextRun(text, ctx.textState, {
    ctm: state.ctm,
    textRise: state.textRise,
    charSpacing: state.charSpacing,
    wordSpacing: state.wordSpacing,
    horizontalScaling: state.horizontalScaling,
    graphicsState: state,
  });

  maybeApplyTextClipBBox(run, ctx.textState, gfxOps);

  return {
    operandStack: newStack,
    textState: {
      ...ctx.textState,
      textMatrix: newTextMatrix,
      textRuns: [...ctx.textState.textRuns, run],
    },
  };
};

/**
 * TJ operator: Show text with individual glyph positioning
 *
 * Array elements are either:
 * - string: text to show
 * - number: horizontal adjustment in 1/1000 em (positive = move left)
 */
const handleShowTextArray: OperatorHandler = (ctx, gfxOps) => {
  if (!ctx.inTextObject) {
    return {};
  }

  const [array, newStack] = popArray(ctx.operandStack);
  const state = gfxOps.get();
  const { currentFontSize } = ctx.textState;
  const { horizontalScaling } = state;
  const writingMode = ctx.textState.currentFontInfo?.writingMode ?? 0;
  const Th = horizontalScaling / 100;

  const textState = array.reduce((textState, elem) => {
    if (typeof elem === "string") {
      const { run, newTextMatrix } = createTextRun(elem, textState, {
        ctm: state.ctm,
        textRise: state.textRise,
        charSpacing: state.charSpacing,
        wordSpacing: state.wordSpacing,
        horizontalScaling,
        graphicsState: state,
      });
      maybeApplyTextClipBBox(run, textState, gfxOps);
      return {
        ...textState,
        textMatrix: newTextMatrix,
        textRuns: [...textState.textRuns, run],
      };
    }
    if (typeof elem === "number") {
      // PDF Reference 9.4.3:
      // Number value represents displacement in text space units (1/1000 em)
      // Positive values move left (subtract from position)
      const adjustment = -elem * currentFontSize / 1000 * (writingMode === 1 ? 1 : Th);
      const newTextMatrix = applyTextAdjustmentToMatrix(textState.textMatrix, adjustment, writingMode);
      return {
        ...textState,
        textMatrix: newTextMatrix,
      };
    }
    return textState;
  }, ctx.textState);

  return {
    operandStack: newStack,
    textState,
  };
};

/**
 * ' operator: Move to next line and show text
 */
const handleTextNextLineShow: OperatorHandler = (ctx, gfxOps) => {
  // First move to next line
  const leading = gfxOps.get().textLeading;
  const [a, b, c, d, e, f] = ctx.textState.textLineMatrix;
  const tx = 0;
  const ty = -leading;
  const newLineMatrix: PdfMatrix = [a, b, c, d, e + a * tx + c * ty, f + b * tx + d * ty];

  const movedState: TextObjectState = {
    ...ctx.textState,
    textLineMatrix: newLineMatrix,
    textMatrix: newLineMatrix,
  };

  // Then show text
  if (!ctx.inTextObject) {
    return { textState: movedState };
  }

  const [text, newStack] = popString(ctx.operandStack);
  const state = gfxOps.get();

  const { run, newTextMatrix } = createTextRun(text, movedState, {
    ctm: state.ctm,
    textRise: state.textRise,
    charSpacing: state.charSpacing,
    wordSpacing: state.wordSpacing,
    horizontalScaling: state.horizontalScaling,
    graphicsState: state,
  });

  return {
    operandStack: newStack,
    textState: {
      ...movedState,
      textMatrix: newTextMatrix,
      textRuns: [...movedState.textRuns, run],
    },
  };
};

/**
 * " operator: Set word/char spacing, move to next line, show text
 */
const handleTextNextLineShowSpacing: OperatorHandler = (ctx, gfxOps) => {
  const [text, stack1] = popString(ctx.operandStack);
  const [charSpacing, stack2] = popNumber(stack1);
  const [wordSpacing, stack3] = popNumber(stack2);

  // Apply spacing to graphics state
  gfxOps.setWordSpacing(wordSpacing);
  gfxOps.setCharSpacing(charSpacing);

  // Move to next line
  const leading = gfxOps.get().textLeading;
  const [a, b, c, d, e, f] = ctx.textState.textLineMatrix;
  const tx = 0;
  const ty = -leading;
  const newLineMatrix: PdfMatrix = [a, b, c, d, e + a * tx + c * ty, f + b * tx + d * ty];

  const movedState: TextObjectState = {
    ...ctx.textState,
    textLineMatrix: newLineMatrix,
    textMatrix: newLineMatrix,
  };

  // Show text
  if (!ctx.inTextObject) {
    return {
      operandStack: stack3,
      textState: movedState,
    };
  }

  const state = gfxOps.get();

  const { run, newTextMatrix } = createTextRun(text, movedState, {
    ctm: state.ctm,
    textRise: state.textRise,
    charSpacing: state.charSpacing,
    wordSpacing: state.wordSpacing,
    horizontalScaling: state.horizontalScaling,
    graphicsState: state,
  });

  return {
    operandStack: stack3,
    textState: {
      ...movedState,
      textMatrix: newTextMatrix,
      textRuns: [...movedState.textRuns, run],
    },
  };
};

// =============================================================================
// Handler Registry (Rule 1: Lookup objects instead of switch)
// =============================================================================

/**
 * Text operator handlers.
 */
export const TEXT_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  // Text object
  ["BT", { handler: handleBeginText, category: "text", description: "Begin text object" }],
  ["ET", { handler: handleEndText, category: "text", description: "End text object" }],
  // Text state
  ["Tf", { handler: handleSetFont, category: "text", description: "Set font and size" }],
  ["Tc", { handler: handleSetCharSpacing, category: "text", description: "Set character spacing" }],
  ["Tw", { handler: handleSetWordSpacing, category: "text", description: "Set word spacing" }],
  ["Tz", { handler: handleSetHorizontalScaling, category: "text", description: "Set horizontal scaling" }],
  ["TL", { handler: handleSetTextLeading, category: "text", description: "Set text leading" }],
  ["Tr", { handler: handleSetTextRenderingMode, category: "text", description: "Set text rendering mode" }],
  ["Ts", { handler: handleSetTextRise, category: "text", description: "Set text rise" }],
  // Text positioning
  ["Td", { handler: handleTextMove, category: "text", description: "Move text position" }],
  ["TD", { handler: handleTextMoveSetLeading, category: "text", description: "Move and set leading" }],
  ["Tm", { handler: handleTextMatrix, category: "text", description: "Set text matrix" }],
  ["T*", { handler: handleTextNextLine, category: "text", description: "Move to next line" }],
  // Text showing
  ["Tj", { handler: handleShowText, category: "text", description: "Show text" }],
  ["TJ", { handler: handleShowTextArray, category: "text", description: "Show text with positioning" }],
  ["'", { handler: handleTextNextLineShow, category: "text", description: "Next line and show" }],
  ["\"", { handler: handleTextNextLineShowSpacing, category: "text", description: "Set spacing, next line, show" }],
]);

// =============================================================================
// Exported Functions for Testing
// =============================================================================

export const textHandlers = {
  handleBeginText,
  handleEndText,
  handleSetFont,
  handleSetCharSpacing,
  handleSetWordSpacing,
  handleSetHorizontalScaling,
  handleSetTextLeading,
  handleSetTextRenderingMode,
  handleSetTextRise,
  handleTextMove,
  handleTextMoveSetLeading,
  handleTextMatrix,
  handleTextNextLine,
  handleShowText,
  handleShowTextArray,
  handleTextNextLineShow,
  handleTextNextLineShowSpacing,
} as const;
