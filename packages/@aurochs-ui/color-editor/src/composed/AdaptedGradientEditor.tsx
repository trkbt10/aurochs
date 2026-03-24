/**
 * @file AdaptedGradientEditor
 *
 * Wraps react-editor-ui's GradientSection with DrawingML GradientFill type props.
 * Converts between GradientFill and GradientValue via adapters.
 */

import { useCallback, useMemo, useRef } from "react";
import type { GradientFill } from "@aurochs-office/drawing-ml/domain/fill";
import { GradientSection } from "react-editor-ui/sections/GradientSection";
import {
  gradientFillToGradientValue,
  gradientValueToGradientFill,
  type ReuiGradientValue,
} from "../adapters/color-value-adapter";
import { useColorEditing } from "../context/ColorEditingContext";

export type AdaptedGradientEditorProps = {
  readonly value: GradientFill;
  readonly onChange: (fill: GradientFill) => void;
  readonly disabled?: boolean;
};

/** GradientSection adapter that accepts DrawingML GradientFill props. */
export function AdaptedGradientEditor({
  value,
  onChange,
  disabled,
}: AdaptedGradientEditorProps) {
  const { colorContext } = useColorEditing();
  const originalRef = useRef(value);
  originalRef.current = value;

  const gradientValue = useMemo(
    () => gradientFillToGradientValue(value, colorContext),
    [value, colorContext],
  );

  const handleChange = useCallback(
    (gv: ReuiGradientValue) => {
      onChange(gradientValueToGradientFill(gv, originalRef.current));
    },
    [onChange],
  );

  return (
    <GradientSection
      value={gradientValue}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}
