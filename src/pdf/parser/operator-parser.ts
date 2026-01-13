/**
 * @file PDF operator parser
 *
 * Parses PDF content stream tokens and extracts graphical elements.
 * Handles path construction, painting, graphics state, and text operators.
 */

import type { PdfPathOp, PdfPaintOp, PdfGraphicsState, PdfMatrix } from "../domain";
import { GraphicsStateStack, IDENTITY_MATRIX, transformPoint, multiplyMatrices } from "../domain";
import type { PdfToken } from "./tokenizer";
import { DEFAULT_FONT_METRICS, type FontMappings, type FontMetrics } from "./font-decoder";

// =============================================================================
// Parsed Element Types
// =============================================================================

export type ParsedPath = {
  readonly type: "path";
  readonly operations: readonly PdfPathOp[];
  readonly paintOp: PdfPaintOp;
  readonly graphicsState: PdfGraphicsState;
};

/**
 * Text run extracted from PDF content stream.
 *
 * Represents a single text show operation (Tj, TJ, ', ").
 *
 * ## Position Semantics
 *
 * x and y represent the **baseline** position (not bounding box):
 * - x: Start of baseline (left edge of first glyph)
 * - y: Baseline vertical position
 *
 * These are in PDF page space (after CTM transformation).
 *
 * @see ISO 32000-1:2008 Section 9.4.4 - Text Rendering
 */
export type TextRun = {
  readonly text: string;

  /**
   * X coordinate of baseline start in PDF points (page space).
   * This is where the first glyph's origin is positioned.
   */
  readonly x: number;

  /**
   * Y coordinate of baseline in PDF points (page space).
   *
   * This is the **baseline**, not the bounding box edge.
   * The baseline is where glyphs sit; ascenders go above, descenders below.
   *
   * Calculated as: textMatrix.f + textRise, then transformed by CTM.
   *
   * @see ISO 32000-1:2008 Section 9.4.2 - Text Positioning
   */
  readonly y: number;

  readonly fontSize: number;
  /**
   * Font resource identifier (e.g., "F1", "/F1").
   * This is the PDF internal name used in Tf operator.
   */
  readonly fontName: string;
  /**
   * Actual font name from BaseFont entry (e.g., "CIDFont+F1", "Helvetica").
   * This is the real font name for rendering, used for @font-face matching.
   */
  readonly baseFont?: string;

  /**
   * X coordinate where text ends (after last glyph).
   * Used to calculate text width: width = endX - x
   */
  readonly endX: number;
  /**
   * Effective font size after applying text matrix and CTM scaling.
   * PDF Reference 9.4.4: The actual rendered text size is affected by
   * both the text matrix (Tm) and the current transformation matrix (CTM).
   */
  readonly effectiveFontSize: number;

  // ==========================================================================
  // Text spacing properties (from PDF text state operators)
  // ==========================================================================

  /**
   * Character spacing in PDF points (Tc operator).
   * Added to each character's displacement after glyph width.
   */
  readonly charSpacing: number;

  /**
   * Word spacing in PDF points (Tw operator).
   * Added to space character (0x20) displacement only.
   */
  readonly wordSpacing: number;

  /**
   * Horizontal scaling as percentage (Tz operator).
   * Default: 100 (no scaling).
   */
  readonly horizontalScaling: number;
};

export type ParsedText = {
  readonly type: "text";
  readonly runs: readonly TextRun[];
  readonly graphicsState: PdfGraphicsState;
};

export type ParsedImage = {
  readonly type: "image";
  readonly name: string;
  readonly graphicsState: PdfGraphicsState;
};

export type ParsedElement = ParsedPath | ParsedText | ParsedImage;

// =============================================================================
// Operator Parser
// =============================================================================

export class OperatorParser {
  private readonly gfxState: GraphicsStateStack;
  private readonly operandStack: (number | string | (number | string)[])[] = [];
  private currentPath: PdfPathOp[] = [];
  private readonly elements: ParsedElement[] = [];

  // Text state
  private inTextObject = false;
  private textMatrix: PdfMatrix = IDENTITY_MATRIX;
  private textLineMatrix: PdfMatrix = IDENTITY_MATRIX;
  private currentFont = "";
  private currentBaseFont: string | undefined = undefined;
  private currentFontSize = 12;
  private textRuns: TextRun[] = [];
  private currentFontMetrics: FontMetrics = DEFAULT_FONT_METRICS;
  private currentCodeByteWidth: 1 | 2 = 1;

