/**
 * @file ViewerSidebar
 *
 * Thumbnail/navigation sidebar for viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, fontTokens, colorTokens } from "../design-tokens";

export type ViewerSidebarProps = {
  /** Sidebar title */
  readonly title?: string;
  /** Item count (shown next to title) */
  readonly count?: number;
  /** Sidebar content (e.g., thumbnail list) */
  readonly children: ReactNode;
  /** Sidebar width (default: 160px) */
  readonly width?: number | string;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const sidebarStyle: CSSProperties = {
  backgroundColor: colorTokens.background.secondary,
  borderRight: `1px solid ${colorTokens.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacingTokens.md,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
};

const titleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.tertiary,
  textTransform: "uppercase",
  letterSpacing: fontTokens.letterSpacing.uppercase,
};

const countStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: spacingTokens.sm,
};

/**
 * Sidebar with optional title and content area.
 */
export function ViewerSidebar({
  title,
  count,
  children,
  width = 160,
  className,
  style,
}: ViewerSidebarProps) {
  return (
    <aside style={{ ...sidebarStyle, width, ...style }} className={className}>
      {(title !== undefined || count !== undefined) && (
        <div style={headerStyle}>
          {title !== undefined && <span style={titleStyle}>{title}</span>}
          {count !== undefined && <span style={countStyle}>{count}</span>}
        </div>
      )}
      <div style={contentStyle}>{children}</div>
    </aside>
  );
}
