/**
 * @file Text edit input frame component
 *
 * Hosts a hidden textarea and positions a text overlay within shape bounds.
 * Format-agnostic - works with any canvas that uses percentage-based positioning.
 *
 * When `showTextSelection` is enabled, the component internally tracks
 * the textarea's selection range and renders a proportional highlight overlay
 * with a blinking caret. This is suitable for flat (single-style) text editing
 * (e.g., PDF text elements). Rich text editors (e.g., PPTX TextEditController)
 * should use the `children` slot for custom selection rendering instead.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEventHandler,
  type KeyboardEventHandler,
  type CompositionEventHandler,
  type ReactEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
  type CSSProperties,
} from "react";
import type { TextEditBounds, LayoutResultLike, LayoutSpanLike } from "@aurochs-ui/editor-core/text-edit";
import {
  offsetToCursorPosition,
  cursorPositionToCoordinates,
  selectionToRects,
  DEFAULT_ASCENDER_RATIO,
  DEFAULT_CURSOR_CONTEXT,
  type CursorCalculationContext,
} from "@aurochs-ui/editor-core/text-edit";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type TextEditInputFrameProps = {
  readonly bounds: TextEditBounds;
  /** Canvas width in domain units (for percentage calculation) */
  readonly canvasWidth: number;
  /** Canvas height in domain units (for percentage calculation) */
  readonly canvasHeight: number;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLTextAreaElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  readonly onSelect?: ReactEventHandler<HTMLTextAreaElement>;
  readonly onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onCompositionUpdate: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onNonPrimaryMouseDown?: MouseEventHandler<HTMLTextAreaElement>;
  readonly onContextMenuCapture?: MouseEventHandler<HTMLTextAreaElement>;
  readonly showFrameOutline?: boolean;
  /**
   * Enable built-in text selection highlight.
   * When true, TextEditInputFrame internally tracks textarea selection and renders
   * a highlight + blinking caret. Use this for single-style text editing.
   * For rich text with per-run formatting (PPTX), use `children` to render custom selection instead.
   */
  readonly showTextSelection?: boolean;
  /**
   * Font properties for accurate text measurement (used with showTextSelection).
   * When provided, character positions are computed via canvas measureText
   * scaled to match the actual rendered width. Essential for styled text.
   */
  readonly textFont?: {
    readonly family: string;
    readonly size: number;
    readonly weight?: string;
    readonly style?: string;
    /** Font ascender in 1/1000 em units (default: 800). Used for baseline position. */
    readonly ascender?: number;
    /** Font descender in 1/1000 em units (default: -200). Used for baseline position. */
    readonly descender?: number;
  };
  readonly children: ReactNode;
};

const HIDDEN_TEXTAREA_STYLE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "text",
  resize: "none",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  pointerEvents: "auto",
  caretColor: "transparent",
  zIndex: 1,
};

function buildContainerStyle({
  bounds,
  canvasWidth,
  canvasHeight,
  showFrameOutline,
}: {
  readonly bounds: TextEditBounds;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly showFrameOutline: boolean;
}): CSSProperties {
  const left = (bounds.x / canvasWidth) * 100;
  const top = (bounds.y / canvasHeight) * 100;
  const width = (bounds.width / canvasWidth) * 100;
  const height = (bounds.height / canvasHeight) * 100;

  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: bounds.rotation !== 0 ? `rotate(${bounds.rotation}deg)` : undefined,
    transformOrigin: "center center",
    boxSizing: "border-box",
    border: showFrameOutline ? `2px solid ${colorTokens.selection.primary}` : "none",
    borderRadius: "2px",
    backgroundColor: "transparent",
    zIndex: 1000,
    overflow: "visible",
  };
}

/**
 * Text edit input frame that hosts a hidden textarea and overlay content.
 * Positions itself within a canvas using percentage-based layout.
 */
