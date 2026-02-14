/**
 * @file VBA Code Editor Component
 *
 * Main code editing area with syntax highlighting, line numbers, and editing support.
 * Features virtual scrolling for efficient rendering of large files.
 *
 * Uses unified renderer for line numbers, highlights, and cursor.
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
import { useModuleTokenCache } from "./line/use-line-token-cache";
import {
  HtmlCodeRenderer,
  type CodeRendererComponent,
  type HighlightRange,
  type CursorState,
} from "./element/renderers";
import { useVirtualLines } from "./line/use-virtual-lines";
import { useDebouncedHistory } from "./code/use-debounced-history";
import { useScopedSelectionChange } from "./code/use-scoped-selection-change";
import {
  useCodeComposition,
  INITIAL_COMPOSITION_STATE,
  type CompositionState,
} from "./code/use-code-composition";
import { useCodeKeyHandlers } from "./code/use-code-key-handlers";
import { useFontMetrics } from "./element/use-font-metrics";
import { useLineIndex } from "./line/use-line-index";
import { SearchBar } from "../search";
import { useSearchIntegration } from "../../hooks/use-search";
import { useVbaCompletion } from "../../completion";
import { CompletionPopup } from "../completion";
import styles from "./VbaCodeEditor.module.css";

// =============================================================================
// Constants
// =============================================================================

const LINE_HEIGHT = 21;
const OVERSCAN = 5;
const HISTORY_DEBOUNCE_MS = 300;
const LINE_NUMBER_WIDTH = 48;
const CODE_PADDING = 8;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fallback line/column finder when lineIndex is not in sync with textarea.
 */
function findLineColumnFallback(
  currentLines: readonly string[],
  offset: number
): { line: number; column: number } {
  let remaining = offset;
  for (const [i, lineText] of currentLines.entries()) {
    const len = lineText.length;
    if (remaining <= len) {
      return { line: i + 1, column: remaining + 1 };
    }
    remaining -= len + 1;
  }
  const lastLine = currentLines[currentLines.length - 1];
  return { line: currentLines.length, column: (lastLine?.length ?? 0) + 1 };
}

/**
 * Create line-at-offset lookup function.
 */
function createLineAtOffsetFn(
  sourceInSync: boolean,
  lineIndex: { getLineAtOffset: (offset: number) => { line: number; column: number } },
  currentLines: readonly string[]
): (offset: number) => { line: number; column: number } {
  if (sourceInSync) {
    return lineIndex.getLineAtOffset;
  }
  return (offset: number) => findLineColumnFallback(currentLines, offset);
}

/**
 * Convert line/column to character offset.
 */
function lineColumnToOffset(
  lines: readonly string[],
  line: number,
  column: number
): number {
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  const lineText = lines[line - 1] ?? "";
  offset += Math.min(column - 1, lineText.length);
  return offset;
}

/**
 * Convert click coordinates to line/column position.
 */
function coordinatesToPosition(
  x: number,
  y: number,
  scrollTop: number,
  lines: readonly string[],
  measureText: ((text: string) => number) | undefined,
): { line: number; column: number } {
  // Adjust for scroll
  const adjustedY = y + scrollTop;

  // Calculate line (1-based)
  const lineIndex = Math.floor(adjustedY / LINE_HEIGHT);
  const line = Math.max(1, Math.min(lineIndex + 1, lines.length));

  // Get the line text
  const lineText = lines[line - 1] ?? "";

  // Calculate column based on x position
  // x is relative to code area, so subtract line number width and padding
  const codeX = x - LINE_NUMBER_WIDTH - CODE_PADDING;

  if (codeX <= 0) {
    return { line, column: 1 };
  }

  // Find column by measuring text widths
  let column = 1;
  if (measureText) {
    // Binary search for the closest column
    let low = 0;
    let high = lineText.length;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const width = measureText(lineText.slice(0, mid));
      if (width <= codeX) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    column = low + 1;
  } else {
    // Fallback: estimate using average character width
    const avgCharWidth = 7.8;
    column = Math.max(1, Math.round(codeX / avgCharWidth) + 1);
  }

  // Clamp column to line length + 1
  column = Math.min(column, lineText.length + 1);

  return { line, column };
}

// =============================================================================
// Types
// =============================================================================

export type VbaCodeEditorProps = {
  readonly style?: CSSProperties;
  /** Code renderer component. Defaults to HtmlCodeRenderer. */
  readonly Renderer?: CodeRendererComponent;
};

// =============================================================================
// Internal State Types
// =============================================================================

type EditorCursorState = {
  /** Cursor line (1-based) */
  readonly line: number;
  /** Cursor column (1-based) */
  readonly column: number;
  /** Whether cursor is visible */
  readonly visible: boolean;
  /** Whether cursor is blinking */
  readonly blinking: boolean;
};

