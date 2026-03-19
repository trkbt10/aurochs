/**
 * @file DegreesEditor - Editor for Degrees branded type
 */

import { useCallback, type CSSProperties } from "react";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { deg, type Degrees } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type DegreesEditorProps = EditorProps<Degrees> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly style?: CSSProperties;
};

/**
 * Editor for Degrees values.
 */
export function DegreesEditor({
  value,
  onChange,
  disabled,
  className,
  min = 0,
  max = 360,
  step = 1,
  style,
}: DegreesEditorProps) {
  const handleChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseFloat(newValue);
      // Normalize to 0-360 range
      const normalized = ((num % 360) + 360) % 360;
      onChange(deg(normalized));
    },
    [onChange],
  );

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
