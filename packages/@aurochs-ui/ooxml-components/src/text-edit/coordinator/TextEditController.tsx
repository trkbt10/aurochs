/**
 * @file Text Edit Controller Component
 *
 * Provides a hybrid text editing experience:
 * - Hidden textarea captures input and tracks cursor/selection
 * - Visual text is rendered as SVG on top
 * - IME composition (pre-edit) text is displayed with underline
 * - Cursor and selection are overlaid
 *
 * Style preservation on copy-paste:
 * - copy/cut event listeners store per-character styled entries in an
 *   instance-scoped ref (not module-level, so multiple editors don't collide).
 * - paste event listener sets a pending styled paste ref without calling
 *   preventDefault — the browser's native paste proceeds normally, preserving
 *   the textarea's undo stack and caret position.
 * - The next mergeTextIntoBody call (triggered by the textarea's change event)
 *   picks up the pending styled paste and applies per-character styles to the
 *   inserted region, falling back to insertion-point inheritance when no
 *   pending paste is present.
 * - The SoT for the current TextBody is the parent component: onSelectionChange
 *   propagates the merged result upward, and the parent feeds it back as the
 *   textBody prop. No secondary state (styledBaseBody) is needed.
 */

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import type { TextBody } from "@aurochs-office/pptx/domain";
import { toLayoutInput, layoutTextBody } from "@aurochs-renderer/pptx/text-layout";
import { createLayoutParagraphMeasurer } from "@aurochs-renderer/pptx/react";
import {
  coordinatesToCursorPosition,
  getLineRangeForPosition,
} from "../input-support/cursor";
import {
  getPlainText,
  cursorPositionToOffset,
  offsetToCursorPosition,
} from "@aurochs-ui/editor-core/text-edit";
import {
  mergeTextIntoBody,
  extractDefaultRunProperties,
  flattenTextBody,
  type StyledCharEntry,
  type PendingStyledPaste,
} from "../input-support/text-body-merge";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import { TextOverlay } from "../text-render/TextOverlay";
import { CursorCaret } from "@aurochs-ui/ui-components/primitives/CursorCaret";
import { EMPTY_COLOR_CONTEXT } from "../input-support/color-context";
import { TextEditInputFrame } from "../input-field/TextEditInputFrame";
import {
  applySelectionRange,
  getSelectionAnchor,
  isPrimaryMouseAction,
  isPrimaryPointerAction,
} from "@aurochs-ui/editor-core/pointer-utils";
import type { TextEditControllerProps, CursorState, CompositionState } from "./types";
import { useTextEditInput } from "./use-text-edit-input";
import { useTextComposition } from "./use-text-composition";
import { useTextKeyHandlers } from "./use-text-key-handlers";
import { ContextMenu, type MenuEntry } from "@aurochs-ui/ui-components";

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
  const rightBoundary = Array.from(rightSlice).findIndex((next) => next === "\n" || isWordChar(next) !== wordChar);
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
  const defaultRunProperties = useMemo(() => extractDefaultRunProperties(textBody), [textBody]);

  // Instance-scoped internal clipboard for styled text.
  // Each TextEditController instance has its own clipboard so multiple
  // editors (PPTX, DOCX, XLSX) mounted simultaneously don't collide.
  // The plainText field verifies sync with the system clipboard.
  const internalClipboardRef = useRef<{
    readonly plainText: string;
    readonly entries: readonly StyledCharEntry[];
  } | null>(null);

  // Pending styled paste: set by the paste event listener, consumed by the
  // next mergeTextIntoBody call (triggered by the textarea's native input event).
  // Using a ref avoids an extra render cycle — the merge reads it synchronously
  // within the same render that processes the textarea change.
  const pendingStyledPasteRef = useRef<PendingStyledPaste | null>(null);

  // Compute current TextBody from edited text.
  // The textBody prop is the SoT: the parent updates it via onSelectionChange.
  // If a styled paste is pending, mergeTextIntoBody applies per-character
  // styles to the inserted region; otherwise insertion-point inheritance is used.
  const currentTextBody = useMemo(() => {
    const pending = pendingStyledPasteRef.current;
    const result = mergeTextIntoBody(textBody, currentText, defaultRunProperties, pending);
    // Clear pending after consumption so subsequent edits don't re-apply it.
    if (pending) {
      pendingStyledPasteRef.current = null;
    }
    return result;
  }, [textBody, currentText, defaultRunProperties]);

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

  const { handleChange, updateCursorPosition } = useTextEditInput({
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

  /**
   * Store styled entries for the given selection range into the internal clipboard.
   */
  const storeStyledSelection = useCallback(
    (start: number, end: number): void => {
      if (start === end) {
        return;
      }
      const allEntries = flattenTextBody(currentTextBody);
      const selectedEntries: StyledCharEntry[] = allEntries.slice(start, end).map((entry) => ({
        char: entry.char,
        kind: entry.kind,
        properties: entry.properties,
      }));
      const selectedText = allEntries
        .slice(start, end)
        .map((e) => e.char)
        .join("");

      internalClipboardRef.current = { plainText: selectedText, entries: selectedEntries };
    },
    [currentTextBody],
  );

  const copySelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    restoreSelectionSnapshot();
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    if (start === end) {
      return;
    }

    storeStyledSelection(start, end);

    if (navigator.clipboard && window.isSecureContext) {
      const selectedText = textarea.value.slice(start, end);
      navigator.clipboard.writeText(selectedText).catch(() => {
        document.execCommand("copy");
      });
    } else {
      document.execCommand("copy");
    }
  }, [restoreSelectionSnapshot, storeStyledSelection]);

  // Native copy event: store styled entries. No preventDefault.
  const handleCopy = useCallback(
    (_event: ClipboardEvent) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      storeStyledSelection(textarea.selectionStart ?? 0, textarea.selectionEnd ?? 0);
    },
    [storeStyledSelection],
  );

  // Native cut event: store styled entries. No preventDefault.
  const handleCut = useCallback(
    (_event: ClipboardEvent) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      storeStyledSelection(textarea.selectionStart ?? 0, textarea.selectionEnd ?? 0);
    },
    [storeStyledSelection],
  );

  // Native paste event: if pasted text matches internal clipboard, prepare
  // pending styled paste for the next merge. No preventDefault — the browser's
  // native paste proceeds, preserving undo stack and caret position.
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const clipboard = internalClipboardRef.current;
      const pastedText = event.clipboardData?.getData("text/plain");
      if (!pastedText || !clipboard) {
        pendingStyledPasteRef.current = null;
        return;
      }

      if (pastedText !== clipboard.plainText) {
        // System clipboard doesn't match internal clipboard — stale.
        internalClipboardRef.current = null;
        pendingStyledPasteRef.current = null;
        return;
      }

      pendingStyledPasteRef.current = {
        plainText: clipboard.plainText,
        entries: clipboard.entries,
      };
    },
    [],
  );

  // Attach clipboard event listeners.
  // These only observe events without interfering with native behavior.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.addEventListener("copy", handleCopy);
    textarea.addEventListener("cut", handleCut);
    textarea.addEventListener("paste", handlePaste);
    return () => {
      textarea.removeEventListener("copy", handleCopy);
      textarea.removeEventListener("cut", handleCut);
      textarea.removeEventListener("paste", handlePaste);
    };
  }, [handleCopy, handleCut, handlePaste]);

  const contextMenuItems: readonly MenuEntry[] = useMemo(() => [{ id: "copy", label: "Copy" }], []);
  const { handleCompositionStart, handleCompositionUpdate, handleCompositionEnd } = useTextComposition({
    setComposition,
    initialCompositionState: INITIAL_COMPOSITION_STATE,
  });
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
    [currentText, currentTextBody, getOffsetFromPointerEvent, layoutResult, updateCursorPosition],
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

  const handleContextMenuAction = useCallback(
    (actionId: string) => {
      if (actionId === "copy") {
        copySelection();
      }
    },
    [copySelection],
  );

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
          {embeddedFontCss && <style type="text/css">{embeddedFontCss}</style>}

          <rect x={0} y={0} width={boundsWidth} height={boundsHeight} fill="transparent" pointerEvents="all" />

          {/* Selection highlights */}
          {showSelectionOverlay &&
            cursorState.selectionRects.map((rect, index) => (
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
          {cursorState.cursor && (
            <CursorCaret
              x={cursorState.cursor.x as number}
              y={cursorState.cursor.y as number}
              height={cursorState.cursor.height as number}
              isBlinking={cursorState.isBlinking}
            />
          )}
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
