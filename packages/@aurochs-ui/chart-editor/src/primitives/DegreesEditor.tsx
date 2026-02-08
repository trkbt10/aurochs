/**
 * @file DegreesEditor - Editor for Degrees branded type
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Slider } from "@aurochs-ui/ui-components/primitives";
import { deg, type Degrees } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type DegreesEditorProps = EditorProps<Degrees> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly style?: CSSProperties;
  readonly slider?: boolean;
};

/**
 * Editor component for Degrees values with optional slider mode.
 */
export function DegreesEditor({
  value,
  onChange,
  disabled,
  className,
  min = -180,
  max = 180,
  step = 1,
  style,
  slider = false,
}: DegreesEditorProps) {
  const handleChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseFloat(newValue);
      const clamped = Math.max(min, Math.min(max, num));
      onChange(deg(clamped));
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
        suffix="°"
      />
    );
  }

  return (
    <Input
      type="number"
      value={value}
      onChange={handleChange}
      suffix="°"
      disabled={disabled}
      className={className}
      min={min}
      max={max}
      step={step}
      style={style}
    />
  );
}
