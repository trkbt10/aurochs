/**
 * @file VBA Editor Main Component
 *
 * Integrates all VBA editor components into a complete editor view.
 */

import { useMemo, useCallback, useState, type CSSProperties, type ReactNode } from "react";
import type { VbaProgramIr } from "@aurochs-office/vba";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { EditorStatusBar } from "@aurochs-ui/ui-components";
import { VbaEditorProvider, useVbaEditor } from "../context/vba-editor";
import type { ProjectSearchMatch } from "../context/vba-editor/types";
import { VbaCodeEditor, type CodeRendererComponent } from "./code-editor";
import { VbaModuleGroupedList } from "./module-list";
import { VbaEditorToolbar } from "./toolbar";
import { VbaExecutionPanel, type ExecutionState } from "./execution-panel";
import { SearchResultsPanel } from "./search";
import { useProjectSearch } from "../hooks/use-project-search";

export type VbaEditorProps = {
  /** VBA program to edit */
  readonly program?: VbaProgramIr;
  /** Callback when program changes */
  readonly onProgramChange?: (program: VbaProgramIr) => void;
  /** Read-only mode */
  readonly readonly?: boolean;
  /** Custom style */
  readonly style?: CSSProperties;
  /** Code renderer component. Defaults to HtmlCodeRenderer. */
  readonly Renderer?: CodeRendererComponent;
  /** Callback when Run button is clicked. Receives the selected procedure name. */
  readonly onRun?: (procedureName: string) => void;
  /** Callback when Stop button is clicked. */
  readonly onStop?: () => void;
};

type VbaEditorInnerProps = {
  readonly style?: CSSProperties;
  readonly Renderer?: CodeRendererComponent;
  readonly onRun?: (procedureName: string) => void;
  readonly onStop?: () => void;
};

/**
 * Inner editor component (requires context).
 */
function VbaEditorInner({
  style,
  Renderer,
  onRun,
  onStop,
}: VbaEditorInnerProps): ReactNode {
  const { state, dispatch, program } = useVbaEditor();
  const { search } = state;
  const [executionState, setExecutionState] = useState<ExecutionState>("idle");

  // Get modified source map from history
  const modifiedSourceMap = state.sourceHistory.present;

  // Project-wide search
  const handleProjectMatchesUpdate = useCallback(
    (
      matches: ReadonlyMap<string, readonly ProjectSearchMatch[]>,
      totalCount: number,
    ) => {
      dispatch({ type: "UPDATE_PROJECT_MATCHES", projectMatches: matches, totalCount });
    },
    [dispatch],
  );

  useProjectSearch({
    program,
    query: search.query,
    options: search.options,
    isOpen: search.isOpen && search.mode === "project-wide",
    modifiedSourceMap,
    onProjectMatchesUpdate: handleProjectMatchesUpdate,
  });

  // Handle result click to navigate
  const handleMatchSelect = useCallback(
    (moduleName: string, match: ProjectSearchMatch) => {
      // Select the module and set cursor to match position
      dispatch({ type: "SELECT_MODULE", moduleName });
      dispatch({
        type: "SET_CURSOR",
        line: match.line,
        column: match.startColumn,
      });
    },
    [dispatch],
  );

  // Wrap onRun to track execution state
  const handleRun = useCallback(
    (procedureName: string) => {
      setExecutionState("running");
      onRun?.(procedureName);
      // Simulate completion after a delay (in real use, caller would control this)
      setTimeout(() => setExecutionState("success"), 100);
    },
    [onRun]
  );

  const handleStop = useCallback(() => {
    setExecutionState("idle");
    onStop?.();
  }, [onStop]);

  const panels = useMemo<EditorPanel[]>(
    () => [
      {
        id: "modules",
        position: "left",
        size: "200px",
        content: <VbaModuleGroupedList />,
        drawerLabel: "Modules",
      },
      {
        id: "execution",
        position: "right",
        size: "280px",
        content: (
          <VbaExecutionPanel
            onRun={handleRun}
            onStop={handleStop}
            executionState={executionState}
          />
        ),
        drawerLabel: "Execution",
      },
    ],
    [handleRun, handleStop, executionState]
  );

  // Get cursor position from state
  const { cursor, selection } = state;

  // Compute selection character count
  const selectionInfo = useMemo(() => {
    if (!selection) return undefined;
    // Simple estimation - actual character count would need source text
    const lines = selection.endLine - selection.startLine;
    return { lines, characters: 0 }; // Characters computed in context if needed
  }, [selection]);

  // Bottom bar: always show status bar, add search results when searching
  const bottomBar = (
    <>
      {search.isOpen && search.mode === "project-wide" && (
        <SearchResultsPanel onMatchSelect={handleMatchSelect} />
      )}
      <EditorStatusBar
        cursor={{ line: cursor.line, column: cursor.column }}
        selection={selectionInfo}
        language="VBA"
      />
    </>
  );

  return (
    <EditorShell
      toolbar={<VbaEditorToolbar />}
      panels={panels}
      bottomBar={bottomBar}
      style={style}
    >
      <VbaCodeEditor Renderer={Renderer} />
    </EditorShell>
  );
}

/**
 * VBA Editor component.
 *
 * Complete VBA code editor with:
 * - Module list (left sidebar)
 * - Code editor with syntax highlighting (center)
 * - Execution panel (right sidebar) with run/stop controls and console
 * - Toolbar with breadcrumb navigation and undo/redo
 */
export function VbaEditor({
  program,
  onProgramChange: _onProgramChange,
  readonly: _readonly,
  style,
  Renderer,
  onRun,
  onStop,
}: VbaEditorProps): ReactNode {
  return (
    <VbaEditorProvider program={program}>
      <VbaEditorInner
        style={style}
        Renderer={Renderer}
        onRun={onRun}
        onStop={onStop}
      />
    </VbaEditorProvider>
  );
}
