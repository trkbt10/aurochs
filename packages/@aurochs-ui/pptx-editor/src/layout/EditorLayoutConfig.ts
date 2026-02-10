/**
 * @file Editor layout configuration — PPTX-specific tab definitions
 *
 * Defines the inspector panel tab structure for the presentation editor.
 */

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
