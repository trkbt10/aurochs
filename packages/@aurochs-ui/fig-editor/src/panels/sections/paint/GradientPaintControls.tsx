/** @file Shared gradient paint editor controls for fill and stroke paints. */

import type { FigGradientPaint, FigGradientStop, FigPaint, FigVector } from "@aurochs/fig/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";

type GradientPaintControlsProps = {
  readonly labelPrefix: string;
  readonly paintIndex: number;
  readonly paint: FigPaint;
  readonly onChange: (paint: FigPaint) => void;
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
} as const;

const stopRowStyle = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) 58px 58px 22px",
  alignItems: "center",
  gap: 4,
  width: "100%",
} as const;

const swatchStyle = {
  width: 24,
  height: 24,
  border: `1px solid ${colorTokens.border.strong}`,
  borderRadius: 4,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
} as const;

const addButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: `1px dashed ${colorTokens.border.primary}`,
  borderRadius: 4,
  cursor: "pointer",
  padding: "4px 8px",
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.sm,
  justifyContent: "center",
} as const;

const removeButtonStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 2,
  color: colorTokens.text.tertiary,
  lineHeight: 0,
} as const;

/** Render a complete gradient editor: stops, stop alpha/position, and handle/origin controls. */
export function GradientPaintControls({ labelPrefix, paintIndex, paint, onChange }: GradientPaintControlsProps) {
  if (!isGradientPaint(paint)) {
    return null;
  }

  const stops = normalizeGradientStops(paint);
  const handles = normalizeGradientHandles(paint);
  const controlLabel = `${labelPrefix} gradient`;
  const ordinal = paintIndex + 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {stops.map((stop, stopIndex) => (
        <div key={stopIndex} style={stopRowStyle}>
          <input
            aria-label={`${controlLabel} stop ${stopIndex + 1} color ${ordinal}`}
            type="color"
            value={colorToHex(stop.color)}
            onChange={(event) => onChange(updateGradientStop(paint, stopIndex, {
              ...stop,
              color: hexToColor(event.target.value, stop.color.a),
            }))}
            style={swatchStyle}
          />
          <Input
            type="number"
            ariaLabel={`${controlLabel} stop ${stopIndex + 1} position ${ordinal}`}
            value={Math.round(stop.position * 100)}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => onChange(updateGradientStop(paint, stopIndex, {
              ...stop,
              position: clamp01((value as number) / 100),
            }))}
          />
          <Input
            type="number"
            ariaLabel={`${controlLabel} stop ${stopIndex + 1} opacity ${ordinal}`}
            value={Math.round(stop.color.a * 100)}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => onChange(updateGradientStop(paint, stopIndex, {
              ...stop,
              color: { ...stop.color, a: clamp01((value as number) / 100) },
            }))}
          />
          <button
            type="button"
            aria-label={`${controlLabel} remove stop ${stopIndex + 1} ${ordinal}`}
            title="Remove gradient stop"
            style={removeButtonStyle}
            disabled={stops.length <= 2}
            onClick={() => onChange(removeGradientStop(paint, stopIndex))}
          >
            <CloseIcon size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        aria-label={`${controlLabel} add stop ${ordinal}`}
        style={addButtonStyle}
        onClick={() => onChange(addGradientStop(paint))}
      >
        <AddIcon size={12} />
        Add stop
      </button>
      <div style={rowStyle}>
        {handles.map((handle, handleIndex) => (
          <span key={handleIndex} style={{ display: "contents" }}>
            <Input
              type="number"
              ariaLabel={`${controlLabel} handle ${handleIndex + 1} x ${ordinal}`}
              value={roundPercent(handle.x)}
              min={-200}
              max={200}
              step={1}
              suffix="x"
              width={64}
              onChange={(value) => onChange(updateGradientHandle(paint, handleIndex, {
                ...handle,
                x: (value as number) / 100,
              }))}
            />
            <Input
              type="number"
              ariaLabel={`${controlLabel} handle ${handleIndex + 1} y ${ordinal}`}
              value={roundPercent(handle.y)}
              min={-200}
              max={200}
              step={1}
              suffix="y"
              width={64}
              onChange={(value) => onChange(updateGradientHandle(paint, handleIndex, {
                ...handle,
                y: (value as number) / 100,
              }))}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function isGradientPaint(paint: FigPaint): paint is FigGradientPaint {
  return paint.type.startsWith("GRADIENT_");
}

function normalizeGradientStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  const stops = paint.gradientStops ?? paint.stops;
  if (stops && stops.length > 0) {
    return [...stops].sort((a, b) => a.position - b.position);
  }
  return [
    { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
  ];
}

function normalizeGradientHandles(paint: FigGradientPaint): readonly FigVector[] {
  if (paint.gradientHandlePositions && paint.gradientHandlePositions.length >= 3) {
    return paint.gradientHandlePositions;
  }
  return [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0, y: 1 },
  ];
}

function withStops(paint: FigGradientPaint, stops: readonly FigGradientStop[]): FigGradientPaint {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  return { ...paint, gradientStops: sorted, stops: sorted };
}

function updateGradientStop(paint: FigGradientPaint, stopIndex: number, stop: FigGradientStop): FigGradientPaint {
  const stops = normalizeGradientStops(paint).map((current, index) => index === stopIndex ? stop : current);
  return withStops(paint, stops);
}

function addGradientStop(paint: FigGradientPaint): FigGradientPaint {
  const stops = normalizeGradientStops(paint);
  const position = findLargestStopGapMidpoint(stops);
  return withStops(paint, [...stops, { position, color: interpolateStopColor(stops, position) }]);
}

function removeGradientStop(paint: FigGradientPaint, stopIndex: number): FigGradientPaint {
  const stops = normalizeGradientStops(paint);
  if (stops.length <= 2) {
    return paint;
  }
  return withStops(paint, stops.filter((_, index) => index !== stopIndex));
}

function updateGradientHandle(paint: FigGradientPaint, handleIndex: number, handle: FigVector): FigGradientPaint {
  const handles = normalizeGradientHandles(paint).map((current, index) => index === handleIndex ? handle : current);
  return { ...paint, gradientHandlePositions: handles };
}

function findLargestStopGapMidpoint(stops: readonly FigGradientStop[]): number {
  const initial = {
    bestStart: stops[0]?.position ?? 0,
    bestEnd: stops[stops.length - 1]?.position ?? 1,
    bestGap: (stops[stops.length - 1]?.position ?? 1) - (stops[0]?.position ?? 0),
  };
  const { bestStart, bestEnd } = stops.slice(1).reduce((best, current, index) => {
    const previous = stops[index]!;
    const gap = current.position - previous.position;
    if (gap <= best.bestGap) {
      return best;
    }
    return { bestStart: previous.position, bestEnd: current.position, bestGap: gap };
  }, initial);
  return clamp01((bestStart + bestEnd) / 2);
}

function interpolateStopColor(stops: readonly FigGradientStop[], position: number): FigGradientStop["color"] {
  const previous = [...stops].reverse().find((stop) => stop.position <= position) ?? stops[0]!;
  const next = stops.find((stop) => stop.position >= position) ?? stops[stops.length - 1]!;
  const range = next.position - previous.position;
  const t = range === 0 ? 0 : (position - previous.position) / range;
  return {
    r: previous.color.r + (next.color.r - previous.color.r) * t,
    g: previous.color.g + (next.color.g - previous.color.g) * t,
    b: previous.color.b + (next.color.b - previous.color.b) * t,
    a: previous.color.a + (next.color.a - previous.color.a) * t,
  };
}

function colorToHex(color: FigGradientStop["color"]): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string, alpha: number): FigGradientStop["color"] {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: alpha,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundPercent(value: number): number {
  return Math.round(value * 100);
}
