/**
 * @file LabeledSlider component
 *
 * A slider with label and value display. Generic UI component.
 */

import type { CSSProperties } from "react";
import { Slider } from "@oxen-ui/ui-components/primitives";

export type LabeledSliderProps = {
  /** Label text (e.g., "A", "°") */
  readonly label: string;
  /** Current value */
  readonly value: number;
  /** Called when value changes */
  readonly onChange: (value: number) => void;
  /** Minimum value */
  readonly min: number;
  /** Maximum value */
  readonly max: number;
  /** Value suffix (e.g., "%", "°") */
  readonly suffix?: string;
  /** Label color override */
  readonly labelColor?: string;
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  width: "16px",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #666)",
};

const sliderContainerStyle: CSSProperties = {
  flex: 1,
};

const valueStyle: CSSProperties = {
  width: "32px",
  textAlign: "right",
  fontSize: "11px",
  color: "var(--text-secondary, #999)",
};

/**
 * A slider with label and value display.
 */
export function LabeledSlider({
  label,
  value,
  onChange,
  min,
  max,
  suffix = "",
  labelColor,
}: LabeledSliderProps) {
  return (
    <div style={rowStyle}>
      <span style={labelColor ? { ...labelStyle, color: labelColor } : labelStyle}>
        {label}
      </span>
      <div style={sliderContainerStyle}>
        <Slider value={value} onChange={onChange} min={min} max={max} showValue={false} />
      </div>
      <span style={valueStyle}>
        {value}{suffix}
      </span>
    </div>
  );
}
