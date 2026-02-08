/**
 * @file Editor layout configuration for react-panel-layout GridLayout
 *
 * Defines the resizable panel layout structure for the presentation editor:
 * - Thumbnails panel (left, resizable)
 * - Canvas area (center, flexible)
 * - Inspector panel (right, resizable with pivot tabs)
 */

import type { PanelLayoutConfig } from "react-panel-layout";

/**
 * Tab IDs for the right inspector panel.
 *
 * Grouped into 3 categories:
 * - properties: 選択要素 + レイヤー
 * - slide: スライド情報 + レイアウト
 * - resources: アセット + テーマ
 */
export type RightPanelTabId = "properties" | "slide" | "resources";

/**
 * Tab configuration for display.
 */
export type RightPanelTabConfig = {
  readonly id: RightPanelTabId;
  readonly label: string;
};

/**
 * All available tabs for the right panel.
 */
export const RIGHT_PANEL_TABS: readonly RightPanelTabConfig[] = [
  { id: "properties", label: "プロパティ" },
  { id: "slide", label: "スライド" },
  { id: "resources", label: "リソース" },
] as const;

/**
 * Default active tab ID.
 */
export const DEFAULT_ACTIVE_TAB: RightPanelTabId = "properties";

/**
 * Grid layout configuration for the presentation editor.
 *
 * Layout structure:
 * ```
 * +-------------+------------------+-------------+
 * | thumbnails  |     canvas       |  inspector  |
 * | (resizable) |      (1fr)       | (resizable) |
 * +-------------+------------------+-------------+
 * ```
 */
export const EDITOR_GRID_CONFIG: PanelLayoutConfig = {
  areas: [["thumbnails", "canvas", "inspector"]],
  rows: [{ size: "1fr" }],
  columns: [
    {
      size: "200px",
      resizable: true,
      minSize: 150,
      maxSize: 350,
    },
    {
      size: "1fr",
    },
    {
      size: "280px",
      resizable: true,
      minSize: 200,
      maxSize: 500,
    },
  ],
  gap: "0px",
};

/**
 * Grid layout configuration with only thumbnails and canvas (no inspector).
 */
export const EDITOR_GRID_CONFIG_NO_INSPECTOR: PanelLayoutConfig = {
  areas: [["thumbnails", "canvas"]],
  rows: [{ size: "1fr" }],
  columns: [
    {
      size: "200px",
      resizable: true,
      minSize: 150,
      maxSize: 350,
    },
    {
      size: "1fr",
    },
  ],
  gap: "0px",
};

/**
 * Tablet grid layout configuration.
 * - Keep thumbnails visible (resizable)
 * - Inspector is expected to be rendered as a drawer layer (not in the grid)
 */
export const EDITOR_GRID_CONFIG_TABLET: PanelLayoutConfig = {
  areas: [["thumbnails", "canvas"]],
  rows: [{ size: "1fr" }],
  columns: [
    {
      size: "180px",
      resizable: true,
      minSize: 150,
      maxSize: 320,
    },
    {
      size: "1fr",
    },
  ],
  gap: "0px",
};

/**
 * Mobile grid layout configuration.
 * - Canvas only
 * - Thumbnails and inspector are expected to be rendered as drawer layers
 */
export const EDITOR_GRID_CONFIG_MOBILE: PanelLayoutConfig = {
  areas: [["canvas"]],
  rows: [{ size: "1fr" }],
  columns: [{ size: "1fr" }],
  gap: "0px",
};
