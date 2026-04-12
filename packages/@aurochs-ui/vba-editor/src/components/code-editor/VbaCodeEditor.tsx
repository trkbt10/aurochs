/**
 * @file VBA Code Editor Component
 *
 * Thin wrapper around react-editor-ui's CodeEditor that integrates
 * VBA-specific features: syntax highlighting, search, and completion.
 *
 * The core editing concerns (textarea management, cursor, selection,
 * virtual scrolling, IME composition, undo/redo) are all delegated to
 * CodeEditor. This component is responsible only for:
 * - Bridging BlockDocument ↔ VBA editor context
 * - Search integration (SearchBar overlay + highlight ranges)
 * - Completion popup
 * - VBA-specific key bindings (search open/close)
 */

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  CodeEditor,
  createBlockDocument,
  getBlockDocumentText,
  type BlockDocument,
  type CursorPosition,
  type SelectionRange,
  type HighlightRange,
} from "react-editor-ui/editors/RichTextEditors";
import { useVbaEditor } from "../../context/vba-editor";
import type { SearchMatch } from "../../context/vba-editor/types";
import { SearchBar } from "../search";
import { useSearchIntegration } from "../../hooks/use-search";
import { useVbaCompletion } from "../../completion";
import { CompletionPopup } from "../completion";
import { vbaTokenizer, vbaTokenStyles } from "./vba-tokenizer";

// =============================================================================
// Constants
// =============================================================================

const LINE_HEIGHT = 21;
const LINE_NUMBER_WIDTH = 48;

// =============================================================================
// Types
// =============================================================================

