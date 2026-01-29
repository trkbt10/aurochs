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
  useEffect,
} from "react";
import { toLayoutInput, layoutTextBody } from "@oxen-office/pptx-render/text-layout";
import { createLayoutParagraphMeasurer } from "@oxen-office/pptx-render/react";
import {
  getPlainText,
  cursorPositionToOffset,
  coordinatesToCursorPosition,
  offsetToCursorPosition,
  getLineRangeForPosition,
} from "../input-support/cursor";
import { mergeTextIntoBody, extractDefaultRunProperties } from "../input-support/text-body-merge";
import { colorTokens } from "@oxen-ui/ui-components/design-tokens";
import { TextOverlay } from "../text-render/TextOverlay";
import { CursorCaret } from "../text-render/CursorCaret";
import { EMPTY_COLOR_CONTEXT } from "../input-support/color-context";
import { TextEditInputFrame } from "../input-field/TextEditInputFrame";
import {
  applySelectionRange,
  getSelectionAnchor,
  isPrimaryMouseAction,
  isPrimaryPointerAction,
} from "@oxen-ui/editor-core/pointer-utils";
import type { TextEditControllerProps, CursorState, CompositionState } from "./types";
import { useTextEditInput } from "./use-text-edit-input";
import { useTextComposition } from "./use-text-composition";
import { useTextKeyHandlers } from "./use-text-key-handlers";
import { ContextMenu } from "../../../ui/context-menu/ContextMenu";
import type { MenuEntry } from "../../../ui/context-menu/types";
const WORD_CHAR_REGEX = /[\p{L}\p{N}_]/u;

function isWordChar(value: string): boolean {
  return WORD_CHAR_REGEX.test(value);
}

