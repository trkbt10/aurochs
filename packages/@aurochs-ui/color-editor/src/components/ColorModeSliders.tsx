/**
 * @file ColorModeSliders component
 *
 * RGB/HSL color input with mode toggle tabs.
 * Takes and returns hex color values.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { RgbSliders } from "./RgbSliders";
import { HslSliders } from "./HslSliders";
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from "../color-convert";
import { spacingTokens, radiusTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

export type ColorModeSlidersProps = {
  /** Hex color value (6 characters, without #) */
  readonly value: string;
  /** Called when color changes */
  readonly onChange: (hex: string) => void;
};

const modeTabsStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens["2xs"],
  backgroundColor: "var(--bg-tertiary, #222)",
  borderRadius: radiusTokens.sm,
  padding: spacingTokens["2xs"],
};

const slidersContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens["xs-plus"],
};

function modeTabStyle(isActive: boolean): CSSProperties {
  return {
    flex: 1,
    padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
    fontSize: fontTokens.size.sm,
    fontWeight: fontTokens.weight.medium,
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    backgroundColor: isActive ? "var(--bg-secondary, #2a2a2a)" : "transparent",
    color: isActive ? "var(--text-primary, #fff)" : "var(--text-tertiary, #888)",
    transition: "all 150ms ease",
  };
}

/**
 * RGB/HSL color input with mode toggle tabs.
 */
export function ColorModeSliders({ value, onChange }: ColorModeSlidersProps) {
  const [mode, setMode] = useState<"rgb" | "hsl">("rgb");

  const rgb = useMemo(() => hexToRgb(value), [value]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const handleRgbChange = useCallback(
    (r: number, g: number, b: number) => {
      onChange(rgbToHex(r, g, b));
    },
    [onChange]
  );

  const handleHslChange = useCallback(
    (h: number, s: number, l: number) => {
      const { r, g, b } = hslToRgb(h, s, l);
      onChange(rgbToHex(r, g, b));
    },
    [onChange]
  );

  return (
    <>
      <div style={modeTabsStyle}>
        <button type="button" style={modeTabStyle(mode === "rgb")} onClick={() => setMode("rgb")}>
          RGB
        </button>
        <button type="button" style={modeTabStyle(mode === "hsl")} onClick={() => setMode("hsl")}>
          HSL
        </button>
      </div>

      <div style={slidersContainerStyle}>
        {mode === "rgb" && <RgbSliders r={rgb.r} g={rgb.g} b={rgb.b} onChange={handleRgbChange} />}
        {mode === "hsl" && <HslSliders h={hsl.h} s={hsl.s} l={hsl.l} onChange={handleHslChange} />}
      </div>
    </>
  );
}
