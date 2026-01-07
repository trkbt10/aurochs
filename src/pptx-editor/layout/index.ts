/**
 * @file Layout module exports
 *
 * Provides layout configuration and components for the presentation editor.
 */

export {
  EDITOR_GRID_CONFIG,
  EDITOR_GRID_CONFIG_NO_INSPECTOR,
  RIGHT_PANEL_TABS,
  DEFAULT_ACTIVE_TAB,
  type RightPanelTabId,
  type RightPanelTabConfig,
} from "./EditorLayoutConfig";

export { CanvasArea, type CanvasAreaProps } from "./CanvasArea";

export { usePivotTabs, type UsePivotTabsOptions, type UsePivotTabsResult } from "./hooks/usePivotTabs";