export function TextEditInputFrame({
  bounds,
  canvasWidth,
  canvasHeight,
  textareaRef,
  value,
  onChange,
  onKeyDown,
  onSelect,
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  onNonPrimaryMouseDown,
  onContextMenuCapture,
  showFrameOutline = true,
  showTextSelection = false,
  textFont,
  children,
}: TextEditInputFrameProps) {
  const containerStyle = buildContainerStyle({ bounds, canvasWidth, canvasHeight, showFrameOutline });
  const handleMouseDown: MouseEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.button !== 0) {
      onNonPrimaryMouseDown?.(event);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // --- Flat text selection tracking (internal) ---
  const [flatSelection, setFlatSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const handleSelect: ReactEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onSelect?.(e);
      if (showTextSelection) {
        const textarea = textareaRef.current;
        if (textarea) {
          setFlatSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
        }
      }
    },
    [onSelect, showTextSelection, textareaRef],
  );

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onChange(e);
      if (showTextSelection) {
        setFlatSelection({ start: e.target.selectionStart, end: e.target.selectionEnd });
      }
    },
    [onChange, showTextSelection],
  );

  // Auto-focus and select all on mount when flat text selection is enabled
  useEffect(() => {
    if (!showTextSelection) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.select();
      setFlatSelection({ start: 0, end: textarea.value.length });
    });
  }, [showTextSelection, textareaRef]);

  return (
    <div style={containerStyle}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onSelect={handleSelect}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCompositionEnd={onCompositionEnd}
        onMouseDown={handleMouseDown}
        onContextMenuCapture={onContextMenuCapture}
        style={HIDDEN_TEXTAREA_STYLE}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {showTextSelection && <TextSelectionOverlay text={value} selection={flatSelection} textFont={textFont} boundsWidth={bounds.width} boundsHeight={bounds.height} />}
      {children}
    </div>
  );
}

// =============================================================================
// TextSelectionOverlay (internal)
//
// Uses the SAME cursor/selection pipeline as PPTX's TextEditController:
// 1. Build LayoutResultLike from text + font info
// 2. offsetToCursorPosition() → CursorPosition
// 3. cursorPositionToCoordinates() / selectionToRects() → visual coords
//
// This is the SoT for cursor/selection positioning (editor-core/text-edit).
// =============================================================================

const CARET_BLINK_KEYFRAMES = `@keyframes _tso-blink{0%,100%{opacity:1}50%{opacity:0}}`;

/** Shared offscreen canvas for text measurement. */
const measureCtxCache = { ctx: null as CanvasRenderingContext2D | null };

function getCanvasCtx(): CanvasRenderingContext2D | null {
  if (!measureCtxCache.ctx) {
    try { measureCtxCache.ctx = document.createElement("canvas").getContext("2d"); } catch { /* SSR */ }
  }
  return measureCtxCache.ctx;
}

/**
 * Build a LayoutResultLike from a single-style text string + font info.
 * Models the text as 1 paragraph, 1 line, 1 span — matching how PDF text is structured.
 *
 * Baseline position is derived from actual font metrics (ascender/descender)
 * to match the SVG renderer's positioning exactly.
 */
function buildLayoutResult(
  text: string,
  boundsWidth: number,
  boundsHeight: number,
  font?: TextEditInputFrameProps["textFont"],
): LayoutResultLike {
  const fontSize = font?.size ?? DEFAULT_CURSOR_CONTEXT.defaultFontSizePt;
  // Baseline position within bounds: ascender portion of total height.
  // ascender/descender MUST be provided by the caller (resolved via format-specific SoT).
  const ascRatio = (font?.ascender != null && font?.descender != null)
    ? font.ascender / (font.ascender - font.descender)
    : DEFAULT_ASCENDER_RATIO;
  const baselineY = boundsHeight * ascRatio;

  const span: LayoutSpanLike = {
    text,
    width: boundsWidth,
    dx: 0,
    fontSize,
    fontFamily: font?.family,
  };
  return {
    paragraphs: [{
      lines: [{
        spans: [span],
        x: 0,
        y: baselineY,
        height: boundsHeight,
      }],
    }],
  };
}

