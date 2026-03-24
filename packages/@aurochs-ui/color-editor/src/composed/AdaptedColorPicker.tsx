/**
 * @file AdaptedColorPicker
 *
 * Displays react-editor-ui's ColorPicker inside a Popover(unstyled).
 *
 * Container control: Popover(unstyled) only provides positioning, portal, and
 * overlay. ColorPicker's own container (background, border, shadow, border-radius,
 * padding) serves as the sole container. This structurally eliminates nesting.
 */

import { useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import { pct } from "@aurochs-office/drawing-ml/domain/units";
import { Popover } from "@aurochs-ui/ui-components/primitives";
import { colorTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { ColorPicker } from "react-editor-ui/ColorPicker";
import { toReactHex, fromReactHex } from "../adapters/color-value-adapter";
import { FillPreview } from "../FillPreview";
import { useColorEditing } from "../context/ColorEditingContext";

export type AdaptedColorPickerProps = {
  /** Hex color value (6 characters, no #, uppercase) */
  readonly value: string;
  /** Called when color changes (bare hex without #) */
  readonly onChange: (hex: string) => void;
  /** Alpha value (0-1) */
  readonly alpha?: number;
  /** Called when alpha changes */
  readonly onAlphaChange?: (alpha: number) => void;
  /** Show alpha/opacity slider */
  readonly showAlpha?: boolean;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element */
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

/**
 * ColorPicker in an unstyled Popover. The Popover only positions the content;
 * ColorPicker provides its own container chrome.
 */
export function AdaptedColorPicker({
  value,
  onChange,
  alpha = 1,
  onAlphaChange,
  showAlpha = false,
  disabled,
  trigger,
}: AdaptedColorPickerProps) {
  const { presetColors } = useColorEditing();

  const handleChange = useCallback(
    (reactHex: string) => {
      onChange(fromReactHex(reactHex));
    },
    [onChange],
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      onAlphaChange?.(opacity / 100);
    },
    [onAlphaChange],
  );

  const reactHex = useMemo(() => toReactHex(value), [value]);

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

  const triggerElement = trigger ?? (
    <div style={{ ...defaultTriggerStyle, opacity: disabled ? 0.5 : 1 }}>
      <FillPreview fill={fill} />
    </div>
  );

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled} unstyled>
      <ColorPicker
        value={reactHex}
        onChange={handleChange}
        opacity={Math.round(alpha * 100)}
        onOpacityChange={showAlpha && onAlphaChange ? handleOpacityChange : undefined}
        showOpacity={showAlpha && !!onAlphaChange}
        presetColors={presetColors as string[]}
      />
    </Popover>
  );
}
