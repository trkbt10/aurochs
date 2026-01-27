/**
 * @file Hook for managing right panel pivot tab state
 *
 * Provides controlled state management for the inspector panel tabs
 * with optional auto-switch behavior when shape selection changes.
 */

import { useState, useCallback, useEffect } from "react";
import { DEFAULT_ACTIVE_TAB, type RightPanelTabId } from "../EditorLayoutConfig";

export type UsePivotTabsOptions = {
  /** Default tab to show on mount */
  readonly defaultTab?: RightPanelTabId;
  /**
   * Automatically switch to "properties" tab when shapes are selected.
   * @default false
   */
  readonly autoSwitchOnSelection?: boolean;
  /** Current selection state (number of selected shapes) */
  readonly selectionCount?: number;
};

export type UsePivotTabsResult = {
  /** Currently active tab ID */
  readonly activeTab: RightPanelTabId;
  /** Set the active tab */
  readonly setActiveTab: (id: RightPanelTabId) => void;
  /** Check if a specific tab is active */
  readonly isActive: (id: RightPanelTabId) => boolean;
  /** Callback for pivot onActiveChange */
  readonly handleTabChange: (id: string) => void;
};

/**
 * Hook for managing right panel pivot tab state.
 *
 * @example
 * ```tsx
 * const { activeTab, handleTabChange, isActive } = usePivotTabs({
 *   defaultTab: "properties",
 *   autoSwitchOnSelection: true,
 *   selectionCount: selectedShapes.length,
 * });
 *
 * // Use in pivot behavior
 * pivot: {
 *   items: [...],
 *   activeId: activeTab,
 *   onActiveChange: handleTabChange,
 * }
 * ```
 */
export function usePivotTabs(options: UsePivotTabsOptions = {}): UsePivotTabsResult {
  const { defaultTab = DEFAULT_ACTIVE_TAB, autoSwitchOnSelection = false, selectionCount = 0 } = options;

  const [activeTab, setActiveTabInternal] = useState<RightPanelTabId>(defaultTab);

  const setActiveTab = useCallback((id: RightPanelTabId) => {
    setActiveTabInternal(id);
  }, []);

  const handleTabChange = useCallback(
    (id: string) => {
      setActiveTab(id as RightPanelTabId);
    },
    [setActiveTab],
  );

  const isActive = useCallback(
    (id: RightPanelTabId): boolean => {
      return activeTab === id;
    },
    [activeTab],
  );

  // Auto-switch to "properties" tab when selection changes (optional)
  useEffect(() => {
    if (autoSwitchOnSelection && selectionCount > 0) {
      setActiveTabInternal("properties");
    }
  }, [autoSwitchOnSelection, selectionCount]);

  return {
    activeTab,
    setActiveTab,
    isActive,
    handleTabChange,
  };
}
