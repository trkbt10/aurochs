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
// Color Conversion Utilities
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
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
