/**
 * @file ColorSpecEditor - Editor for ColorSpec union type
 *
 * User-centric design: sRGB (hex) is the primary view with a color swatch.
 * Advanced color modes (scheme, hsl, etc.) are accessible via a mode menu.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { Input, Select } from "@oxen-ui/ui-components/primitives";
import { FieldGroup } from "@oxen-ui/ui-components/layout";
import { FillPreview } from "../../ui/color";
import { PercentEditor, DegreesEditor } from "../primitives";
import { deg, pct } from "@oxen/ooxml/domain/units";
import type { ColorSpec, SrgbColor, SchemeColor, SystemColor, PresetColor, HslColor } from "@oxen/ooxml/domain/color";
import type { SolidFill } from "@oxen/ooxml/domain/fill";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";
import type { ColorContext } from "@oxen/pptx/domain/color/context";
import { resolveColor } from "@oxen/pptx/domain/color/resolution";
import { useEditorConfig } from "../../context/editor/EditorConfigContext";

export type ColorSpecEditorProps = EditorProps<ColorSpec> & {
  readonly style?: CSSProperties;
  /** Hide the mode switcher (only show current type's editor) */
  readonly hideModeSwitch?: boolean;
};

type ColorSpecType = ColorSpec["type"];

const colorModeOptions: SelectOption<ColorSpecType>[] = [
  { value: "srgb", label: "Hex" },
  { value: "scheme", label: "Theme" },
  { value: "hsl", label: "HSL" },
  { value: "preset", label: "Preset" },
  { value: "system", label: "System" },
];

const schemeColorOptions: SelectOption[] = [
  { value: "dk1", label: "Dark 1" },
  { value: "lt1", label: "Light 1" },
  { value: "dk2", label: "Dark 2" },
  { value: "lt2", label: "Light 2" },
  { value: "accent1", label: "Accent 1" },
  { value: "accent2", label: "Accent 2" },
  { value: "accent3", label: "Accent 3" },
  { value: "accent4", label: "Accent 4" },
  { value: "accent5", label: "Accent 5" },
  { value: "accent6", label: "Accent 6" },
  { value: "hlink", label: "Hyperlink" },
  { value: "folHlink", label: "Followed Link" },
  { value: "bg1", label: "Background 1" },
  { value: "bg2", label: "Background 2" },
  { value: "tx1", label: "Text 1" },
  { value: "tx2", label: "Text 2" },
  { value: "phClr", label: "Placeholder" },
];

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const modeSwitchStyle: CSSProperties = {
  minWidth: "70px",
};

const hexInputStyle: CSSProperties = {
  flex: 1,
  fontFamily: "monospace",
};

const previewContainerStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "4px",
  flexShrink: 0,
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  overflow: "hidden",
};

function createDefaultColorSpec(type: ColorSpecType): ColorSpec {
  switch (type) {
    case "srgb":
      return { type: "srgb", value: "000000" };
    case "scheme":
      return { type: "scheme", value: "accent1" };
    case "system":
      return { type: "system", value: "windowText" };
    case "preset":
      return { type: "preset", value: "black" };
    case "hsl":
      return { type: "hsl", hue: deg(0), saturation: pct(100), luminance: pct(50) };
    case "scrgb":
      return { type: "scrgb", red: pct(0), green: pct(0), blue: pct(0) };
  }
}

function getHexPreview(spec: ColorSpec, colorContext: ColorContext | undefined): string {
  const resolved = resolveColor({ spec }, colorContext);
  return resolved ?? "000000";
}

function createSolidFillFromHex(hex: string): SolidFill {
  return {
    type: "solidFill",
    color: { spec: { type: "srgb", value: hex } },
  };
}

function getDisabledContainerStyle(disabled?: boolean): CSSProperties {
  return {
    ...previewContainerStyle,
    opacity: disabled ? 0.5 : 1,
  };
}

/**
 * Compact, user-friendly color specification editor.
 * sRGB is the primary mode with swatch + hex input.
 */
