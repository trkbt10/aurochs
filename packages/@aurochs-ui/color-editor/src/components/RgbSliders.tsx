/**
 * @file RgbSliders component
 *
 * RGB color input with three sliders for Red, Green, Blue values.
 */

import { LabeledSlider } from "../LabeledSlider";

export type RgbSlidersProps = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly onChange: (r: number, g: number, b: number) => void;
};

/**
 * RGB color input with three sliders for Red, Green, Blue values.
 */
export function RgbSliders({ r, g, b, onChange }: RgbSlidersProps) {
  return (
    <>
      <LabeledSlider
        label="R"
        value={r}
        onChange={(v) => onChange(v, g, b)}
        min={0}
        max={255}
        labelColor="#e57373"
      />
      <LabeledSlider
        label="G"
        value={g}
        onChange={(v) => onChange(r, v, b)}
        min={0}
        max={255}
        labelColor="#81c784"
      />
      <LabeledSlider
        label="B"
        value={b}
        onChange={(v) => onChange(r, g, v)}
        min={0}
        max={255}
        labelColor="#64b5f6"
      />
    </>
  );
}