type EditorSelectionState = {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
};

const INITIAL_CURSOR: EditorCursorState = {
  line: 1,
  column: 1,
  visible: true,
  blinking: true,
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * VBA Code Editor component.
 *
 * Displays VBA source code with:
 * - Virtual scrolling for large files (10,000+ lines)
 * - Line numbers (integrated in renderer)
 * - Syntax highlighting with token caching
 * - Selection and match highlights (integrated in renderer)
 * - Cursor (integrated in renderer)
 * - Editable text via hidden textarea
 * - IME composition support
 * - Debounced undo history
 */
export function VbaCodeEditor({
  style,
  Renderer = HtmlCodeRenderer,
}: VbaCodeEditorProps): ReactNode {
  const { activeModuleSource, activeModule, dispatch, canUndo, canRedo, pendingCursorOffset, state } =
    useVbaEditor();
  const { search, selection: stateSelection } = state;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const [composition, setComposition] = useState<CompositionState>(
    INITIAL_COMPOSITION_STATE
  );
  const [cursorState, setCursorState] = useState<EditorCursorState>(INITIAL_CURSOR);
  const [selectionState, setSelectionState] = useState<EditorSelectionState | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ line: number; column: number } | null>(null);

  // Token cache for efficient syntax highlighting
  const tokenCache = useModuleTokenCache(activeModule?.name);

  // Measure actual font metrics from container
  const { lineHeight, measureText } = useFontMetrics(containerRef);

  // Line index for efficient offset-to-line conversion
  const lineIndex = useLineIndex(activeModuleSource ?? "");
  const lines = lineIndex.lines;

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

  // Search integration
  const handleMatchesUpdate = useCallback(
    (matches: readonly import("../../context/vba-editor/types").SearchMatch[]) => {
      dispatch({ type: "UPDATE_MATCHES", matches });
    },
    [dispatch],
  );

  useSearchIntegration({
    source: activeModuleSource,
    query: search.query,
    options: search.options,
    isOpen: search.isOpen,
    onMatchesUpdate: handleMatchesUpdate,
  });

  // Completion (IntelliSense)
  const cursorOffset = useMemo(() => {
    const textarea = textareaRef.current;
    return textarea?.selectionStart ?? 0;
  }, [cursorState]);

  const handleCompletionSourceUpdate = useCallback(
    (newSource: string, newCursorOffset: number) => {
      if (!activeModule?.name) return;
      dispatch({
        type: "UPDATE_MODULE_SOURCE",
        moduleName: activeModule.name,
        source: newSource,
        cursorOffset: newCursorOffset,
      });
    },
    [dispatch, activeModule?.name],
  );

  const completion = useVbaCompletion({
    source: activeModuleSource,
    cursorOffset,
    procedures: activeModule?.procedures ?? [],
    onSourceUpdate: handleCompletionSourceUpdate,
  });

  // Composition handlers
  const {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
  } = useCodeComposition({ setComposition });

  // Cache for cursor position
  const cursorCacheRef = useRef<{
    selectionStart: number;
    selectionEnd: number;
    valueLength: number;
  } | null>(null);

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

    // Skip if selection hasn't changed
    const cache = cursorCacheRef.current;
    if (
      cache !== null &&
      cache.selectionStart === selectionStart &&
      cache.selectionEnd === selectionEnd &&
      cache.valueLength === value.length
    ) {
      return;
    }

    cursorCacheRef.current = { selectionStart, selectionEnd, valueLength: value.length };

    const sourceInSync = value === activeModuleSource;
    const currentLines = sourceInSync ? lines : value.split("\n");
    const getLineAtOffset = createLineAtOffsetFn(sourceInSync, lineIndex, currentLines);

    if (hasSelection) {
      const start = getLineAtOffset(selectionStart);
      const end = getLineAtOffset(selectionEnd);

      dispatch({
        type: "SET_SELECTION",
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
      });

      setSelectionState({
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
      });

      setCursorState({
        line: end.line,
        column: end.column,
        visible: false,
        blinking: false,
      });
    } else {
      const pos = getLineAtOffset(selectionStart);

      dispatch({ type: "SET_CURSOR", line: pos.line, column: pos.column });
      dispatch({ type: "CLEAR_SELECTION" });

      setSelectionState(undefined);
      setCursorState({
        line: pos.line,
        column: pos.column,
        visible: true,
        blinking: true,
      });
    }
  }, [composition.isComposing, dispatch, activeModuleSource, lines, lineIndex]);

  // Scoped selection change listener
  useScopedSelectionChange(textareaRef, updateCursorPosition);

  // Handle text change from textarea
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = event.target;
      const newText = textarea.value;
      const offset = textarea.selectionStart;

      updateSource(newText, offset);

      requestAnimationFrame(() => {
        updateCursorPosition();
      });
    },
    [updateSource, updateCursorPosition]
  );

  // Key handlers
  const { handleKeyDown: baseHandleKeyDown } = useCodeKeyHandlers({
    composition,
    dispatch,
    canUndo,
    canRedo,
    moduleName: activeModule?.name,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Completion navigation
      if (completion.state.isOpen) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          completion.moveHighlight(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          completion.moveHighlight(-1);
          return;
        }
        if (event.key === "Tab" || event.key === "Enter") {
          event.preventDefault();
          completion.accept();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          completion.dismiss();
          return;
        }
      }

      // Manual completion trigger: Ctrl+Space
      if ((event.ctrlKey || event.metaKey) && event.key === " ") {
        event.preventDefault();
        completion.triggerManually();
        return;
      }

      // Flush history before undo/redo
      if ((event.metaKey || event.ctrlKey) && (event.key === "z" || event.key === "Z")) {
        flushHistory();
      }
      baseHandleKeyDown(event);
    },
    [baseHandleKeyDown, flushHistory, completion]
  );

  // Sync scroll
  const handleCodeAreaScroll = useCallback(() => {
    const codeArea = codeAreaRef.current;
    const textarea = textareaRef.current;
    if (codeArea) {
      setScrollTop(codeArea.scrollTop);
      if (textarea) {
        textarea.scrollTop = codeArea.scrollTop;
        textarea.scrollLeft = codeArea.scrollLeft;
      }
    }
  }, [setScrollTop]);

  const handleTextareaScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    if (textarea && codeArea) {
      codeArea.scrollTop = textarea.scrollTop;
      codeArea.scrollLeft = textarea.scrollLeft;
      setScrollTop(textarea.scrollTop);
    }
  }, [setScrollTop]);

  // Click handler to focus textarea
  const handleContainerClick = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Pointer event handlers for text selection (supports mouse + touch)
  const handleCodePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Only handle primary pointer (left mouse or touch)
      if (!event.isPrimary) return;

      const codeArea = codeAreaRef.current;
      if (!codeArea) return;

      const rect = codeArea.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const pos = coordinatesToPosition(x, y, codeArea.scrollTop, lines, measureText);

      // Start drag selection
      dragStartRef.current = pos;
      setIsDragging(true);

      // Capture pointer for drag outside element
      (event.target as HTMLElement).setPointerCapture(event.pointerId);

      // Update cursor and clear selection
      setCursorState({
        line: pos.line,
        column: pos.column,
        visible: true,
        blinking: true,
      });
      setSelectionState(undefined);

      // Sync to textarea
      const textarea = textareaRef.current;
      if (textarea) {
        const offset = lineColumnToOffset(lines, pos.line, pos.column);
        textarea.focus();
        textarea.setSelectionRange(offset, offset);
      }

      // Dispatch cursor position
      dispatch({ type: "SET_CURSOR", line: pos.line, column: pos.column });
      dispatch({ type: "CLEAR_SELECTION" });

      event.preventDefault();
    },
    [lines, measureText, dispatch]
  );

  const handleCodePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current || !event.isPrimary) return;

      const codeArea = codeAreaRef.current;
      if (!codeArea) return;

      const rect = codeArea.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const endPos = coordinatesToPosition(x, y, codeArea.scrollTop, lines, measureText);
      const startPos = dragStartRef.current;

      // Determine selection direction
      const isForward =
        endPos.line > startPos.line ||
        (endPos.line === startPos.line && endPos.column >= startPos.column);

      const selStart = isForward ? startPos : endPos;
      const selEnd = isForward ? endPos : startPos;

      // Update selection state
      setSelectionState({
        startLine: selStart.line,
        startColumn: selStart.column,
        endLine: selEnd.line,
        endColumn: selEnd.column,
      });

      // Update cursor to end of selection
      setCursorState({
        line: endPos.line,
        column: endPos.column,
        visible: false,
        blinking: false,
      });

      // Sync to textarea
      const textarea = textareaRef.current;
      if (textarea) {
        const startOffset = lineColumnToOffset(lines, selStart.line, selStart.column);
        const endOffset = lineColumnToOffset(lines, selEnd.line, selEnd.column);
        textarea.setSelectionRange(startOffset, endOffset);
      }

      // Dispatch selection
      dispatch({
        type: "SET_SELECTION",
        startLine: selStart.line,
        startColumn: selStart.column,
        endLine: selEnd.line,
        endColumn: selEnd.column,
      });

      event.preventDefault();
    },
    [isDragging, lines, measureText, dispatch]
  );

  const handleCodePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary) return;
      setIsDragging(false);
      dragStartRef.current = null;
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    },
    []
  );

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

    requestAnimationFrame(() => {
      updateCursorPosition();
    });
  }, [pendingCursorOffset, dispatch, updateCursorPosition]);

  // Ensure cursor is visible in viewport
  useEffect(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    if (!textarea || !codeArea || !cursorState.visible) {
      return;
    }

    const cursorY = (cursorState.line - 1) * LINE_HEIGHT;
    const visibleTop = codeArea.scrollTop;
    const visibleBottom = visibleTop + codeArea.clientHeight;

    if (cursorY < visibleTop || cursorY + LINE_HEIGHT > visibleBottom) {
      const targetScroll = Math.max(0, cursorY - codeArea.clientHeight / 2);
      codeArea.scrollTop = targetScroll;
      textarea.scrollTop = targetScroll;
      setScrollTop(targetScroll);
    }
  }, [cursorState.line, cursorState.visible, setScrollTop]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Set up virtual container ref
  useEffect(() => {
    virtualContainerRef(codeAreaRef.current);
  }, [virtualContainerRef]);

  // Build highlights array for renderer
  const highlights = useMemo((): readonly HighlightRange[] => {
    const result: HighlightRange[] = [];

    // Add selection
    if (selectionState) {
      result.push({
        startLine: selectionState.startLine,
        startColumn: selectionState.startColumn,
        endLine: selectionState.endLine,
        endColumn: selectionState.endColumn,
        type: "selection",
      });
    }

    // Add search matches
    if (search.isOpen && search.matches.length > 0) {
      for (let i = 0; i < search.matches.length; i++) {
        const match = search.matches[i];
        result.push({
          startLine: match.line,
          startColumn: match.startColumn,
          endLine: match.line,
          endColumn: match.endColumn,
          type: i === search.currentMatchIndex ? "currentMatch" : "match",
        });
      }
    }

    return result;
  }, [selectionState, search.isOpen, search.matches, search.currentMatchIndex]);

  // Build cursor state for renderer
  const rendererCursor = useMemo((): CursorState | undefined => {
    if (composition.isComposing || !cursorState.visible) {
      return undefined;
    }
    return {
      line: cursorState.line,
      column: cursorState.column,
      visible: cursorState.visible,
      blinking: cursorState.blinking,
    };
  }, [cursorState, composition.isComposing]);

  // Completion popup position (based on cursor line/column)
  const completionPosition = useMemo(() => {
    if (!cursorState.visible) return { x: 0, y: 0 };
    // Estimate position: line number width + column offset
    const x = LINE_NUMBER_WIDTH + (cursorState.column - 1) * 7.8; // approx char width
    const y = (cursorState.line - 1) * LINE_HEIGHT + LINE_HEIGHT + 4;
    return { x, y };
  }, [cursorState]);

  if (!activeModuleSource) {
    return (
      <div ref={containerRef} className={styles.container} style={style}>
        <div className={styles.emptyMessage}>No module selected</div>
      </div>
    );
  }

  // IME input style
  const imeInputStyle = useMemo((): CSSProperties => {
    const x = LINE_NUMBER_WIDTH + (cursorState.column - 1) * 7.8;
    const y = (cursorState.line - 1) * LINE_HEIGHT;
    return { left: x, top: y };
  }, [cursorState]);

  return (
    <div ref={containerRef} className={styles.container} style={style} onClick={handleContainerClick}>
      {/* Search bar */}
      <SearchBar />

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

        {/* Unified code display with line numbers, highlights, and cursor */}
        <div
          onPointerDown={handleCodePointerDown}
          onPointerMove={handleCodePointerMove}
          onPointerUp={handleCodePointerUp}
          style={{ cursor: "text", touchAction: "none" }}
        >
          <Renderer
            lines={lines}
            visibleRange={virtualState.visibleRange}
            topSpacerHeight={virtualState.topSpacerHeight}
            bottomSpacerHeight={virtualState.bottomSpacerHeight}
            tokenCache={tokenCache}
            lineHeight={LINE_HEIGHT}
            padding={CODE_PADDING}
            width={codeAreaRef.current?.clientWidth}
            height={virtualState.viewportHeight}
            measureText={measureText}
            showLineNumbers={true}
            lineNumberWidth={LINE_NUMBER_WIDTH}
            highlights={highlights}
            cursor={rendererCursor}
          />
        </div>

        {/* Completion popup */}
        {completion.state.isOpen && cursorState.visible && (
          <CompletionPopup
            items={completion.state.items}
            highlightedIndex={completion.state.highlightedIndex}
            position={completionPosition}
            onSelect={(index) => {
              completion.moveHighlight(index - completion.state.highlightedIndex);
              completion.accept();
            }}
            onDismiss={completion.dismiss}
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
