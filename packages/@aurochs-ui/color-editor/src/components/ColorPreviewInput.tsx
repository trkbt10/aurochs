/**
 * @file ColorPreviewInput component
 *
 * Color preview swatch with hex input field.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import { pct } from "@aurochs-office/drawing-ml/domain/units";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { FillPreview } from "../FillPreview";
import { parseHexInput } from "../color-convert";
import { spacingTokens, radiusTokens, colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

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
  gap: spacingTokens.sm,
};

const previewContainerStyle: CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: radiusTokens.md,
  flexShrink: 0,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  overflow: "hidden",
};

const hexInputContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
};

const hexLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: "var(--text-tertiary, #666)",
  textTransform: "uppercase",
};

/**
 * Color preview swatch with hex input field.
 */
export function ColorPreviewInput({ value, onChange, alpha = 1 }: ColorPreviewInputProps) {
  const handleHexInput = useCallback(
    (input: string | number) => {
      const hex = parseHexInput(String(input));
      if (hex !== null) {
        onChange(hex);
      }
    },
    [onChange],
  );

  const fill = useMemo(
    (): SolidFill => ({
      type: "solidFill",
      color: {
        spec: { type: "srgb", value },
        transform: alpha < 1 ? { alpha: pct(alpha * 100) } : undefined,
      },
    }),
    [value, alpha],
  );

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
