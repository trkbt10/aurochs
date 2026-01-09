/**
 * @file Text Edit Controller Component
 *
 * Provides a hybrid text editing experience:
 * - Hidden textarea captures input and tracks cursor/selection
 * - Visual text is rendered as SVG on top
 * - IME composition (未確定文字) is displayed with underline
 * - Cursor and selection are overlaid
 */

import {
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { toLayoutInput, layoutTextBody } from "../../../../pptx/render/text-layout";
import { createLayoutParagraphMeasurer } from "../../../../pptx/render/react/text-measure/layout-bridge";
import {
  getPlainText,
  cursorPositionToOffset,
  coordinatesToCursorPosition,
} from "../input-support/cursor";
import { mergeTextIntoBody, extractDefaultRunProperties } from "../input-support/text-body-merge";
import { colorTokens } from "../../../ui/design-tokens";
import { TextOverlay } from "../text-render/TextOverlay";
import { CursorCaret } from "../text-render/CursorCaret";
import { EMPTY_COLOR_CONTEXT } from "../input-support/color-context";
import { TextEditInputFrame } from "../input-field/TextEditInputFrame";
import type { TextEditControllerProps, CursorState, CompositionState } from "./types";
import { useTextEditInput } from "./use-text-edit-input";
import { useTextComposition } from "./use-text-composition";
import { useTextKeyHandlers } from "./use-text-key-handlers";

// =============================================================================
// Initial State
// =============================================================================

const INITIAL_COMPOSITION_STATE: CompositionState = {
  isComposing: false,
  text: "",
  startOffset: 0,
};

const INITIAL_CURSOR_STATE: CursorState = {
  cursor: undefined,
  selectionRects: [],
  isBlinking: true,
};

// =============================================================================
// Selection Helpers
// =============================================================================

function getSelectionAnchor(textarea: HTMLTextAreaElement): number {
  if (textarea.selectionDirection === "backward") {
    return textarea.selectionEnd ?? 0;
  }
  return textarea.selectionStart ?? 0;
}

function applySelectionRange(
  textarea: HTMLTextAreaElement,
  anchorOffset: number,
  focusOffset: number,
) {
  const start = Math.min(anchorOffset, focusOffset);
  const end = Math.max(anchorOffset, focusOffset);
  const direction = focusOffset < anchorOffset ? "backward" : "forward";
  textarea.setSelectionRange(start, end, direction);
}

// =============================================================================
// Component
// =============================================================================

/**
 * Text edit controller with live text preview and IME support.
 */
export function TextEditController({
  bounds,
  textBody,
  colorContext,
  fontScheme,
  slideWidth,
  slideHeight,
  onComplete,
  onCancel,
  onSelectionChange,
}: TextEditControllerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const [currentText, setCurrentText] = useState(() => getPlainText(textBody));
  const [composition, setComposition] = useState<CompositionState>(INITIAL_COMPOSITION_STATE);
  const initialTextRef = useRef(getPlainText(textBody));
  const finishedRef = useRef(false);

  // Extract default run properties from original text body (memoized)
  const defaultRunProperties = useMemo(
    () => extractDefaultRunProperties(textBody),
    [textBody],
  );

  // Compute current TextBody from edited text
  const currentTextBody = useMemo(
    () => mergeTextIntoBody(textBody, currentText, defaultRunProperties),
    [textBody, currentText, defaultRunProperties],
  );

  // Compute layout result for current text
  const paragraphMeasurer = useMemo(() => createLayoutParagraphMeasurer(), []);
  const layoutResult = useMemo(() => {
    const input = toLayoutInput({
      body: currentTextBody,
      width: bounds.width,
      height: bounds.height,
      colorContext: colorContext ?? EMPTY_COLOR_CONTEXT,
      fontScheme,
    });
    return layoutTextBody({
      ...input,
      measureParagraph: paragraphMeasurer ?? undefined,
    });
  }, [currentTextBody, bounds.width, bounds.height, colorContext, fontScheme, paragraphMeasurer]);

  // Cursor state
  const [cursorState, setCursorState] = useState<CursorState>(INITIAL_CURSOR_STATE);

  const {
    handleChange,
    updateCursorPosition,
  } = useTextEditInput({
    textareaRef,
    currentTextBody,
    layoutResult,
    composition,
    currentText,
    setCurrentText,
    onComplete,
    onSelectionChange,
    setCursorState,
    finishedRef,
    initialTextRef,
  });
  const { handleCompositionStart, handleCompositionUpdate, handleCompositionEnd } = useTextComposition(
    {
      setComposition,
      initialCompositionState: INITIAL_COMPOSITION_STATE,
    },
  );
  const { handleKeyDown } = useTextKeyHandlers({
    isComposing: composition.isComposing,
    currentText,
    onCancel,
    onComplete,
    finishedRef,
  });

  const getOffsetFromPointerEvent = useCallback(
    (event: React.PointerEvent<SVGSVGElement>): number | null => {
      const svg = svgRef.current;
      if (!svg) {
        return null;
      }

      const matrix = svg.getScreenCTM();
      if (!matrix) {
        return null;
      }

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(matrix.inverse());
      const cursorPos = coordinatesToCursorPosition(layoutResult, local.x, local.y);
      return cursorPositionToOffset(currentTextBody, cursorPos);
    },
    [currentTextBody, layoutResult],
  );

  const handleSvgPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event);
      if (!textarea || offset === null) {
        return;
      }

      isDraggingRef.current = true;
      textarea.focus();

      const anchorOffset = event.shiftKey
        ? getSelectionAnchor(textarea)
        : offset;
      dragAnchorRef.current = anchorOffset;
      applySelectionRange(textarea, anchorOffset, offset);
      updateCursorPosition();

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [getOffsetFromPointerEvent, updateCursorPosition],
  );

  const handleSvgPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isDraggingRef.current) {
        return;
      }

      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event);
      if (!textarea || offset === null) {
        return;
      }

      const anchorOffset = dragAnchorRef.current ?? getSelectionAnchor(textarea);
      applySelectionRange(textarea, anchorOffset, offset);
      updateCursorPosition();
      event.preventDefault();
    },
    [getOffsetFromPointerEvent, updateCursorPosition],
  );

  const handleSvgPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) {
      return;
    }
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

  const boundsWidth = bounds.width as number;
  const boundsHeight = bounds.height as number;

  return (
    <TextEditInputFrame
      bounds={bounds}
      slideWidth={slideWidth}
      slideHeight={slideHeight}
      textareaRef={textareaRef}
      value={currentText}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onSelect={updateCursorPosition}
      onCompositionStart={handleCompositionStart}
      onCompositionUpdate={handleCompositionUpdate}
      onCompositionEnd={handleCompositionEnd}
    >
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
        }}
        viewBox={`0 0 ${boundsWidth} ${boundsHeight}`}
        preserveAspectRatio="xMinYMin meet"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerCancel}
      >
        {/* Rendered text */}
        <TextOverlay
          layoutResult={layoutResult}
          composition={composition}
          cursorOffset={textareaRef.current?.selectionStart ?? 0}
        />

        {/* Selection highlights */}
        {cursorState.selectionRects.map((rect, index) => (
          <rect
            key={`sel-${index}`}
            x={rect.x as number}
            y={rect.y as number}
            width={rect.width as number}
            height={rect.height as number}
            fill={colorTokens.selection.primary}
            fillOpacity={0.3}
          />
        ))}

        {/* Cursor caret */}
        <CursorCaret
          cursor={cursorState.cursor}
          isBlinking={cursorState.isBlinking}
        />
      </svg>
    </TextEditInputFrame>
  );
}
