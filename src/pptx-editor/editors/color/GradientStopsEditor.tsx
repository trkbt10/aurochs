/**
 * @file GradientStopsEditor - Editor for gradient color stops
 *
 * Adobe-style interactive gradient editor with clickable stops.
 * Each stop opens a Popover with complete editing (position + color + remove).
 */

import { useState, useCallback, useRef, type CSSProperties, type MouseEvent } from "react";
import { Button, Popover } from "../../ui/primitives";
import { FillPreview } from "../../ui/color";
import { GradientStopEditor } from "./GradientStopEditor";
import { createDefaultColor } from "./ColorEditor";
import type { GradientStop, Color, SolidFill } from "../../../pptx/domain/color";
import type { Percent } from "../../../pptx/domain/types";
import { pct } from "../../../pptx/domain/types";
import type { EditorProps } from "../../types";

export type GradientStopsEditorProps = EditorProps<readonly GradientStop[]> & {
  readonly style?: CSSProperties;
  /** Maximum number of stops allowed */
  readonly maxStops?: number;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const gradientBarContainerStyle: CSSProperties = {
  position: "relative",
  height: "48px",
  userSelect: "none",
};

const gradientBarStyle: CSSProperties = {
  position: "absolute",
  top: "0",
  left: "8px",
  right: "8px",
  height: "24px",
  borderRadius: "4px",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  cursor: "crosshair",
};

const stopMarkerStyle = (position: number, isSelected: boolean): CSSProperties => ({
  position: "absolute",
  left: `calc(${position}% + 8px)`,
  top: "22px",
  transform: "translateX(-50%)",
  width: "16px",
  height: "20px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  zIndex: isSelected ? 2 : 1,
});

function getTriangleBorderColor(isSelected: boolean): string {
  if (isSelected) {
    return "8px solid var(--accent-blue, #0070f3)";
  }
  return "8px solid var(--text-secondary, #a1a1a1)";
}

const stopTriangleStyle = (isSelected: boolean): CSSProperties => ({
  width: 0,
  height: 0,
  borderLeft: "6px solid transparent",
  borderRight: "6px solid transparent",
  borderBottom: getTriangleBorderColor(isSelected),
});

const stopSwatchContainerStyle: CSSProperties = {
  marginTop: "-1px",
};

function getSwatchBorder(isSelected: boolean): string {
  if (isSelected) {
    return "2px solid var(--accent-blue, #0070f3)";
  }
  return "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))";
}

function getSwatchPreviewStyle(isSelected: boolean): CSSProperties {
  return {
    width: "16px",
    height: "16px",
    borderRadius: "2px",
    border: getSwatchBorder(isSelected),
    overflow: "hidden",
  };
}

function createFillFromColor(color: Color): SolidFill {
  return { type: "solidFill", color };
}

const emptyMessageStyle: CSSProperties = {
  color: "var(--text-tertiary, #737373)",
  fontSize: "12px",
  textAlign: "center",
  padding: "8px",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
};

function getHexFromColor(color: Color): string {
  if (color.spec.type === "srgb") {
    return color.spec.value;
  }
  return "888888";
}

function buildGradientPreview(stops: readonly GradientStop[]): string {
  if (stops.length === 0) {
    return "var(--bg-tertiary, #111111)";
  }
  if (stops.length === 1) {
    return `#${getHexFromColor(stops[0].color)}`;
  }

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const gradientStops = sortedStops
    .map((stop) => `#${getHexFromColor(stop.color)} ${stop.position}%`)
    .join(", ");

  return `linear-gradient(to right, ${gradientStops})`;
}

/**
 * Interactive gradient stops editor with Adobe-style preview bar.
 * Click on stops to edit position and color in a popover.
 */
export function GradientStopsEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  maxStops = 10,
}: GradientStopsEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const handleBarClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (disabled || value.length >= maxStops) {
        return;
      }

      const bar = barRef.current;
      if (!bar) {
        return;
      }

      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const position = Math.round((clickX / rect.width) * 100);
      const clampedPosition = Math.max(0, Math.min(100, position));

      const newStop: GradientStop = {
        position: pct(clampedPosition),
        color: createDefaultColor("808080"),
      };

      const newStops = [...value, newStop];
      onChange(newStops);
      setSelectedIndex(newStops.length - 1);
    },
    [disabled, value, onChange, maxStops]
  );

  const handleStopClick = useCallback(
    (index: number, e: MouseEvent) => {
      e.stopPropagation();
      setSelectedIndex(index);
    },
    []
  );

  const handleStopChange = useCallback(
    (index: number, updatedStop: GradientStop) => {
      const newStops = value.map((stop, i) =>
        i === index ? updatedStop : stop
      );
      onChange(newStops);
    },
    [value, onChange]
  );

  const handleRemoveStop = useCallback(
    (index: number) => {
      const newStops = value.filter((_, i) => i !== index);
      onChange(newStops);
      setSelectedIndex(null);
    },
    [value, onChange]
  );

  const handleAddStop = useCallback(() => {
    const newStop: GradientStop = {
      position: calculateNewPosition(value),
      color: createDefaultColor("808080"),
    };
    const newStops = [...value, newStop];
    onChange(newStops);
    setSelectedIndex(newStops.length - 1);
  }, [value, onChange]);

  const canRemoveStop = value.length > 1;

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Interactive Gradient Bar */}
      <div style={gradientBarContainerStyle}>
        <div
          ref={barRef}
          style={{ ...gradientBarStyle, background: buildGradientPreview(value) }}
          onClick={handleBarClick}
          title={disabled ? undefined : "Click to add a color stop"}
        />

        {/* Stop Markers with Complete Editing Popover */}
        {value.map((stop, index) => {
          const isSelected = selectedIndex === index;
          return (
            <div
              key={index}
              style={stopMarkerStyle(stop.position, isSelected)}
              onClick={(e) => handleStopClick(index, e)}
              title={`Stop at ${stop.position}%`}
            >
              <div style={stopTriangleStyle(isSelected)} />
              <div style={stopSwatchContainerStyle}>
                <Popover
                  trigger={
                    <div style={{ ...getSwatchPreviewStyle(isSelected), opacity: disabled ? 0.5 : 1 }}>
                      <FillPreview fill={createFillFromColor(stop.color)} />
                    </div>
                  }
                  side="bottom"
                  align="center"
                  disabled={disabled}
                >
                  <GradientStopEditor
                    value={stop}
                    onChange={(updatedStop) => handleStopChange(index, updatedStop)}
                    onRemove={canRemoveStop ? () => handleRemoveStop(index) : undefined}
                    disabled={disabled}
                  />
                </Popover>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {value.length === 0 && (
        <div style={emptyMessageStyle}>
          Click on the bar above to add color stops
        </div>
      )}

      {/* Add Stop Button */}
      {value.length > 0 && value.length < maxStops && (
        <div style={actionsStyle}>
          <Button
            variant="secondary"
            onClick={handleAddStop}
            disabled={disabled}
          >
            + Add Stop
          </Button>
        </div>
      )}
    </div>
  );
}

function findLargestGapMidpoint(positions: readonly number[]): number {
  type GapInfo = { readonly maxGap: number; readonly midpoint: number };

  const result = positions.slice(0, -1).reduce<GapInfo>(
    (acc, pos, i) => {
      const gap = positions[i + 1] - pos;
      if (gap > acc.maxGap) {
        return { maxGap: gap, midpoint: (pos + positions[i + 1]) / 2 };
      }
      return acc;
    },
    { maxGap: 0, midpoint: 50 }
  );

  return Math.round(result.midpoint);
}

function calculateNewPosition(stops: readonly GradientStop[]): Percent {
  if (stops.length === 0) {
    return pct(50);
  }

  const positions = stops.map((s) => s.position).sort((a, b) => a - b);

  if (positions[0] > 0) {
    return pct(0);
  }

  if (positions[positions.length - 1] < 100) {
    return pct(100);
  }

  return pct(findLargestGapMidpoint(positions));
}

/**
 * Create default gradient stops (two-stop black to white gradient).
 */
export function createDefaultGradientStops(): readonly GradientStop[] {
  return [
    { position: pct(0), color: createDefaultColor("000000") },
    { position: pct(100), color: createDefaultColor("FFFFFF") },
  ];
}
