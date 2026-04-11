/**
 * @file PDF Text Edit Controller
 *
 * Mirrors the PPTX TextEditController architecture:
 * - Hidden textarea captures input and selection
 * - SVG overlay renders text, cursor caret, and selection highlights
 * - Click/drag on SVG maps to textarea cursor via getScreenCTM().inverse()
 *
 * Text rendering is delegated to renderPdfElementToSvg (the same function used
 * by the page renderer) to guarantee font/position parity between editing and
 * display modes. The SVG viewBox uses page-coordinate space so that the
 * renderer's output is injected without coordinate transformation.
 */

import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ChangeEvent,
} from "react";
import type { PdfText } from "@aurochs/pdf";
import { renderPdfElementToSvgNodes, svgFragmentToJsx, resolveTextFontMetrics, resolveTextAnchor } from "@aurochs-renderer/pdf/svg";
import {
  coordinatesToCursorPosition,
  cursorPositionToCoordinates,
  cursorPositionToOffset,
  offsetToCursorPosition,
  selectionToRects,
  type LayoutResultLike,
  type LayoutSpanLike,
  type CursorCalculationContext,
  type CursorCoordinates,
  type SelectionRect,
} from "@aurochs-ui/editor-core/text-edit";
import {
  applySelectionRange,
  getSelectionAnchor,
  isPrimaryPointerAction,
  isPrimaryMouseAction,
} from "@aurochs-ui/editor-core/pointer-utils";
import type { TextEditBounds } from "@aurochs-ui/editor-core/text-edit";
import { TextEditInputFrame } from "@aurochs-ui/editor-controls/text-edit";
import { useTextComposition } from "@aurochs-ui/editor-controls/text-edit";
import { CursorCaret } from "@aurochs-ui/ui-components/primitives/CursorCaret";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type PdfTextEditControllerProps = {
  /** Bounds in SVG coordinate space (top-left origin). */
  readonly bounds: TextEditBounds;
  /** The original PdfText element being edited. */
  readonly element: PdfText;
  /** Page height in PDF points (for coordinate conversion). */
  readonly pageHeight: number;
  /** Canvas width (page width) for percentage-based positioning. */
  readonly canvasWidth: number;
  /** Canvas height (page height) for percentage-based positioning. */
  readonly canvasHeight: number;
  readonly onComplete: (newText: string) => void;
  readonly onCancel: () => void;
};

type CursorState = {
  readonly cursor: CursorCoordinates | undefined;
  readonly selectionRects: readonly SelectionRect[];
  readonly isBlinking: boolean;
};

type CompositionState = {
  readonly isComposing: boolean;
  readonly text: string;
  readonly startOffset: number;
};

// =============================================================================
// Constants
// =============================================================================

const INITIAL_CURSOR_STATE: CursorState = { cursor: undefined, selectionRects: [], isBlinking: true };
const INITIAL_COMPOSITION: CompositionState = { isComposing: false, text: "", startOffset: 0 };

const WORD_CHAR_REGEX = /[\p{L}\p{N}_]/u;

function getWordRange(text: string, offset: number): { start: number; end: number } {
  if (text.length === 0) { return { start: 0, end: 0 }; }
  const clamped = Math.max(0, Math.min(offset, text.length - 1));
  const char = text[clamped];
  const isWord = WORD_CHAR_REGEX.test(char);
  const leftSlice = text.slice(0, clamped);
  const leftBoundary = Array.from(leftSlice).reverse().findIndex((c) => WORD_CHAR_REGEX.test(c) !== isWord);
  const start = leftBoundary === -1 ? 0 : clamped - leftBoundary;
  const rightSlice = text.slice(clamped + 1);
  const rightBoundary = Array.from(rightSlice).findIndex((c) => WORD_CHAR_REGEX.test(c) !== isWord);
  const end = rightBoundary === -1 ? text.length : clamped + 1 + rightBoundary;
  return { start, end };
}

// =============================================================================
// Layout & Measurement Helpers
//
// Consumes the same domain SoT that the SVG renderer uses:
//   - text.width              → PDF-computed text width (SoT for span width)
//   - text.fontSize           → font size (SoT)
//   - resolveTextFontMetrics  → ascender/descender (SoT)
//   - resolveTextAnchor       → position/baseline (SoT, consumed by renderer too)
//
// No intermediate aggregation type (like PdfTextLayout). Both the renderer and
// this cursor calculation consume the same low-level values directly.
// =============================================================================

