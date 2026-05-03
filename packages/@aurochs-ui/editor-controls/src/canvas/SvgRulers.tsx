/**
 * @file SVG Rulers component
 *
 * Renders rulers as SVG elements with viewport-fixed positioning.
 * Tick marks move with the canvas, but ruler background stays fixed.
 */

import { useMemo } from "react";
import type { ViewportTransform, ViewportSize, SlideSize } from "@aurochs-ui/editor-core/viewport";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

export type SvgRulersProps = {
  /** Current viewport transform */
  readonly viewport: ViewportTransform;
  /** Viewport dimensions */
  readonly viewportSize: ViewportSize;
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Ruler thickness in pixels */
  readonly rulerThickness: number;
  /** Whether to show rulers */
  readonly visible: boolean;
  /**
   * Bounded rulers clamp labels to [0, slideSize]. Infinite-canvas editors
   * should use "unbounded" so negative / off-canvas page coordinates remain
   * visible while panning.
   */
  readonly coordinateMode?: "bounded" | "unbounded";
};

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
    if (value >= start) {
      values.push(value);
    }
  }
  return values;
}

function isMajorTick(value: number, majorStep: number): boolean {
  const ratio = value / majorStep;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

/** Resolve the coordinate range displayed on a ruler axis. */
function resolveVisibleRange(params: {
  readonly rawStart: number;
  readonly rawEnd: number;
  readonly min: number;
  readonly max: number;
  readonly coordinateMode: "bounded" | "unbounded";
}): { readonly start: number; readonly end: number } {
  if (params.coordinateMode === "unbounded") {
    return { start: params.rawStart, end: params.rawEnd };
  }
  return {
    start: Math.max(params.min, params.rawStart),
    end: Math.min(params.max, params.rawEnd),
  };
}

/**
 * SVG-based rulers component.
 */
export function SvgRulers({
  viewport,
  viewportSize,
  slideSize,
  rulerThickness,
  visible,
  coordinateMode = "bounded",
}: SvgRulersProps) {
  if (!visible) {
    return null;
  }

  const { major, minor } = useMemo(() => getStepForZoom(viewport.scale), [viewport.scale]);

  // Calculate visible slide coordinate range for horizontal ruler
  const hVisible = resolveVisibleRange({
    rawStart: -viewport.translateX / viewport.scale,
    rawEnd: (viewportSize.width - rulerThickness - viewport.translateX) / viewport.scale,
    min: 0,
    max: slideSize.width,
    coordinateMode,
  });

  // Calculate visible slide coordinate range for vertical ruler
  const vVisible = resolveVisibleRange({
    rawStart: -viewport.translateY / viewport.scale,
    rawEnd: (viewportSize.height - rulerThickness - viewport.translateY) / viewport.scale,
    min: 0,
    max: slideSize.height,
    coordinateMode,
  });

  const hMinorTicks = useMemo(
    () => getTickValues(hVisible.start, hVisible.end, minor).filter((v) => !isMajorTick(v, major)),
    [hVisible.start, hVisible.end, minor, major],
  );
  const hMajorTicks = useMemo(
    () => getTickValues(hVisible.start, hVisible.end, major),
    [hVisible.start, hVisible.end, major],
  );

  const vMinorTicks = useMemo(
    () => getTickValues(vVisible.start, vVisible.end, minor).filter((v) => !isMajorTick(v, major)),
    [vVisible.start, vVisible.end, minor, major],
  );
  const vMajorTicks = useMemo(
    () => getTickValues(vVisible.start, vVisible.end, major),
    [vVisible.start, vVisible.end, major],
  );

  const rulerBgColor = `var(--bg-secondary, ${colorTokens.background.secondary})`;
  const borderColor = `var(--border-subtle, ${colorTokens.border.subtle})`;
  const tickColor = `var(--border-strong, ${colorTokens.border.strong})`;
  const textColor = `var(--text-secondary, ${colorTokens.text.secondary})`;
  const fontSize = fontTokens.size.sm;

  // Width/height of ruler areas (ensure non-negative)
  const hRulerWidth = Math.max(0, viewportSize.width - rulerThickness);
  const vRulerHeight = Math.max(0, viewportSize.height - rulerThickness);

  return (
    <g className="rulers" style={{ pointerEvents: "none" }}>
      {/* Horizontal ruler (top) */}
      <g transform={`translate(${rulerThickness}, 0)`}>
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={hRulerWidth}
          height={rulerThickness}
          fill={rulerBgColor}
          stroke={borderColor}
          strokeWidth={1}
        />
        {/* Tick marks - these move with the canvas */}
        <g style={{ clipPath: `inset(0 0 0 0)` }}>
          {/* Minor ticks */}
          {hMinorTicks.map((value) => {
            const pos = value * viewport.scale + viewport.translateX;
            if (pos < 0 || pos > hRulerWidth) {
              return null;
            }
            return (
              <line
                key={`h-minor-${value}`}
                x1={pos}
                y1={rulerThickness}
                x2={pos}
                y2={rulerThickness - 6}
                stroke={tickColor}
                strokeWidth={1}
              />
            );
          })}
          {/* Major ticks with labels */}
          {hMajorTicks.map((value) => {
            const pos = value * viewport.scale + viewport.translateX;
            if (pos < -20 || pos > hRulerWidth + 20) {
              return null;
            }
            return (
              <g key={`h-major-${value}`}>
                <line
                  x1={pos}
                  y1={rulerThickness}
                  x2={pos}
                  y2={rulerThickness - 10}
                  stroke={tickColor}
                  strokeWidth={1}
                />
                <text x={pos + 2} y={rulerThickness - 12} fill={textColor} fontSize={fontSize} fontFamily="inherit">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
        </g>
      </g>

      {/* Vertical ruler (left) */}
      <g transform={`translate(0, ${rulerThickness})`}>
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={rulerThickness}
          height={vRulerHeight}
          fill={rulerBgColor}
          stroke={borderColor}
          strokeWidth={1}
        />
        {/* Tick marks */}
        <g style={{ clipPath: `inset(0 0 0 0)` }}>
          {/* Minor ticks */}
          {vMinorTicks.map((value) => {
            const pos = value * viewport.scale + viewport.translateY;
            if (pos < 0 || pos > vRulerHeight) {
              return null;
            }
            return (
              <line
                key={`v-minor-${value}`}
                x1={rulerThickness}
                y1={pos}
                x2={rulerThickness - 6}
                y2={pos}
                stroke={tickColor}
                strokeWidth={1}
              />
            );
          })}
          {/* Major ticks with labels */}
          {vMajorTicks.map((value) => {
            const pos = value * viewport.scale + viewport.translateY;
            if (pos < -20 || pos > vRulerHeight + 20) {
              return null;
            }
            return (
              <g key={`v-major-${value}`}>
                <line
                  x1={rulerThickness}
                  y1={pos}
                  x2={rulerThickness - 10}
                  y2={pos}
                  stroke={tickColor}
                  strokeWidth={1}
                />
                <text x={2} y={pos + 10} fill={textColor} fontSize={fontSize} fontFamily="inherit">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
        </g>
      </g>

      {/* Corner square */}
      <rect
        x={0}
        y={0}
        width={rulerThickness}
        height={rulerThickness}
        fill={rulerBgColor}
        stroke={borderColor}
        strokeWidth={1}
      />
    </g>
  );
}
