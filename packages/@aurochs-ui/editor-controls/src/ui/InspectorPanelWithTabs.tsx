/**
 * @file InspectorPanelWithTabs - Tab bar + content container for right panel
 *
 * Shared component for multi-tab inspector panels (Properties/Layers/etc).
 * SoT for both pptx-editor and pdf-editor right panel tab UI.
 */

import { type ReactNode, type CSSProperties } from "react";

// =============================================================================
// Types
// =============================================================================

export type InspectorTab = {
  readonly id: string;
  readonly label?: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
};

export type InspectorPanelWithTabsProps = {
  readonly tabs: readonly InspectorTab[];
  readonly activeTabId: string;
  readonly onActiveTabChange: (tabId: string) => void;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "2px",
  padding: "4px",
  borderBottom: "1px solid var(--border-subtle, #333)",
  backgroundColor: "var(--bg-primary, #0a0a0a)",
  flexShrink: 0,
};

const tabButtonStyle: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "var(--text-secondary, #888)",
  transition: "background-color 0.15s, color 0.15s",
};

const activeTabButtonStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "var(--bg-tertiary, #222)",
  color: "var(--text-primary, #fff)",
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

// =============================================================================
// Component
// =============================================================================

/** Inspector panel with tab bar navigation. Shared across editors. */
export function InspectorPanelWithTabs({ tabs, activeTabId, onActiveTabChange, style }: InspectorPanelWithTabsProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div style={{ ...containerStyle, ...style }}>
      <div style={tabBarStyle}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={tab.id === activeTabId ? activeTabButtonStyle : tabButtonStyle}
            onClick={() => onActiveTabChange(tab.id)}
            disabled={tab.disabled}
          >
            {tab.label ?? tab.id}
          </button>
        ))}
      </div>
      <div style={contentStyle}>{activeTab?.content ?? null}</div>
    </div>
  );
}
