/**
 * @file LinePreview component
 *
 * An SVG-based preview showing all line attributes:
 * - Stroke width (scaled for visibility)
 * - Dash pattern
 * - Cap style (visible at line ends)
 * - Join style (visible at the corner)
 * - Compound style (single/double/triple)
 * - Arrow heads (head/tail)
 * - Stroke color/gradient
 */

import { useMemo, type CSSProperties } from "react";
import type { GradientFill } from "@oxen/ooxml/domain/fill";
import type { Line, LineEnd } from "@oxen/pptx/domain/color/types";

export type LinePreviewProps = {
  /** Line properties to display */
  readonly line: Line;
  /** Preview width in pixels */
  readonly width?: number;
  /** Preview height in pixels */
  readonly height?: number;
  /** Show background grid */
  readonly showGrid?: boolean;
  /** Additional CSS class */
  readonly className?: string;
  /** Inline style overrides */
  readonly style?: CSSProperties;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_WIDTH = 236;
const DEFAULT_HEIGHT = 64;

// =============================================================================
// Utility Functions
// =============================================================================

function getScaledWidth(width: number): number {
  // Scale width for preview visibility
  // 0-2px → as-is
  // 2-10px → logarithmic scale
  // 10px+ → clamp to max 8px
  if (width <= 2) {
    return Math.max(1, width);
  }
  if (width <= 10) {
    return 2 + Math.log2(width - 1) * 2;
  }
  return 8;
}

function getDashArray(dash: string, width: number): string {
  const w = Math.max(width, 1);
  const patterns: Record<string, string> = {
    solid: "none",
    dot: `${w * 1.5} ${w * 3}`,
    dash: `${w * 6} ${w * 3}`,
    lgDash: `${w * 12} ${w * 3}`,
    dashDot: `${w * 6} ${w * 3} ${w * 1.5} ${w * 3}`,
    lgDashDot: `${w * 12} ${w * 3} ${w * 1.5} ${w * 3}`,
    lgDashDotDot: `${w * 12} ${w * 3} ${w * 1.5} ${w * 3} ${w * 1.5} ${w * 3}`,
  };
  return patterns[dash] ?? "none";
}

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

function isGradientFill(line: Line): line is Line & { fill: GradientFill } {
  return line.fill.type === "gradientFill";
}

function getHexFromColor(color: { spec: { type: string; value?: string } }): string {
  if (color.spec.type === "srgb" && color.spec.value) {
    return color.spec.value;
  }
  return "888888";
}

function getLineCap(cap: Line["cap"]): "butt" | "round" | "square" {
  switch (cap) {
    case "round":
      return "round";
    case "square":
      return "square";
    default:
      return "butt";
  }
}

function getLineJoin(join: Line["join"]): "miter" | "round" | "bevel" {
  switch (join) {
    case "round":
      return "round";
    case "bevel":
      return "bevel";
    default:
      return "miter";
  }
}

// Arrow marker path definitions
function getArrowPath(type: LineEnd["type"]): string {
  switch (type) {
    case "triangle":
      return "M 0 0 L 10 5 L 0 10 z";
    case "stealth":
      return "M 0 0 L 10 5 L 0 10 L 3 5 z";
    case "diamond":
      return "M 5 0 L 10 5 L 5 10 L 0 5 z";
    case "oval":
      return "M 5 0 A 5 5 0 1 1 5 10 A 5 5 0 1 1 5 0";
    case "arrow":
      return "M 0 1 L 8 5 L 0 9";
    default:
      return "";
  }
}

function getArrowSize(size: LineEnd["width"] | LineEnd["length"]): number {
  switch (size) {
    case "sm":
      return 0.7;
    case "lg":
      return 1.3;
    default:
      return 1;
  }
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle = (width: number, height: number): CSSProperties => ({
  width: `${width}px`,
  height: `${height}px`,
  borderRadius: "6px",
  overflow: "hidden",
  backgroundColor: "var(--bg-tertiary, #222)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
});

// =============================================================================
// Sub-components
// =============================================================================

type GradientDefProps = {
  readonly fill: GradientFill;
  readonly id: string;
};

function GradientDef({ fill, id }: GradientDefProps) {
  const angle = fill.linear?.angle ?? 0;
  // Convert CSS angle to SVG gradient coordinates
  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = 50 - Math.cos(rad) * 50;
  const y1 = 50 - Math.sin(rad) * 50;
  const x2 = 50 + Math.cos(rad) * 50;
  const y2 = 50 + Math.sin(rad) * 50;

  return (
    <linearGradient id={id} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
      {fill.stops.map((stop, i) => (
        <stop
          key={i}
          offset={`${stop.position}%`}
          stopColor={`#${getHexFromColor(stop.color)}`}
        />
      ))}
    </linearGradient>
  );
}

type ArrowMarkerProps = {
  readonly id: string;
  readonly end: LineEnd;
  readonly strokeWidth: number;
  readonly color: string;
  readonly isHead: boolean;
};

function ArrowMarker({ id, end, strokeWidth, color, isHead }: ArrowMarkerProps) {
  if (end.type === "none") {
    return null;
  }

  const widthScale = getArrowSize(end.width);
  const lengthScale = getArrowSize(end.length);
  const baseSize = strokeWidth * 3;
  const markerWidth = baseSize * lengthScale;
  const markerHeight = baseSize * widthScale;
  const path = getArrowPath(end.type);
  const isFilled = end.type !== "arrow";

  return (
    <marker
      id={id}
      markerWidth={markerWidth}
      markerHeight={markerHeight}
      refX={isHead ? 0 : 10}
      refY={5}
      orient="auto"
      markerUnits="userSpaceOnUse"
    >
      <path
        d={path}
        fill={isFilled ? color : "none"}
        stroke={isFilled ? "none" : color}
        strokeWidth={1.5}
        transform={`scale(${lengthScale}, ${widthScale})`}
      />
    </marker>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SVG-based line preview showing all line attributes.
 */
export function LinePreview({
  line,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  showGrid = true,
  className,
  style,
}: LinePreviewProps) {
  const gradientId = useMemo(() => `line-gradient-${Math.random().toString(36).slice(2)}`, []);
  const headMarkerId = useMemo(() => `head-marker-${Math.random().toString(36).slice(2)}`, []);
  const tailMarkerId = useMemo(() => `tail-marker-${Math.random().toString(36).slice(2)}`, []);

  const scaledWidth = useMemo(() => getScaledWidth(line.width), [line.width]);
  const dashArray = useMemo(
    () => getDashArray(typeof line.dash === "string" ? line.dash : "solid", scaledWidth),
    [line.dash, scaledWidth]
  );
  const strokeColor = useMemo(() => getStrokeColor(line), [line]);
  const lineCap = getLineCap(line.cap);
  const lineJoin = getLineJoin(line.join);

  const hasGradient = isGradientFill(line);
  const stroke = hasGradient ? `url(#${gradientId})` : strokeColor;

  // L-shaped path to show join style
  const padding = 16;
  const cornerY = height / 2;
  const cornerX = width / 2;
  const pathD = `M ${padding},${cornerY} L ${cornerX},${cornerY} L ${cornerX},${height - padding}`;

  // Check if we need markers
  const hasHeadEnd = line.headEnd && line.headEnd.type !== "none";
  const hasTailEnd = line.tailEnd && line.tailEnd.type !== "none";

  // Compound line rendering
  const isDouble = line.compound === "dbl";
  const isTriple = line.compound === "tri";
  const isThickThin = line.compound === "thickThin";
  const isThinThick = line.compound === "thinThick";

  const renderPath = (offset: number, widthMultiplier: number) => (
    <path
      d={pathD}
      fill="none"
      stroke={stroke}
      strokeWidth={scaledWidth * widthMultiplier}
      strokeLinecap={lineCap}
      strokeLinejoin={lineJoin}
      strokeDasharray={dashArray}
      markerStart={hasHeadEnd ? `url(#${headMarkerId})` : undefined}
      markerEnd={hasTailEnd ? `url(#${tailMarkerId})` : undefined}
      transform={offset !== 0 ? `translate(${offset}, 0)` : undefined}
    />
  );

  const renderCompoundLines = () => {
    if (isDouble) {
      const gap = scaledWidth * 0.8;
      return (
        <>
          <g transform={`translate(0, ${-gap / 2})`}>{renderPath(0, 0.4)}</g>
          <g transform={`translate(0, ${gap / 2})`}>{renderPath(0, 0.4)}</g>
        </>
      );
    }
    if (isTriple) {
      const gap = scaledWidth * 0.8;
      return (
        <>
          <g transform={`translate(0, ${-gap})`}>{renderPath(0, 0.3)}</g>
          {renderPath(0, 0.3)}
          <g transform={`translate(0, ${gap})`}>{renderPath(0, 0.3)}</g>
        </>
      );
    }
    if (isThickThin) {
      const gap = scaledWidth * 0.6;
      return (
        <>
          <g transform={`translate(0, ${-gap / 2})`}>{renderPath(0, 0.6)}</g>
          <g transform={`translate(0, ${gap / 2})`}>{renderPath(0, 0.25)}</g>
        </>
      );
    }
    if (isThinThick) {
      const gap = scaledWidth * 0.6;
      return (
        <>
          <g transform={`translate(0, ${-gap / 2})`}>{renderPath(0, 0.25)}</g>
          <g transform={`translate(0, ${gap / 2})`}>{renderPath(0, 0.6)}</g>
        </>
      );
    }
    // Single line (default)
    return renderPath(0, 1);
  };

  return (
    <div style={{ ...containerStyle(width, height), ...style }} className={className}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          {/* Grid pattern */}
          {showGrid && (
            <pattern id="preview-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="var(--border-subtle, rgba(255, 255, 255, 0.08))"
                strokeWidth="0.5"
              />
            </pattern>
          )}

          {/* Gradient definition */}
          {hasGradient && <GradientDef fill={line.fill as GradientFill} id={gradientId} />}

          {/* Arrow markers */}
          {hasHeadEnd && line.headEnd && (
            <ArrowMarker
              id={headMarkerId}
              end={line.headEnd}
              strokeWidth={scaledWidth}
              color={strokeColor}
              isHead={true}
            />
          )}
          {hasTailEnd && line.tailEnd && (
            <ArrowMarker
              id={tailMarkerId}
              end={line.tailEnd}
              strokeWidth={scaledWidth}
              color={strokeColor}
              isHead={false}
            />
          )}
        </defs>

        {/* Background grid */}
        {showGrid && <rect fill="url(#preview-grid)" width="100%" height="100%" opacity="0.5" />}

        {/* Main line path */}
        {renderCompoundLines()}
      </svg>
    </div>
  );
}
