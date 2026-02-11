/**
 * @file ThumbnailItem
 *
 * Thumbnail item for viewer sidebar.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, fontTokens, radiusTokens, colorTokens, shadowTokens } from "../design-tokens";

export type ThumbnailItemProps = {
  /** Thumbnail content (preview) */
  readonly children: ReactNode;
  /** Item number (1-based) */
  readonly number: number;
  /** Whether this item is active */
  readonly active?: boolean;
  /** Click handler */
  readonly onClick?: () => void;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const itemStyle: CSSProperties = {
  marginBottom: spacingTokens.sm,
  cursor: "pointer",
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
  border: "2px solid transparent",
  transition: "border-color 0.15s ease",
};

const activeItemStyle: CSSProperties = {
  ...itemStyle,
  borderColor: colorTokens.accent.primary,
};

const previewStyle: CSSProperties = {
  width: "100%",
  backgroundColor: colorTokens.background.primary,
  boxShadow: shadowTokens.sm,
};

const numberStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  textAlign: "center",
  marginTop: spacingTokens.xs,
};

/**
 * Thumbnail item with preview and number.
 */
export function ThumbnailItem({ children, number, active, onClick, className, style }: ThumbnailItemProps) {
  return (
    <div
      style={{ ...(active ? activeItemStyle : itemStyle), ...style }}
      onClick={onClick}
      className={className}
    >
      <div style={previewStyle}>{children}</div>
      <div style={numberStyle}>{number}</div>
    </div>
  );
}
