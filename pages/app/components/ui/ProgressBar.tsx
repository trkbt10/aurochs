/**
 * @file ProgressBar
 *
 * Shared progress bar component for slide navigation.
 */

import type { CSSProperties } from "react";

type Variant = "dark" | "light";

type Props = {
  progress: number;
  variant?: Variant;
  className?: string;
};

const trackStyles: Record<Variant, CSSProperties> = {
  dark: {
    height: "4px",
    backgroundColor: "var(--border-strong)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  light: {
    height: "2px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: "1px",
    overflow: "hidden",
  },
};

const fillStyle: CSSProperties = {
  height: "100%",
  backgroundColor: "var(--accent-blue)",
  transition: "width 0.2s ease",
};

const fillGradientStyle: CSSProperties = {
  ...fillStyle,
  background: "linear-gradient(90deg, var(--accent-blue), #22d3ee)",
};




































export function ProgressBar({ progress, variant = "dark", className }: Props) {
  const trackStyle = trackStyles[variant];
  const barStyle = variant === "light" ? fillGradientStyle : fillStyle;

  return (
    <div style={trackStyle} className={className}>
      <div style={{ ...barStyle, width: `${Math.min(100, Math.max(0, progress))}%` }} />
    </div>
  );
}
