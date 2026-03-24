/**
 * @file AdaptedFillPanel
 *
 * Wraps react-editor-ui's FillPanel with DrawingML BaseFill type props.
 * Converts between BaseFill and FillValue via adapters.
 *
 * baseFillToFillValue only returns solid/gradient, which are structurally
 * compatible with FillPanel's FillValue. FillPanel's onChange may emit
 * image/pattern/video types, handled via fillValueToBaseFill with original fallback.
 */

import { useCallback, useMemo, useRef } from "react";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { FillPanel, type FillPanelProps } from "react-editor-ui/panels/FillPanel";
import {
  baseFillToFillValue,
  fillValueToBaseFill,
  type ReuiFillValueInput,
} from "../adapters/color-value-adapter";
import { useColorEditing } from "../context/ColorEditingContext";

export type AdaptedFillPanelProps = {
  readonly value: BaseFill;
  readonly onChange: (fill: BaseFill) => void;
  readonly onImageUpload?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/** FillPanel adapter that accepts DrawingML BaseFill props. */
export function AdaptedFillPanel({
  value,
  onChange,
  onImageUpload,
  disabled,
  className,
}: AdaptedFillPanelProps) {
  const { colorContext } = useColorEditing();
  const originalRef = useRef(value);
  originalRef.current = value;

  const fillValue = useMemo(
    () => baseFillToFillValue(value, colorContext),
    [value, colorContext],
  );

  const handleChange: FillPanelProps["onChange"] = useCallback(
    (fv) => {
      onChange(fillValueToBaseFill(fv as ReuiFillValueInput, originalRef.current));
    },
    [onChange],
  );

  const fillPanelValue = fillValue as Parameters<FillPanelProps["onChange"]>[0];

  return (
    <FillPanel
      value={fillPanelValue}
      onChange={handleChange}
      onImageUpload={onImageUpload}
      disabled={disabled}
      className={className}
    />
  );
}