  // Font mappings for glyph width lookup
  private readonly fontMappings: FontMappings;

  constructor(fontMappings: FontMappings = new Map()) {
    this.gfxState = new GraphicsStateStack();
    this.fontMappings = fontMappings;
  }

  /**
   * Parse token stream and return extracted elements
   */
  parse(tokens: PdfToken[]): ParsedElement[] {
    for (const token of tokens) {
      switch (token.type) {
        case "number":
          this.operandStack.push(token.value as number);
          break;
        case "string":
          this.operandStack.push(token.value as string);
          break;
        case "name":
          this.operandStack.push(token.value as string);
          break;
        case "operator":
          this.handleOperator(token.value as string);
          break;
        case "array_start":
          this.operandStack.push([]);
          break;
        case "array_end":
          // Find last array_start marker and collect elements
          this.finalizeArray();
          break;
        // dict_start/dict_end handled as needed
      }
    }

    return this.elements;
  }

  private finalizeArray(): void {
    const items: (number | string)[] = [];
    while (this.operandStack.length > 0) {
      const item = this.operandStack.pop();
      if (Array.isArray(item) && item.length === 0) {
        // Found array start marker
        break;
      }
      if (typeof item === "number" || typeof item === "string") {
        items.unshift(item);
      }
    }
    this.operandStack.push(items);
  }

  private handleOperator(op: string): void {
    switch (op) {
      // === Graphics State Operators ===
      case "q":
        this.gfxState.push();
        break;
      case "Q":
        this.gfxState.pop();
        break;
      case "cm":
        this.handleCm();
        break;
      case "w":
        this.handleW();
        break;
      case "J":
        this.handleJ();
        break;
      case "j":
        this.handlej();
        break;
      case "M":
        this.handleM();
        break;
      case "d":
        this.handleD();
        break;

      // === Color Operators ===
      case "g":
        this.handleFillGray();
        break;
      case "G":
        this.handleStrokeGray();
        break;
      case "rg":
        this.handleFillRgb();
        break;
      case "RG":
        this.handleStrokeRgb();
        break;
      case "k":
        this.handleFillCmyk();
        break;
      case "K":
        this.handleStrokeCmyk();
        break;

      // === Path Construction Operators ===
      case "m":
        this.handleMoveTo();
        break;
      case "l":
        this.handleLineTo();
        break;
      case "c":
        this.handleCurveTo();
        break;
      case "v":
        this.handleCurveToV();
        break;
      case "y":
        this.handleCurveToY();
        break;
      case "h":
        this.handleClosePath();
        break;
      case "re":
        this.handleRectangle();
        break;

      // === Path Painting Operators ===
      case "S":
        this.finishPath("stroke");
        break;
      case "s":
        this.handleClosePath();
        this.finishPath("stroke");
        break;
      case "f":
      case "F":
        this.finishPath("fill");
        break;
      case "f*":
        this.finishPath("fill");
        break;
      case "B":
        this.finishPath("fillStroke");
        break;
      case "B*":
        this.finishPath("fillStroke");
        break;
      case "b":
        this.handleClosePath();
        this.finishPath("fillStroke");
        break;
      case "b*":
        this.handleClosePath();
        this.finishPath("fillStroke");
        break;
      case "n":
        this.finishPath("none");
        break;
      case "W":
      case "W*":
        this.finishPath("clip");
        break;

      // === Text Operators ===
      case "BT":
        this.beginTextObject();
        break;
      case "ET":
        this.endTextObject();
        break;
      case "Tf":
        this.handleSetFont();
        break;
      case "Tc":
        this.handleSetCharSpacing();
        break;
      case "Tw":
        this.handleSetWordSpacing();
        break;
      case "Tz":
        this.handleSetHorizontalScaling();
        break;
      case "TL":
        this.handleSetTextLeading();
        break;
      case "Tr":
        this.handleSetTextRenderingMode();
        break;
      case "Ts":
        this.handleSetTextRise();
        break;
      case "Td":
        this.handleTextMove();
        break;
      case "TD":
        this.handleTextMoveSetLeading();
        break;
      case "Tm":
        this.handleTextMatrix();
        break;
      case "T*":
        this.handleTextNextLine();
        break;
      case "Tj":
        this.handleShowText();
        break;
      case "TJ":
        this.handleShowTextArray();
        break;
      case "'":
        this.handleTextNextLineShow();
        break;
      case '"':
        this.handleTextNextLineShowSpacing();
        break;

      // === XObject Operators ===
      case "Do":
        this.handleXObject();
        break;
    }

    // Clear operand stack after operator (except for array building)
    if (op !== "[") {
      this.operandStack.length = 0;
    }
  }

