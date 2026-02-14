/**
 * @file VBA Code Editor Component
 *
 * Main code editing area with syntax highlighting, line numbers, and editing support.
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
import { tokenizeLine, getTokenColor, type Token } from "./syntax-highlight";
import { LineNumbers } from "./LineNumbers";
import {
  useCodeComposition,
  INITIAL_COMPOSITION_STATE,
  type CompositionState,
} from "./use-code-composition";
import {
  useCodeEditInput,
  INITIAL_CURSOR_STATE,
  type CodeCursorState,
} from "./use-code-edit-input";
import { useCodeKeyHandlers } from "./use-code-key-handlers";
import { useFontMetrics } from "./use-font-metrics";
import styles from "./VbaCodeEditor.module.css";

export type VbaCodeEditorProps = {
  readonly style?: CSSProperties;
};

// =============================================================================
// Rendering Helpers
// =============================================================================

/**
 * Render a single token with appropriate styling.
 */
function renderToken(token: Token, key: number): ReactNode {
  if (token.type === "whitespace") {
    return <span key={key}>{token.text}</span>;
  }
  return (
    <span key={key} style={{ color: getTokenColor(token.type) }}>
      {token.text}
    </span>
  );
}

/**
 * Render a line of code with syntax highlighting.
 */
function renderLine(line: string, lineIndex: number): ReactNode {
  const tokens = tokenizeLine(line);
  return (
    <div key={lineIndex} className={styles.line}>
      {tokens.length === 0 ? "\u00A0" : tokens.map(renderToken)}
    </div>
  );
}

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
  const cursorStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: 2,
    height,
    backgroundColor: "var(--vba-cursor-color, #000)",
    pointerEvents: "none",
    animation: isBlinking ? "vba-cursor-blink 1s step-end infinite" : "none",
  };

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
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            backgroundColor: "var(--vba-selection-color, rgba(51, 144, 255, 0.3))",
            pointerEvents: "none",
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
 * - Line numbers
 * - Syntax highlighting
 * - Editable text via hidden textarea
 * - Cursor and selection rendering
 * - IME composition support
 */
export function VbaCodeEditor({ style }: VbaCodeEditorProps): ReactNode {
  const { activeModuleSource, activeModule, dispatch, canUndo, canRedo, pendingCursorOffset } =
    useVbaEditor();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const [composition, setComposition] = useState<CompositionState>(
    INITIAL_COMPOSITION_STATE
  );
  const [cursorState, setCursorState] =
    useState<CodeCursorState>(INITIAL_CURSOR_STATE);

  // Measure actual font metrics from container
  const { lineHeight, measureText } = useFontMetrics(containerRef);

  // Sync scroll position between textarea and code display
  const handleTextareaScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    if (textarea && codeArea) {
      codeArea.scrollTop = textarea.scrollTop;
      codeArea.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  // Sync scroll when codeArea is scrolled (e.g., via wheel on visual elements)
  const handleCodeAreaScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    if (textarea && codeArea) {
      textarea.scrollTop = codeArea.scrollTop;
      textarea.scrollLeft = codeArea.scrollLeft;
    }
  }, []);

  const lines = useMemo(() => {
    if (!activeModuleSource) {
      return [];
    }
    return activeModuleSource.split("\n");
  }, [activeModuleSource]);

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

  // Edit input handlers
  const { handleChange } = useCodeEditInput({
    textareaRef,
    composition,
    dispatch,
    moduleName: activeModule?.name,
    onCursorStateChange: handleCursorStateChange,
    lineHeight,
    measureText,
  });

  // Key handlers
  const { handleKeyDown } = useCodeKeyHandlers({
    composition,
    dispatch,
    canUndo,
    canRedo,
    moduleName: activeModule?.name,
  });

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

    // Restore cursor position
    textarea.selectionStart = pendingCursorOffset;
    textarea.selectionEnd = pendingCursorOffset;

    // Clear pending cursor offset
    dispatch({ type: "CLEAR_PENDING_CURSOR" });
  }, [pendingCursorOffset, dispatch]);

  // Ensure textarea is scrolled to show cursor when cursor state changes
  useEffect(() => {
    const textarea = textareaRef.current;
    const codeArea = codeAreaRef.current;
    if (!textarea || !codeArea || !cursorState.cursor) {
      return;
    }

    // Sync scroll positions to ensure IME appears at correct location
    const cursorY = cursorState.cursor.y;
    const visibleTop = codeArea.scrollTop;
    const visibleBottom = visibleTop + codeArea.clientHeight;

    // If cursor is outside visible area, scroll to show it
    if (cursorY < visibleTop || cursorY + lineHeight > visibleBottom) {
      const targetScroll = Math.max(0, cursorY - codeArea.clientHeight / 2);
      codeArea.scrollTop = targetScroll;
      textarea.scrollTop = targetScroll;
    }
  }, [cursorState.cursor, lineHeight]);

  if (!activeModuleSource) {
    return (
      <div ref={containerRef} className={styles.container} style={style}>
        <div className={styles.emptyMessage}>No module selected</div>
      </div>
    );
  }

  // IME input style - positioned at cursor location
  const imeInputStyle = useMemo((): CSSProperties => {
    const cursor = cursorState.cursor;
    return {
      left: cursor?.x ?? 8,
      top: cursor?.y ?? 8,
    };
  }, [cursorState.cursor]);

  return (
    <div ref={containerRef} className={styles.container} style={style} onClick={handleContainerClick}>
      <LineNumbers lineCount={lines.length} />
      <div ref={codeAreaRef} className={styles.codeArea} onScroll={handleCodeAreaScroll}>
        {/* Hidden textarea for input - covers full area for normal editing */}
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

        {/* IME composition indicator at cursor position */}
        {composition.isComposing && composition.text && (
          <div className={styles.imeComposition} style={imeInputStyle}>
            {composition.text}
          </div>
        )}

        {/* Visual code display */}
        <div className={styles.codeDisplay}>{lines.map(renderLine)}</div>

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
