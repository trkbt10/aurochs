/**
 * @file Code edit input hook
 *
 * Manages textarea input, selection syncing, and cursor position updates.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type RefObject,
} from "react";
import type { VbaEditorAction } from "../../context/vba-editor/types";
import type { CompositionState } from "./use-code-composition";
import {
  offsetToLineColumn,
  lineColumnToCoordinates,
  calculateSelectionRects,
  type CursorCoordinates,
  type SelectionRect,
  type MeasureTextFn,
} from "./cursor-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Visual cursor state for rendering.
 */
export type CodeCursorState = {
  /** Cursor coordinates (when no selection) */
  readonly cursor: CursorCoordinates | undefined;
  /** Selection rectangles (when selection exists) */
  readonly selectionRects: readonly SelectionRect[];
  /** Whether cursor should blink */
  readonly isBlinking: boolean;
};

/**
 * Initial cursor state.
 */
export const INITIAL_CURSOR_STATE: CodeCursorState = {
  cursor: undefined,
  selectionRects: [],
  isBlinking: true,
};

// =============================================================================
// Hook
// =============================================================================

type UseCodeEditInputArgs = {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly composition: CompositionState;
  readonly dispatch: (action: VbaEditorAction) => void;
  readonly moduleName: string | undefined;
  readonly onCursorStateChange: (state: CodeCursorState) => void;
  readonly lineHeight?: number;
  /** Function to measure text width (for variable-width support) */
  readonly measureText?: MeasureTextFn;
};

type UseCodeEditInputResult = {
  readonly handleChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly updateCursorPosition: () => void;
};

/**
 * Hook for managing code input and cursor/selection synchronization.
 */
export function useCodeEditInput({
  textareaRef,
  composition,
  dispatch,
  moduleName,
  onCursorStateChange,
  lineHeight,
  measureText,
}: UseCodeEditInputArgs): UseCodeEditInputResult {
  const rafRef = useRef<number | null>(null);

  /**
   * Update cursor position from textarea selection.
   */
  const updateCursorPosition = useCallback(() => {
    if (composition.isComposing) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const hasSelection = selectionStart !== selectionEnd;
    const lines = value.split("\n");

    if (hasSelection) {
      // Selection mode
      const start = offsetToLineColumn(value, selectionStart);
      const end = offsetToLineColumn(value, selectionEnd);

      // Dispatch selection to state
      dispatch({
        type: "SET_SELECTION",
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
      });

      // Calculate selection rects
      const rects = calculateSelectionRects({
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
        lines,
        lineHeight,
        measureText,
      });

      onCursorStateChange({
        cursor: undefined,
        selectionRects: rects,
        isBlinking: false,
      });
    } else {
      // Cursor mode (no selection)
      const pos = offsetToLineColumn(value, selectionStart);
      const lineText = lines[pos.line - 1] ?? "";

      // Dispatch cursor to state
      dispatch({ type: "SET_CURSOR", line: pos.line, column: pos.column });
      dispatch({ type: "CLEAR_SELECTION" });

      // Calculate cursor coordinates
      const coords = lineColumnToCoordinates({
        line: pos.line,
        column: pos.column,
        lineText,
        lineHeight,
        measureText,
      });

      onCursorStateChange({
        cursor: coords,
        selectionRects: [],
        isBlinking: true,
      });
    }
  }, [
    composition.isComposing,
    textareaRef,
    dispatch,
    onCursorStateChange,
    lineHeight,
    measureText,
  ]);

  /**
   * Handle text change from textarea.
   */
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = event.target;
      const newText = textarea.value;
      const cursorOffset = textarea.selectionStart;

      // Dispatch source update with cursor position
      if (moduleName) {
        dispatch({
          type: "UPDATE_MODULE_SOURCE",
          moduleName,
          source: newText,
          cursorOffset,
        });
      }

      // Update cursor position in next frame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        updateCursorPosition();
        rafRef.current = null;
      });
    },
    [dispatch, moduleName, updateCursorPosition]
  );

  // Focus textarea on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
    }
  }, [textareaRef]);

  // Listen to selection change events
  useEffect(() => {
    const handleSelectionChange = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        updateCursorPosition();
        rafRef.current = null;
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateCursorPosition]);

  return {
    handleChange,
    updateCursorPosition,
  };
}
