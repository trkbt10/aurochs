/**
 * @file Layout module exports
 *
 * Provides layout configuration and components for the presentation editor.
 */

export {
  EDITOR_GRID_CONFIG,
  EDITOR_GRID_CONFIG_NO_INSPECTOR,
  EDITOR_GRID_CONFIG_TABLET,
  EDITOR_GRID_CONFIG_MOBILE,
  RIGHT_PANEL_TABS,
  DEFAULT_ACTIVE_TAB,
  type RightPanelTabId,
  type RightPanelTabConfig,
} from "./EditorLayoutConfig";

export { CanvasArea, type CanvasAreaProps } from "./CanvasArea";

export { usePivotTabs, type UsePivotTabsOptions, type UsePivotTabsResult } from "./hooks/usePivotTabs";

export { useContainerWidth } from "./hooks/useContainerWidth";

export { createPresentationEditorLayoutSchemas, type PresentationEditorLayoutSchema } from "./presentation-editor-layout-schema";

export { type LayerPlacement, type LayerPlacements } from "./layer-placements";

export {
  DEFAULT_EDITOR_LAYOUT_BREAKPOINTS,
  resolveEditorLayoutMode,
  type EditorLayoutMode,
  type EditorLayoutBreakpoints,
} from "./responsive-layout";
