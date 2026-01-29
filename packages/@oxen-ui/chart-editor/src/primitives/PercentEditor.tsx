/**
 * @file PercentEditor - Editor for Percent branded type
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Slider } from "@oxen-ui/ui-components/primitives";
import { pct, type Percent } from "@oxen-office/ooxml/domain/units";
import type { EditorProps } from "@oxen-ui/ui-components/types";

export type PercentEditorProps = EditorProps<Percent> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly style?: CSSProperties;
  readonly slider?: boolean;
};






export function PercentEditor({
  value,
  onChange,
  disabled,
  className,
  min = 0,
  max = 100,
  step = 1,
  style,
  slider = false,
}: PercentEditorProps) {
  const handleChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseFloat(newValue);
      const clamped = Math.max(min, Math.min(max, num));
      onChange(pct(clamped));
    },
    [onChange, min, max],
  );

  if (slider) {
    return (
      <Slider
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={className}
        style={style}
        suffix="%"
      />
    );
  }

  return (
    <Input
      type="number"
      value={value}
      onChange={handleChange}
      suffix="%"
      disabled={disabled}
      className={className}
      min={min}
      max={max}
      step={step}
      style={style}
    />
  );
}