function getWordRange(text: string, offset: number): { start: number; end: number } {
  if (text.length === 0) {
    return { start: 0, end: 0 };
  }

  const clamped = Math.max(0, Math.min(offset, text.length - 1));
  const char = text[clamped];

  if (char === "\n") {
    return { start: clamped, end: clamped + 1 };
  }

  const wordChar = isWordChar(char);
  const leftSlice = text.slice(0, clamped);
  const leftBoundary = Array.from(leftSlice)
    .reverse()
    .findIndex((prev) => prev === "\n" || isWordChar(prev) !== wordChar);
  const start = leftBoundary === -1 ? 0 : clamped - leftBoundary;

  const rightSlice = text.slice(clamped + 1);
  const rightBoundary = Array.from(rightSlice)
    .findIndex((next) => next === "\n" || isWordChar(next) !== wordChar);
  const end = rightBoundary === -1 ? text.length : clamped + 1 + rightBoundary;

  return { start, end };
}

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
  embeddedFontCss,
  onComplete,
  onCancel,
  showSelectionOverlay = true,
  showFrameOutline = true,
  onSelectionChange,
}: TextEditControllerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const selectionSnapshotRef = useRef({
    start: 0,
    end: 0,
    direction: "forward" as HTMLTextAreaElement["selectionDirection"],
  });
  const selectionGuardRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [currentText, setCurrentText] = useState(() => getPlainText(textBody));
  const [composition, setComposition] = useState<CompositionState>(INITIAL_COMPOSITION_STATE);
  const initialTextRef = useRef(getPlainText(textBody));
  const finishedRef = useRef(false);

  useEffect(() => {
    initialTextRef.current = getPlainText(textBody);
  }, [textBody]);

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
    onSelectionSnapshot: (snapshot) => {
      selectionSnapshotRef.current = snapshot;
    },
    selectionGuardRef,
    setCursorState,
    finishedRef,
    initialTextRef,
  });

  const restoreSelectionSnapshot = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const snapshot = selectionSnapshotRef.current;
    textarea.focus();
    textarea.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction ?? "forward");
    updateCursorPosition();
  }, [updateCursorPosition]);

  const copySelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    restoreSelectionSnapshot();
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const selectedText = textarea.value.slice(start, end);
    if (selectedText.length === 0) {
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(selectedText).catch(() => {
        document.execCommand("copy");
      });
    } else {
      document.execCommand("copy");
    }
  }, [restoreSelectionSnapshot]);

  const contextMenuItems: readonly MenuEntry[] = useMemo(
    () => [
      { id: "copy", label: "Copy" },
    ],
    [],
  );
  const { handleCompositionStart, handleCompositionUpdate, handleCompositionEnd } = useTextComposition(
    {
      setComposition,
      initialCompositionState: INITIAL_COMPOSITION_STATE,
    },
  );
  const { handleKeyDown } = useTextKeyHandlers({
    isComposing: composition.isComposing,
    onCancel,
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
      if (!isPrimaryPointerAction(event)) {
        selectionGuardRef.current = true;
        event.preventDefault();
        return;
      }

      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event);
      if (!textarea || offset === null) {
        return;
      }

      selectionGuardRef.current = false;
      isDraggingRef.current = true;
      textarea.focus();

      const anchorOffset = event.shiftKey ? getSelectionAnchor(textarea) : offset;
      dragAnchorRef.current = anchorOffset;
      applySelectionRange({ textarea, anchorOffset, focusOffset: offset });
      updateCursorPosition();

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [
      currentText,
      currentTextBody,
      getOffsetFromPointerEvent,
      layoutResult,
      updateCursorPosition,
    ],
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
      applySelectionRange({ textarea, anchorOffset, focusOffset: offset });
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
    selectionGuardRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const handleSvgPointerCancel = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    dragAnchorRef.current = null;
    selectionGuardRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const handleSvgClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (event.detail < 3) {
        return;
      }
      if (!isPrimaryMouseAction(event)) {
        event.preventDefault();
        return;
      }
      if (isDraggingRef.current) {
        return;
      }

      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event as React.PointerEvent<SVGSVGElement>);
      if (!textarea || offset === null) {
        return;
      }

      const position = offsetToCursorPosition(currentTextBody, offset);
      const lineRange = getLineRangeForPosition(position, layoutResult);
      if (!lineRange) {
        return;
      }

      const startOffset = cursorPositionToOffset(currentTextBody, lineRange.start);
      const endOffset = cursorPositionToOffset(currentTextBody, lineRange.end);
      applySelectionRange({ textarea, anchorOffset: startOffset, focusOffset: endOffset });
      updateCursorPosition();
      event.preventDefault();
    },
    [currentTextBody, getOffsetFromPointerEvent, layoutResult, updateCursorPosition],
  );

  const handleSvgDoubleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isPrimaryMouseAction(event)) {
        event.preventDefault();
        return;
      }
      if (isDraggingRef.current) {
        return;
      }

      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event as React.PointerEvent<SVGSVGElement>);
      if (!textarea || offset === null) {
        return;
      }

      const range = getWordRange(currentText, offset);
      applySelectionRange({ textarea, anchorOffset: range.start, focusOffset: range.end });
      updateCursorPosition();
      event.preventDefault();
    },
    [currentText, getOffsetFromPointerEvent, updateCursorPosition],
  );

  const handleSvgContextMenuCapture = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      event.preventDefault();
      selectionGuardRef.current = true;
      restoreSelectionSnapshot();
      setContextMenu({ x: event.clientX, y: event.clientY });
      event.stopPropagation();
    },
    [restoreSelectionSnapshot],
  );

  const handleTextareaContextMenuCapture = useCallback(
    (event: React.MouseEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      selectionGuardRef.current = true;
      restoreSelectionSnapshot();
      setContextMenu({ x: event.clientX, y: event.clientY });
      event.stopPropagation();
    },
    [restoreSelectionSnapshot],
  );

  const handleTextareaNonPrimaryMouseDown = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    const current = event.currentTarget;
    selectionSnapshotRef.current = {
      start: current.selectionStart ?? 0,
      end: current.selectionEnd ?? 0,
      direction: current.selectionDirection ?? "forward",
    };
    selectionGuardRef.current = true;
  }, []);

  const handleContextMenuAction = useCallback((actionId: string) => {
    if (actionId === "copy") {
      copySelection();
    }
  }, [copySelection]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
    selectionGuardRef.current = false;
  }, []);


  const boundsWidth = bounds.width as number;
  const boundsHeight = bounds.height as number;

  return (
    <>
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
      onNonPrimaryMouseDown={handleTextareaNonPrimaryMouseDown}
      onContextMenuCapture={handleTextareaContextMenuCapture}
      showFrameOutline={showFrameOutline}
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
          zIndex: 2,
        }}
        viewBox={`0 0 ${boundsWidth} ${boundsHeight}`}
        preserveAspectRatio="xMinYMin meet"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerCancel}
        onClick={handleSvgClick}
        onDoubleClick={handleSvgDoubleClick}
        onContextMenuCapture={handleSvgContextMenuCapture}
      >
        {/* Embedded fonts CSS (from PDF import) */}
        {embeddedFontCss && (
          <style type="text/css">{embeddedFontCss}</style>
        )}

        <rect
          x={0}
          y={0}
          width={boundsWidth}
          height={boundsHeight}
          fill="transparent"
          pointerEvents="all"
        />

        {/* Selection highlights */}
        {showSelectionOverlay && cursorState.selectionRects.map((rect, index) => (
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

        {/* Rendered text */}
        <TextOverlay
          layoutResult={layoutResult}
          composition={composition}
          cursorOffset={textareaRef.current?.selectionStart ?? 0}
        />

        {/* Cursor caret */}
        <CursorCaret
          cursor={cursorState.cursor}
          isBlinking={cursorState.isBlinking}
        />
      </svg>
    </TextEditInputFrame>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onAction={handleContextMenuAction}
          onClose={handleContextMenuClose}
        />
      )}
    </>
  );
}
