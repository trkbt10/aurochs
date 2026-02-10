/**
 * @file GradientStopRow component
 *
 * Single gradient stop with color and position inputs.
 */

import { useMemo, type CSSProperties } from "react";
import type { GradientStop, SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { FillPreview } from "../FillPreview";
import { parseHexInput } from "../color-convert";
import { getStopHex } from "./fill-utils";
import { spacingTokens, radiusTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type GradientStopRowProps = {
  readonly stop: GradientStop;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onColorChange: (hex: string) => void;
  readonly onPositionChange: (position: number) => void;
};

function getRowStyle(isSelected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: spacingTokens["xs-plus"],
    backgroundColor: isSelected ? "var(--bg-tertiary, #222)" : "transparent",
    padding: spacingTokens.xs,
    borderRadius: radiusTokens.sm,
    cursor: "pointer",
  };
}

const previewContainerStyle: CSSProperties = {
  width: "16px",
  height: "16px",
  borderRadius: "2px",
  flexShrink: 0,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  overflow: "hidden",
};

/**
 * Single gradient stop row with color swatch, hex input, and position input.
 */
export function GradientStopRow({ stop, selected, onSelect, onColorChange, onPositionChange }: GradientStopRowProps) {
  const hex = getStopHex(stop);

  const handleColorInput = (v: string | number) => {
    const parsed = parseHexInput(String(v));
    if (parsed !== null) {
      onColorChange(parsed);
    }
  };

  const fill = useMemo(
    (): SolidFill => ({
      type: "solidFill",
      color: { spec: { type: "srgb", value: hex } },
    }),
    [hex],
  );

  return (
    <div style={getRowStyle(selected)} onClick={onSelect}>
      <div style={previewContainerStyle}>
        <FillPreview fill={fill} />
      </div>
      <Input type="text" value={hex} onChange={handleColorInput} style={{ flex: 1, width: "auto" }} />
      <Input
        type="number"
        value={stop.position}
        onChange={(v) => onPositionChange(Number(v))}
        suffix="%"
        style={{ width: "60px" }}
        min={0}
        max={100}
      />
    </div>
  );
}
