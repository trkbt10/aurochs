/**
 * @file Text edit overlay component
 *
 * Provides inline text editing with contentEditable.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { TextBody } from "../../../pptx/domain";
import type { TextEditBounds } from "../../state";
import { textBodyToHtml, textBodyToPlainText } from "../text-edit/text-to-html";
import { mergeTextIntoBody } from "../text-edit/html-to-text";
import { colorTokens } from "../../ui/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type TextEditOverlayProps = {
  /** Bounds of the text editing area */
  readonly bounds: TextEditBounds;
  /** Initial text body */
  readonly textBody: TextBody;
  /** Slide dimensions for positioning */
  readonly slideWidth: number;
  readonly slideHeight: number;
  /** Called when editing is complete */
  readonly onComplete: (newTextBody: TextBody) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
};

// =============================================================================
// Styles
// =============================================================================

function getOverlayStyle(
  bounds: TextEditBounds,
  slideWidth: number,
  slideHeight: number
): CSSProperties {
  // Calculate percentage-based position
  const left = ((bounds.x as number) / slideWidth) * 100;
  const top = ((bounds.y as number) / slideHeight) * 100;
  const width = ((bounds.width as number) / slideWidth) * 100;
  const height = ((bounds.height as number) / slideHeight) * 100;

  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: bounds.rotation !== 0 ? `rotate(${bounds.rotation}deg)` : undefined,
    transformOrigin: "center center",
    boxSizing: "border-box",
    padding: "4px 8px",
    border: `2px solid ${colorTokens.selection.primary}`,
    borderRadius: "2px",
    backgroundColor: "transparent",
    outline: "none",
    overflow: "auto",
    zIndex: 1000,
    cursor: "text",
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Overlay for inline text editing
 */
export function TextEditOverlay({
  bounds,
  textBody,
  slideWidth,
  slideHeight,
  onComplete,
  onCancel,
}: TextEditOverlayProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialTextRef = useRef<string>(textBodyToPlainText(textBody));

  // Focus on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      // Select all text
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        handleComplete();
      }
    };

    // Add listener on next tick to avoid immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleComplete = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const newText = editorRef.current.innerText;

    // Only update if text changed
    if (newText !== initialTextRef.current) {
      const newTextBody = mergeTextIntoBody(textBody, newText);
      onComplete(newTextBody);
    } else {
      onCancel();
    }
  }, [textBody, onComplete, onCancel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey) {
        // Enter without shift completes editing
        // Shift+Enter inserts a new line
        e.preventDefault();
        handleComplete();
      }
    },
    [onCancel, handleComplete]
  );

  const style = getOverlayStyle(bounds, slideWidth, slideHeight);
  const initialHtml = textBodyToHtml(textBody, { includeStyles: true });

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      style={style}
      onKeyDown={handleKeyDown}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
    />
  );
}
