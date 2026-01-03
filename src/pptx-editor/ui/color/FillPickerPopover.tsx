/**
 * @file FillPickerPopover component
 *
 * Adobe/Figma-style fill picker that opens in a popover.
 * Supports NoFill, Solid, Gradient, Pattern fills with appropriate editors.
 */

import { useState, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import { Popover } from "../primitives/Popover";
import { Slider } from "../primitives/Slider";
import { Input } from "../primitives/Input";
import { Select } from "../primitives/Select";
import { ColorSwatch, type ColorSwatchSize } from "./ColorSwatch";
import { deg, pct } from "../../../pptx/domain/types";
import type {
  Fill,
  SolidFill,
  GradientFill,
  GradientStop,
  LinearGradient,
  Color,
} from "../../../pptx/domain/color";
import type { SelectOption } from "../../types";

export type FillPickerPopoverProps = {
  /** Current fill value */
  readonly value: Fill;
  /** Called when fill changes */
  readonly onChange: (fill: Fill) => void;
  /** Size of the trigger swatch */
  readonly size?: ColorSwatchSize;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element */
  readonly trigger?: ReactNode;
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
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
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
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// =============================================================================
// Fill Utilities
// =============================================================================

type FillType = Fill["type"];

const fillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "None" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
];

function getFillPreview(fill: Fill): { color: string; gradient?: string } {
  switch (fill.type) {
    case "noFill":
      return { color: "transparent" };
    case "solidFill":
      if (fill.color.spec.type === "srgb") {
        return { color: fill.color.spec.value };
      }
      return { color: "888888" };
    case "gradientFill":
      if (fill.stops.length >= 2) {
        const colors = fill.stops.map((stop) => {
          if (stop.color.spec.type === "srgb") {
            return `#${stop.color.spec.value}`;
          }
          return "#888888";
        });
        const angle = fill.linear?.angle ?? 0;
        return {
          color: colors[0].replace("#", ""),
          gradient: `linear-gradient(${angle}deg, ${colors.join(", ")})`,
        };
      }
      return { color: "888888" };
    default:
      return { color: "888888" };
  }
}

function createDefaultColor(hex: string): Color {
  return { spec: { type: "srgb", value: hex } };
}

function createDefaultFill(type: FillType): Fill {
  switch (type) {
    case "noFill":
      return { type: "noFill" };
    case "solidFill":
      return { type: "solidFill", color: createDefaultColor("000000") };
    case "gradientFill":
      return {
        type: "gradientFill",
        stops: [
          { position: pct(0), color: createDefaultColor("000000") },
          { position: pct(100), color: createDefaultColor("FFFFFF") },
        ],
        linear: { angle: deg(90), scaled: true },
        rotWithShape: true,
      };
    default:
      return { type: "noFill" };
  }
}

// =============================================================================
// Styles
// =============================================================================

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "260px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const previewSwatchStyle: CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "6px",
  flexShrink: 0,
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

const gradientStopsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const gradientStopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

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

type SolidFillEditorProps = {
  readonly value: SolidFill;
  readonly onChange: (fill: SolidFill) => void;
};

function SolidFillEditor({ value, onChange }: SolidFillEditorProps) {
  const [mode, setMode] = useState<"rgb" | "hsl">("rgb");

  const hex = value.color.spec.type === "srgb" ? value.color.spec.value : "000000";
  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const handleHexChange = useCallback(
    (newHex: string) => {
      onChange({ ...value, color: createDefaultColor(newHex) });
    },
    [value, onChange]
  );

  const handleRgbChange = useCallback(
    (r: number, g: number, b: number) => {
      onChange({ ...value, color: createDefaultColor(rgbToHex(r, g, b)) });
    },
    [value, onChange]
  );

  const handleHslChange = useCallback(
    (h: number, s: number, l: number) => {
      const { r, g, b } = hslToRgb(h, s, l);
      onChange({ ...value, color: createDefaultColor(rgbToHex(r, g, b)) });
    },
    [value, onChange]
  );

  const handleHexInput = useCallback(
    (input: string | number) => {
      const newHex = String(input).replace(/^#/, "").slice(0, 6).toUpperCase();
      if (/^[0-9A-F]{6}$/i.test(newHex)) {
        handleHexChange(newHex);
      }
    },
    [handleHexChange]
  );

  return (
    <>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <ColorSwatch color={hex} style={previewSwatchStyle} />
        <div style={{ flex: 1 }}>
          <Input type="text" value={hex} onChange={handleHexInput} placeholder="RRGGBB" />
        </div>
      </div>

      <div style={modeTabsStyle}>
        <button type="button" style={modeTabStyle(mode === "rgb")} onClick={() => setMode("rgb")}>
          RGB
        </button>
        <button type="button" style={modeTabStyle(mode === "hsl")} onClick={() => setMode("hsl")}>
          HSL
        </button>
      </div>

      {mode === "rgb" && <RgbSliders r={rgb.r} g={rgb.g} b={rgb.b} onChange={handleRgbChange} />}
      {mode === "hsl" && <HslSliders h={hsl.h} s={hsl.s} l={hsl.l} onChange={handleHslChange} />}
    </>
  );
}

type GradientFillEditorProps = {
  readonly value: GradientFill;
  readonly onChange: (fill: GradientFill) => void;
};

function GradientFillEditor({ value, onChange }: GradientFillEditorProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);

  const angle = value.linear?.angle ?? 0;

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      onChange({
        ...value,
        linear: { ...(value.linear ?? { scaled: true }), angle: deg(newAngle) } as LinearGradient,
      });
    },
    [value, onChange]
  );

  const handleStopColorChange = useCallback(
    (index: number, hex: string) => {
      const newStops = [...value.stops];
      newStops[index] = { ...newStops[index], color: createDefaultColor(hex) };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newStops = [...value.stops];
      newStops[index] = { ...newStops[index], position: pct(position) };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const getStopHex = (stop: GradientStop): string => {
    return stop.color.spec.type === "srgb" ? stop.color.spec.value : "888888";
  };

  return (
    <>
      {/* Gradient Preview */}
      <div
        style={{
          height: "24px",
          borderRadius: "4px",
          background: `linear-gradient(${angle}deg, ${value.stops.map((s) => `#${getStopHex(s)} ${s.position}%`).join(", ")})`,
        }}
      />

      {/* Angle */}
      <div style={sliderRowStyle}>
        <span style={sliderLabelStyle}>°</span>
        <div style={sliderContainerStyle}>
          <Slider value={angle} onChange={handleAngleChange} min={0} max={360} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{angle}°</span>
      </div>

      {/* Stops */}
      <div style={gradientStopsStyle}>
        {value.stops.map((stop, index) => {
          const stopHex = getStopHex(stop);
          return (
            <div
              key={index}
              style={{
                ...gradientStopRowStyle,
                backgroundColor: selectedStopIndex === index ? "var(--bg-tertiary, #222)" : "transparent",
                padding: "4px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setSelectedStopIndex(index)}
            >
              <ColorSwatch color={stopHex} size="sm" />
              <Input
                type="text"
                value={stopHex}
                onChange={(v) => {
                  const newHex = String(v).replace(/^#/, "").slice(0, 6).toUpperCase();
                  if (/^[0-9A-F]{6}$/i.test(newHex)) {
                    handleStopColorChange(index, newHex);
                  }
                }}
                style={{ flex: 1, width: "auto" }}
              />
              <Input
                type="number"
                value={stop.position}
                onChange={(v) => handleStopPositionChange(index, Number(v))}
                suffix="%"
                style={{ width: "60px" }}
                min={0}
                max={100}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * A fill picker popover for editing Fill values (NoFill, Solid, Gradient).
 */
export function FillPickerPopover({
  value,
  onChange,
  size = "md",
  disabled,
  trigger,
}: FillPickerPopoverProps) {
  const preview = useMemo(() => getFillPreview(value), [value]);

  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultFill(newType as FillType));
    },
    [onChange]
  );

  const triggerElement = trigger ?? (
    <div
      style={{
        ...previewSwatchStyle,
        width: size === "sm" ? "16px" : size === "md" ? "24px" : "32px",
        height: size === "sm" ? "16px" : size === "md" ? "24px" : "32px",
        background: preview.gradient ?? `#${preview.color}`,
        border: value.type === "noFill" ? "2px dashed var(--border-subtle, #444)" : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        {/* Fill Type Selector */}
        <div style={headerStyle}>
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            style={{ flex: 1 }}
          />
        </div>

        {/* Type-specific Editor */}
        {value.type === "noFill" && (
          <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px", padding: "16px 0" }}>
            No fill
          </div>
        )}

        {value.type === "solidFill" && (
          <SolidFillEditor value={value} onChange={(v) => onChange(v)} />
        )}

        {value.type === "gradientFill" && (
          <GradientFillEditor value={value} onChange={(v) => onChange(v)} />
        )}
      </div>
    </Popover>
  );
}
