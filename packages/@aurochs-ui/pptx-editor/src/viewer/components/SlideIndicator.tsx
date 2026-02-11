/**
 * @file SlideIndicator
 *
 * Displays current slide number and total slides count.
 */

import type { CSSProperties } from "react";

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

const containerStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  light: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontFamily: "monospace",
    fontSize: "16px",
    fontWeight: 500,
    color: "#fff",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
  },
  compact: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  minimal: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    color: "var(--text-tertiary)",
  },
};

const currentStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  light: {
    fontSize: "20px",
  },
  compact: {
    fontWeight: 600,
  },
  minimal: {},
};

const separatorStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    display: "none",
  },
  light: {
    color: "rgba(255, 255, 255, 0.4)",
    margin: "0 2px",
  },
  compact: {
    color: "var(--text-tertiary)",
  },
  minimal: {
    color: "var(--text-tertiary)",
    margin: "0 2px",
  },
};

const totalStyles: Record<SlideIndicatorVariant, CSSProperties> = {
  dark: {
    fontSize: "12px",
    color: "var(--text-tertiary)",
  },
  light: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  compact: {
    color: "var(--text-tertiary)",
  },
  minimal: {},
};

const animationIndicatorStyle: CSSProperties = {
  color: "#4ade80",
  fontSize: "8px",
  marginLeft: "8px",
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
