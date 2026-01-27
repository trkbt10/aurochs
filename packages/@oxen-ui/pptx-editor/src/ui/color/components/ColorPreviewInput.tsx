/**
 * @file ColorPreviewInput component
 *
 * Color preview swatch with hex input field.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { SolidFill } from "@oxen/ooxml/domain/fill";
import { pct } from "@oxen/ooxml/domain/units";
import { Input } from "@oxen-ui/ui-components/primitives";
import { FillPreview } from "../FillPreview";
import { parseHexInput } from "../color-convert";

export type ColorPreviewInputProps = {
  /** Hex color value (6 characters, without #) */
  readonly value: string;
  /** Called when color changes via hex input */
  readonly onChange: (hex: string) => void;
  /** Alpha value for swatch display (0-1) */
  readonly alpha?: number;
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const previewContainerStyle: CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "6px",
  flexShrink: 0,
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  overflow: "hidden",
};

const hexInputContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const hexLabelStyle: CSSProperties = {
  fontSize: "10px",
  color: "var(--text-tertiary, #666)",
  textTransform: "uppercase",
};

/**
 * Color preview swatch with hex input field.
 */
export function ColorPreviewInput({
  value,
  onChange,
  alpha = 1,
}: ColorPreviewInputProps) {
  const handleHexInput = useCallback(
    (input: string | number) => {
      const hex = parseHexInput(String(input));
      if (hex !== null) {
        onChange(hex);
      }
    },
    [onChange]
  );

  const fill = useMemo((): SolidFill => ({
    type: "solidFill",
    color: {
      spec: { type: "srgb", value },
      transform: alpha < 1 ? { alpha: pct(alpha * 100) } : undefined,
    },
  }), [value, alpha]);

  return (
    <div style={rowStyle}>
      <div style={previewContainerStyle}>
        <FillPreview fill={fill} />
      </div>
      <div style={hexInputContainerStyle}>
        <span style={hexLabelStyle}>Hex</span>
        <Input type="text" value={value} onChange={handleHexInput} placeholder="RRGGBB" />
      </div>
    </div>
  );
}
