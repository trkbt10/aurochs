/**
 * @file VBA Code Editor Component
 *
 * Main code editing area with syntax highlighting, line numbers, and editing support.
 * Features virtual scrolling for efficient rendering of large files.
 */

import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useVbaEditor } from "../../context/vba-editor";
import { LineNumbers } from "./LineNumbers";
import { useLineTokenCache } from "./use-line-token-cache";
import {
  HtmlCodeRenderer,
  type CodeRendererComponent,
} from "./renderers";
import { useVirtualLines } from "./use-virtual-lines";
import { useDebouncedHistory } from "./use-debounced-history";
import { useScopedSelectionChange } from "./use-scoped-selection-change";
import {
  useCodeComposition,
  INITIAL_COMPOSITION_STATE,
  type CompositionState,
} from "./use-code-composition";
import {
  INITIAL_CURSOR_STATE,
  type CodeCursorState,
} from "./use-code-edit-input";
import { useCodeKeyHandlers } from "./use-code-key-handlers";
import { useFontMetrics } from "./use-font-metrics";
import {
  offsetToLineColumn,
  lineColumnToCoordinates,
  calculateSelectionRects,
} from "./cursor-utils";
import styles from "./VbaCodeEditor.module.css";

// =============================================================================
// Constants
// =============================================================================

const LINE_HEIGHT = 21;
const OVERSCAN = 5;
const HISTORY_DEBOUNCE_MS = 300;

// =============================================================================
// Types
// =============================================================================

export type VbaCodeEditorProps = {
  readonly style?: CSSProperties;
  /** Code renderer component. Defaults to HtmlCodeRenderer. */
  readonly Renderer?: CodeRendererComponent;
};

// =============================================================================
// Memoized Style Objects
// =============================================================================

const CURSOR_BASE_STYLE: CSSProperties = {
  position: "absolute",
  width: 2,
  backgroundColor: "var(--vba-cursor-color, #000)",
  pointerEvents: "none",
};

const SELECTION_BASE_STYLE: CSSProperties = {
  position: "absolute",
  backgroundColor: "var(--vba-selection-color, rgba(51, 144, 255, 0.3))",
  pointerEvents: "none",
};

// =============================================================================
// Cursor Component
// =============================================================================

type CursorProps = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly isBlinking: boolean;
};

/**
 * Blinking cursor caret.
 */
function Cursor({ x, y, height, isBlinking }: CursorProps): ReactNode {
  const cursorStyle: CSSProperties = useMemo(
    () => ({
      ...CURSOR_BASE_STYLE,
      left: x,
      top: y,
      height,
      animation: isBlinking ? "vba-cursor-blink 1s step-end infinite" : "none",
    }),
    [x, y, height, isBlinking]
  );

  return <div style={cursorStyle} />;
}

// =============================================================================
// Selection Overlay Component
// =============================================================================

type SelectionOverlayProps = {
  readonly rects: readonly { x: number; y: number; width: number; height: number }[];
};

/**
 * Render selection highlight rectangles.
 */
