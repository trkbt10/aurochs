/**
 * @file ColorPickerPopover component
 *
 * Adobe/Figma-style color picker that opens in a popover.
 * Displays a color swatch that, when clicked, opens a popover with RGB/HSL sliders.
 * Uses design tokens for consistent styling.
 */

import { useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import type { SolidFill } from "../../../pptx/domain/color/types";
import { pct } from "../../../pptx/domain/types";
import { Popover } from "../primitives/Popover";
import { LabeledSlider } from "../common";
import { FillPreview } from "./FillPreview";
import { HexColorEditor } from "./components";
import { colorTokens, radiusTokens, spacingTokens } from "../design-tokens";

export type ColorPickerPopoverProps = {
  /** Hex color value (6 characters, no #) */
  readonly value: string;
  /** Called when color changes */
  readonly onChange: (hex: string) => void;
  /** Alpha value (0-1) */
  readonly alpha?: number;
  /** Called when alpha changes */
  readonly onAlphaChange?: (alpha: number) => void;
  /** Show alpha slider */
  readonly showAlpha?: boolean;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element (parent controls size and interaction styling) */
  readonly trigger?: ReactNode;
};

const defaultTriggerStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  overflow: "hidden",
};

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.md,
  width: "240px",
};

/**
 * A color picker popover triggered by clicking a color swatch.
 * Provides RGB and HSL slider modes for color adjustment.
 */
export function ColorPickerPopover({
  value,
  onChange,
  alpha = 1,
  onAlphaChange,
  showAlpha = false,
  disabled,
  trigger,
}: ColorPickerPopoverProps) {
  const handleAlphaChange = useCallback(
    (v: number) => {
      onAlphaChange?.(v / 100);
    },
    [onAlphaChange]
  );

  const fill = useMemo((): SolidFill => ({
    type: "solidFill",
    color: {
      spec: { type: "srgb", value },
      transform: alpha < 1 ? { alpha: pct(alpha * 100) } : undefined,
    },
  }), [value, alpha]);

  const triggerElement = trigger ?? (
    <div style={{ ...defaultTriggerStyle, opacity: disabled ? 0.5 : 1 }}>
      <FillPreview fill={fill} />
    </div>
  );

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        <HexColorEditor value={value} onChange={onChange} alpha={alpha} />

        {showAlpha && onAlphaChange && (
          <LabeledSlider
            label="A"
            value={Math.round(alpha * 100)}
            onChange={handleAlphaChange}
            min={0}
            max={100}
            suffix="%"
          />
        )}
      </div>
    </Popover>
  );
}
