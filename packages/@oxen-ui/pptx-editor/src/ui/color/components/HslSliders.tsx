/**
 * @file HslSliders component
 *
 * HSL color input with three sliders for Hue, Saturation, Lightness values.
 */

import { LabeledSlider } from "../../common";

export type HslSlidersProps = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly onChange: (h: number, s: number, l: number) => void;
};

/**
 * HSL color input with three sliders for Hue, Saturation, Lightness values.
 */
export function HslSliders({ h, s, l, onChange }: HslSlidersProps) {
  return (
    <>
      <LabeledSlider
        label="H"
        value={h}
        onChange={(v) => onChange(v, s, l)}
        min={0}
        max={360}
        suffix="°"
      />
      <LabeledSlider
        label="S"
        value={s}
        onChange={(v) => onChange(h, v, l)}
        min={0}
        max={100}
        suffix="%"
      />
      <LabeledSlider
        label="L"
        value={l}
        onChange={(v) => onChange(h, s, v)}
        min={0}
        max={100}
        suffix="%"
      />
    </>
  );
}
