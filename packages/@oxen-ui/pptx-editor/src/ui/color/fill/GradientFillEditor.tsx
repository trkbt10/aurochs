/**
 * @file GradientFillEditor component
 *
 * Editor for gradient fill with angle and color stops.
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { GradientFill, LinearGradient } from "@oxen/ooxml/domain/fill";
import { deg, pct } from "@oxen/ooxml/domain/units";
import { LabeledSlider } from "../../common";
import { GradientStopRow } from "./GradientStopRow";
import { createDefaultColor, getStopHex } from "./fill-utils";

export type GradientFillEditorProps = {
  readonly value: GradientFill;
  readonly onChange: (fill: GradientFill) => void;
};

const previewStyle = (angle: number, cssGradient: string): CSSProperties => ({
  height: "24px",
  borderRadius: "4px",
  background: cssGradient,
});

const stopsContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: "28px",
  borderRadius: "6px",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
  cursor: "crosshair",
  userSelect: "none",
  touchAction: "none",
};

const handleSize = 14;
const handleStyle = (position: number, isSelected: boolean, hex: string): CSSProperties => ({
  position: "absolute",
  left: `${position}%`,
  top: "50%",
  width: `${handleSize}px`,
  height: `${handleSize}px`,
  transform: "translate(-50%, -50%)",
  borderRadius: "50%",
  backgroundColor: `#${hex}`,
  border: isSelected
    ? "2px solid var(--border-strong, #fff)"
    : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.4))",
  boxShadow: isSelected ? "0 0 0 2px rgba(0, 0, 0, 0.35)" : "0 0 0 1px rgba(0, 0, 0, 0.25)",
  cursor: "grab",
});

const minStopCount = 2;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function buildGradientCss(angle: number, stops: GradientFill["stops"]): string {
  const colorStops = [...stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `#${getStopHex(s)} ${s.position}%`)
    .join(", ");
  return `linear-gradient(${angle}deg, ${colorStops})`;
}

function findClosestStop(stops: GradientFill["stops"], position: number) {
  if (stops.length === 0) {
    return null;
  }
  return stops.reduce((closest, stop) => {
    const closestDistance = Math.abs(closest.position - position);
    const stopDistance = Math.abs(stop.position - position);
    return stopDistance < closestDistance ? stop : closest;
  });
}

/**
 * Editor for gradient fill values.
 */
export function GradientFillEditor({ value, onChange }: GradientFillEditorProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [draggingStopIndex, setDraggingStopIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const angle = value.linear?.angle ?? 0;

  useEffect(() => {
    if (selectedStopIndex > value.stops.length - 1) {
      setSelectedStopIndex(Math.max(0, value.stops.length - 1));
    }
  }, [selectedStopIndex, value.stops.length]);

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      const nextLinear: LinearGradient = {
        angle: deg(newAngle),
        scaled: value.linear?.scaled ?? true,
      };
      onChange({
        ...value,
        linear: nextLinear,
      });
    },
    [value, onChange]
  );

  const positionFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) {
      return 0;
    }
    const ratio = (clientX - rect.left) / rect.width;
    return clampPercent(ratio * 100);
  }, []);

  const focusRoot = useCallback(() => {
    rootRef.current?.focus();
  }, []);

  const handleStopSelect = useCallback(
    (index: number) => {
      setSelectedStopIndex(index);
      focusRoot();
    },
    [focusRoot]
  );

  const handleStopColorChange = useCallback(
    (index: number, hex: string) => {
      const newStops = [...value.stops];
      newStops[index] = { ...newStops[index], color: createDefaultColor(hex) };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newStops = [...value.stops];
      newStops[index] = { ...newStops[index], position: pct(clampPercent(position)) };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const handleTrackClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const position = positionFromClientX(event.clientX);
      const closestStop = findClosestStop(value.stops, position);
      const hex = closestStop ? getStopHex(closestStop) : "ffffff";
      const newStop = {
        position: pct(position),
        color: createDefaultColor(hex),
      };
      const newStops = [...value.stops, newStop];
      onChange({ ...value, stops: newStops });
      setSelectedStopIndex(newStops.length - 1);
      focusRoot();
    },
    [positionFromClientX, value, onChange, focusRoot]
  );

  const handleStopPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>, index: number) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedStopIndex(index);
      setDraggingStopIndex(index);
      focusRoot();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [focusRoot]
  );

  const handleStopPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>, index: number) => {
      if (draggingStopIndex !== index) {
        return;
      }
      const position = positionFromClientX(event.clientX);
      handleStopPositionChange(index, position);
    },
    [draggingStopIndex, positionFromClientX, handleStopPositionChange]
  );

  const handleStopPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>, index: number) => {
      if (draggingStopIndex !== index) {
        return;
      }
      setDraggingStopIndex(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [draggingStopIndex]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (value.stops.length <= minStopCount) {
        return;
      }
      if (selectedStopIndex < 0 || selectedStopIndex >= value.stops.length) {
        return;
      }
      const newStops = value.stops.filter((_, index) => index !== selectedStopIndex);
      onChange({ ...value, stops: newStops });
      setSelectedStopIndex(Math.max(0, selectedStopIndex - 1));
      event.preventDefault();
    },
    [value, onChange, selectedStopIndex]
  );

  const gradientCss = useMemo(
    () => buildGradientCss(angle, value.stops),
    [angle, value.stops]
  );

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={handleKeyDown}>
      <div style={previewStyle(angle, gradientCss)} />

      <LabeledSlider
        label="°"
        value={angle}
        onChange={handleAngleChange}
        min={0}
        max={360}
        suffix="°"
      />

      <div
        ref={trackRef}
        style={{ ...trackStyle, background: gradientCss }}
        onClick={handleTrackClick}
      >
        {value.stops.map((stop, index) => {
          const hex = getStopHex(stop);
          return (
            <div
              key={index}
              style={handleStyle(stop.position, selectedStopIndex === index, hex)}
              onPointerDown={(event) => handleStopPointerDown(event, index)}
              onPointerMove={(event) => handleStopPointerMove(event, index)}
              onPointerUp={(event) => handleStopPointerUp(event, index)}
              onPointerCancel={(event) => handleStopPointerUp(event, index)}
              onClick={(event) => {
                event.stopPropagation();
                handleStopSelect(index);
              }}
            />
          );
        })}
      </div>

      <div style={stopsContainerStyle}>
        {value.stops.map((stop, index) => (
          <GradientStopRow
            key={index}
            stop={stop}
            selected={selectedStopIndex === index}
            onSelect={() => handleStopSelect(index)}
            onColorChange={(hex) => handleStopColorChange(index, hex)}
            onPositionChange={(pos) => handleStopPositionChange(index, pos)}
          />
        ))}
      </div>
    </div>
  );
}
