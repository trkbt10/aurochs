/**
 * @file Inline text editing overlay for the fig editor canvas.
 *
 * Uses the shared TextEditInputFrame component from editor-controls.
 * This is the "hidden textarea + SVG selection" pattern used by pptx-editor.
 *
 * Architecture:
 * 1. TextEditInputFrame positions a container at the text node's absolute
 *    bounds using percentage-based positioning (zoom-independent).
 * 2. A hidden textarea captures keyboard and IME input.
 * 3. The existing SVG rendering of the text node remains visible beneath —
 *    the overlay is transparent except for the selection highlight and caret.
 * 4. On text change, the node's textData.characters is updated via
 *    UPDATE_NODE, which re-renders the SVG text in place.
 * 5. showTextSelection mode renders cursor and selection using canvas
 *    measureText, matching the SVG text layout.
 *
 * The user sees the same SVG-rendered text during editing, with a cursor
 * and selection overlay on top. This achieves WYSIWYG editing because the
 * SVG renderer is the single source of truth for text appearance.
 */

import { useCallback, useRef, useState, useEffect, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../context/fig-editor/types";
import { TextEditInputFrame } from "@aurochs-ui/editor-controls/text-edit";
import { useTextComposition } from "@aurochs-ui/editor-controls/text-edit";
import { useCanvasViewportRequired } from "@aurochs-ui/editor-controls/canvas";
import { createInitialCompositionState, type CompositionState } from "@aurochs-ui/editor-core/text-edit";

// =============================================================================
// Types
// =============================================================================

type FigTextEditOverlayProps = {
  /** The TEXT node being edited */
  readonly node: FigDesignNode;
  /** Absolute bounds of the text node in page coordinates */
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
  };
  /** Canvas dimensions for percentage-based positioning */
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================

export function FigTextEditOverlay({
  node,
  bounds,
  canvasWidth,
  canvasHeight,
  dispatch,
}: FigTextEditOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { screenToPage } = useCanvasViewportRequired();
  const textData = node.textData;
  const currentText = textData?.characters ?? "";

  // --- Click-outside detection ---
  const handleOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const page = screenToPage(e.clientX, e.clientY);
      if (!page) return;
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

  // Focus textarea on mount
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      // Place cursor at end
      ta.setSelectionRange(currentText.length, currentText.length);
    }
  }, []); // Only on mount

  // --- Text change handler ---
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => {
          if (!n.textData) return n;
          return {
            ...n,
            textData: { ...n.textData, characters: newText },
          };
        },
      });
    },
    [dispatch, node.id],
  );

  // --- Key handler (Escape to exit) ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: "EXIT_TEXT_EDIT" });
      }
      // Prevent global keyboard shortcuts (Delete, Cmd+D, etc.) from firing
      // while editing text. Only Escape should propagate.
      e.stopPropagation();
    },
    [dispatch],
  );

  // --- IME composition ---
  const initialComposition = createInitialCompositionState();
  const [composition, setComposition] = useState<CompositionState>(initialComposition);
  const {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
  } = useTextComposition({ setComposition, initialCompositionState: initialComposition });

  // --- Font information for accurate cursor positioning ---
  const textFont = textData
    ? {
        family: textData.fontName.family,
        size: textData.fontSize,
        weight: textData.fontName.style.toLowerCase().includes("bold") ? "bold" : "normal",
        style: textData.fontName.style.toLowerCase().includes("italic") ? "italic" : "normal",
      }
    : undefined;

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
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        showFrameOutline
        showTextSelection
        textFont={textFont}
      >
        {/* No custom children needed — showTextSelection handles cursor/selection */}
        {null}
      </TextEditInputFrame>
    </div>
  );
}
