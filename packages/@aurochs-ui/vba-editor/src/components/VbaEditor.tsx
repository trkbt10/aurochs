/**
 * @file VBA Editor Main Component
 *
 * Integrates all VBA editor components into a complete editor view.
 */

import { useMemo, useCallback, type CSSProperties, type ReactNode } from "react";
import type { VbaProgramIr } from "@aurochs-office/vba";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { VbaEditorProvider, useVbaEditor } from "../context/vba-editor";
import type { ProjectSearchMatch } from "../context/vba-editor/types";
import { VbaCodeEditor, type CodeRendererComponent } from "./code-editor";
import { VbaModuleGroupedList } from "./module-list";
import { VbaEditorToolbar, type RunStatus } from "./toolbar";
import { VbaPropertiesPanel } from "./properties-panel";
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
  /** Whether Run button is disabled */
  readonly runDisabled?: boolean;
  /** Current run status */
  readonly runStatus?: RunStatus;
};

type VbaEditorInnerProps = {
  readonly style?: CSSProperties;
  readonly Renderer?: CodeRendererComponent;
  readonly onRun?: (procedureName: string) => void;
  readonly runDisabled?: boolean;
  readonly runStatus?: RunStatus;
};

/**
 * Inner editor component (requires context).
 */
function VbaEditorInner({
  style,
  Renderer,
  onRun,
  runDisabled,
  runStatus,
}: VbaEditorInnerProps): ReactNode {
  const { state, dispatch, program } = useVbaEditor();
  const { search } = state;

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
        id: "properties",
        position: "right",
        size: "240px",
        content: <VbaPropertiesPanel />,
        drawerLabel: "Properties",
      },
    ],
    []
  );

  // Show SearchResultsPanel as bottom bar when in project-wide search mode
  const bottomBar =
    search.isOpen && search.mode === "project-wide" ? (
      <SearchResultsPanel onMatchSelect={handleMatchSelect} />
    ) : undefined;

  return (
    <EditorShell
      toolbar={
        <VbaEditorToolbar
          onRun={onRun}
          runDisabled={runDisabled}
          runStatus={runStatus}
        />
      }
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
 * - Properties panel (right sidebar)
 * - Toolbar with undo/redo, procedure dropdown, and run button
 */
export function VbaEditor({
  program,
  onProgramChange: _onProgramChange,
  readonly: _readonly,
  style,
  Renderer,
  onRun,
  runDisabled,
  runStatus,
}: VbaEditorProps): ReactNode {
  return (
    <VbaEditorProvider program={program}>
      <VbaEditorInner
        style={style}
        Renderer={Renderer}
        onRun={onRun}
        runDisabled={runDisabled}
        runStatus={runStatus}
      />
    </VbaEditorProvider>
  );
}
