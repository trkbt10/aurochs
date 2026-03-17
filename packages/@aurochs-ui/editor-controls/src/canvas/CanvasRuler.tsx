/**
 * @file CanvasRuler - Format-agnostic ruler for canvas editors
 *
 * Renders horizontal or vertical ruler ticks based on canvas coordinates.
 * Extracted from pptx-editor's SlideRuler for cross-format reuse.
 */

import { useMemo, type CSSProperties } from "react";

// =============================================================================
// Types
// =============================================================================

export type CanvasRulerProps = {
  readonly orientation: "horizontal" | "vertical";
  /** Ruler length in pixels. */
  readonly length: number;
  /** Ruler thickness in pixels. */
  readonly thickness: number;
  /** Current zoom level (1 = 100%). */
  readonly zoom: number;
  /** Scroll offset in pixels. */
  readonly offsetPx: number;
  /** Maximum canvas coordinate value. */
  readonly max: number;
  readonly className?: string;
  readonly style?: CSSProperties;
};

// =============================================================================
// Tick calculation
// =============================================================================

const TICK_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

function getStepForZoom(zoom: number): { major: number; minor: number } {
  const targetPx = 50;
  const major = TICK_STEPS.find((step) => step * zoom >= targetPx) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const minor = major >= 10 ? major / 5 : major / 2;
  return { major, minor };
}

function getTickValues(start: number, end: number, step: number): number[] {
  const first = Math.floor(start / step) * step;
  const values: number[] = [];
  for (let value = first; value <= end; value += step) {
    values.push(value);
  }
  return values;
}

function isMajorTick(value: number, majorStep: number): boolean {
  const ratio = value / majorStep;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

// =============================================================================
// Tick rendering
// =============================================================================

type TickParams = {
  readonly isHorizontal: boolean;
  readonly value: number;
  readonly pos: number;
  readonly thickness: number;
  readonly tickColor: string;
};

function renderMinorTick({ isHorizontal, value, pos, thickness, tickColor }: TickParams) {
  if (isHorizontal) {
    return <line key={`m-${value}`} x1={pos} y1={thickness} x2={pos} y2={thickness - 6} stroke={tickColor} strokeWidth={1} />;
  }
  return <line key={`m-${value}`} x1={thickness} y1={pos} x2={thickness - 6} y2={pos} stroke={tickColor} strokeWidth={1} />;
}

function renderMajorTick({ isHorizontal, value, pos, thickness, tickColor, label }: TickParams & { readonly label: string }) {
  if (isHorizontal) {
    return (
      <g key={`M-${value}`}>
        <line x1={pos} y1={thickness} x2={pos} y2={thickness - 10} stroke={tickColor} strokeWidth={1} />
        <text x={pos + 2} y={thickness - 12} fill="var(--text-secondary, #888)" fontSize="10" fontFamily="inherit">{label}</text>
      </g>
    );
  }
  return (
    <g key={`M-${value}`}>
      <line x1={thickness} y1={pos} x2={thickness - 10} y2={pos} stroke={tickColor} strokeWidth={1} />
      <text x={2} y={pos + 10} fill="var(--text-secondary, #888)" fontSize="10" fontFamily="inherit">{label}</text>
    </g>
  );
}

// =============================================================================
// Component
// =============================================================================

/** Ruler strip for canvas coordinates. */
export function CanvasRuler({ orientation, length, thickness, zoom, offsetPx, max, className, style }: CanvasRulerProps) {
  const { major, minor } = useMemo(() => getStepForZoom(zoom), [zoom]);

  const startValue = Math.max(0, offsetPx / zoom);
  const endValue = Math.min(max, (offsetPx + length) / zoom);

  const minorTicks = useMemo(
    () => getTickValues(startValue, endValue, minor).filter((value) => !isMajorTick(value, major)),
    [startValue, endValue, minor, major],
  );
  const majorTicks = useMemo(() => getTickValues(startValue, endValue, major), [startValue, endValue, major]);

  const svgStyle: CSSProperties = {
    display: "block",
    backgroundColor: "var(--bg-secondary, #fafafa)",
    borderBottom: orientation === "horizontal" ? "1px solid var(--border-subtle, #e0e0e0)" : undefined,
    borderRight: orientation === "vertical" ? "1px solid var(--border-subtle, #e0e0e0)" : undefined,
    ...style,
  };

  const tickColor = "var(--border-strong, #ccc)";
  const isHorizontal = orientation === "horizontal";

  return (
    <svg
      className={className}
      width={isHorizontal ? length : thickness}
      height={isHorizontal ? thickness : length}
      style={svgStyle}
    >
      {minorTicks.map((value) => {
        const pos = value * zoom - offsetPx;
        return renderMinorTick({ isHorizontal, value, pos, thickness, tickColor });
      })}
      {majorTicks.map((value) => {
        const pos = value * zoom - offsetPx;
        const label = Math.round(value).toString();
        return renderMajorTick({ isHorizontal, value, pos, thickness, tickColor, label });
      })}
    </svg>
  );
}
