/**
 * @file Inspector section component
 *
 * Lightweight section component for use inside inspector panels.
 * No border/radius - designed to be nested inside tab containers.
 */

import type { ReactNode, CSSProperties } from "react";
import { colorTokens, fontTokens, spacingTokens } from "../design-tokens";

export type InspectorSectionProps = {
  /** Section content */
  readonly children: ReactNode;
  /** Section title */
  readonly title: string;
  /** Badge/count to show next to title (optional) */
  readonly badge?: string | number;
};

const headerStyle: CSSProperties = {
  padding: `${spacingTokens.md} ${spacingTokens.lg}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const badgeStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  padding: "2px 6px",
  borderRadius: "4px",
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

/**
 * Section component for inspector panel tabs.
 *
 * Use this instead of Panel when inside InspectorPanelWithTabs.
 */
export function InspectorSection({ children, title, badge }: InspectorSectionProps) {
  return (
    <>
      <div style={headerStyle}>
        <span>{title}</span>
        {badge !== undefined && <span style={badgeStyle}>{badge}</span>}
      </div>
      <div style={contentStyle}>{children}</div>
    </>
  );
}
