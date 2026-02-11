/**
 * @file SlideIndicator
 *
 * Displays current slide number and total slides count.
 */

import type { CSSProperties } from "react";

type Variant = "dark" | "light";

type Props = {
  current: number;
  total: number;
  variant?: Variant;
  showAnimation?: boolean;
  className?: string;
};

const containerStyles: Record<Variant, CSSProperties> = {
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
};

const currentStyles: Record<Variant, CSSProperties> = {
  dark: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  light: {
    fontSize: "20px",
  },
};

const separatorStyles: Record<Variant, CSSProperties> = {
  dark: {
    display: "none",
  },
  light: {
    color: "rgba(255, 255, 255, 0.4)",
    margin: "0 2px",
  },
};

const totalStyles: Record<Variant, CSSProperties> = {
  dark: {
    fontSize: "12px",
    color: "var(--text-tertiary)",
  },
  light: {
    color: "rgba(255, 255, 255, 0.6)",
  },
};

const animationIndicatorStyle: CSSProperties = {
  color: "#4ade80",
  fontSize: "8px",
  marginLeft: "8px",
  animation: "pulse 2s ease-in-out infinite",
};

export function SlideIndicator({ current, total, variant = "dark", showAnimation = false, className }: Props) {
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
    <div style={containerStyles.light} className={className}>
      <span style={currentStyles.light}>{current}</span>
      <span style={separatorStyles.light}>/</span>
      <span style={totalStyles.light}>{total}</span>
      {showAnimation && (
        <span style={animationIndicatorStyle} title="Has animations">
          ●
        </span>
      )}
    </div>
  );
}