  // === Graphics State Handlers ===

  private handleCm(): void {
    const f = this.popNumber();
    const e = this.popNumber();
    const d = this.popNumber();
    const c = this.popNumber();
    const b = this.popNumber();
    const a = this.popNumber();
    this.gfxState.concatMatrix([a, b, c, d, e, f]);
  }

  private handleW(): void {
    this.gfxState.setLineWidth(this.popNumber());
  }

  private handleJ(): void {
    const cap = this.popNumber();
    if (cap === 0 || cap === 1 || cap === 2) {
      this.gfxState.setLineCap(cap);
    }
  }

  private handlej(): void {
    const join = this.popNumber();
    if (join === 0 || join === 1 || join === 2) {
      this.gfxState.setLineJoin(join);
    }
  }

  private handleM(): void {
    this.gfxState.setMiterLimit(this.popNumber());
  }

  private handleD(): void {
    const phase = this.popNumber();
    const array = this.popArray();
    const numArray = array.filter((v): v is number => typeof v === "number");
    this.gfxState.setDashPattern(numArray, phase);
  }

  // === Color Handlers ===

  private handleFillGray(): void {
    this.gfxState.setFillGray(this.popNumber());
  }

  private handleStrokeGray(): void {
    this.gfxState.setStrokeGray(this.popNumber());
  }

  private handleFillRgb(): void {
    const b = this.popNumber();
    const g = this.popNumber();
    const r = this.popNumber();
    this.gfxState.setFillRgb(r, g, b);
  }

  private handleStrokeRgb(): void {
    const b = this.popNumber();
    const g = this.popNumber();
    const r = this.popNumber();
    this.gfxState.setStrokeRgb(r, g, b);
  }

  private handleFillCmyk(): void {
    const k = this.popNumber();
    const y = this.popNumber();
    const m = this.popNumber();
    const c = this.popNumber();
    this.gfxState.setFillCmyk(c, m, y, k);
  }

  private handleStrokeCmyk(): void {
    const k = this.popNumber();
    const y = this.popNumber();
    const m = this.popNumber();
    const c = this.popNumber();
    this.gfxState.setStrokeCmyk(c, m, y, k);
  }

  // === Path Construction Handlers ===

  private handleMoveTo(): void {
    const y = this.popNumber();
    const x = this.popNumber();
    this.currentPath.push({ type: "moveTo", point: { x, y } });
  }

  private handleLineTo(): void {
    const y = this.popNumber();
    const x = this.popNumber();
    this.currentPath.push({ type: "lineTo", point: { x, y } });
  }

  private handleCurveTo(): void {
    const y3 = this.popNumber();
    const x3 = this.popNumber();
    const y2 = this.popNumber();
    const x2 = this.popNumber();
    const y1 = this.popNumber();
    const x1 = this.popNumber();
    this.currentPath.push({
      type: "curveTo",
      cp1: { x: x1, y: y1 },
      cp2: { x: x2, y: y2 },
      end: { x: x3, y: y3 },
    });
  }

  private handleCurveToV(): void {
    const y3 = this.popNumber();
    const x3 = this.popNumber();
    const y2 = this.popNumber();
    const x2 = this.popNumber();
    this.currentPath.push({
      type: "curveToV",
      cp2: { x: x2, y: y2 },
      end: { x: x3, y: y3 },
    });
  }

  private handleCurveToY(): void {
    const y3 = this.popNumber();
    const x3 = this.popNumber();
    const y1 = this.popNumber();
    const x1 = this.popNumber();
    this.currentPath.push({
      type: "curveToY",
      cp1: { x: x1, y: y1 },
      end: { x: x3, y: y3 },
    });
  }

  private handleClosePath(): void {
    this.currentPath.push({ type: "closePath" });
  }

  private handleRectangle(): void {
    const height = this.popNumber();
    const width = this.popNumber();
    const y = this.popNumber();
    const x = this.popNumber();
    this.currentPath.push({ type: "rect", x, y, width, height });
  }

  private finishPath(paintOp: PdfPaintOp): void {
    if (this.currentPath.length > 0) {
      this.elements.push({
        type: "path",
        operations: [...this.currentPath],
        paintOp,
        graphicsState: this.gfxState.get(),
      });
      this.currentPath = [];
    }
  }

  // === Text Handlers ===

