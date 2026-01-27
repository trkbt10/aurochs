/**
 * @file DOCX Text Edit Controller
 *
 * Coordinator for inline text editing in DOCX documents.
 * Manages the textarea + SVG overlay pattern for text input.
 *
 * Based on PPTX TextEditController pattern.
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRunProperties } from "@oxen/docx/domain/run";
import type { DocxStyles } from "@oxen/docx/domain/styles";
import type { ElementId } from "../canvas/DocumentCanvas";
import {
  type DocxCursorPosition,
  getPlainTextFromParagraph,
} from "./cursor";
import { mergeTextIntoParagraph } from "./text-merge/paragraph-edit";
import { DocxTextInputFrame } from "./DocxTextInputFrame";
import {
  layoutParagraphText,
  getCursorCoordinates,
  coordinatesToOffset,
  computeSelectionRects,
  computeRunSvgStyles,
  type LayoutResult,
  type CursorCoordinates,
  type SelectionRect,
} from "./DocxTextOverlay";
import { CursorCaret } from "./CursorCaret";

// =============================================================================
// Constants
// =============================================================================

const SELECTION_FILL = "color-mix(in srgb, var(--selection-primary) 30%, transparent)";

const WORD_CHAR_REGEX = /[\p{L}\p{N}_]/u;

// =============================================================================
// Types
// =============================================================================

export type DocxTextEditControllerProps = {
  /** Element ID being edited */
  readonly editingElementId: ElementId;
  /** Paragraph being edited */
  readonly paragraph: DocxParagraph;
  /** Bounding rect for positioning */
  readonly bounds: DOMRect;
  /** Document styles for default formatting */
  readonly styles?: DocxStyles;
  /** Initial cursor position */
  readonly initialCursorPosition?: DocxCursorPosition;
  /** Called when text changes */
  readonly onTextChange: (paragraph: DocxParagraph) => void;
  /** Called when selection changes */
  readonly onSelectionChange: (selection: {
    start: DocxCursorPosition;
    end: DocxCursorPosition;
  }) => void;
  /** Called when editing should exit */
  readonly onExit: () => void;
};

/**
 * Cursor state for rendering.
 */
type CursorState = {
  readonly cursor: CursorCoordinates | undefined;
  readonly selectionRects: readonly SelectionRect[];
  readonly isBlinking: boolean;
};

/**
 * Local state for text editing.
 */
export type TextEditLocalState = {
  /** Current text value (flat string for textarea) */
  readonly currentText: string;
  /** Current paragraph (structured document model) */
  readonly currentParagraph: DocxParagraph;
  /** Selection start offset in textarea */
  readonly selectionStart: number;
  /** Selection end offset in textarea */
  readonly selectionEnd: number;
  /** Whether IME composition is active */
  readonly isComposing: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

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

/**
 * Create initial local state from paragraph.
 */
function createInitialState(
  paragraph: DocxParagraph,
  initialCursorPosition?: DocxCursorPosition
): TextEditLocalState {
  const text = getPlainTextFromParagraph(paragraph);
  const offset = initialCursorPosition?.charOffset ?? text.length;

  return {
    currentText: text,
    currentParagraph: paragraph,
    selectionStart: offset,
    selectionEnd: offset,
    isComposing: false,
  };
}

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
): void {
  const start = Math.min(anchorOffset, focusOffset);
  const end = Math.max(anchorOffset, focusOffset);
  const direction = focusOffset < anchorOffset ? "backward" : "forward";
  textarea.setSelectionRange(start, end, direction);
}

function isPrimaryPointerAction(event: React.PointerEvent<SVGSVGElement>): boolean {
  if (event.pointerType === "mouse") {
    return event.button === 0;
  }
  return event.button === 0 || (event.buttons & 1) === 1;
}

function isPrimaryMouseAction(event: React.MouseEvent<SVGSVGElement>): boolean {
  return event.button === 0;
}

function computeSelectionRectsIfRange(
  layout: LayoutResult,
  start: number,
  end: number,
  defaultRunProperties: DocxRunProperties | undefined,
): readonly SelectionRect[] {
  if (start === end) {
    return [];
  }
  return computeSelectionRects(layout, start, end, defaultRunProperties);
}

// =============================================================================
// Initial States
// =============================================================================