const measureCtxCache = { ctx: null as CanvasRenderingContext2D | null };
function getCanvasCtx(): CanvasRenderingContext2D | null {
  if (!measureCtxCache.ctx) {
    // eslint-disable-next-line no-restricted-syntax -- SSR safety: canvas not available server-side
    try { measureCtxCache.ctx = document.createElement("canvas").getContext("2d"); } catch { /* SSR */ }
  }
  return measureCtxCache.ctx;
}

/**
 * Build LayoutResultLike from the domain SoT values.
 *
 * - span.width = text.width (PDF's computed text extent — same value the renderer
 *   uses via textLength attribute)
 * - baseline Y = derived from resolveTextFontMetrics + resolveTextAnchor
 *   (same functions the renderer calls)
 */
function buildLayoutResult(args: {
  text: string;
  textWidth: number;
  fontSize: number;
  fontFamily: string;
  ascender: number;
  descender: number;
  anchor: { y: number; fromBaseline: boolean };
  boundsY: number;
}): LayoutResultLike {
  const { text, textWidth, fontSize, fontFamily, ascender, descender, anchor, boundsY } = args;
  const ascPx = (ascender * fontSize) / 1000;
  const descPx = (descender * fontSize) / 1000;
  const textHeight = ascPx - descPx;
  // Baseline Y within bounds-local coordinates.
  // For alphabetic: anchor.y is the baseline in page space; boundsY is the bounds top in page space.
  // For text-before-edge: anchor is at top of bounds, so baseline = ascender portion.
  const baselineYInBounds = anchor.fromBaseline ? anchor.y - boundsY : ascPx;
  const span: LayoutSpanLike = { text, width: textWidth, dx: 0, fontSize, fontFamily };
  return { paragraphs: [{ lines: [{ spans: [span], x: 0, y: baselineYInBounds, height: textHeight }] }] };
}

/**
 * Build CursorCalculationContext from domain SoT values.
 *
 * measureSpanTextWidth scales canvas.measureText proportionally to span.width
 * (= text.width from the PDF parser, the SoT for text extent).
 */
function buildCursorContext(args: {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  ascender: number;
  descender: number;
}): CursorCalculationContext {
  const ctx = getCanvasCtx();
  const fontStr = `${args.fontStyle} ${args.fontWeight} ${args.fontSize}px ${args.fontFamily}`;
  const ascRatio = args.ascender / (args.ascender - args.descender);

  const measureSpanTextWidth = (span: LayoutSpanLike, substring: string): number => {
    if (!ctx || span.text.length === 0 || substring.length === 0) { return 0; }
    ctx.font = fontStr;
    const fullWidth = ctx.measureText(span.text).width;
    if (fullWidth <= 0) { return 0; }
    // Scale to span.width (= text.width, the PDF SoT)
    return (ctx.measureText(substring).width / fullWidth) * span.width;
  };

  return {
    measureSpanTextWidth,
    getAscenderRatio: () => ascRatio,
    ptToPx: 1,
    defaultFontSizePt: args.fontSize,
  };
}

// =============================================================================
// Component
// =============================================================================

