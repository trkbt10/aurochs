/**
 * @file Top-level fig editor component
 *
 * Composes EditorShell with all panels and the canvas.
 * This is the main entry point for embedding the fig editor.
 */

import { useMemo, type CSSProperties } from "react";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { EditorShell, CanvasArea, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { FigEditorProvider, useFigEditor } from "../context/FigEditorContext";
import { FigEditorCanvas } from "../canvas/FigEditorCanvas";
import { FigEditorToolbar } from "./FigEditorToolbar";
import { PageListPanel } from "../panels/PageListPanel";
import { PropertyPanel } from "../panels/PropertyPanel";
import { LayerPanel } from "../panels/LayerPanel";
import { useFigKeyboard } from "../canvas/interaction/use-fig-keyboard";

// =============================================================================
// Types
// =============================================================================

type FigEditorProps = {
  readonly initialDocument: FigDesignDocument;
};

// =============================================================================
// Left panel content: pages (fixed) + layers (scrollable)
// =============================================================================

const leftPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const layerPanelWrapperStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
};

/**
 * Left panel: Pages (compact, always visible) above Layers (scrollable, fills remaining space).
 *
 * Using flex layout: PageListPanel gets its natural height,
 * LayerPanel wrapper takes remaining space with independent scroll.
 */
function LeftPanelContent() {
  return (
    <div style={leftPanelStyle}>
      <PageListPanel />
      <div style={layerPanelWrapperStyle}>
        <LayerPanel />
      </div>
    </div>
  );
}

// =============================================================================
// Inner Component (uses context)
// =============================================================================

function FigEditorContent() {
  const { dispatch, nodeSelection, canUndo, canRedo, textEdit } = useFigEditor();
  const hasSelection = nodeSelection.selectedIds.length > 0;

  // Register keyboard shortcuts
  useFigKeyboard({
    dispatch,
    hasSelection,
    selectedIds: nodeSelection.selectedIds,
    canUndo,
    canRedo,
    isTextEditing: textEdit.type === "active",
  });

  const toolbarContent = useMemo(() => <FigEditorToolbar />, []);

  const panels = useMemo((): EditorPanel[] => [
    {
      id: "pages-layers",
      position: "left",
      content: <LeftPanelContent />,
      drawerLabel: "Pages & Layers",
      scrollable: false,
    },
    {
      id: "inspector",
      position: "right",
      content: <PropertyPanel />,
      drawerLabel: "Inspector",
      scrollable: true,
    },
  ], []);

  return (
    <EditorShell toolbar={toolbarContent} panels={panels}>
      <CanvasArea>
        <FigEditorCanvas />
      </CanvasArea>
    </EditorShell>
  );
}

// =============================================================================
// Public Component
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

/**
 * Fig design editor.
 *
 * Provides a full-featured editor for .fig design files with:
 * - Page management (left panel)
 * - Interactive canvas with selection, move, resize, rotate (center)
 * - Property editing + layer tree (right panel)
 * - Creation tools toolbar (top)
 * - Undo/redo (top)
 * - Keyboard shortcuts
 *
 * @example
 * ```tsx
 * const doc = await createFigDesignDocument(buffer);
 * <FigEditor initialDocument={doc} />
 * ```
 */
export function FigEditor({ initialDocument }: FigEditorProps) {
  return (
    <FigEditorProvider initialDocument={initialDocument}>
      <div style={containerStyle}>
        <FigEditorContent />
      </div>
    </FigEditorProvider>
  );
}
