/**
 * @file Slide ruler component
 *
 * Renders a horizontal or vertical ruler based on slide coordinates.
 */

import { useMemo, type CSSProperties } from "react";
import { colorTokens, fontTokens } from "../ui/design-tokens";

export type SlideRulerProps = {
  readonly orientation: "horizontal" | "vertical";
  readonly length: number;
  readonly thickness: number;
  readonly zoom: number;
  readonly offsetPx: number;
  readonly max: number;
  readonly className?: string;
  readonly style?: CSSProperties;
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
    values.push(value);
  }
  return values;
}

function isMajorTick(value: number, majorStep: number): boolean {
  const ratio = value / majorStep;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

/**
 * Ruler strip for slide coordinates.
 */
export function SlideRuler({
  orientation,
  length,
  thickness,
  zoom,
  offsetPx,
  max,
  className,
  style,
}: SlideRulerProps) {
  const { major, minor } = useMemo(() => getStepForZoom(zoom), [zoom]);

  const startValue = Math.max(0, offsetPx / zoom);
  const endValue = Math.min(max, (offsetPx + length) / zoom);

  const minorTicks = useMemo(
    () => getTickValues(startValue, endValue, minor).filter((value) => !isMajorTick(value, major)),
    [startValue, endValue, minor, major]
  );
  const majorTicks = useMemo(
    () => getTickValues(startValue, endValue, major),
    [startValue, endValue, major]
  );

  const svgStyle: CSSProperties = {
    display: "block",
    backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
    border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
    ...style,
  };

  const labelStyle: CSSProperties = {
    fill: `var(--text-secondary, ${colorTokens.text.secondary})`,
    fontSize: fontTokens.size.sm,
    fontFamily: "inherit",
  };

  const tickColor = `var(--border-strong, ${colorTokens.border.strong})`;

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
        if (isHorizontal) {
          return (
            <line
              key={`minor-${value}`}
              x1={pos}
              y1={thickness}
              x2={pos}
              y2={thickness - 6}
              stroke={tickColor}
              strokeWidth={1}
            />
          );
        }
        return (
          <line
            key={`minor-${value}`}
            x1={thickness}
            y1={pos}
            x2={thickness - 6}
            y2={pos}
            stroke={tickColor}
            strokeWidth={1}
          />
        );
      })}

      {majorTicks.map((value) => {
        const pos = value * zoom - offsetPx;
        const label = Math.round(value).toString();
        if (isHorizontal) {
          return (
            <g key={`major-${value}`}>
              <line
                x1={pos}
                y1={thickness}
                x2={pos}
                y2={thickness - 10}
                stroke={tickColor}
                strokeWidth={1}
              />
              <text x={pos + 2} y={thickness - 12} style={labelStyle}>
                {label}
              </text>
            </g>
          );
        }
        return (
          <g key={`major-${value}`}>
            <line
              x1={thickness}
              y1={pos}
              x2={thickness - 10}
              y2={pos}
              stroke={tickColor}
              strokeWidth={1}
            />
            <text x={2} y={pos + 10} style={labelStyle}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
