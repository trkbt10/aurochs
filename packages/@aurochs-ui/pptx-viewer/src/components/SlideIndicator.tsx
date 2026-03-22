/**
 * @file SlideIndicator
 *
 * Displays current slide number and total slides count.
 */

import type { CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type SlideIndicatorVariant = "dark" | "light" | "compact" | "minimal";

export type SlideIndicatorProps = {
  /** Current slide number (1-based) */
  readonly current: number;
  /** Total number of slides */
  readonly total: number;
  /** Visual variant */
  readonly variant?: SlideIndicatorVariant;
  /** Show animation indicator dot */
  readonly showAnimation?: boolean;
  /** Additional CSS class */
  readonly className?: string;
};

/** Large font size for light variant current number (20px) */
const LIGHT_CURRENT_FONT_SIZE = 20;
/** Standard font size for light variant (16px) */
const LIGHT_FONT_SIZE = 16;
/** Animation indicator font size (8px) */
const ANIMATION_DOT_SIZE = 8;

const containerStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    display: "flex",
    flexDirection: "column",
    gap: spacingTokens["2xs"],
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
  compact: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacingTokens.xs,
    fontSize: fontTokens.size.lg,
    fontWeight: fontTokens.weight.medium,
    color: colorTokens.text.secondary,
  },
  minimal: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: fontTokens.size.md,
    color: colorTokens.text.tertiary,
  },
};

const currentStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    fontSize: fontTokens.size.xl,
    fontWeight: fontTokens.weight.medium,
    color: colorTokens.text.primary,
  },
  light: {
    fontSize: LIGHT_CURRENT_FONT_SIZE,
  },
  compact: {
    fontWeight: fontTokens.weight.semibold,
  },
  minimal: {},
};

const separatorStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    display: "none",
  },
  light: {
    color: colorTokens.overlay.lightTextTertiary,
    margin: `0 ${spacingTokens["2xs"]}`,
  },
  compact: {
    color: colorTokens.text.tertiary,
  },
  minimal: {
    color: colorTokens.text.tertiary,
    margin: `0 ${spacingTokens["2xs"]}`,
  },
};

const totalStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    fontSize: fontTokens.size.md,
    color: colorTokens.text.tertiary,
  },
  light: {
    color: colorTokens.overlay.lightTextSecondary,
  },
  compact: {
    color: colorTokens.text.tertiary,
  },
  minimal: {},
};

const animationIndicatorStyle: CSSProperties = {
  color: colorTokens.accent.success,
  fontSize: ANIMATION_DOT_SIZE,
  marginLeft: spacingTokens.sm,
  animation: "pulse 2s ease-in-out infinite",
};

/**
 * Displays the current slide position within a presentation.
 *
 * @example
 * ```tsx
 * <SlideIndicator current={3} total={10} variant="light" />
 * ```
 */
export function SlideIndicator({
  current,
  total,
  variant = "dark",
  showAnimation = false,
  className,
}: SlideIndicatorProps) {
  if (variant === "dark") {
    return (
      <div style={containerStyles.dark} className={className}>
        <span style={currentStyles.dark}>
          {current} / {total}
        </span>
      </div>
    );
  }

  return (
    <div style={containerStyles[variant]} className={className}>
      <span style={currentStyles[variant]}>{current}</span>
      <span style={separatorStyles[variant]}>/</span>
      <span style={totalStyles[variant]}>{total}</span>
      {showAnimation && (
        <span style={animationIndicatorStyle} title="Has animations">
          ●
        </span>
      )}
    </div>
  );
}
