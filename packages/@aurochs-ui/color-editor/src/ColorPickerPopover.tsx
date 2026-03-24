/**
 * @file ColorPickerPopover component
 *
 * API-compatible wrapper over AdaptedColorPicker.
 * Delegates to react-editor-ui's ColorPicker via Popover(unstyled).
 */

import type { ReactNode } from "react";
import { AdaptedColorPicker } from "./composed/AdaptedColorPicker";

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

/**
 * A color picker popover triggered by clicking a color swatch.
 * Internally delegates to react-editor-ui's ColorPicker.
 */
export function ColorPickerPopover(props: ColorPickerPopoverProps) {
  return <AdaptedColorPicker {...props} />;
}
