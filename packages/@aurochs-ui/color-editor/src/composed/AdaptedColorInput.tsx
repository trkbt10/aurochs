/**
 * @file AdaptedColorInput
 *
 * Wraps react-editor-ui's ColorInput with DrawingML Color type props.
 * Converts between Color and ColorValue via adapters.
 */

import { useCallback, useMemo } from "react";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import { ColorInput } from "react-editor-ui/ColorInput";
import { colorToColorValue, colorValueToColor, type ReuiColorValue } from "../adapters/color-value-adapter";
import { useColorEditing } from "../context/ColorEditingContext";

export type AdaptedColorInputProps = {
  readonly value: Color;
  readonly onChange: (color: Color) => void;
  readonly disabled?: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
};

/** ColorInput adapter that accepts DrawingML Color props. */
export function AdaptedColorInput({
  value,
  onChange,
  disabled,
  size,
  className,
}: AdaptedColorInputProps) {
  const { colorContext } = useColorEditing();

  const colorValue = useMemo(
    () => colorToColorValue(value, colorContext),
    [value, colorContext],
  );

  const handleChange = useCallback(
    (cv: ReuiColorValue) => {
      onChange(colorValueToColor(cv));
    },
    [onChange],
  );

  return (
    <ColorInput
      value={colorValue}
      onChange={handleChange}
      disabled={disabled}
      size={size}
      className={className}
    />
  );
}
