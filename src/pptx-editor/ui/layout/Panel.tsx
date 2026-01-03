/**
 * @file Panel layout component
 *
 * Reusable panel container for sidebars and property panels.
 */

import type { ReactNode, CSSProperties } from "react";

// =============================================================================
// Types
// =============================================================================

export type PanelProps = {
  /** Panel content */
  readonly children: ReactNode;
  /** Panel title (optional) */
  readonly title?: string;
  /** Badge/count to show next to title (optional) */
  readonly badge?: string | number;
  /** Panel width (default: 280px) */
  readonly width?: number | string;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Panel container for sidebar content.
 *
 * Provides consistent styling for editor panels with optional header.
 *
 * @example
 * ```tsx
 * <Panel title="Layers" badge={5}>
 *   <LayerList />
 * </Panel>
 * ```
 */
export function Panel({
  children,
  title,
  badge,
  width = 280,
  className,
  style,
}: PanelProps) {
  const containerStyle: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    flexShrink: 0,
    backgroundColor: "var(--editor-panel-bg, #0a0a0a)",
    borderRadius: "var(--radius-md, 8px)",
    border: "1px solid var(--editor-border, #222)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    ...style,
  };

  const headerStyle: CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-subtle, #222)",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-primary, #fff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const badgeStyle: CSSProperties = {
    fontSize: "10px",
    color: "var(--text-tertiary, #737373)",
    backgroundColor: "var(--bg-tertiary, #111111)",
    padding: "2px 6px",
    borderRadius: "4px",
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: "auto",
  };

  return (
    <div className={className} style={containerStyle}>
      {title && (
        <div style={headerStyle}>
          <span>{title}</span>
          {badge !== undefined && <span style={badgeStyle}>{badge}</span>}
        </div>
      )}
      <div style={contentStyle}>{children}</div>
    </div>
  );
}
