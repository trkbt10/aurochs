/**
 * @file GradientStopsEditor - Editor for gradient color stops
 *
 * Adobe-style interactive gradient editor with clickable stops.
 * Each stop opens a Popover with complete editing (position + color + remove).
 */

import { useState, useCallback, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { Button, Popover } from "../../ui/primitives";
import { FillPreview } from "../../ui/color";
import { GradientStopEditor } from "./GradientStopEditor";
import { createDefaultColor } from "./ColorEditor";
import type { GradientStop, Color, SolidFill } from "../../../pptx/domain/color/types";
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

const defaultStopHex = "b3b3b3";

const gradientBarContainerStyle: CSSProperties = {
  position: "relative",
  height: "52px",
  userSelect: "none",
};

const gradientBarStyle: CSSProperties = {
  position: "absolute",
  top: "0",
  left: 0,
  right: 0,
  height: "26px",
  borderRadius: "6px",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  cursor: "crosshair",
};

const stopMarkerStyle = (position: number, isSelected: boolean): CSSProperties => ({
  position: "absolute",
  left: `${position}%`,
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
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.35)",
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
  return defaultStopHex;
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
  const dragStateRef = useRef<{
    index: number;
    pointerId: number;
    startX: number;
    hasMoved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const clampPosition = useCallback((position: number): number => {
    return Math.max(0, Math.min(100, position));
  }, []);

  const getPositionFromClientX = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar) {
        return null;
      }
      const rect = bar.getBoundingClientRect();
      if (rect.width <= 0) {
        return null;
      }
      const offsetX = clientX - rect.left;
      const position = Math.round((offsetX / rect.width) * 100);
      return clampPosition(position);
    },
    [clampPosition]
  );

  const handleBarClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (disabled || value.length >= maxStops) {
        return;
      }

      const clampedPosition = getPositionFromClientX(e.clientX);
      if (clampedPosition === null) {
        return;
      }

      const newStop: GradientStop = {
        position: pct(clampedPosition),
        color: createDefaultColor(defaultStopHex),
      };

      const newStops = [...value, newStop];
      onChange(newStops);
      setSelectedIndex(newStops.length - 1);
    },
    [disabled, value, onChange, maxStops, getPositionFromClientX]
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

  const handleStopPointerDown = useCallback(
    (index: number, event: PointerEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      setSelectedIndex(index);
      suppressClickRef.current = false;
      dragStateRef.current = {
        index,
        pointerId: event.pointerId,
        startX: event.clientX,
        hasMoved: false,
      };
      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [disabled]
  );

  const handleStopPointerMove = useCallback(
    (index: number, event: PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.index !== index || dragState.pointerId !== event.pointerId) {
        return;
      }
      const position = getPositionFromClientX(event.clientX);
      if (position === null) {
        return;
      }
      if (Math.abs(event.clientX - dragState.startX) > 2) {
        dragState.hasMoved = true;
      }
      const current = Number(value[index]?.position ?? 0);
      if (position === current) {
        return;
      }
      const updatedStop: GradientStop = { ...value[index], position: pct(position) };
      handleStopChange(index, updatedStop);
    },
    [getPositionFromClientX, handleStopChange, value]
  );

  const handleStopPointerUp = useCallback(
    (index: number, event: PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.index !== index || dragState.pointerId !== event.pointerId) {
        return;
      }
      suppressClickRef.current = dragState.hasMoved;
      dragStateRef.current = null;
    },
    []
  );

  const handleStopPointerCancel = useCallback(
    (index: number, event: PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.index !== index || dragState.pointerId !== event.pointerId) {
        return;
      }
      suppressClickRef.current = false;
      dragStateRef.current = null;
    },
    []
  );

  const handleStopClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

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
      color: createDefaultColor(defaultStopHex),
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
              onPointerDown={(event) => handleStopPointerDown(index, event)}
              onPointerMove={(event) => handleStopPointerMove(index, event)}
              onPointerUp={(event) => handleStopPointerUp(index, event)}
              onPointerCancel={(event) => handleStopPointerCancel(index, event)}
              onClickCapture={handleStopClickCapture}
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
