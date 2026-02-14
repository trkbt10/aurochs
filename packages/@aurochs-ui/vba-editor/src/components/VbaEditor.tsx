/**
 * @file VBA Editor Main Component
 *
 * Integrates all VBA editor components into a complete editor view.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { VbaProgramIr } from "@aurochs-office/vba";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { VbaEditorProvider } from "../context/vba-editor";
import { VbaCodeEditor, type CodeRendererComponent } from "./code-editor";
import { VbaModuleList } from "./module-list";
import { VbaEditorToolbar } from "./toolbar";
import { VbaPropertiesPanel } from "./properties-panel";

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
};

type VbaEditorInnerProps = {
  readonly style?: CSSProperties;
  readonly Renderer?: CodeRendererComponent;
};

/**
 * Inner editor component (requires context).
 */
function VbaEditorInner({ style, Renderer }: VbaEditorInnerProps): ReactNode {
  const panels = useMemo<EditorPanel[]>(
    () => [
      {
        id: "modules",
        position: "left",
        size: "200px",
        content: <VbaModuleList />,
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

  return (
    <EditorShell toolbar={<VbaEditorToolbar />} panels={panels} style={style}>
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
 * - Toolbar with undo/redo and procedure dropdown
 */
export function VbaEditor({
  program,
  onProgramChange: _onProgramChange,
  readonly: _readonly,
  style,
  Renderer,
}: VbaEditorProps): ReactNode {
  return (
    <VbaEditorProvider program={program}>
      <VbaEditorInner style={style} Renderer={Renderer} />
    </VbaEditorProvider>
  );
}
