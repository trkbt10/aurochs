/**
 * @file ColorPickerPopover component
 *
 * Adobe/Figma-style color picker that opens in a popover.
 * Displays a color swatch that, when clicked, opens a popover with RGB/HSL sliders.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Popover } from "../primitives/Popover";
import { Slider } from "../primitives/Slider";
import { Input } from "../primitives/Input";
import { ColorSwatch, type ColorSwatchSize } from "./ColorSwatch";
import {
  hexToRgb as hexToRgbBase,
  rgbToHex as rgbToHexBase,
  rgbToHsl as rgbToHslBase,
  hslToRgb as hslToRgbBase,
} from "../../../color";

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
  /** Size of the trigger swatch */
  readonly size?: ColorSwatchSize;
  /** Disable interaction */
  readonly disabled?: boolean;
};

// =============================================================================
// Color Conversion Wrappers (adapting src/color API to UI format)
// =============================================================================

/** hexToRgb wrapper - returns same format as before */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const rgb = hexToRgbBase(hex);
  return { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) };
}

/** rgbToHex wrapper - returns uppercase hex without # */
function rgbToHex(r: number, g: number, b: number): string {
  return rgbToHexBase(r, g, b).toUpperCase();
}

/** rgbToHsl wrapper - converts s/l from 0-1 to 0-100 for UI display */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const hsl = rgbToHslBase(r, g, b);
  return {
    h: Math.round(hsl.h),
    s: Math.round(hsl.s * 100),
    l: Math.round(hsl.l * 100),
  };
}

/** hslToRgb wrapper - converts s/l from 0-100 UI format to 0-1 for base function */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const rgb = hslToRgbBase(h, s / 100, l / 100);
  return { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) };
}

// =============================================================================
// Styles
// =============================================================================

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "240px",
};

const previewRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const previewSwatchStyle: CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "6px",
  flexShrink: 0,
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

const sliderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sliderLabelStyle: CSSProperties = {
  width: "16px",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #666)",
};

const sliderContainerStyle: CSSProperties = {
  flex: 1,
};

const sliderValueStyle: CSSProperties = {
  width: "32px",
  textAlign: "right",
  fontSize: "11px",
  color: "var(--text-secondary, #999)",
};

const modeTabsStyle: CSSProperties = {
  display: "flex",
  gap: "2px",
  backgroundColor: "var(--bg-tertiary, #222)",
  borderRadius: "4px",
  padding: "2px",
};

const modeTabStyle = (isActive: boolean): CSSProperties => ({
  flex: 1,
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: 500,
  border: "none",
  borderRadius: "3px",
  cursor: "pointer",
  backgroundColor: isActive ? "var(--bg-secondary, #2a2a2a)" : "transparent",
  color: isActive ? "var(--text-primary, #fff)" : "var(--text-tertiary, #888)",
  transition: "all 150ms ease",
});

// =============================================================================
// Sub-components
// =============================================================================

type RgbSlidersProps = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly onChange: (r: number, g: number, b: number) => void;
};

function RgbSliders({ r, g, b, onChange }: RgbSlidersProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={sliderRowStyle}>
        <span style={{ ...sliderLabelStyle, color: "#e57373" }}>R</span>
        <div style={sliderContainerStyle}>
          <Slider value={r} onChange={(v) => onChange(v, g, b)} min={0} max={255} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{r}</span>
      </div>
      <div style={sliderRowStyle}>
        <span style={{ ...sliderLabelStyle, color: "#81c784" }}>G</span>
        <div style={sliderContainerStyle}>
          <Slider value={g} onChange={(v) => onChange(r, v, b)} min={0} max={255} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{g}</span>
      </div>
      <div style={sliderRowStyle}>
        <span style={{ ...sliderLabelStyle, color: "#64b5f6" }}>B</span>
        <div style={sliderContainerStyle}>
          <Slider value={b} onChange={(v) => onChange(r, g, v)} min={0} max={255} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{b}</span>
      </div>
    </div>
  );
}

type HslSlidersProps = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly onChange: (h: number, s: number, l: number) => void;
};

function HslSliders({ h, s, l, onChange }: HslSlidersProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={sliderRowStyle}>
        <span style={sliderLabelStyle}>H</span>
        <div style={sliderContainerStyle}>
          <Slider value={h} onChange={(v) => onChange(v, s, l)} min={0} max={360} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{h}°</span>
      </div>
      <div style={sliderRowStyle}>
        <span style={sliderLabelStyle}>S</span>
        <div style={sliderContainerStyle}>
          <Slider value={s} onChange={(v) => onChange(h, v, l)} min={0} max={100} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{s}%</span>
      </div>
      <div style={sliderRowStyle}>
        <span style={sliderLabelStyle}>L</span>
        <div style={sliderContainerStyle}>
          <Slider value={l} onChange={(v) => onChange(h, s, v)} min={0} max={100} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{l}%</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

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
  size = "md",
  disabled,
}: ColorPickerPopoverProps) {
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

  const handleHexInput = useCallback(
    (input: string | number) => {
      const hex = String(input).replace(/^#/, "").slice(0, 6).toUpperCase();
      if (/^[0-9A-F]{6}$/i.test(hex)) {
        onChange(hex);
      }
    },
    [onChange]
  );

  const trigger = <ColorSwatch color={value} alpha={alpha} size={size} disabled={disabled} />;

  return (
    <Popover trigger={trigger} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        {/* Preview + Hex Input */}
        <div style={previewRowStyle}>
          <ColorSwatch color={value} alpha={alpha} style={previewSwatchStyle} />
          <div style={hexInputContainerStyle}>
            <span style={hexLabelStyle}>Hex</span>
            <Input type="text" value={value} onChange={handleHexInput} placeholder="RRGGBB" />
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={modeTabsStyle}>
          <button type="button" style={modeTabStyle(mode === "rgb")} onClick={() => setMode("rgb")}>
            RGB
          </button>
          <button type="button" style={modeTabStyle(mode === "hsl")} onClick={() => setMode("hsl")}>
            HSL
          </button>
        </div>

        {/* Sliders */}
        {mode === "rgb" && <RgbSliders r={rgb.r} g={rgb.g} b={rgb.b} onChange={handleRgbChange} />}
        {mode === "hsl" && <HslSliders h={hsl.h} s={hsl.s} l={hsl.l} onChange={handleHslChange} />}

        {/* Alpha Slider */}
        {showAlpha && onAlphaChange && (
          <div style={sliderRowStyle}>
            <span style={sliderLabelStyle}>A</span>
            <div style={sliderContainerStyle}>
              <Slider value={Math.round(alpha * 100)} onChange={(v) => onAlphaChange(v / 100)} min={0} max={100} showValue={false} />
            </div>
            <span style={sliderValueStyle}>{Math.round(alpha * 100)}%</span>
          </div>
        )}
      </div>
    </Popover>
  );
}
