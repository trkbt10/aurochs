/**
 * @file GroupedListGroup
 *
 * Group header with collapsible content.
 * - Click to toggle collapse
 * - Right-click for context menu (create new item in group)
 */

import { useCallback, type CSSProperties } from "react";
import { colorTokens, spacingTokens, fontTokens } from "../design-tokens";
import type { GroupedListGroupProps } from "./types";

const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.xs,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  cursor: "pointer",
  userSelect: "none",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
};

const chevronStyle: CSSProperties = {
  fontSize: "10px",
  transition: "transform 0.2s ease",
  display: "inline-block",
};

const chevronCollapsedStyle: CSSProperties = {
  ...chevronStyle,
  transform: "rotate(-90deg)",
};

const contentStyle: CSSProperties = {
  display: "block",
};

const contentCollapsedStyle: CSSProperties = {
  display: "none",
};

/**
 * Group header with collapsible content.
 */
export function GroupedListGroup({
  group,
  isCollapsed,
  mode: _mode,
  children,
  onToggleCollapse,
  onGroupContextMenu,
}: GroupedListGroupProps) {
  const handleClick = useCallback(() => {
    onToggleCollapse();
  }, [onToggleCollapse]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onGroupContextMenu(group.id, e);
    },
    [onGroupContextMenu, group.id]
  );

  return (
    <div data-group-id={group.id}>
      <div
        style={groupHeaderStyle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span style={isCollapsed ? chevronCollapsedStyle : chevronStyle}>
          ▼
        </span>
        <span>{group.label}</span>
      </div>
      <div style={isCollapsed ? contentCollapsedStyle : contentStyle}>
        {children}
      </div>
    </div>
  );
}
