/**
 * @file Inline text editing overlay for the fig editor canvas.
 *
 * Uses the shared TextEditInputFrame component (hidden textarea + overlay
 * container) from editor-controls, combined with fig's own text layout
 * computation for cursor/selection positioning.
 *
 * Key invariant: the cursor/selection overlay MUST use the same layout
 * computation as the SVG text renderer. Both go through:
 *   extractTextProps() → computeTextLayout() → line positions
 *
 * For cursor positioning, the SVG text-anchor coordinates are converted to
 * left-edge coordinates via textLayoutToCursorLayout() — a function provided
 * by the text layout SoT (compute-layout.ts), NOT computed independently here.
 *
 * Architecture (same pattern as pptx-editor's TextEditController):
 * 1. Hidden textarea captures keyboard and IME input
 * 2. Text change → UPDATE_NODE → textData.characters update → SVG re-render
 * 3. Custom SVG children render cursor/selection using fig's layout result
 * 4. Click-outside detection via CanvasViewportContext
 */

import { useCallback, useRef, useState, useEffect, useMemo, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../context/fig-editor/types";
import { TextEditInputFrame } from "@aurochs-ui/editor-controls/text-edit";
import { useTextComposition } from "@aurochs-ui/editor-controls/text-edit";
import { useCanvasViewportRequired } from "@aurochs-ui/editor-controls/canvas";
import {
  createInitialCompositionState,
  offsetToCursorPosition,
  cursorPositionToCoordinates,
  coordinatesToCursorPosition,
  cursorPositionToOffset,
  selectionToRects,
  proportionalTextWidth,
  type CompositionState,
  type CursorCalculationContext,
  type LayoutSpanLike,
  type TextBodyLike,
  type TextSelection,
} from "@aurochs-ui/editor-core/text-edit";
import {
  extractTextProps,
  computeTextLayout,
  textLayoutToCursorLayout,
  type TextLayout,
} from "@aurochs-renderer/fig/text";
import { FigTextLines } from "@aurochs-renderer/fig/react";
import type { TextLineLayout } from "@aurochs-renderer/fig/scene-graph";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Constants
// =============================================================================

/**
 * Caret blink animation CSS. Injected as <style> within the SVG overlay.
 */
const CARET_BLINK_KEYFRAMES = `
@keyframes _fig-caret-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}`;

// =============================================================================
// Text anchor mapping (must match scene-graph/convert/text.ts exactly)
// =============================================================================

function getTextAnchor(alignH: string): "start" | "middle" | "end" {
  switch (alignH) {
    case "CENTER":
      return "middle";
    case "RIGHT":
      return "end";
    default:
      return "start";
  }
}

/**
 * Build TextLineLayout from layout result and text props.
 *
 * This constructs the SAME data structure that convertTextNode() in
 * scene-graph/convert/text.ts produces. By passing this to FigTextLines
 * (the shared component also used by TextNodeRenderer), we guarantee
 * identical SVG output for text during editing and normal display.
 */
function buildTextLineLayout(
  layout: TextLayout,
  props: { fontFamily: string; fontSize: number; fontWeight?: number; fontStyle?: string; letterSpacing?: number; textAlignHorizontal: string; },
): TextLineLayout {
  return {
    lines: layout.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
    })),
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    fontWeight: props.fontWeight,
    fontStyle: props.fontStyle,
    letterSpacing: props.letterSpacing,
    lineHeight: layout.lineHeight,
    textAnchor: getTextAnchor(props.textAlignHorizontal),
  };
}

// =============================================================================
// Fill color extraction (must match scene-graph/convert/text.ts exactly)
// =============================================================================