  private beginTextObject(): void {
    this.inTextObject = true;
    this.textMatrix = IDENTITY_MATRIX;
    this.textLineMatrix = IDENTITY_MATRIX;
    this.textRuns = [];
  }

  private endTextObject(): void {
    if (this.textRuns.length > 0) {
      this.elements.push({
        type: "text",
        runs: [...this.textRuns],
        graphicsState: this.gfxState.get(),
      });
    }
    this.inTextObject = false;
    this.textRuns = [];
  }

  private handleSetFont(): void {
    const size = this.popNumber();
    const name = this.popString();
    this.currentFont = name;
    this.currentFontSize = size;

    // Load font metrics for glyph width calculations (PDF Reference 9.4.4)
    const cleanName = name.startsWith("/") ? name.slice(1) : name;
    let fontInfo = this.fontMappings.get(cleanName);

    // Try without subset prefix (e.g., "XGIAKD+Arial" → "Arial")
    if (!fontInfo) {
      const plusIndex = cleanName.indexOf("+");
      if (plusIndex > 0) {
        fontInfo = this.fontMappings.get(cleanName.slice(plusIndex + 1));
      }
    }

    this.currentFontMetrics = fontInfo?.metrics ?? DEFAULT_FONT_METRICS;
    this.currentCodeByteWidth = fontInfo?.codeByteWidth ?? 1;
    // Store baseFont for accurate font-family matching (ISO 32000-1 Section 9.6)
    this.currentBaseFont = fontInfo?.baseFont;
  }

  /** Tc operator: set character spacing (PDF Reference 9.3.2) */
  private handleSetCharSpacing(): void {
    const charSpace = this.popNumber();
    this.gfxState.setCharSpacing(charSpace);
  }

  /** Tw operator: set word spacing (PDF Reference 9.3.3) */
  private handleSetWordSpacing(): void {
    const wordSpace = this.popNumber();
    this.gfxState.setWordSpacing(wordSpace);
  }

  /** Tz operator: set horizontal scaling (PDF Reference 9.3.4) */
  private handleSetHorizontalScaling(): void {
    const scale = this.popNumber();
    this.gfxState.setHorizontalScaling(scale);
  }

  /** TL operator: set text leading (PDF Reference 9.3.5) */
  private handleSetTextLeading(): void {
    const leading = this.popNumber();
    this.gfxState.setTextLeading(leading);
  }

