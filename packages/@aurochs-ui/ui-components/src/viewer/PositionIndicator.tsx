/**
 * @file PositionIndicator
 *
 * Displays current position (slide/page/sheet) and total count.
 * Unified component for PPTX/DOCX/XLSX viewers.
 */

import type { CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens } from "../design-tokens";

export type PositionIndicatorVariant = "default" | "compact" | "minimal" | "light";

export type PositionIndicatorProps = {
  /** Current position (1-based) */
  readonly current: number;
  /** Total count */
  readonly total: number;
  /** Visual variant */
  readonly variant?: PositionIndicatorVariant;
  /** Optional label (e.g., sheet name) */
  readonly label?: string;
  /** Additional CSS class */
  readonly className?: string;
};

/** Large font size for light variant current number (20px) */
const LIGHT_CURRENT_FONT_SIZE = 20;
/** Standard font size for light variant (16px) */
const LIGHT_FONT_SIZE = 16;

const containerStyles: Record<PositionIndicatorVariant, CSSProperties> = {
  default: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacingTokens.xs,
    fontSize: fontTokens.size.lg,
    fontWeight: fontTokens.weight.medium,
    color: colorTokens.text.secondary,
  },
  compact: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacingTokens.xs,
    fontSize: fontTokens.size.md,
    fontWeight: fontTokens.weight.medium,
    color: colorTokens.text.secondary,
  },
  minimal: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: fontTokens.size.md,
    color: colorTokens.text.tertiary,
  },
  light: {
    display: "flex",
    alignItems: "center",
    gap: spacingTokens.xs,
    fontFamily: "monospace",
    fontSize: LIGHT_FONT_SIZE,
    fontWeight: fontTokens.weight.medium,
    color: colorTokens.overlay.lightText,
    textShadow: `0 2px 4px ${colorTokens.shadow.default}`,
  },
};

const currentStyles: Record<PositionIndicatorVariant, CSSProperties> = {
  default: { fontWeight: fontTokens.weight.semibold },
  compact: { fontWeight: fontTokens.weight.semibold },
  minimal: {},
  light: { fontSize: LIGHT_CURRENT_FONT_SIZE },
};

const separatorStyles: Record<PositionIndicatorVariant, CSSProperties> = {
  default: { color: colorTokens.text.tertiary },
  compact: { color: colorTokens.text.tertiary },
  minimal: { color: colorTokens.text.tertiary, margin: `0 ${spacingTokens["2xs"]}` },
  light: { color: colorTokens.overlay.lightTextTertiary, margin: `0 ${spacingTokens["2xs"]}` },
};

const totalStyles: Record<PositionIndicatorVariant, CSSProperties> = {
  default: { color: colorTokens.text.tertiary },
  compact: { color: colorTokens.text.tertiary },
  minimal: {},
  light: { color: colorTokens.overlay.lightTextSecondary },
};

const labelStyles: Record<PositionIndicatorVariant, CSSProperties> = {
  default: { marginRight: spacingTokens.sm, fontWeight: fontTokens.weight.medium },
  compact: { marginRight: spacingTokens["xs-plus"] },
  minimal: { marginRight: spacingTokens.xs },
  light: { marginRight: spacingTokens.md },
};

/**
 * Position indicator for viewers.
 *
 * @example
 * ```tsx
 * <PositionIndicator current={3} total={10} variant="default" />
 * <PositionIndicator current={1} total={5} label="Sheet1" variant="compact" />
 * ```
 */
export function PositionIndicator({
  current,
  total,
  variant = "default",
  label,
  className,
}: PositionIndicatorProps) {
  return (
    <div style={containerStyles[variant]} className={className}>
      {label !== undefined && <span style={labelStyles[variant]}>{label}</span>}
      <span style={currentStyles[variant]}>{current}</span>
      <span style={separatorStyles[variant]}>/</span>
      <span style={totalStyles[variant]}>{total}</span>
    </div>
  );
}
