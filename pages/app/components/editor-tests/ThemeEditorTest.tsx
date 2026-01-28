/**
 * @file Theme Editor Test
 *
 * Test component for theme editing functionality.
 */

import { useState, useCallback, type CSSProperties } from "react";
import {
  ThemeEditorTabs,
  ThemeEditorCanvas,
  ColorSchemeEditor,
  FontSchemeEditor,
  ThemePresetSelector,
} from "@oxen-ui/pptx-editor/panels/theme-editor";
import type { SchemeColorName, ThemePreset } from "@oxen-ui/pptx-editor/panels/theme-editor/types";
import type { ColorScheme } from "@oxen-office/ooxml/domain/color-context";
import type { FontScheme, FontSpec } from "@oxen-office/ooxml/domain/font-scheme";

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const sectionStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid var(--border-subtle)",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "12px",
  color: "var(--text-primary)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: "24px",
};

const columnStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const stateDisplayStyle: CSSProperties = {
  backgroundColor: "var(--bg-tertiary)",
  padding: "12px",
  borderRadius: "4px",
  fontFamily: "monospace",
  fontSize: "12px",
  whiteSpace: "pre-wrap",
  overflow: "auto",
  maxHeight: "200px",
};

const DEFAULT_COLOR_SCHEME: ColorScheme = {
  dk1: "000000",
  lt1: "FFFFFF",
  dk2: "44546A",
  lt2: "E7E6E6",
  accent1: "4472C4",
  accent2: "ED7D31",
  accent3: "A5A5A5",
  accent4: "FFC000",
  accent5: "5B9BD5",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72",
};

const DEFAULT_FONT_SCHEME: FontScheme = {
  majorFont: { latin: "Calibri Light", eastAsian: undefined, complexScript: undefined },
  minorFont: { latin: "Calibri", eastAsian: undefined, complexScript: undefined },
};

/**
 * Theme Editor Test Component
 */
export function ThemeEditorTest() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(DEFAULT_COLOR_SCHEME);
  const [fontScheme, setFontScheme] = useState<FontScheme>(DEFAULT_FONT_SCHEME);
  const [lastAction, setLastAction] = useState<string>("None");

  const handleColorChange = useCallback((name: SchemeColorName, color: string) => {
    setColorScheme((prev) => ({ ...prev, [name]: color }));
    setLastAction(`Color changed: ${name} = #${color}`);
  }, []);

  const handleMajorFontChange = useCallback((spec: Partial<FontSpec>) => {
    setFontScheme((prev) => ({
      ...prev,
      majorFont: { ...prev.majorFont, ...spec },
    }));
    setLastAction(`Major font changed: ${JSON.stringify(spec)}`);
  }, []);

  const handleMinorFontChange = useCallback((spec: Partial<FontSpec>) => {
    setFontScheme((prev) => ({
      ...prev,
      minorFont: { ...prev.minorFont, ...spec },
    }));
    setLastAction(`Minor font changed: ${JSON.stringify(spec)}`);
  }, []);

  const handlePresetSelect = useCallback((preset: ThemePreset) => {
    setColorScheme(preset.colorScheme);
    setFontScheme(preset.fontScheme);
    setLastAction(`Preset selected: ${preset.name}`);
  }, []);

  return (
    <div style={containerStyle}>
      {/* Graphical Theme Editor Canvas - Main Feature */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>ThemeEditorCanvas (Full Graphical Editor)</h3>
        <div style={{ height: "600px" }}>
          <ThemeEditorCanvas
            colorScheme={colorScheme}
            fontScheme={fontScheme}
            onColorChange={handleColorChange}
            onMajorFontChange={handleMajorFontChange}
            onMinorFontChange={handleMinorFontChange}
            onPresetSelect={handlePresetSelect}
          />
        </div>
      </div>

      {/* State Display */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Current State</h3>
        <div style={rowStyle}>
          <div style={columnStyle}>
            <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Last Action</h4>
            <div style={stateDisplayStyle}>{lastAction}</div>
          </div>
          <div style={columnStyle}>
            <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Color Scheme</h4>
            <div style={stateDisplayStyle}>
              {JSON.stringify(colorScheme, null, 2)}
            </div>
          </div>
          <div style={columnStyle}>
            <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Font Scheme</h4>
            <div style={stateDisplayStyle}>
              {JSON.stringify(fontScheme, null, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* Combined Theme Editor Tabs */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>ThemeEditorTabs (Compact Version)</h3>
        <div style={{ height: "400px" }}>
          <ThemeEditorTabs
            colorScheme={colorScheme}
            fontScheme={fontScheme}
            onColorChange={handleColorChange}
            onMajorFontChange={handleMajorFontChange}
            onMinorFontChange={handleMinorFontChange}
            onPresetSelect={handlePresetSelect}
          />
        </div>
      </div>

      {/* Individual Components */}
      <div style={rowStyle}>
        <div style={{ ...sectionStyle, ...columnStyle }}>
          <h3 style={sectionTitleStyle}>ColorSchemeEditor</h3>
          <div style={{ height: "350px", overflow: "auto" }}>
            <ColorSchemeEditor
              colorScheme={colorScheme}
              onColorChange={handleColorChange}
            />
          </div>
        </div>

        <div style={{ ...sectionStyle, ...columnStyle }}>
          <h3 style={sectionTitleStyle}>FontSchemeEditor</h3>
          <div style={{ height: "350px", overflow: "auto" }}>
            <FontSchemeEditor
              fontScheme={fontScheme}
              onMajorFontChange={handleMajorFontChange}
              onMinorFontChange={handleMinorFontChange}
            />
          </div>
        </div>

        <div style={{ ...sectionStyle, ...columnStyle }}>
          <h3 style={sectionTitleStyle}>ThemePresetSelector</h3>
          <div style={{ height: "350px", overflow: "auto" }}>
            <ThemePresetSelector
              onPresetSelect={handlePresetSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