  /** Tr operator: set text rendering mode (PDF Reference 9.3.6) */
  private handleSetTextRenderingMode(): void {
    const mode = this.popNumber();
    if (mode >= 0 && mode <= 7) {
      this.gfxState.setTextRenderingMode(mode as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
  }

  /** Ts operator: set text rise (PDF Reference 9.3.7) */
  private handleSetTextRise(): void {
    const rise = this.popNumber();
    this.gfxState.setTextRise(rise);
  }

  private handleTextMove(): void {
    const ty = this.popNumber();
    const tx = this.popNumber();
    const [a, b, c, d, e, f] = this.textLineMatrix;
    this.textLineMatrix = [a, b, c, d, e + tx, f + ty];
    this.textMatrix = [...this.textLineMatrix];
  }

  /** TD operator: move to next line and set leading to -ty (PDF Reference 9.4.2) */
  private handleTextMoveSetLeading(): void {
    const ty = this.popNumber();
    const tx = this.popNumber();
    // Set text leading to -ty per PDF spec
    this.gfxState.setTextLeading(-ty);
    // Then move text position
    this.operandStack.push(tx);
    this.operandStack.push(ty);
    this.handleTextMove();
  }

  private handleTextMatrix(): void {
    const f = this.popNumber();
    const e = this.popNumber();
    const d = this.popNumber();
    const c = this.popNumber();
    const b = this.popNumber();
    const a = this.popNumber();
    this.textMatrix = [a, b, c, d, e, f];
    this.textLineMatrix = [a, b, c, d, e, f];
  }

  /** T* operator: move to start of next line using stored leading (PDF Reference 9.4.2) */
  private handleTextNextLine(): void {
    // T* is equivalent to: 0 -TL Td
    const leading = this.gfxState.get().textLeading;
    this.operandStack.push(0);
    this.operandStack.push(-leading);
    this.handleTextMove();
  }

  /**
   * Tj operator: Show text
   * PDF Reference 9.4.3
   *
   * Text position is calculated by composing the text matrix with CTM:
   * - Text matrix (Tm) positions text in user space
   * - CTM transforms user space to page space
   * - Text rise (Ts) shifts the baseline vertically
   *
   * The effective font size is scaled by both text matrix and CTM.
   * PDF Reference 9.4.4: The rendering matrix Trm = Tm × CTM
   * determines the actual size of rendered glyphs.
   */
  private handleShowText(): void {
    if (!this.inTextObject) return;

    const text = this.popString();
    const state = this.gfxState.get();
    const ctm = state.ctm;
    const textRise = state.textRise;

    // Text matrix translation gives position in text space
    const [tmA, tmB, tmC, tmD, tmE, tmF] = this.textMatrix;

    // Apply text rise to baseline position (PDF Reference 9.4.2)
    // Text rise shifts the baseline in text space Y direction
    const textSpaceY = tmF + textRise;

    // Transform text position to page space by composing with CTM (PDF Reference 9.4.2)
    // Position in page space = Tm * CTM applied to origin
    const startPos = transformPoint({ x: tmE, y: textSpaceY }, ctm);

    // PDF Reference 9.4.4: Calculate text displacement using glyph widths
    const displacement = this.calculateTextDisplacement(text);

    // Update text matrix with new position (displacement is in text space)
    const newTmE = tmE + displacement;
    this.textMatrix = [tmA, tmB, tmC, tmD, newTmE, tmF];

    // Transform end position to page space
    const endPos = transformPoint({ x: newTmE, y: textSpaceY }, ctm);

    // Calculate effective font size by applying text matrix and CTM scaling
    // PDF Reference 9.4.4: Trm = Tm × CTM, font size is scaled by Trm
    // We compute the composite matrix and extract the Y-scale (for text height)
    const compositeMatrix = multiplyMatrices(this.textMatrix, ctm);
    // Y-scale from composite matrix: sqrt(c² + d²) where matrix is [a,b,c,d,e,f]
    const [, , compC, compD] = compositeMatrix;
    const yScale = Math.sqrt(compC * compC + compD * compD);
    const effectiveFontSize = this.currentFontSize * yScale;

    this.textRuns.push({
      text,
      x: startPos.x,
      y: startPos.y,
      fontSize: this.currentFontSize,
      fontName: this.currentFont,
      baseFont: this.currentBaseFont,
      endX: endPos.x,
      effectiveFontSize,
      // Add spacing properties from text state
      charSpacing: state.charSpacing,
      wordSpacing: state.wordSpacing,
      horizontalScaling: state.horizontalScaling,
    });
  }

  /**
   * Calculate text displacement per PDF Reference 9.4.4
   * Formula: tx = ((w0 - Tj/1000) * Tfs + Tc + Tw) * Th
   * For Tj operator, Tj = 0, so:
   * tx = sum of (w0 * Tfs / 1000 + Tc + (isSpace ? Tw : 0)) * Th
   *
   * @param text - The raw text string
   * @param tjAdjustment - Optional TJ adjustment in 1/1000 em (default 0)
   */
  private calculateTextDisplacement(text: string, tjAdjustment: number = 0): number {
    const state = this.gfxState.get();
    const Tfs = this.currentFontSize;
    const Tc = state.charSpacing;
    const Tw = state.wordSpacing;
    const Th = state.horizontalScaling / 100;

    let totalDisplacement = 0;

    // For 2-byte CID fonts, character codes are encoded as pairs of bytes
    // Each pair forms a CID value: CID = highByte * 256 + lowByte
    if (this.currentCodeByteWidth === 2) {
      for (let i = 0; i + 1 < text.length; i += 2) {
        const highByte = text.charCodeAt(i);
        const lowByte = text.charCodeAt(i + 1);
        const cid = highByte * 256 + lowByte;

        // Get glyph width from font metrics (in 1/1000 em units)
        const w0 = this.getGlyphWidth(cid);

        const glyphWidth = (w0 - tjAdjustment) * Tfs / 1000;
        // For CID fonts, space character is typically CID 1 or 32
        const isSpace = cid === 32 || cid === 1;
        const charDisplacement = (glyphWidth + Tc + (isSpace ? Tw : 0)) * Th;

        totalDisplacement += charDisplacement;
      }
    } else {
      // Single-byte font
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);

        // Get glyph width from font metrics (in 1/1000 em units)
        const w0 = this.getGlyphWidth(charCode);

        // PDF Reference 9.4.4:
        // tx = ((w0 - Tj/1000) * Tfs + Tc + Tw) * Th
        // For Tj operator, Tj adjustment is distributed across text
        // For single character: tx = (w0 * Tfs / 1000 + Tc + (isSpace ? Tw : 0)) * Th
        const glyphWidth = (w0 - tjAdjustment) * Tfs / 1000;
        const isSpace = charCode === 32;
        const charDisplacement = (glyphWidth + Tc + (isSpace ? Tw : 0)) * Th;

        totalDisplacement += charDisplacement;
      }
    }

    return totalDisplacement;
  }