function SelectionOverlay({ rects }: SelectionOverlayProps): ReactNode {
  return (
    <>
      {rects.map((rect, i) => (
        <div
          key={i}
          style={{
            ...SELECTION_BASE_STYLE,
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * VBA Code Editor component.
 *
 * Displays VBA source code with:
 * - Virtual scrolling for large files (10,000+ lines)
 * - Line numbers (virtualized)
 * - Syntax highlighting with token caching
 * - Editable text via hidden textarea
 * - Cursor and selection rendering
 * - IME composition support
 * - Debounced undo history
 */
export function VbaCodeEditor({
  style,
  Renderer = HtmlCodeRenderer,
}: VbaCodeEditorProps): ReactNode {
  const { activeModuleSource, activeModule, dispatch, canUndo, canRedo, pendingCursorOffset } =
    useVbaEditor();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [composition, setComposition] = useState<CompositionState>(
    INITIAL_COMPOSITION_STATE
  );
  const [cursorState, setCursorState] =
    useState<CodeCursorState>(INITIAL_CURSOR_STATE);

  // Token cache for efficient syntax highlighting
  const tokenCache = useLineTokenCache();

  // Clear token cache when module changes
  const prevModuleName = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (activeModule?.name !== prevModuleName.current) {
      tokenCache.clear();
      prevModuleName.current = activeModule?.name;
    }
  }, [activeModule?.name, tokenCache]);

  // Measure actual font metrics from container
  const { lineHeight, measureText } = useFontMetrics(containerRef);

  // Split lines (memoized)
  const lines = useMemo(() => {
    if (!activeModuleSource) {
      return [];
    }
    return activeModuleSource.split("\n");
  }, [activeModuleSource]);

  // Virtual scrolling state
  const { state: virtualState, setScrollTop, containerRef: virtualContainerRef } = useVirtualLines(
    lines.length,
    { lineHeight: LINE_HEIGHT, overscan: OVERSCAN }
  );

  // Debounced history for grouping rapid keystrokes
  const { updateSource, flush: flushHistory } = useDebouncedHistory({
    debounceMs: HISTORY_DEBOUNCE_MS,
    dispatch,
    moduleName: activeModule?.name,
  });

  // Composition handlers
  const {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
  } = useCodeComposition({ setComposition });

  // Cursor state change handler
  const handleCursorStateChange = useCallback((state: CodeCursorState) => {
    setCursorState(state);
  }, []);

  // Update cursor position from textarea selection
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
    const currentLines = value.split("\n");

    if (hasSelection) {
      const start = offsetToLineColumn(value, selectionStart);
      const end = offsetToLineColumn(value, selectionEnd);

      dispatch({
        type: "SET_SELECTION",
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
      });

      const rects = calculateSelectionRects({
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
        lines: currentLines,
        lineHeight,
        measureText,
      });

      handleCursorStateChange({
        cursor: undefined,
        selectionRects: rects,
        isBlinking: false,
      });
    } else {
      const pos = offsetToLineColumn(value, selectionStart);
      const lineText = currentLines[pos.line - 1] ?? "";

      dispatch({ type: "SET_CURSOR", line: pos.line, column: pos.column });
      dispatch({ type: "CLEAR_SELECTION" });

      const coords = lineColumnToCoordinates({
        line: pos.line,
        column: pos.column,
        lineText,
        lineHeight,
        measureText,
      });

      handleCursorStateChange({
        cursor: coords,
        selectionRects: [],
        isBlinking: true,
      });
    }
  }, [composition.isComposing, dispatch, handleCursorStateChange, lineHeight, measureText]);

  // Scoped selection change listener
  useScopedSelectionChange(textareaRef, updateCursorPosition);

  // Handle text change from textarea
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = event.target;
      const newText = textarea.value;
      const cursorOffset = textarea.selectionStart;

      // Use debounced history update
      updateSource(newText, cursorOffset);

      // Update cursor position in next frame
      requestAnimationFrame(() => {
        updateCursorPosition();
      });
    },
    [updateSource, updateCursorPosition]
  );

  // Key handlers with history flush
  const { handleKeyDown: baseHandleKeyDown } = useCodeKeyHandlers({
    composition,
    dispatch,
    canUndo,
    canRedo,
    moduleName: activeModule?.name,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Flush history before undo/redo
      if ((event.metaKey || event.ctrlKey) && (event.key === "z" || event.key === "Z")) {
        flushHistory();
      }
      baseHandleKeyDown(event);
    },
    [baseHandleKeyDown, flushHistory]
  );

  // Sync scroll between codeArea and lineNumbers
  const handleCodeAreaScroll = useCallback(() => {
    const codeArea = codeAreaRef.current;
    const lineNumbers = lineNumbersRef.current;
    const textarea = textareaRef.current;
    if (codeArea) {
      setScrollTop(codeArea.scrollTop);
      if (lineNumbers) {
        lineNumbers.scrollTop = codeArea.scrollTop;
      }
      if (textarea) {
        textarea.scrollTop = codeArea.scrollTop;
        textarea.scrollLeft = codeArea.scrollLeft;
      }
    }
  }, [setScrollTop]);

  // Sync scroll when textarea is scrolled
  const handleTextareaScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (textarea && codeArea) {
      codeArea.scrollTop = textarea.scrollTop;
      codeArea.scrollLeft = textarea.scrollLeft;
      setScrollTop(textarea.scrollTop);
      if (lineNumbers) {
        lineNumbers.scrollTop = textarea.scrollTop;
      }
    }
  }, [setScrollTop]);

  // Click handler to focus textarea
  const handleContainerClick = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Restore cursor position after undo/redo
  useEffect(() => {
    if (pendingCursorOffset === undefined) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.selectionStart = pendingCursorOffset;
    textarea.selectionEnd = pendingCursorOffset;
    dispatch({ type: "CLEAR_PENDING_CURSOR" });

    // Update cursor visual
    requestAnimationFrame(() => {
      updateCursorPosition();
    });
  }, [pendingCursorOffset, dispatch, updateCursorPosition]);

  // Ensure textarea is scrolled to show cursor
  useEffect(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    if (!textarea || !codeArea || !cursorState.cursor) {
      return;
    }

    const cursorY = cursorState.cursor.y;
    const visibleTop = codeArea.scrollTop;
    const visibleBottom = visibleTop + codeArea.clientHeight;

    if (cursorY < visibleTop || cursorY + lineHeight > visibleBottom) {
      const targetScroll = Math.max(0, cursorY - codeArea.clientHeight / 2);
      codeArea.scrollTop = targetScroll;
      textarea.scrollTop = targetScroll;
      setScrollTop(targetScroll);
    }
  }, [cursorState.cursor, lineHeight, setScrollTop]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Set up virtual container ref
  useEffect(() => {
    virtualContainerRef(codeAreaRef.current);
  }, [virtualContainerRef]);

  if (!activeModuleSource) {
    return (
      <div ref={containerRef} className={styles.container} style={style}>
        <div className={styles.emptyMessage}>No module selected</div>
      </div>
    );
  }

  // IME input style
  const imeInputStyle = useMemo((): CSSProperties => {
    const cursor = cursorState.cursor;
    return {
      left: cursor?.x ?? 8,
      top: cursor?.y ?? 8,
    };
  }, [cursorState.cursor]);

  return (
    <div ref={containerRef} className={styles.container} style={style} onClick={handleContainerClick}>
      {/* Virtualized line numbers */}
      <div ref={lineNumbersRef} className={styles.lineNumbersWrapper}>
        <LineNumbers
          lineCount={lines.length}
          scrollTop={virtualState.scrollTop}
          viewportHeight={virtualState.viewportHeight}
          lineHeight={LINE_HEIGHT}
          overscan={OVERSCAN}
        />
      </div>

      <div ref={codeAreaRef} className={styles.codeArea} onScroll={handleCodeAreaScroll}>
        {/* Hidden textarea for input */}
        <textarea
          ref={textareaRef}
          className={styles.hiddenTextarea}
          value={activeModuleSource}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleTextareaScroll}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* IME composition indicator */}
        {composition.isComposing && composition.text && (
          <div className={styles.imeComposition} style={imeInputStyle}>
            {composition.text}
          </div>
        )}

        {/* Virtualized code display */}
        <Renderer
          lines={lines}
          visibleRange={virtualState.visibleRange}
          topSpacerHeight={virtualState.topSpacerHeight}
          bottomSpacerHeight={virtualState.bottomSpacerHeight}
          tokenCache={tokenCache}
          lineHeight={LINE_HEIGHT}
          padding={8}
          width={codeAreaRef.current?.clientWidth}
          height={virtualState.viewportHeight}
        />

        {/* Selection overlay */}
        {cursorState.selectionRects.length > 0 && (
          <SelectionOverlay rects={cursorState.selectionRects} />
        )}

        {/* Cursor */}
        {cursorState.cursor && !composition.isComposing && (
          <Cursor
            x={cursorState.cursor.x}
            y={cursorState.cursor.y}
            height={cursorState.cursor.height}
            isBlinking={cursorState.isBlinking}
          />
        )}
      </div>

      {/* CSS for cursor blink animation */}
      <style>{`
        @keyframes vba-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