/**
 * Create a CursorCalculationContext that uses canvas measureText
 * SCALED to match the span's actual width (from SVG bounds).
 *
 * Raw canvas.measureText may differ from SVG text rendering width.
 * By measuring the full span text and computing the ratio, we ensure
 * substring positions are proportionally consistent with span.width.
 */
function buildCursorContext(font?: TextEditInputFrameProps["textFont"]): CursorCalculationContext {
  const canvasCtx = getCanvasCtx();
  const fontStr = font
    ? `${font.style ?? "normal"} ${font.weight ?? "normal"} ${font.size}px ${font.family}`
    : `normal normal ${DEFAULT_CURSOR_CONTEXT.defaultFontSizePt}px sans-serif`;

  const measureSpanTextWidth = (span: LayoutSpanLike, substring: string): number => {
    if (!canvasCtx || span.text.length === 0 || substring.length === 0) return 0;
    canvasCtx.font = fontStr;
    const fullWidth = canvasCtx.measureText(span.text).width;
    if (fullWidth <= 0) return 0;
    // Scale canvas measurement to match span.width (from SVG bounds)
    // This ensures cursor positions are consistent with the rendered text width
    return (canvasCtx.measureText(substring).width / fullWidth) * span.width;
  };

  const cursorAscRatio = (font?.ascender != null && font?.descender != null)
    ? font.ascender / (font.ascender - font.descender)
    : DEFAULT_ASCENDER_RATIO;

  return {
    measureSpanTextWidth,
    getAscenderRatio: () => cursorAscRatio,
    ptToPx: 1, // bounds are already in display units
    defaultFontSizePt: font?.size ?? DEFAULT_CURSOR_CONTEXT.defaultFontSizePt,
  };
}

/**
 * Text selection highlight overlay.
 *
 * Uses editor-core's cursor/selection pipeline (same SoT as PPTX TextEditController):
 * text → LayoutResultLike → cursorPositionToCoordinates/selectionToRects → SVG coordinates
 */
function TextSelectionOverlay({
  text,
  selection,
  textFont,
  boundsWidth,
  boundsHeight,
}: {
  readonly text: string;
  readonly selection: { readonly start: number; readonly end: number };
  readonly textFont?: TextEditInputFrameProps["textFont"];
  readonly boundsWidth: number;
  readonly boundsHeight: number;
}) {
  if (text.length === 0 || boundsWidth <= 0 || boundsHeight <= 0) return null;

  const layoutResult = useMemo(
    () => buildLayoutResult(text, boundsWidth, boundsHeight, textFont),
    [text, boundsWidth, boundsHeight, textFont],
  );

  const cursorCtx = useMemo(() => buildCursorContext(textFont), [textFont]);

  // Use editor-core SoT: offset → CursorPosition → visual coords
  const textBody = useMemo(() => ({
    paragraphs: [{ runs: [{ type: "regular" as const, text }] }],
  }), [text]);

  const caretPos = offsetToCursorPosition(textBody, selection.end);
  const caretCoords = cursorPositionToCoordinates(caretPos, layoutResult, cursorCtx);

  const hasRange = selection.start !== selection.end;
  const selRects = hasRange
    ? selectionToRects(
        {
          start: offsetToCursorPosition(textBody, Math.min(selection.start, selection.end)),
          end: offsetToCursorPosition(textBody, Math.max(selection.start, selection.end)),
        },
        layoutResult,
        cursorCtx,
      )
    : [];

  return (
    <div style={overlayContainerStyle}>
      <style>{CARET_BLINK_KEYFRAMES}</style>
      {selRects.map((rect, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            backgroundColor: colorTokens.selection.primary,
            opacity: 0.3,
          }}
        />
      ))}
      {caretCoords && (
        <div
          style={{
            position: "absolute",
            left: caretCoords.x,
            top: caretCoords.y,
            width: 2,
            height: caretCoords.height,
            backgroundColor: colorTokens.selection.primary,
            animation: hasRange ? "none" : "_tso-blink 1s step-end infinite",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

const overlayContainerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};