  /**
   * Get glyph width for a character code from font metrics
   * Returns width in 1/1000 em units
   */
  private getGlyphWidth(charCode: number): number {
    const width = this.currentFontMetrics.widths.get(charCode);
    if (width !== undefined) {
      return width;
    }
    return this.currentFontMetrics.defaultWidth;
  }

  /**
   * TJ operator: Show text with individual glyph positioning
   * PDF Reference 9.4.3
   *
   * Array elements are either:
   * - string: text to show
   * - number: horizontal adjustment in 1/1000 em (positive = move left)
   */
  private handleShowTextArray(): void {
    if (!this.inTextObject) return;

    const state = this.gfxState.get();
    const Tfs = this.currentFontSize;
    const Th = state.horizontalScaling / 100;

    const array = this.popArray();
    for (const elem of array) {
      if (typeof elem === "string") {
        this.operandStack.push(elem);
        this.handleShowText();
      } else if (typeof elem === "number") {
        // PDF Reference 9.4.3:
        // Number value represents displacement in text space units (1/1000 em)
        // Positive values move left (subtract from position)
        // tx = -Tj * Tfs / 1000 * Th
        const adjustment = -elem * Tfs / 1000 * Th;
        const [a, b, c, d, e, f] = this.textMatrix;
        this.textMatrix = [a, b, c, d, e + adjustment, f];
      }
    }
  }

  private handleTextNextLineShow(): void {
    this.handleTextNextLine();
    this.handleShowText();
  }

  /**
   * " operator: set word spacing, character spacing, move to next line, show text
   * (PDF Reference 9.4.3)
   */
  private handleTextNextLineShowSpacing(): void {
    const text = this.popString();
    const charSpacing = this.popNumber();
    const wordSpacing = this.popNumber();
    // Apply spacing to graphics state
    this.gfxState.setWordSpacing(wordSpacing);
    this.gfxState.setCharSpacing(charSpacing);
    // Move to next line and show text
    this.handleTextNextLine();
    this.operandStack.push(text);
    this.handleShowText();
  }

  // === XObject Handler ===

  private handleXObject(): void {
    const name = this.popString();
    this.elements.push({
      type: "image",
      name,
      graphicsState: this.gfxState.get(),
    });
  }

  // === Stack Utilities ===

  /**
   * Pop a number from the operand stack.
   *
   * If the stack is empty or the value is not a number, logs a warning
   * and returns 0 as a fallback. This matches PDF viewer behavior where
   * malformed content streams are handled gracefully rather than throwing.
   *
   * @see PDF Reference 1.7, Section 3.7.1 (Content Streams)
   */
  private popNumber(): number {
    const val = this.operandStack.pop();
    if (typeof val !== "number") {
      console.warn(
        `[PDF Parser] Expected number operand but got ${val === undefined ? "empty stack" : typeof val}` +
          (val !== undefined ? ` (value: ${JSON.stringify(val)})` : "")
      );
      return 0;
    }
    return val;
  }

  /**
   * Pop a string from the operand stack.
   *
   * If the stack is empty or the value is not a string, logs a warning
   * and returns an empty string as a fallback.
   *
   * @see PDF Reference 1.7, Section 3.7.1 (Content Streams)
   */
  private popString(): string {
    const val = this.operandStack.pop();
    if (typeof val !== "string") {
      console.warn(
        `[PDF Parser] Expected string operand but got ${val === undefined ? "empty stack" : typeof val}` +
          (val !== undefined ? ` (value: ${JSON.stringify(val)})` : "")
      );
      return "";
    }
    return val;
  }

  /**
   * Pop an array from the operand stack.
   *
   * If the stack is empty or the value is not an array, logs a warning
   * and returns an empty array as a fallback.
   *
   * @see PDF Reference 1.7, Section 3.7.1 (Content Streams)
   */
  private popArray(): (number | string)[] {
    const val = this.operandStack.pop();
    if (Array.isArray(val)) {
      return val as (number | string)[];
    }
    console.warn(
      `[PDF Parser] Expected array operand but got ${val === undefined ? "empty stack" : typeof val}` +
        (val !== undefined ? ` (value: ${JSON.stringify(val)})` : "")
    );
    return [];
  }
}