const INITIAL_CURSOR_STATE: CursorState = {
  cursor: undefined,
  selectionRects: [],
  isBlinking: true,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Text edit controller for DOCX paragraphs.
 *
 * Coordinates:
 * - Hidden textarea for input capture
 * - SVG overlay for text rendering
 * - Cursor caret display
 * - IME composition support
 */
export function DocxTextEditController({
  editingElementId,
  paragraph,
  bounds,
  styles,
  initialCursorPosition,
  onTextChange,
  onSelectionChange,
  onExit,
}: DocxTextEditControllerProps): ReactNode {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Local editing state
  const [state, setState] = useState<TextEditLocalState>(() =>
    createInitialState(paragraph, initialCursorPosition)
  );

  // Cursor state
  const [cursorState, setCursorState] = useState<CursorState>(INITIAL_CURSOR_STATE);

  // Track if we've initialized
  const initializedRef = useRef(false);

  // Extract default run properties
  const defaultRunProperties = styles?.docDefaults?.rPrDefault?.rPr;

  // Compute layout result for current text
  const layout: LayoutResult = useMemo(
    () => layoutParagraphText(state.currentParagraph, bounds, styles),
    [state.currentParagraph, bounds, styles],
  );

  // Update cursor position based on textarea selection
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || state.isComposing) {
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const cursor = getCursorCoordinates(layout, end, defaultRunProperties);
    const selectionRects = computeSelectionRectsIfRange(layout, start, end, defaultRunProperties);

    setCursorState({
      cursor,
      selectionRects,
      isBlinking: start === end,
    });

    // Notify selection change
    onSelectionChange({
      start: { elementIndex: 0, charOffset: start },
      end: { elementIndex: 0, charOffset: end },
    });
  }, [layout, defaultRunProperties, state.isComposing, onSelectionChange]);

  // Focus textarea on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !initializedRef.current) {
      textarea.focus();
      textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
      initializedRef.current = true;
      updateCursorPosition();
    }
  }, [state.selectionStart, state.selectionEnd, updateCursorPosition]);

  // Get offset from pointer event
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

      return coordinatesToOffset(layout, local.x, local.y, defaultRunProperties);
    },
    [layout, defaultRunProperties],
  );

  // Handle text input change
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newText = event.target.value;
      const newParagraph = mergeTextIntoParagraph(paragraph, newText);

      setState((prev) => ({
        ...prev,
        currentText: newText,
        currentParagraph: newParagraph,
        selectionStart: event.target.selectionStart ?? newText.length,
        selectionEnd: event.target.selectionEnd ?? newText.length,
      }));

      onTextChange(newParagraph);
    },
    [paragraph, onTextChange],
  );

  // Handle selection change in textarea
  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || state.isComposing) {
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    setState((prev) => ({
      ...prev,
      selectionStart: start,
      selectionEnd: end,
    }));

    updateCursorPosition();
  }, [state.isComposing, updateCursorPosition]);

  // Handle key events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't handle keys during IME composition
      if (state.isComposing) {
        return;
      }

      // Escape exits text editing
      if (event.key === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }
    },
    [state.isComposing, onExit],
  );

  // IME Composition handlers
  const handleCompositionStart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComposing: true,
    }));
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComposing: false,
    }));

    // After composition ends, update the paragraph
    const textarea = textareaRef.current;
    if (textarea) {
      const newText = textarea.value;
      const newParagraph = mergeTextIntoParagraph(paragraph, newText);

      setState((prev) => ({
        ...prev,
        currentText: newText,
        currentParagraph: newParagraph,
        selectionStart: textarea.selectionStart ?? newText.length,
        selectionEnd: textarea.selectionEnd ?? newText.length,
      }));

      onTextChange(newParagraph);
      updateCursorPosition();
    }
  }, [paragraph, onTextChange, updateCursorPosition]);

  // Pointer event handlers for SVG overlay
  const handleSvgPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isPrimaryPointerAction(event)) {
        event.preventDefault();
        return;
      }

      const textarea = textareaRef.current;
      const offset = getOffsetFromPointerEvent(event);
      if (!textarea || offset === null) {
        return;
      }

      isDraggingRef.current = true;
      textarea.focus();

      const anchorOffset = event.shiftKey ? getSelectionAnchor(textarea) : offset;
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

  // Get offset from mouse event (for double-click)
  const getOffsetFromMouseEvent = useCallback(
    (event: React.MouseEvent<SVGSVGElement>): number | null => {
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

      return coordinatesToOffset(layout, local.x, local.y, defaultRunProperties);
    },
    [layout, defaultRunProperties],
  );

  // Double-click for word selection
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
      const offset = getOffsetFromMouseEvent(event);
      if (!textarea || offset === null) {
        return;
      }

      const range = getWordRange(state.currentText, offset);
      applySelectionRange(textarea, range.start, range.end);
      updateCursorPosition();
      event.preventDefault();
    },
    [state.currentText, getOffsetFromMouseEvent, updateCursorPosition],
  );

  // Handle blur to exit editing
  const handleBlur = useCallback(() => {
    // Small delay to allow for click events on the SVG
    setTimeout(() => {
      if (!textareaRef.current?.matches(":focus")) {
        onExit();
      }
    }, 100);
  }, [onExit]);

  const boundsWidth = Math.max(0, bounds.width);
  const boundsHeight = Math.max(0, bounds.height);

  return (
    <div
      style={{
        position: "absolute",
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: "none",
      }}
      data-testid="docx-text-edit-controller"
      data-editing-element={editingElementId}
    >
      {/* Hidden textarea for input capture */}
      <DocxTextInputFrame
        textareaRef={textareaRef}
        value={state.currentText}
        selectionStart={state.selectionStart}
        selectionEnd={state.selectionEnd}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onBlur={handleBlur}
      />

      {/* SVG overlay for text rendering and interaction */}
      <svg
        ref={svgRef}
        data-testid="docx-text-edit-svg"
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
        onDoubleClick={handleSvgDoubleClick}
      >
        {/* Transparent hit area */}
        <rect
          x={0}
          y={0}
          width={boundsWidth}
          height={boundsHeight}
          fill="transparent"
          pointerEvents="all"
        />

        {/* Selection highlights */}
        {cursorState.selectionRects.map((rect, index) => (
          <rect
            key={`sel-${index}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={SELECTION_FILL}
          />
        ))}

        {/* Text rendering */}
        {layout.lines.flatMap((line, li) =>
          line.spans.map((span, si) => (
            <text
              key={`${li}-${si}`}
              x={span.x}
              y={line.y}
              style={computeRunSvgStyles(span.runProperties, defaultRunProperties)}
              xmlSpace="preserve"
            >
              {span.text}
            </text>
          )),
        )}

        {/* Cursor caret */}
        <CursorCaret
          x={cursorState.cursor?.x ?? 0}
          y={cursorState.cursor?.y ?? 0}
          height={cursorState.cursor?.height ?? 18}
          isBlinking={cursorState.isBlinking}
        />
      </svg>
    </div>
  );
}

// =============================================================================
// Exports for Testing
// =============================================================================

export { createInitialState };
