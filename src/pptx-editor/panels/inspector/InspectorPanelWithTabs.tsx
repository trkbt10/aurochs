/**
 * @file Inspector panel with tab bar
 *
 * Wraps pivot content with a tab bar navigation.
 */

import { type ReactNode, type CSSProperties } from "react";
import type { PivotBehavior } from "react-panel-layout/pivot";

export type InspectorPanelWithTabsProps = {
  readonly pivot: PivotBehavior;
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "2px",
  padding: "4px",
  borderBottom: "1px solid var(--border-subtle, #333)",
  backgroundColor: "var(--bg-primary, #0a0a0a)",
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

function getTabStyle(isActive: boolean): CSSProperties {
  return isActive ? activeTabButtonStyle : tabButtonStyle;
}

/**
 * Inspector panel with tab bar navigation.
 */
export function InspectorPanelWithTabs({ pivot, style }: InspectorPanelWithTabsProps): ReactNode {
  const { items, activeId, onActiveChange } = pivot;

  const activeItem = items.find((item) => item.id === activeId);
  const content = activeItem?.content ?? null;

  return (
    <div style={{ ...containerStyle, ...style }}>
      <div style={tabBarStyle}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            style={getTabStyle(item.id === activeId)}
            onClick={() => onActiveChange?.(item.id)}
            disabled={item.disabled}
          >
            {item.label ?? item.id}
          </button>
        ))}
      </div>
      <div style={contentStyle}>{content}</div>
    </div>
  );
}
