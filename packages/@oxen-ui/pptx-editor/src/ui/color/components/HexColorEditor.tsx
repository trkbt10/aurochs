/**
 * @file HexColorEditor component
 *
 * Complete color editor combining preview/input with RGB/HSL sliders.
 */

import { ColorPreviewInput } from "./ColorPreviewInput";
import { ColorModeSliders } from "./ColorModeSliders";

export type HexColorEditorProps = {
  /** Hex color value (6 characters, without #) */
  readonly value: string;
  /** Called when color changes */
  readonly onChange: (hex: string) => void;
  /** Alpha value for swatch display (0-1) */
  readonly alpha?: number;
};

/**
 * Complete color editor with preview, hex input, and RGB/HSL sliders.
 */
export function HexColorEditor({
  value,
  onChange,
  alpha = 1,
}: HexColorEditorProps) {
  return (
    <>
      <ColorPreviewInput value={value} onChange={onChange} alpha={alpha} />
      <ColorModeSliders value={value} onChange={onChange} />
    </>
  );
}