export function ColorSpecEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  hideModeSwitch = false,
}: ColorSpecEditorProps) {
  const { colorScheme, colorMap } = useEditorConfig();
  const colorContext = useMemo<ColorContext>(
    () => ({
      colorScheme: colorScheme ?? {},
      colorMap: colorMap ?? {},
    }),
    [colorScheme, colorMap]
  );
  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultColorSpec(newType as ColorSpecType));
    },
    [onChange]
  );

  const previewFill = useMemo(
    () => createSolidFillFromHex(getHexPreview(value, colorContext)),
    [value, colorContext]
  );

  const renderEditor = () => {
    switch (value.type) {
      case "srgb": {
        const srgbValue = value as SrgbColor;
        return (
          <div style={rowStyle}>
            <div style={getDisabledContainerStyle(disabled)}>
              <FillPreview fill={previewFill} />
            </div>
            <Input
              type="text"
              value={srgbValue.value}
              onChange={(v) => onChange({ ...srgbValue, value: String(v).replace(/^#/, "").slice(0, 6).toUpperCase() })}
              placeholder="RRGGBB"
              disabled={disabled}
              style={hexInputStyle}
            />
            {!hideModeSwitch && (
              <Select
                value={value.type}
                onChange={handleTypeChange}
                options={colorModeOptions}
                disabled={disabled}
                style={modeSwitchStyle}
              />
            )}
          </div>
        );
      }

      case "scheme": {
        const schemeValue = value as SchemeColor;
        return (
          <div style={rowStyle}>
            <div style={getDisabledContainerStyle(disabled)}>
              <FillPreview fill={previewFill} />
            </div>
            <Select
              value={schemeValue.value}
              onChange={(v) => onChange({ ...schemeValue, value: v as SchemeColor["value"] })}
              options={schemeColorOptions}
              disabled={disabled}
              style={{ flex: 1 }}
            />
            {!hideModeSwitch && (
              <Select
                value={value.type}
                onChange={handleTypeChange}
                options={colorModeOptions}
                disabled={disabled}
                style={modeSwitchStyle}
              />
            )}
          </div>
        );
      }

      case "system": {
        const systemValue = value as SystemColor;
        return (
          <>
            <div style={rowStyle}>
              <div style={getDisabledContainerStyle(disabled)}>
                <FillPreview fill={previewFill} />
              </div>
              <Input
                type="text"
                value={systemValue.value}
                onChange={(v) => onChange({ ...systemValue, value: String(v) })}
                placeholder="windowText"
                disabled={disabled}
                style={{ flex: 1 }}
              />
              {!hideModeSwitch && (
                <Select
                  value={value.type}
                  onChange={handleTypeChange}
                  options={colorModeOptions}
                  disabled={disabled}
                  style={modeSwitchStyle}
                />
              )}
            </div>
          </>
        );
      }

      case "preset": {
        const presetValue = value as PresetColor;
        return (
          <div style={rowStyle}>
            <div style={getDisabledContainerStyle(disabled)}>
              <FillPreview fill={previewFill} />
            </div>
            <Input
              type="text"
              value={presetValue.value}
              onChange={(v) => onChange({ ...presetValue, value: String(v) })}
              placeholder="red, blue, etc."
              disabled={disabled}
              style={{ flex: 1 }}
            />
            {!hideModeSwitch && (
              <Select
                value={value.type}
                onChange={handleTypeChange}
                options={colorModeOptions}
                disabled={disabled}
                style={modeSwitchStyle}
              />
            )}
          </div>
        );
      }

      case "hsl": {
        const hslValue = value as HslColor;
        return (
          <>
            <div style={rowStyle}>
              <div style={getDisabledContainerStyle(disabled)}>
                <FillPreview fill={previewFill} />
              </div>
              <span style={{ flex: 1, fontSize: "12px", color: "var(--text-secondary)" }}>
                H:{hslValue.hue}° S:{hslValue.saturation}% L:{hslValue.luminance}%
              </span>
              {!hideModeSwitch && (
                <Select
                  value={value.type}
                  onChange={handleTypeChange}
                  options={colorModeOptions}
                  disabled={disabled}
                  style={modeSwitchStyle}
                />
              )}
            </div>
            <FieldGroup label="Hue">
              <DegreesEditor
                value={hslValue.hue}
                onChange={(v) => onChange({ ...hslValue, hue: v })}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Saturation">
              <PercentEditor
                value={hslValue.saturation}
                onChange={(v) => onChange({ ...hslValue, saturation: v })}
                disabled={disabled}
                slider
              />
            </FieldGroup>
            <FieldGroup label="Luminance">
              <PercentEditor
                value={hslValue.luminance}
                onChange={(v) => onChange({ ...hslValue, luminance: v })}
                disabled={disabled}
                slider
              />
            </FieldGroup>
          </>
        );
      }
    }
  };

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {renderEditor()}
    </div>
  );
}

/**
 * Create a default sRGB color spec.
 */
export function createDefaultSrgbColor(hex: string = "000000"): SrgbColor {
  return { type: "srgb", value: hex };
}
