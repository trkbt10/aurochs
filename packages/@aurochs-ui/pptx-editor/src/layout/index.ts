/**
 * @file Layout module exports
 *
 * PPTX-specific layout configuration and hooks.
 */

export {
  RIGHT_PANEL_TABS,
  DEFAULT_ACTIVE_TAB,
  type RightPanelTabId,
  type RightPanelTabConfig,
} from "./EditorLayoutConfig";

export { usePivotTabs, type UsePivotTabsOptions, type UsePivotTabsResult } from "./hooks/usePivotTabs";