function getFillColorHex(node: FigDesignNode): string {
  const fills = node.fills;
  if (fills.length > 0) {
    const paint = fills[0];
    if ("color" in paint && paint.color) {
      const c = paint.color;
      const r = Math.round(c.r * 255).toString(16).padStart(2, "0");
      const g = Math.round(c.g * 255).toString(16).padStart(2, "0");
      const b = Math.round(c.b * 255).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }
  return "#000000";
}

function getFillOpacity(node: FigDesignNode): number {
  const fills = node.fills;
  if (fills.length > 0) {
    const paint = fills[0];
    if ("opacity" in paint && typeof paint.opacity === "number") {
      return paint.opacity;
    }
  }
  return 1;
}

// =============================================================================
// TextBody construction
// =============================================================================

/**
 * Build a TextBodyLike from fig's text characters.
 *
 * The text is split by newlines into paragraphs, each containing one run.
 * This structure maps to editor-core's offset ↔ CursorPosition conversion.
 */
function buildTextBodyFromCharacters(characters: string): TextBodyLike {
  const paragraphs = characters.split("\n").map((line) => ({
    runs: [{ type: "regular" as const, text: line }],
  }));
  return { paragraphs };
}

// =============================================================================
// Canvas text measurement
// =============================================================================

/**
 * Create a text width measurement function using canvas 2d context.
 *
 * Returns a function that measures the actual rendered width of a text string.
 * Used by textLayoutToCursorLayout() for accurate cursor positioning in the browser.
 *
 * The canvas measurement is the authoritative width for cursor calculation —
 * it matches what the browser renders for SVG <text> elements.
 */
function createCanvasTextMeasurer(fontStr: string): (text: string) => number {
  const canvasCtx = tryGetCanvasContext();

  return (text: string): number => {
    if (!canvasCtx || text.length === 0) {return 0;}
    canvasCtx.font = fontStr;
    return canvasCtx.measureText(text).width;
  };
}

function tryGetCanvasContext(): CanvasRenderingContext2D | null {
  try {
    return document.createElement("canvas").getContext("2d");
  // eslint-disable-next-line no-restricted-syntax -- catch without param: error is intentionally discarded; SSR environment lacks canvas API and any error is a non-actionable environment mismatch
  } catch {
    // SSR fallback — return null to trigger estimatedWidth fallback
    return null;
  }
}

/**
 * Build a CursorCalculationContext using canvas measureText.
 *
 * The measurement is scaled to match the span's width (from layout) so that
 * cursor positions are proportionally correct even if canvas and SVG measure
 * slightly differently.
 */
function buildFigCursorContext(
  fontStr: string,
  fontSize: number,
  ascenderRatio: number,
): CursorCalculationContext {
  const canvasCtx = tryGetCanvasContext();

  const measureSpanTextWidth = (span: LayoutSpanLike, substring: string): number => {
    if (!canvasCtx || span.text.length === 0 || substring.length === 0) {
      return proportionalTextWidth(span, substring);
    }
    canvasCtx.font = fontStr;
    const fullWidth = canvasCtx.measureText(span.text).width;
    if (fullWidth <= 0) {
      return proportionalTextWidth(span, substring);
    }
    // Scale canvas measurement to match span.width (from layout)
    return (canvasCtx.measureText(substring).width / fullWidth) * span.width;
  };

  return {
    measureSpanTextWidth,
    getAscenderRatio: () => ascenderRatio,
    ptToPx: 1, // fig uses pixels directly
    defaultFontSizePt: fontSize,
  };
}

// =============================================================================
// Types
// =============================================================================

type FigTextEditOverlayProps = {
  readonly node: FigDesignNode;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
  };
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================






/** Overlay component for in-canvas text editing of a Figma node. */
export function FigTextEditOverlay({
  node,
  bounds,
  canvasWidth,
  canvasHeight,
  dispatch,
}: FigTextEditOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { screenToPage } = useCanvasViewportRequired();
  const textData = node.textData;
  const currentText = textData?.characters ?? "";

  // --- Extract text props using the SAME function as SVG renderer ---
  const textProps = useMemo(() => extractTextProps(node), [node]);

  // --- CSS font string (single source — used for both measurement and cursor context) ---
  const fontStr = useMemo(
    () => `${textProps.fontStyle ?? "normal"} ${textProps.fontWeight ?? "normal"} ${textProps.fontSize}px ${textProps.fontFamily}`,
    [textProps.fontFamily, textProps.fontSize, textProps.fontWeight, textProps.fontStyle],
  );

  // --- Compute layout using the SAME function as SVG renderer ---
  const textLayout = useMemo(
    () => computeTextLayout({ props: textProps }),
    [textProps],
  );

  // --- Convert to cursor layout via SoT function ---
  // textLayoutToCursorLayout() handles the SVG textAnchor → left-edge coordinate
  // conversion. We provide a canvas-based text measurer for accurate widths.
  const canvasMeasurer = useMemo(
    () => createCanvasTextMeasurer(fontStr),
    [fontStr],
  );
  const cursorLayout = useMemo(
    () => textLayoutToCursorLayout(textLayout, canvasMeasurer),
    [textLayout, canvasMeasurer],
  );

  // --- Build TextLineLayout for shared FigTextLines component ---
  const editTextLineLayout = useMemo(
    () => buildTextLineLayout(textLayout, textProps),
    [textLayout, textProps],
  );

  const fillColor = useMemo(() => getFillColorHex(node), [node]);
  const fillOpacity = useMemo(() => getFillOpacity(node), [node]);

  // --- Build TextBodyLike for cursor offset mapping ---
  const textBody = useMemo(
    () => buildTextBodyFromCharacters(currentText),
    [currentText],
  );

  // --- Cursor calculation context ---
  const cursorCtx = useMemo(
    () => buildFigCursorContext(fontStr, textProps.fontSize, textLayout.ascenderRatio),
    [fontStr, textProps.fontSize, textLayout.ascenderRatio],
  );

  // --- Cursor/selection state ---
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({
    start: currentText.length,
    end: currentText.length,
  });

  const updateSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      setSelectionRange({ start: ta.selectionStart, end: ta.selectionEnd });
    }
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(currentText.length, currentText.length);
    }
  }, []);

  // Focus guard: if the hidden textarea loses focus to a user-initiated
  // interaction (click on another input, tab navigation), exit text editing.
  //
  // A requestAnimationFrame delay distinguishes intentional focus loss
  // (user clicked elsewhere) from transient focus loss (React re-render).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) {return;}

    // eslint-disable-next-line no-restricted-syntax -- mutable RAF ID required for RAF/cancel-animation-frame pairing
    let rafId: number | null = null;

    const handleBlur = () => {
      rafId = requestAnimationFrame(() => {
        if (document.activeElement !== ta) {
          dispatch({ type: "EXIT_TEXT_EDIT" });
        }
        rafId = null;
      });
    };

    ta.addEventListener("blur", handleBlur);
    return () => {
      ta.removeEventListener("blur", handleBlur);
      if (rafId !== null) {cancelAnimationFrame(rafId);}
    };
  }, [dispatch]);

  // --- Cursor visual position ---
  const caretPos = useMemo(() => {
    const pos = offsetToCursorPosition(textBody, selectionRange.end);
    return cursorPositionToCoordinates(pos, cursorLayout, cursorCtx);
  }, [textBody, selectionRange.end, cursorLayout, cursorCtx]);

  const selRects = useMemo(() => {
    if (selectionRange.start === selectionRange.end) {
      return [];
    }
    const startPos = offsetToCursorPosition(textBody, selectionRange.start);
    const endPos = offsetToCursorPosition(textBody, selectionRange.end);
    const selection: TextSelection = { start: startPos, end: endPos };
    return selectionToRects(selection, cursorLayout, cursorCtx);
  }, [textBody, selectionRange, cursorLayout, cursorCtx]);

  // --- Text change handler ---
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => {
          if (!n.textData) {return n;}
          return { ...n, textData: { ...n.textData, characters: newText } };
        },
      });
      // Defer selection update to after React re-render
      requestAnimationFrame(updateSelection);
    },
    [dispatch, node.id, updateSelection],
  );

  // --- Key handler ---
  // Only Escape needs special handling (exit text edit).
  // All other keys (including Delete, Backspace, Cmd+C/V/X, arrow keys)
  // pass through to the textarea naturally. The global keyboard handler
  // (use-fig-keyboard.ts) has both isInputTarget() and isTextEditing guards.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "EXIT_TEXT_EDIT" });
        return;
      }
      // Defer selection update for arrow keys, etc.
      requestAnimationFrame(updateSelection);
    },
    [dispatch, updateSelection],
  );

  // --- IME composition ---
  const initialComposition = createInitialCompositionState();
  const [_composition, setComposition] = useState<CompositionState>(initialComposition);
  const {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
  } = useTextComposition({ setComposition, initialCompositionState: initialComposition });

  // --- Click-outside detection ---
  const handleOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const page = screenToPage(e.clientX, e.clientY);
      if (!page) {return;}
      const b = bounds;
      const inside =
        page.pageX >= b.x && page.pageX <= b.x + b.width &&
        page.pageY >= b.y && page.pageY <= b.y + b.height;
      if (!inside) {
        dispatch({ type: "EXIT_TEXT_EDIT" });
      }
    },
    [screenToPage, bounds, dispatch],
  );

  // --- Drag selection anchor ---
  //
  // Tracks the character offset where the user pressed down. During drag,
  // the selection extends from this anchor to the current pointer position.
  const dragAnchorRef = useRef<number | null>(null);

  /**
   * Convert screen coordinates to a flat character offset within the text.
   * Uses SVG's getScreenCTM() for accurate mapping regardless of zoom/transform.
   */
  const screenToCharOffset = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current;
      if (!svg) {return null;}

      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) {return null;}

      const svgPoint = pt.matrixTransform(ctm.inverse());
      const cursorPos = coordinatesToCursorPosition({
        layoutResult: cursorLayout,
        x: svgPoint.x,
        y: svgPoint.y,
        ctx: cursorCtx,
      });
      return cursorPositionToOffset(textBody, cursorPos);
    },
    [cursorLayout, cursorCtx, textBody],
  );

  // --- SVG pointer events → textarea selection sync ---
  //
  // pointerdown: set cursor position (anchor), capture pointer for drag tracking
  // pointermove: extend selection from anchor to current position
  // pointerup:   release capture, finalize selection
  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.stopPropagation();
      // preventDefault() is critical: without it, the browser's default mousedown
      // behavior moves focus away from the hidden textarea to the SVG element,
      // triggering the textarea's blur handler → EXIT_TEXT_EDIT. This matches
      // the pptx editor's TextEditController pattern.
      e.preventDefault();

      const ta = textareaRef.current;
      if (!ta) {return;}

      const offset = screenToCharOffset(e.clientX, e.clientY);
      if (offset !== null) {
        dragAnchorRef.current = offset;
        ta.setSelectionRange(offset, offset);
        setSelectionRange({ start: offset, end: offset });
      }

      ta.focus();

      // Capture pointer so pointermove/pointerup fire on this element
      // even when the pointer moves outside the SVG bounds.
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [screenToCharOffset],
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const anchor = dragAnchorRef.current;
      if (anchor === null) {return;}
      e.preventDefault();

      const ta = textareaRef.current;
      if (!ta) {return;}

      const offset = screenToCharOffset(e.clientX, e.clientY);
      if (offset === null) {return;}

      const start = Math.min(anchor, offset);
      const end = Math.max(anchor, offset);
      ta.setSelectionRange(start, end);
      setSelectionRange({ start, end });
    },
    [screenToCharOffset],
  );

  const handleSvgPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      dragAnchorRef.current = null;
      e.preventDefault();
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [],
  );

  const hasRange = selectionRange.start !== selectionRange.end;
  const boundsWidth = bounds.width;
  const boundsHeight = bounds.height;

  return (
    <div
      style={{ position: "absolute", inset: 0 } as CSSProperties}
      onPointerDown={handleOverlayPointerDown}
    >
      <TextEditInputFrame
        bounds={bounds}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        textareaRef={textareaRef}
        value={currentText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={updateSelection}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        showFrameOutline
        showTextSelection={false}
      >
        {/* Custom SVG overlay using fig's layout computation */}
        <svg
          ref={svgRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "auto",
            overflow: "visible",
            zIndex: 2,
          }}
          viewBox={`0 0 ${boundsWidth} ${boundsHeight}`}
          preserveAspectRatio="xMinYMin meet"
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
        >
          <style>{CARET_BLINK_KEYFRAMES}</style>

          {/*
            White background to occlude the original SVG text beneath.
            The overlay completely covers the original text node area.
          */}
          <rect x={0} y={0} width={boundsWidth} height={boundsHeight} fill="white" />

          {/*
            Text re-rendered using FigTextLines — the SAME component
            used by TextNodeRenderer for normal display.
          */}
          <FigTextLines
            textLineLayout={editTextLineLayout}
            fill={fillColor}
            fillOpacity={fillOpacity}
          />

          {/* Selection highlights */}
          {selRects.map((rect, i) => (
            <rect
              key={`sel-${i}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill={colorTokens.selection.primary}
              fillOpacity={0.3}
            />
          ))}

          {/* Cursor caret */}
          {caretPos && (
            <line
              x1={caretPos.x}
              y1={caretPos.y}
              x2={caretPos.x}
              y2={caretPos.y + caretPos.height}
              stroke={colorTokens.selection.primary}
              strokeWidth={2}
              style={{
                animation: hasRange ? "none" : "_fig-caret-blink 1s step-end infinite",
              }}
            />
          )}
        </svg>
      </TextEditInputFrame>
    </div>
  );
}
