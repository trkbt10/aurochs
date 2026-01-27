/**
 * @file Continuous Editor Component
 *
 * Main text editing component for DOCX documents.
 * Uses the same pattern as PPTX TextEditController:
 * - Hidden textarea captures input and tracks cursor/selection
 * - Visual text is rendered as SVG on top
 * - Pointer events (not mouse events) for selection
 */

import type { ReactNode, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxSectionProperties } from "@oxen/docx/domain/section";
import type { DocxNumbering } from "@oxen/docx/domain/numbering";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import type {
  ContinuousCursorPosition,
  ContinuousSelection,
  PageFlowConfig,
  SelectionRect,
  CursorCoordinates,
} from "@oxen/text-layout";
import {
  DEFAULT_PAGE_FLOW_CONFIG,
  getDocumentPlainText,
} from "@oxen/text-layout";
import { useDocumentLayout } from "../document/hooks/use-document-layout";
import {
  coordinatesToCursorPosition,
  cursorPositionToCoordinates,
  cursorPositionToOffset,
  offsetToCursorPosition,
  selectionToRects,
  moveCursorVertically,
} from "./cursor-utils";
import { DocumentTextOverlay, type HyperlinkClickEvent } from "./DocumentTextOverlay";
import { syncParagraphsWithPlainText } from "./text-merge/paragraph-sync";

// =============================================================================
// Types
// =============================================================================

export type ContinuousEditorProps = {
  /** Document paragraphs */
  readonly paragraphs: readonly DocxParagraph[];
  /** Section properties (for page config and text direction) */
  readonly sectPr?: DocxSectionProperties;
  /** Numbering definitions (for list rendering) */
  readonly numbering?: DocxNumbering;
  /** Content width in pixels */
  readonly contentWidth?: Pixels;
  /** Page configuration (overrides sectPr if provided) */
  readonly pageConfig?: PageFlowConfig;
  /** Whether the editor is read-only */
  readonly readOnly?: boolean;
  /** Called when text is changed */
  readonly onTextChange?: (text: string) => void;
  /** Called when selection changes */
  readonly onSelectionChange?: (selection: ContinuousSelection | undefined) => void;
  /** Called when cursor position changes */
  readonly onCursorChange?: (position: ContinuousCursorPosition) => void;
  /** Called when a hyperlink is cmd+clicked */
  readonly onLinkClick?: (event: HyperlinkClickEvent) => void;
};

type CursorState = {
  cursor: CursorCoordinates | undefined;
  selectionRects: readonly SelectionRect[];
  isBlinking: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const editorContainerStyle: CSSProperties = {
  position: "relative",
  outline: "none",
  width: "100%",
  height: "100%",
  overflow: "auto",
};

const hiddenTextareaStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
  // Prevent browser from scrolling to this element
  overflow: "hidden",
  resize: "none",
  border: "none",
  padding: 0,
  margin: 0,
  // Prevent iOS auto-zoom on focus (requires font-size >= 16px)
  fontSize: 16,
};

// =============================================================================
// Helpers
// =============================================================================

