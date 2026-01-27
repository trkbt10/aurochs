/**
 * @file Section layout component
 *
 * Provides a consistent visual container for grouped editor content.
 * Used by consumers to wrap editor components that need visual boundaries.
 *
 * Design principle: Editors themselves are pure content without container styling.
 * Section provides the container, allowing editors to work anywhere (popover, inline, panel).
 */

import type { ReactNode, CSSProperties } from "react";
import { colorTokens, radiusTokens, spacingTokens } from "../design-tokens";

export type SectionProps = {
  /** Content to render inside the section */
  readonly children: ReactNode;
  /** Gap between child elements (default: 12) */
  readonly gap?: number;
  /** Additional CSS class */
  readonly className?: string;
  /** Inline style overrides */
  readonly style?: CSSProperties;
};

/**
 * A visual container section with consistent dark theme styling.
 */
export function Section({
  children,
  gap = 12,
  className,
  style,
}: SectionProps) {
  const sectionStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${gap}px`,
    padding: spacingTokens.md,
    backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
    borderRadius: `var(--radius-md, ${radiusTokens.md})`,
    border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  };

  return (
    <div style={{ ...sectionStyle, ...style }} className={className}>
      {children}
    </div>
  );
}