/** Controller for inline text editing with SVG overlay and hidden textarea. */
export function PdfTextEditController({
  bounds,
  element,
  pageHeight,
  canvasWidth,
  canvasHeight,
  onComplete,
  onCancel,
}: PdfTextEditControllerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const finishedRef = useRef(false);
  const initialTextRef = useRef(element.text);

  const [currentText, setCurrentText] = useState(element.text);
  const [cursorState, setCursorState] = useState<CursorState>(INITIAL_CURSOR_STATE);
  const [composition, setComposition] = useState<CompositionState>(INITIAL_COMPOSITION);

  const compositionHandlers = useTextComposition({
    setComposition,
    initialCompositionState: INITIAL_COMPOSITION,
  });

  // Domain SoT: same functions the SVG renderer calls
  const metrics = useMemo(() => resolveTextFontMetrics(element), [element]);
  const anchor = useMemo(() => resolveTextAnchor(element, pageHeight), [element, pageHeight]);
  const fontFamily = element.baseFont ?? element.fontName;
  const fontWeight = element.isBold ? "bold" : "normal";
  const fontStyle = element.isItalic ? "italic" : "normal";

  const textBody = useMemo(
    () => ({ paragraphs: [{ runs: [{ type: "regular" as const, text: currentText }] }] }),
    [currentText],
  );
  const layoutResult = useMemo(
    () => buildLayoutResult({
      text: currentText,
      textWidth: element.width,
      fontSize: element.fontSize,
      fontFamily,
      ascender: metrics.ascender,
      descender: metrics.descender,
      anchor,
      boundsY: bounds.y,
    }),
    [currentText, element.width, element.fontSize, fontFamily, metrics, anchor, bounds.y],
  );
  const cursorCtx = useMemo(
    () => buildCursorContext({
      fontSize: element.fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      ascender: metrics.ascender,
      descender: metrics.descender,
    }),
    [element.fontSize, fontFamily, fontWeight, fontStyle, metrics],
  );

  // --- Text SVG rendering via renderPdfElementToSvgNodes (SoT) ---
  // Build a live PdfText with updated text, then render using the same renderer
  // that produces contentSvg. This guarantees font/position parity.
  const textSvgNodes = useMemo(() => {
    const liveElement: PdfText = { ...element, text: currentText };
    return svgFragmentToJsx(renderPdfElementToSvgNodes(liveElement, pageHeight), "text-edit");
  }, [element, currentText, pageHeight]);

  // --- Cursor update ---

  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) { return; }
    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart !== selectionEnd) {
      const startPos = offsetToCursorPosition(textBody, selectionStart);
      const endPos = offsetToCursorPosition(textBody, selectionEnd);
      const rects = selectionToRects({ start: startPos, end: endPos }, layoutResult, cursorCtx);
      setCursorState({ cursor: undefined, selectionRects: rects, isBlinking: false });
    } else {
      const pos = offsetToCursorPosition(textBody, selectionStart);
      const coords = cursorPositionToCoordinates(pos, layoutResult, cursorCtx);
      setCursorState({ cursor: coords, selectionRects: [], isBlinking: !composition.isComposing });
    }
  }, [textBody, layoutResult, cursorCtx, composition.isComposing]);

  useEffect(() => { updateCursorPosition(); }, [layoutResult, updateCursorPosition]);

  useEffect(() => {
    const handler = () => updateCursorPosition();
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updateCursorPosition]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) { textarea.focus(); textarea.select(); }
  }, []);

  const latestRef = useRef({ currentText, initialText: initialTextRef.current, onComplete });
  latestRef.current = { currentText, initialText: initialTextRef.current, onComplete };
  useEffect(() => {
    return () => {
      if (finishedRef.current) { return; }
      const latest = latestRef.current;
      if (latest.currentText !== latest.initialText) {
        latest.onComplete(latest.currentText);
      }
    };
  }, []);

  // --- SVG click → cursor offset ---
  // The SVG viewBox is in page-coordinate space, but cursor/selection
  // coordinates are in bounds-local space. The getScreenCTM maps
  // client coords to page coords; we subtract bounds origin to get
  // bounds-local coords for the cursor pipeline.

  const getOffsetFromPointerEvent = useCallback(
    (event: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>): number | null => {
      const svg = svgRef.current;
      if (!svg) { return null; }
      const matrix = svg.getScreenCTM();
      if (!matrix) { return null; }
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const pageCoords = point.matrixTransform(matrix.inverse());
      // SVG viewBox = "0 0 canvasW canvasH" → pageCoords are in page space.
      // Layout is in bounds-local space, so subtract bounds origin.
      const localX = pageCoords.x - bounds.x;
      const localY = pageCoords.y - bounds.y;
      const cursorPos = coordinatesToCursorPosition({ layoutResult, x: localX, y: localY, ctx: cursorCtx });
      return cursorPositionToOffset(textBody, cursorPos);
    },
    [textBody, layoutResult, cursorCtx, bounds.x, bounds.y],
  );

  // --- Pointer events ---

  const handleSvgPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isPrimaryPointerAction(event)) { event.preventDefault(); return; }
      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event);
      if (!textarea || offset === null) { return; }

      isDraggingRef.current = true;
      textarea.focus();
      const anchorOffset = event.shiftKey ? getSelectionAnchor(textarea) : offset;
      dragAnchorRef.current = anchorOffset;
      applySelectionRange({ textarea, anchorOffset, focusOffset: offset });
      updateCursorPosition();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [getOffsetFromPointerEvent, updateCursorPosition],
  );

  const handleSvgPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isDraggingRef.current) { return; }
      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event);
      if (!textarea || offset === null) { return; }
      const anchorOffset = dragAnchorRef.current ?? getSelectionAnchor(textarea);
      applySelectionRange({ textarea, anchorOffset, focusOffset: offset });
      updateCursorPosition();
      event.preventDefault();
    },
    [getOffsetFromPointerEvent, updateCursorPosition],
  );

  const handleSvgPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) { return; }
    isDraggingRef.current = false;
    dragAnchorRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const handleSvgPointerCancel = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    dragAnchorRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const handleSvgDoubleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isPrimaryMouseAction(event)) { event.preventDefault(); return; }
      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event as React.PointerEvent<SVGSVGElement>);
      if (!textarea || offset === null) { return; }
      const range = getWordRange(currentText, offset);
      applySelectionRange({ textarea, anchorOffset: range.start, focusOffset: range.end });
      updateCursorPosition();
      event.preventDefault();
    },
    [currentText, getOffsetFromPointerEvent, updateCursorPosition],
  );

  // --- Input events ---

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentText(e.target.value);
      requestAnimationFrame(() => updateCursorPosition());
    },
    [updateCursorPosition],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape" && !composition.isComposing) {
        e.preventDefault();
        finishedRef.current = true;
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey && !composition.isComposing) {
        e.preventDefault();
        finishedRef.current = true;
        onComplete(currentText);
      }
    },
    [composition.isComposing, onCancel, onComplete, currentText],
  );

  // --- Render ---
  // The SVG uses the full page viewBox ("0 0 canvasWidth canvasHeight") so that
  // renderPdfElementToSvg output is rendered at the *exact same scale* as the
  // main canvas SVG. This eliminates any font-size / position discrepancy between
  // display and editing modes.
  //
  // The SVG is placed as a sibling to TextEditInputFrame (not inside it),
  // both positioned absolutely within the ViewportOverlay. This way the SVG
  // covers the full page (matching the main canvas coordinate system) while
  // the TextEditInputFrame only covers the bounds area for textarea input.

  return (
    <>
      {/* Hidden textarea for input capture (bounds-sized) */}
      <TextEditInputFrame
        bounds={bounds}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        textareaRef={textareaRef}
        value={currentText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={updateCursorPosition}
        onCompositionStart={compositionHandlers.handleCompositionStart}
        onCompositionUpdate={compositionHandlers.handleCompositionUpdate}
        onCompositionEnd={compositionHandlers.handleCompositionEnd}
        showFrameOutline
        showTextSelection={false}
      >
        <div />
      </TextEditInputFrame>

      {/* SVG overlay — full page viewBox for scale parity with main canvas */}
      <svg
        ref={svgRef}
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "hidden", zIndex: 1001 }}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="xMinYMin meet"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerCancel}
        onDoubleClick={handleSvgDoubleClick}
      >
        {/* Hit target covering the text bounds (pointer events only here) */}
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="transparent" pointerEvents="all" />

        {/* Selection highlights (bounds-local → page-coordinate offset) */}
        {cursorState.selectionRects.map((rect, i) => (
          <rect
            key={`sel-${i}`}
            x={rect.x + bounds.x}
            y={rect.y + bounds.y}
            width={rect.width}
            height={rect.height}
            fill={colorTokens.selection.primary}
            fillOpacity={0.3}
          />
        ))}

        {/* Rendered text via renderPdfElementToSvgNodes — single SoT */}
        <g>{textSvgNodes}</g>

        {/* Cursor caret (bounds-local → page-coordinate offset) */}
        {cursorState.cursor && (
          <CursorCaret
            x={cursorState.cursor.x + bounds.x}
            y={cursorState.cursor.y + bounds.y}
            height={cursorState.cursor.height}
            isBlinking={cursorState.isBlinking}
          />
        )}
      </svg>
    </>
  );
}
