/**
 * @file LineSwatch component
 *
 * A small line preview square for line pickers and editors.
 * Similar to ColorSwatch but displays line style (width, dash, color).
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { Line } from "@oxen/pptx/domain/color/types";

export type LineSwatchSize = "sm" | "md" | "lg";

export type LineSwatchProps = {
  /** Line properties to display */
  readonly line: Line;
  /** Size variant */
  readonly size?: LineSwatchSize;
  /** Click handler for interactive swatches */
  readonly onClick?: () => void;
  /** Selected state (shows highlight border) */
  readonly selected?: boolean;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Additional CSS class */
  readonly className?: string;
  /** Inline style overrides */
  readonly style?: CSSProperties;
};

const sizeMap: Record<LineSwatchSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

// =============================================================================
// Utility Functions
// =============================================================================

function getStrokeColor(line: Line): string {
  if (line.fill.type === "noFill") {
    return "transparent";
  }
  if (line.fill.type === "solidFill") {
    if (line.fill.color.spec.type === "srgb") {
      return `#${line.fill.color.spec.value}`;
    }
  }
  if (line.fill.type === "gradientFill" && line.fill.stops.length > 0) {
    const firstStop = line.fill.stops[0];
    if (firstStop.color.spec.type === "srgb") {
      return `#${firstStop.color.spec.value}`;
    }
  }
  return "#888888";
}

function getDashArray(dash: string, width: number): string {
  const w = Math.max(width, 1);
  const patterns: Record<string, string> = {
    solid: "none",
    dot: `${w} ${w * 2}`,
    dash: `${w * 4} ${w * 2}`,
    lgDash: `${w * 8} ${w * 2}`,
    dashDot: `${w * 4} ${w * 2} ${w} ${w * 2}`,
    lgDashDot: `${w * 8} ${w * 2} ${w} ${w * 2}`,
    lgDashDotDot: `${w * 8} ${w * 2} ${w} ${w * 2} ${w} ${w * 2}`,
  };
  return patterns[dash] ?? "none";
}

function getScaledWidth(width: number, size: number): number {
  // Scale width to fit nicely in the swatch
  // For small swatches, limit max width
  const maxWidth = size * 0.25;
  if (width <= 1) {
    return Math.max(1, width);
  }
  if (width <= 4) {
    return Math.min(width, maxWidth);
  }
  return Math.min(2 + Math.log2(width) * 1.5, maxWidth);
}

function getBorderStyle(selected: boolean): string {
  if (selected) {
    return "2px solid var(--accent-blue, #0070f3)";
  }
  return "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))";
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle = (
  size: number,
  hasOnClick: boolean,
  disabled: boolean,
  selected: boolean
): CSSProperties => ({
  position: "relative",
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: "4px",
  overflow: "hidden",
  cursor: hasOnClick && !disabled ? "pointer" : "default",
  border: getBorderStyle(selected),
  boxSizing: "border-box",
  opacity: disabled ? 0.5 : 1,
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  flexShrink: 0,
  backgroundColor: "var(--bg-tertiary, #222)",
});

// =============================================================================
// Component
// =============================================================================

/**
 * A line swatch component displaying a line style preview.
 */
export function LineSwatch({
  line,
  size = "md",
  onClick,
  selected = false,
  disabled,
  className,
  style,
}: LineSwatchProps) {
  const sizeValue = sizeMap[size];
  const padding = 2;
  const svgSize = sizeValue - padding * 2;

  const strokeColor = useMemo(() => getStrokeColor(line), [line]);
  const scaledWidth = useMemo(
    () => getScaledWidth(line.width, sizeValue),
    [line.width, sizeValue]
  );
  const dashArray = useMemo(
    () => getDashArray(typeof line.dash === "string" ? line.dash : "solid", scaledWidth),
    [line.dash, scaledWidth]
  );
  const lineCap = line.cap === "square" ? "square" : line.cap === "round" ? "round" : "butt";

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  // Draw a diagonal line from bottom-left to top-right
  const x1 = 2;
  const y1 = svgSize - 2;
  const x2 = svgSize - 2;
  const y2 = 2;

  return (
    <div
      style={{
        ...containerStyle(sizeValue, !!onClick, disabled ?? false, selected),
        ...style,
      }}
      className={className}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ display: "block", margin: `${padding}px` }}
      >
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={scaledWidth}
          strokeLinecap={lineCap}
          strokeDasharray={dashArray}
        />
      </svg>
    </div>
  );
}