function isPrimaryPointerAction(event: ReactPointerEvent<SVGSVGElement>): boolean {
  if (event.pointerType === "mouse") {
    return event.button === 0;
  }
  return event.button === 0 || (event.buttons & 1) === 1;
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

/**
 * Compute selection rectangles for a given range.
 */
function computeSelectionRects(
  start: number,
  end: number,
  paragraphs: readonly DocxParagraph[],
  pagedLayout: Parameters<typeof selectionToRects>[0],
): readonly SelectionRect[] {
  if (start === end) {
    return [];
  }
  const startPos = offsetToCursorPosition(paragraphs, start);
  const endPos = offsetToCursorPosition(paragraphs, end);
  return selectionToRects(pagedLayout, startPos, endPos);
}

// =============================================================================
// Component
// =============================================================================

/**
 * Continuous text editor for DOCX documents.
 */
export function ContinuousEditor({
  paragraphs,
  sectPr,
  numbering,
  contentWidth,
  pageConfig,
  readOnly = false,
  onTextChange,
  onSelectionChange,
  onCursorChange,
  onLinkClick,
}: ContinuousEditorProps): ReactNode {
  // State
  const [isFocused, setIsFocused] = useState(false);
  const [currentText, setCurrentText] = useState(() => getDocumentPlainText(paragraphs));
  // Internal paragraphs state - updated when text changes
  const [internalParagraphs, setInternalParagraphs] = useState<readonly DocxParagraph[]>(paragraphs);
  const [cursorState, setCursorState] = useState<CursorState>({
    cursor: undefined,
    selectionRects: [],
    isBlinking: true,
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);
  // Preferred X position for vertical cursor movement (maintained across up/down arrow presses)
  const preferredXRef = useRef<number | null>(null);
  // Timeout for resuming cursor blink after movement
  const blinkResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Delay before resuming cursor blink after movement (ms) */
  const BLINK_RESUME_DELAY = 500;

  // Update internal state when paragraphs prop changes
  useEffect(() => {
    setCurrentText(getDocumentPlainText(paragraphs));
    setInternalParagraphs(paragraphs);
  }, [paragraphs]);

  // Layout computation - uses internalParagraphs for layout
  const { pagedLayout } = useDocumentLayout({
    paragraphs: internalParagraphs,
    contentWidth,
    mode: "paged",
    pageConfig,
    sectPr,
    numbering,
  });

  // Cleanup blink resume timeout on unmount
  useEffect(() => {
    return () => {
      if (blinkResumeTimeoutRef.current !== null) {
        clearTimeout(blinkResumeTimeoutRef.current);
      }
    };
  }, []);

  // Pause cursor blinking and schedule resume
  const pauseBlinking = useCallback(() => {
    if (blinkResumeTimeoutRef.current !== null) {
      clearTimeout(blinkResumeTimeoutRef.current);
    }
    setCursorState((prev) => ({ ...prev, isBlinking: false }));
    blinkResumeTimeoutRef.current = setTimeout(() => {
      setCursorState((prev) => ({ ...prev, isBlinking: true }));
      blinkResumeTimeoutRef.current = null;
    }, BLINK_RESUME_DELAY);
  }, []);

  // Get offset from pointer event using SVG CTM
  const getOffsetFromPointerEvent = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): number | null => {
      const svg = svgRef.current;
      if (!svg || pagedLayout.pages.length === 0) {
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

      const cursorPos = coordinatesToCursorPosition(pagedLayout, local.x, local.y);
      return cursorPositionToOffset(internalParagraphs, cursorPos);
    },
    [pagedLayout, internalParagraphs],
  );

  // Update cursor position from textarea selection
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const cursorOffset = textarea.selectionDirection === "backward" ? start : end;

    const cursorPos = offsetToCursorPosition(internalParagraphs, cursorOffset);
    const cursorCoords = cursorPositionToCoordinates(pagedLayout, cursorPos);

    // Calculate selection rects if there's a selection
    const selRects = computeSelectionRects(start, end, internalParagraphs, pagedLayout);

    setCursorState((prev) => ({
      ...prev,
      cursor: cursorCoords,
      selectionRects: selRects,
    }));

    // Notify parent
    onCursorChange?.(cursorPos);
    if (start !== end) {
      const startPos = offsetToCursorPosition(internalParagraphs, start);
      const endPos = offsetToCursorPosition(internalParagraphs, end);
      onSelectionChange?.({ anchor: startPos, focus: endPos });
    } else {
      onSelectionChange?.(undefined);
    }
  }, [internalParagraphs, pagedLayout, onCursorChange, onSelectionChange]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
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
      pauseBlinking();
      updateCursorPosition();

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [getOffsetFromPointerEvent, pauseBlinking, updateCursorPosition],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
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
      pauseBlinking();
      updateCursorPosition();
      event.preventDefault();
    },
    [getOffsetFromPointerEvent, pauseBlinking, updateCursorPosition],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) {
      return;
    }
    isDraggingRef.current = false;
    dragAnchorRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const handlePointerCancel = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    dragAnchorRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  // Textarea event handlers
  const handleTextareaChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (readOnly) {
        return;
      }
      const newText = event.target.value;
      setCurrentText(newText);
      // Apply text changes to internal paragraphs for visual update
      const updatedParagraphs = syncParagraphsWithPlainText(internalParagraphs, newText);
      setInternalParagraphs(updatedParagraphs);
      onTextChange?.(newText);
      // Update cursor after state change
      requestAnimationFrame(() => {
        updateCursorPosition();
      });
    },
    [readOnly, internalParagraphs, onTextChange, updateCursorPosition],
  );

  const handleTextareaSelect = useCallback(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const key = event.key;

      // Handle vertical cursor movement (up/down arrows)
      if (key === "ArrowUp" || key === "ArrowDown") {
        const direction = key === "ArrowUp" ? "up" : "down";
        const cursorOffset = textarea.selectionDirection === "backward"
          ? textarea.selectionStart ?? 0
          : textarea.selectionEnd ?? 0;
        const currentPosition = offsetToCursorPosition(internalParagraphs, cursorOffset);

        const result = moveCursorVertically(
          pagedLayout,
          currentPosition,
          direction,
          preferredXRef.current ?? undefined,
        );

        if (result !== undefined) {
          event.preventDefault();
          const newOffset = cursorPositionToOffset(internalParagraphs, result.position);

          if (event.shiftKey) {
            // Extend selection
            const anchorOffset = getSelectionAnchor(textarea);
            applySelectionRange(textarea, anchorOffset, newOffset);
          } else {
            // Move cursor
            textarea.setSelectionRange(newOffset, newOffset);
          }

          // Store the X position for consecutive vertical movements
          preferredXRef.current = result.xPosition;
          pauseBlinking();
          updateCursorPosition();
        }
        return;
      }

      // Reset preferred X on horizontal movement or other keys
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End") {
        preferredXRef.current = null;
        pauseBlinking();
      }

      // Let default behavior handle most keys
      // Just update cursor after key processing
      requestAnimationFrame(() => {
        updateCursorPosition();
      });
    },
    [internalParagraphs, pagedLayout, pauseBlinking, updateCursorPosition],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Focus textarea when container is clicked
  useEffect(() => {
    const handleContainerClick = () => {
      textareaRef.current?.focus();
    };

    const container = containerRef.current;
    container?.addEventListener("click", handleContainerClick);

    return () => {
      container?.removeEventListener("click", handleContainerClick);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="docx-continuous-editor"
      style={editorContainerStyle}
      tabIndex={-1}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Hidden textarea for input handling */}
      <textarea
        ref={textareaRef}
        style={hiddenTextareaStyle}
        value={currentText}
        onChange={handleTextareaChange}
        onSelect={handleTextareaSelect}
        onKeyDown={handleTextareaKeyDown}
        readOnly={readOnly}
        aria-label="Text editor input"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* Document overlay with SVG rendering */}
      <DocumentTextOverlay
        ref={svgRef}
        pagedLayout={pagedLayout}
        cursorState={cursorState}
        isFocused={isFocused}
        showCursor={!readOnly}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLinkClick={onLinkClick}
      />
    </div>
  );
}
