/**
 * @file PixelsEditor - Editor for Pixels branded type
 */

import { useCallback, type CSSProperties } from "react";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { px, type Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type PixelsEditorProps = EditorProps<Pixels> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly style?: CSSProperties;
};

/**
 * Editor for Pixels values.
 */
export function PixelsEditor({ value, onChange, disabled, className, min, max, step = 1, style }: PixelsEditorProps) {
  const handleChange = useCallback(
    (newValue: string | number) => {
      onChange(px(typeof newValue === "number" ? newValue : parseFloat(newValue)));
    },
    [onChange],
  );

  return (
    <Input
      type="number"
      value={value}
      onChange={handleChange}
      suffix="px"
      disabled={disabled}
      className={className}
      min={min}
      max={max}
      step={step}
      style={style}
    />
  );
}
