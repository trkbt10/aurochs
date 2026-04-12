/**
 * @file Top-level fig editor component
 *
 * Composes the editor shell with all panels and the canvas.
 * This is the main entry point for embedding the fig editor.
 */

import type { FigDesignDocument } from "@aurochs-builder/fig/types";
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
// Inner Component (uses context)
// =============================================================================

function FigEditorContent() {
  const { dispatch, nodeSelection, canUndo, canRedo } = useFigEditor();
  const hasSelection = nodeSelection.selectedIds.length > 0;

  // Register keyboard shortcuts
  useFigKeyboard({ dispatch, hasSelection, canUndo, canRedo });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 260px",
        gridTemplateRows: "auto 1fr",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Toolbar spans full width */}
      <div style={{ gridColumn: "1 / -1" }}>
        <FigEditorToolbar />
      </div>

      {/* Left panel: pages + layers */}
      <div
        style={{
          borderRight: "1px solid #eee",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PageListPanel />
        <hr style={{ border: "none", borderTop: "1px solid #eee", margin: 0 }} />
        <LayerPanel />
      </div>

      {/* Center: canvas */}
      <div style={{ overflow: "hidden", position: "relative" }}>
        <FigEditorCanvas />
      </div>

      {/* Right panel: properties */}
      <div style={{ borderLeft: "1px solid #eee", overflow: "auto" }}>
        <PropertyPanel />
      </div>
    </div>
  );
}

// =============================================================================
// Public Component
// =============================================================================

/**
 * Fig design editor.
 *
 * Provides a full-featured editor for .fig design files with:
 * - Page management (left panel)
 * - Layer tree (left panel)
 * - Interactive canvas with selection, move, resize, rotate (center)
 * - Property editing (right panel)
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
      <FigEditorContent />
    </FigEditorProvider>
  );
}
