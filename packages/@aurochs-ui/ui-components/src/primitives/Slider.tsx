/**
 * @file Slider primitive component
 *
 * A minimal range slider component.
 */

import { useCallback, type ChangeEvent, type CSSProperties } from "react";
import { colorTokens, fontTokens } from "../design-tokens";

export type SliderProps = {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly showValue?: boolean;
  readonly suffix?: string;
};

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sliderStyle: CSSProperties = {
  flex: 1,
  height: "4px",
  borderRadius: "2px",
  appearance: "none",
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  cursor: "pointer",
  outline: "none",
};

const valueStyle: CSSProperties = {
  minWidth: "40px",
  fontSize: fontTokens.size.md,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textAlign: "right",
};

/**
 * Slider input with optional value display.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  style,
  showValue = true,
  suffix = "",
}: SliderProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <input
        type="range"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        style={sliderStyle}
      />
      {showValue && (
        <span style={valueStyle}>
          {value}
          {suffix}
        </span>
      )}
    </div>
  );
}
