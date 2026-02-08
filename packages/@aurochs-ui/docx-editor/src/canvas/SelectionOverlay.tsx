/**
 * @file Selection overlay component
 *
 * Renders visual selection indicators for document elements and text.
 */

import { useEffect, useState, useCallback, type ReactNode, type CSSProperties, type RefObject } from "react";
import type { DocxSelectionState, TextPosition } from "../context/document/state/selection";
import type { TextEditState } from "../context/document/editor/types";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type SelectionOverlayProps = {
  /** Reference to the container element */
  readonly containerRef: RefObject<HTMLElement | null>;
  /** Selection state */
  readonly selection: DocxSelectionState;
  /** Text edit state */
  readonly textEdit: TextEditState;
};

/**
 * Bounds for a selection box.
 */
type SelectionBounds = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Constants
// =============================================================================

const SELECTION_COLOR = colorTokens.selection.primary;
const SELECTION_BORDER_WIDTH = 2;
const TEXT_HIGHLIGHT_OPACITY = 0.2;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get bounding rect for an element by its ID.
 */
function getElementBounds(containerRef: RefObject<HTMLElement | null>, elementId: string): SelectionBounds | null {
  const container = containerRef.current;
  if (!container) {
    return null;
  }

  const element = container.querySelector(`[data-element-id="${elementId}"]`);
  if (!element) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  return {
    top: elementRect.top - containerRect.top + container.scrollTop,
    left: elementRect.left - containerRect.left + container.scrollLeft,
    width: elementRect.width,
    height: elementRect.height,
  };
}

/**
 * Get text selection rects (for text range selection).
 */
function getTextSelectionRects(
  containerRef: RefObject<HTMLElement | null>,
  _range: { start: TextPosition; end: TextPosition },
): DOMRect[] {
  const container = containerRef.current;
  if (!container) {
    return [];
  }

  // Use browser's selection API to get text selection rects
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return [];
  }

  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects());

  const containerRect = container.getBoundingClientRect();

  // Adjust rects relative to container
  return rects.map((rect) => {
    return new DOMRect(
      rect.left - containerRect.left + container.scrollLeft,
      rect.top - containerRect.top + container.scrollTop,
      rect.width,
      rect.height,
    );
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Element selection box component.
 */
function ElementSelectionBox({
  bounds,
  isPrimary,
}: {
  readonly bounds: SelectionBounds;
  readonly isPrimary: boolean;
}): ReactNode {
  const style: CSSProperties = {
    position: "absolute",
    top: bounds.top,
    left: bounds.left,
    width: bounds.width,
    height: bounds.height,
    boxSizing: "border-box",
    border: `${SELECTION_BORDER_WIDTH}px ${isPrimary ? "solid" : "dashed"} ${SELECTION_COLOR}`,
    pointerEvents: "none",
    borderRadius: 2,
  };

  return <div style={style} />;
}

/**
 * Text selection highlight component.
 */
function TextSelectionHighlight({ rects }: { readonly rects: readonly DOMRect[] }): ReactNode {
  if (rects.length === 0) {
    return null;
  }

  return (
    <>
      {rects.map((rect, index) => {
        const style: CSSProperties = {
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          backgroundColor: SELECTION_COLOR,
          opacity: TEXT_HIGHLIGHT_OPACITY,
          pointerEvents: "none",
        };

        return <div key={index} style={style} />;
      })}
    </>
  );
}

/**
 * Text cursor caret component.
 */
function TextCursor({
  containerRef,
  position,
}: {
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly position: TextPosition;
}): ReactNode {
  const [caretStyle, setCaretStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Find the paragraph element
    const paragraph = container.querySelector(`[data-element-id="${position.paragraphIndex}"]`);
    if (!paragraph) {
      return;
    }

    // For now, just position at the start of the paragraph
    // Real implementation would compute character position
    const containerRect = container.getBoundingClientRect();
    const paragraphRect = paragraph.getBoundingClientRect();

    setCaretStyle({
      position: "absolute",
      top: paragraphRect.top - containerRect.top + container.scrollTop,
      left: paragraphRect.left - containerRect.left + container.scrollLeft,
      width: 2,
      height: 20,
      backgroundColor: SELECTION_COLOR,
      pointerEvents: "none",
      animation: "blink 1s infinite",
    });
  }, [containerRef, position]);

  if (!caretStyle) {
    return null;
  }

  return <div style={caretStyle} />;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Selection overlay for document editing.
 *
 * Renders:
 * - Element selection boxes
 * - Text selection highlights
 * - Text cursor caret
 */
export function SelectionOverlay({ containerRef, selection, textEdit }: SelectionOverlayProps): ReactNode {
  const [elementBounds, setElementBounds] = useState<Map<string, SelectionBounds>>(new Map());
  const [textRects, setTextRects] = useState<DOMRect[]>([]);

  // Update element bounds when selection changes
  const updateElementBounds = useCallback(() => {
    const newBounds = new Map<string, SelectionBounds>();

    for (const elementId of selection.element.selectedIds) {
      const bounds = getElementBounds(containerRef, elementId);
      if (bounds) {
        newBounds.set(elementId, bounds);
      }
    }

    setElementBounds(newBounds);
  }, [containerRef, selection.element.selectedIds]);

  // Update text selection rects
  const updateTextRects = useCallback(() => {
    if (selection.text.range) {
      const rects = getTextSelectionRects(containerRef, selection.text.range);
      setTextRects(rects);
    } else {
      setTextRects([]);
    }
  }, [containerRef, selection.text.range]);

  // Update on selection change
  useEffect(() => {
    updateElementBounds();
    updateTextRects();
  }, [updateElementBounds, updateTextRects]);

  // Update on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      updateElementBounds();
      updateTextRects();
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef, updateElementBounds, updateTextRects]);

  // Update on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateElementBounds();
      updateTextRects();
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [containerRef, updateElementBounds, updateTextRects]);

  // Nothing to render if no selection
  const hasElementSelection = selection.element.selectedIds.length > 0;
  const hasTextSelection = selection.text.range !== undefined;
  const hasTextCursor = textEdit.isEditing && textEdit.cursorPosition !== undefined;

  if (!hasElementSelection && !hasTextSelection && !hasTextCursor) {
    return null;
  }

  const overlayStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    overflow: "hidden",
  };

  return (
    <div style={overlayStyle} data-testid="selection-overlay">
      {/* Element selection boxes */}
      {selection.mode === "element" &&
        Array.from(elementBounds.entries()).map(([elementId, bounds]) => (
          <ElementSelectionBox key={elementId} bounds={bounds} isPrimary={elementId === selection.element.primaryId} />
        ))}

      {/* Text selection highlight */}
      {selection.mode === "text" && <TextSelectionHighlight rects={textRects} />}

      {/* Text cursor */}
      {hasTextCursor && textEdit.cursorPosition && (
        <TextCursor containerRef={containerRef} position={textEdit.cursorPosition} />
      )}
    </div>
  );
}
