/**
 * @file @aurochs-ui/fig-editor main entry point
 *
 * React editor for .fig design files.
 */

// Top-level editor component
export { FigEditor } from "./editor/FigEditor";

// Context and hooks
export { FigEditorProvider, useFigEditor, useFigEditorOptional, useFigDrag } from "./context/FigEditorContext";
export { useExportFig } from "./hooks/use-export-fig";
export { useFigFileLoad } from "./hooks/use-fig-file-load";

// Types
export type {
  FigEditorState,
  FigEditorAction,
  FigEditorContextValue,
  FigCreationMode,
  FigTextEditState,
  FigClipboardContent,
} from "./context/fig-editor/types";

export { createSelectMode, isSelectMode } from "./context/fig-editor/types";

// Reducer (for advanced use)
export { figEditorReducer, createFigEditorState } from "./context/fig-editor/reducer/reducer";

// Canvas components (for composition)
export { FigEditorCanvas } from "./canvas/FigEditorCanvas";
export { FigPageRenderer } from "./canvas/FigPageRenderer";

// Panels (for composition)
export { PropertyPanel } from "./panels/PropertyPanel";
export { PageListPanel } from "./panels/PageListPanel";
export { LayerPanel } from "./panels/LayerPanel";
export { FigInspectorPanel, type FigInspectorPanelProps } from "./panels/FigInspectorPanel";
export {
  FigInspectorDetailsPanel,
  type FigInspectorDetailsPanelProps,
  type DetailSectionRenderer,
  FIG_DETAIL_SECTIONS,
  DetailSection,
  DetailRow,
  DetailSwatch,
} from "./panels/FigInspectorDetailsPanel";

// Toolbar
export { FigEditorToolbar } from "./editor/FigEditorToolbar";

// Inspector (Fig-specific category registry, adapters, overlay, panel)
export { FIG_NODE_CATEGORY_REGISTRY, FIG_LEGEND_ORDER } from "./inspector";
export {
  getRootNormalizationTransform,
  collectFigBoxes,
  collectDesignBoxes,
  figNodeToInspectorTree,
  designNodeToInspectorTree,
} from "./inspector";
export { FigInspectorOverlay, type FigInspectorOverlayProps } from "./inspector";
export { FigInspectorProvider, useFigInspectorContextOptional } from "./inspector";
