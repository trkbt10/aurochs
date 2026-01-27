/**
 * @file PointsEditor - Editor for Points branded type (font sizes)
 */

import { useCallback, type CSSProperties } from "react";
import { Input } from "@oxen-ui/ui-components/primitives";
import { pt, type Points } from "@oxen/ooxml/domain/units";
import type { EditorProps } from "@oxen-ui/ui-components/types";

export type PointsEditorProps = EditorProps<Points> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly style?: CSSProperties;
};

/**
 * Editor for Points values.
 */
export function PointsEditor({
  value,
  onChange,
  disabled,
  className,
  min = 1,
  max = 1000,
  step = 0.5,
  style,
}: PointsEditorProps) {
  const handleChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseFloat(newValue);
      // Ensure positive value
      const clamped = Math.max(min, Math.min(max, num));
      onChange(pt(clamped));
    },
    [onChange, min, max]
  );

  return (
    <Input
      type="number"
      value={value}
      onChange={handleChange}
      suffix="pt"
      disabled={disabled}
      className={className}
      min={min}
      max={max}
      step={step}
      style={style}
    />
  );
}