export type VbaCodeEditorProps = {
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const wrapperStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

// =============================================================================
// Component
// =============================================================================

/**
 * VBA Code Editor component.
 *
 * Wraps react-editor-ui's CodeEditor with VBA-specific integrations:
 * - VBA syntax highlighting via vbaTokenizer
 * - In-file and project-wide search with match highlighting
 * - Code completion (IntelliSense)
 * - Integration with VBA editor context (module source management)
 */
export function VbaCodeEditor({ style }: VbaCodeEditorProps): ReactNode {
  const {
    activeModuleSource,
    activeModule,
    dispatch,
    state,
  } = useVbaEditor();
  const { search } = state;

  // -------------------------------------------------------------------------
  // BlockDocument bridge
  // -------------------------------------------------------------------------

  const [doc, setDoc] = useState<BlockDocument>(() =>
    createBlockDocument(activeModuleSource ?? ""),
  );

  // Sync: context → BlockDocument (when active module changes)
  const prevModuleRef = useMemo(() => ({ name: activeModule?.name }), [activeModule?.name]);
  useEffect(() => {
    setDoc(createBlockDocument(activeModuleSource ?? ""));
    // activeModuleSource is intentionally excluded: this effect should only run
    // when the active module switches (prevModuleRef changes), not on every edit.
  }, [prevModuleRef]);

  // Sync: BlockDocument → context (on every edit)
  const handleDocumentChange = useCallback(
    (newDoc: BlockDocument) => {
      setDoc(newDoc);
      if (!activeModule?.name) {return;}
      const text = getBlockDocumentText(newDoc);
      // Skip if text hasn't changed (cursor-only update)
      if (text === activeModuleSource) {return;}
      dispatch({
        type: "UPDATE_MODULE_SOURCE",
        moduleName: activeModule.name,
        source: text,
        cursorOffset: 0, // CodeEditor manages cursor internally
      });
    },
    [activeModule?.name, activeModuleSource, dispatch],
  );

  // -------------------------------------------------------------------------
  // Cursor / Selection → context
  // -------------------------------------------------------------------------

  const handleCursorChange = useCallback(
    (pos: CursorPosition) => {
      dispatch({ type: "SET_CURSOR", line: pos.line, column: pos.column });
    },
    [dispatch],
  );

  const handleSelectionChange = useCallback(
    (sel: SelectionRange | undefined) => {
      if (sel) {
        dispatch({
          type: "SET_SELECTION",
          startLine: sel.start.line,
          startColumn: sel.start.column,
          endLine: sel.end.line,
          endColumn: sel.end.column,
        });
      } else {
        dispatch({ type: "CLEAR_SELECTION" });
      }
    },
    [dispatch],
  );

  // -------------------------------------------------------------------------
  // Search integration
  // -------------------------------------------------------------------------

  const handleMatchesUpdate = useCallback(
    (matches: readonly SearchMatch[]) => {
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

  // Build highlight ranges from search matches
  const highlights = useMemo((): readonly HighlightRange[] => {
    if (!search.isOpen || search.matches.length === 0) {
      return [];
    }
    return search.matches.map((match, i) => ({
      startLine: match.line,
      startColumn: match.startColumn,
      endLine: match.line,
      endColumn: match.endColumn,
      type: i === search.currentMatchIndex ? "currentMatch" as const : "match" as const,
    }));
  }, [search.isOpen, search.matches, search.currentMatchIndex]);

  // -------------------------------------------------------------------------
  // Completion
  // -------------------------------------------------------------------------

  const [cursorOffset, setCursorOffset] = useState(0);

  const handleCompletionSourceUpdate = useCallback(
    (newSource: string, newCursorOffset: number) => {
      if (!activeModule?.name) {return;}
      dispatch({
        type: "UPDATE_MODULE_SOURCE",
        moduleName: activeModule.name,
        source: newSource,
        cursorOffset: newCursorOffset,
      });
      setDoc(createBlockDocument(newSource));
    },
    [dispatch, activeModule?.name],
  );

  const completion = useVbaCompletion({
    source: activeModuleSource,
    cursorOffset,
    procedures: activeModule?.procedures ?? [],
    onSourceUpdate: handleCompletionSourceUpdate,
  });

  // Track cursor offset for completion
  const handleCursorChangeWithOffset = useCallback(
    (pos: CursorPosition) => {
      handleCursorChange(pos);
      // Compute flat character offset from line/column for the completion engine
      if (activeModuleSource) {
        const lines = activeModuleSource.split("\n");
        const lineOffset = lines.slice(0, pos.line - 1).reduce((sum, l) => sum + l.length + 1, 0);
        const columnOffset = Math.min(pos.column - 1, (lines[pos.line - 1] ?? "").length);
        setCursorOffset(lineOffset + columnOffset);
      }
    },
    [handleCursorChange, activeModuleSource],
  );

  // Completion popup position
  const completionPosition = useMemo(() => {
    if (!state.cursor) {return { x: 0, y: 0 };}
    const x = LINE_NUMBER_WIDTH + (state.cursor.column - 1) * 7.8;
    const y = (state.cursor.line - 1) * LINE_HEIGHT + LINE_HEIGHT + 4;
    return { x, y };
  }, [state.cursor]);

  // -------------------------------------------------------------------------
  // VBA-specific keyboard shortcuts
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      // Cmd+F / Ctrl+F: open in-file search
      if (mod && event.key.toLowerCase() === "f" && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: "OPEN_SEARCH", mode: "in-file" });
        return;
      }
      // Cmd+Shift+F: open project-wide search
      if (mod && event.key.toLowerCase() === "f" && event.shiftKey) {
        event.preventDefault();
        dispatch({ type: "OPEN_SEARCH", mode: "project-wide" });
        return;
      }
      // Cmd+H: open search (replace mode)
      if (mod && event.key.toLowerCase() === "h") {
        event.preventDefault();
        dispatch({ type: "OPEN_SEARCH", mode: "in-file" });
        return;
      }
      // Escape: close search
      if (event.key === "Escape") {
        dispatch({ type: "CLOSE_SEARCH" });
      }
    },
    [dispatch],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!activeModuleSource && activeModuleSource !== "") {
    return (
      <div style={{ ...wrapperStyle, ...style }}>
        <div style={{ color: "#9aa0a6", fontStyle: "italic", padding: 16 }}>
          No module selected
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrapperStyle, ...style }} onKeyDown={handleKeyDown}>
      {/* Search bar overlay */}
      <SearchBar />

      {/* Code editor */}
      <CodeEditor
        document={doc}
        onDocumentChange={handleDocumentChange}
        tokenizer={vbaTokenizer}
        tokenStyles={vbaTokenStyles}
        highlights={highlights}
        onCursorChange={handleCursorChangeWithOffset}
        onSelectionChange={handleSelectionChange}
        showLineNumbers
        tabSize={4}
        style={{ flex: 1, minHeight: 0 }}
      />

      {/* Completion popup */}
      {completion.state.isOpen && (
        <div style={{ position: "absolute", zIndex: 200, top: 0, left: 0 }}>
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
        </div>
      )}
    </div>
  );
}
