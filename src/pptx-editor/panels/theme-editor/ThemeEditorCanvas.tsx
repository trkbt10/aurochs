/**
 * @file Graphical Theme Editor Canvas
 *
 * Full-screen graphical theme editor with:
 * - Visual color palette with tile/list view modes
 * - Live sample slide preview
 * - Font editing with all font types (Latin, EastAsian, ComplexScript)
 * - Theme preset gallery
 * - Theme-specific toolbar
 */

import { useState, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import type { ColorScheme } from "../../../pptx/domain/color/context";
import type { FontScheme, FontSpec } from "../../../pptx/domain/resolution";
import type { SchemeColorName, ThemePreset } from "./types";
import { THEME_PRESETS } from "./presets";
import { ColorPickerPopover } from "../../ui/color/ColorPickerPopover";
import { Input } from "../../ui/primitives/Input";
import { Button } from "../../ui/primitives/Button";
import { colorTokens, fontTokens, spacingTokens, radiusTokens, iconTokens } from "../../ui/design-tokens";
import { TileViewIcon, ListViewIcon, UndoIcon, RedoIcon, DownloadIcon } from "../../ui/icons";
import { hexToRgb } from "../../../color";

export type ThemeEditorCanvasProps = {
  readonly colorScheme: ColorScheme;
  readonly fontScheme?: FontScheme;
  readonly onColorChange: (name: SchemeColorName, color: string) => void;
  readonly onMajorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onMinorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onPresetSelect: (preset: ThemePreset) => void;
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly onExport?: () => void;
};

type ColorViewMode = "tile" | "list";

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  overflow: "hidden",
  backgroundColor: colorTokens.background.secondary,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.md,
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  backgroundColor: colorTokens.background.primary,
  flexShrink: 0,
};

const toolbarSectionStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const toolbarDividerStyle: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: colorTokens.border.subtle,
  margin: `0 ${spacingTokens.xs}`,
};

const mainContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flex: 1,
  overflow: "hidden",
};

const leftPanelStyle: CSSProperties = {
  width: "300px",
  minWidth: "300px",
  display: "flex",
  flexDirection: "column",
  borderRight: `1px solid ${colorTokens.border.subtle}`,
  overflow: "hidden",
};

const centerPanelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  padding: spacingTokens.lg,
  overflow: "hidden",
};

const rightPanelStyle: CSSProperties = {
  width: "320px",
  minWidth: "320px",
  display: "flex",
  flexDirection: "column",
  borderLeft: `1px solid ${colorTokens.border.subtle}`,
  overflow: "hidden",
};

const panelHeaderStyle: CSSProperties = {
  padding: spacingTokens.md,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const panelTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.lg,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.primary,
};

const panelContentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: spacingTokens.md,
};

// Pivot-style toggle (matching EditorModePivot)
const pivotContainerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: radiusTokens.md,
  padding: "2px",
  border: `1px solid ${colorTokens.border.subtle}`,
};

const pivotButtonBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 8px",
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  fontFamily: "inherit",
  border: "none",
  borderRadius: `calc(${radiusTokens.md} - 2px)`,
  backgroundColor: "transparent",
  color: colorTokens.text.secondary,
  cursor: "pointer",
  transition: "all 150ms ease",
  userSelect: "none",
};

const pivotButtonActiveStyle: CSSProperties = {
  backgroundColor: colorTokens.background.primary,
  color: colorTokens.text.primary,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
};

// Tile view styles
const colorTileGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: spacingTokens.sm,
};

const colorTileStyle: CSSProperties = {
  aspectRatio: "1.5 / 1",
  borderRadius: radiusTokens.md,
  cursor: "pointer",
  transition: "transform 150ms ease, box-shadow 150ms ease",
  border: `2px solid ${colorTokens.border.subtle}`,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  paddingBottom: spacingTokens.xs,
};

// List view styles
const colorListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
};

const colorListItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: spacingTokens.xs,
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  transition: "background-color 150ms ease",
};

const colorListSwatchStyle: CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: radiusTokens.sm,
  border: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

const colorListLabelStyle: CSSProperties = {
  flex: 1,
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
};

const colorListValueStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  fontFamily: "monospace",
};

// Section styles
const sectionStyle: CSSProperties = {
  marginBottom: spacingTokens.lg,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.secondary,
  marginBottom: spacingTokens.sm,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

// Preview styles
const previewContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const slidePreviewStyle: CSSProperties = {
  flex: 1,
  borderRadius: radiusTokens.lg,
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

// Font styles
const fontGroupStyle: CSSProperties = {
  marginBottom: spacingTokens.lg,
  padding: spacingTokens.md,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: radiusTokens.md,
};

const fontGroupTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.primary,
  marginBottom: spacingTokens.sm,
};

const fontInputRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
};

const fontInputLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  width: "80px",
  flexShrink: 0,
};

const fontPreviewStyle: CSSProperties = {
  padding: spacingTokens.sm,
  backgroundColor: colorTokens.background.primary,
  borderRadius: radiusTokens.sm,
  marginTop: spacingTokens.xs,
};

// Preset styles
const presetGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: spacingTokens.sm,
};

const presetCardStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderRadius: radiusTokens.md,
  border: `2px solid ${colorTokens.border.subtle}`,
  cursor: "pointer",
  transition: "border-color 150ms ease, background-color 150ms ease",
  backgroundColor: colorTokens.background.primary,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const presetColorsStyle: CSSProperties = {
  display: "flex",
  gap: "2px",
  flexShrink: 0,
};

const presetColorDotStyle: CSSProperties = {
  width: "14px",
  height: "14px",
  borderRadius: "50%",
  border: "1px solid rgba(0,0,0,0.1)",
};

const presetNameStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  flex: 1,
};

// =============================================================================
// Color Configuration
// =============================================================================

type ColorConfig = {
  readonly name: SchemeColorName;
  readonly label: string;
  readonly category: "base" | "accent" | "link";
};

const COLOR_CONFIGS: readonly ColorConfig[] = [
  { name: "dk1", label: "Dark 1", category: "base" },
  { name: "lt1", label: "Light 1", category: "base" },
  { name: "dk2", label: "Dark 2", category: "base" },
  { name: "lt2", label: "Light 2", category: "base" },
  { name: "accent1", label: "Accent 1", category: "accent" },
  { name: "accent2", label: "Accent 2", category: "accent" },
  { name: "accent3", label: "Accent 3", category: "accent" },
  { name: "accent4", label: "Accent 4", category: "accent" },
  { name: "accent5", label: "Accent 5", category: "accent" },
  { name: "accent6", label: "Accent 6", category: "accent" },
  { name: "hlink", label: "Hyperlink", category: "link" },
  { name: "folHlink", label: "Followed", category: "link" },
];

// =============================================================================
// Sub-components
// =============================================================================

type ViewModePivotProps = {
  readonly mode: ColorViewMode;
  readonly onModeChange: (mode: ColorViewMode) => void;
};

function ViewModePivot({ mode, onModeChange }: ViewModePivotProps) {
  return (
    <div style={pivotContainerStyle}>
      <button
        type="button"
        style={{
          ...pivotButtonBaseStyle,
          ...(mode === "tile" ? pivotButtonActiveStyle : {}),
        }}
        onClick={() => onModeChange("tile")}
        title="Tile view"
      >
        <TileViewIcon size={iconTokens.size.sm} />
      </button>
      <button
        type="button"
        style={{
          ...pivotButtonBaseStyle,
          ...(mode === "list" ? pivotButtonActiveStyle : {}),
        }}
        onClick={() => onModeChange("list")}
        title="List view"
      >
        <ListViewIcon size={iconTokens.size.sm} />
      </button>
    </div>
  );
}

type ColorTileProps = {
  readonly config: ColorConfig;
  readonly color: string;
  readonly onChange: (name: SchemeColorName, color: string) => void;
};

function ColorTile({ config, color, onChange }: ColorTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const safeColor = color ?? "808080";

  const handleColorChange = useCallback(
    (newColor: string) => {
      onChange(config.name, newColor);
    },
    [config.name, onChange]
  );

  const tileStyle: CSSProperties = {
    ...colorTileStyle,
    backgroundColor: `#${safeColor}`,
    transform: isHovered ? "scale(1.02)" : "scale(1)",
    boxShadow: isHovered ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "none",
  };

  const rgb = hexToRgb(safeColor);
  const brightness = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
  const textColor = brightness > 128 ? "#000" : "#fff";

  const triggerElement = (
    <div
      style={tileStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${config.label}: #${safeColor}`}
    >
      <span style={{ fontSize: fontTokens.size.xs, color: textColor, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
        {config.label}
      </span>
    </div>
  );

  return <ColorPickerPopover value={safeColor} onChange={handleColorChange} trigger={triggerElement} />;
}

type ColorListItemProps = {
  readonly config: ColorConfig;
  readonly color: string;
  readonly onChange: (name: SchemeColorName, color: string) => void;
};

function ColorListItem({ config, color, onChange }: ColorListItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const safeColor = color ?? "808080";

  const handleColorChange = useCallback(
    (newColor: string) => {
      onChange(config.name, newColor);
    },
    [config.name, onChange]
  );

  const itemStyle: CSSProperties = {
    ...colorListItemStyle,
    backgroundColor: isHovered ? colorTokens.background.hover : "transparent",
  };

  const triggerElement = (
    <div
      style={itemStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ ...colorListSwatchStyle, backgroundColor: `#${safeColor}` }} />
      <span style={colorListLabelStyle}>{config.label}</span>
      <span style={colorListValueStyle}>#{safeColor.toUpperCase()}</span>
    </div>
  );

  return <ColorPickerPopover value={safeColor} onChange={handleColorChange} trigger={triggerElement} />;
}

type SampleSlidePreviewProps = {
  readonly colorScheme: ColorScheme;
  readonly fontScheme?: FontScheme;
};

function SampleSlidePreview({ colorScheme, fontScheme }: SampleSlidePreviewProps) {
  const majorFont = fontScheme?.majorFont?.latin ?? "Calibri Light";
  const minorFont = fontScheme?.minorFont?.latin ?? "Calibri";

  const dk1 = colorScheme?.dk1 ?? "000000";
  const dk2 = colorScheme?.dk2 ?? "44546A";
  const lt1 = colorScheme?.lt1 ?? "FFFFFF";
  const lt2 = colorScheme?.lt2 ?? "E7E6E6";
  const hlink = colorScheme?.hlink ?? "0563C1";
  const folHlink = colorScheme?.folHlink ?? "954F72";
  const accents = [
    colorScheme?.accent1 ?? "4472C4",
    colorScheme?.accent2 ?? "ED7D31",
    colorScheme?.accent3 ?? "A5A5A5",
    colorScheme?.accent4 ?? "FFC000",
    colorScheme?.accent5 ?? "5B9BD5",
    colorScheme?.accent6 ?? "70AD47",
  ];

  return (
    <div style={slidePreviewStyle}>
      <div
        style={{
          flex: 1,
          backgroundColor: `#${lt1}`,
          padding: spacingTokens.xl,
          display: "flex",
          flexDirection: "column",
          gap: spacingTokens.md,
          overflow: "auto",
        }}
      >
        <div style={{ fontFamily: majorFont, fontSize: "28px", fontWeight: 600, color: `#${dk1}` }}>
          Presentation Title
        </div>
        <div style={{ fontFamily: minorFont, fontSize: "16px", color: `#${dk2}` }}>
          Subtitle using {minorFont}
        </div>
        <div style={{ flex: 1, display: "flex", gap: spacingTokens.lg }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: spacingTokens.xs }}>
            <div style={{ fontFamily: minorFont, fontSize: "13px", color: `#${dk1}` }}>• Body text</div>
            <div style={{ fontFamily: minorFont, fontSize: "13px", color: `#${dk2}` }}>• Secondary</div>
            <div style={{ fontFamily: minorFont, fontSize: "13px" }}>
              <a href="#" style={{ color: `#${hlink}`, textDecoration: "underline" }}>Link</a>
              {" / "}
              <a href="#" style={{ color: `#${folHlink}`, textDecoration: "underline" }}>Visited</a>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "80px" }}>
            {accents.map((c, i) => (
              <div key={i} style={{ height: "20px", backgroundColor: `#${c}`, borderRadius: radiusTokens.sm }} />
            ))}
          </div>
        </div>
        <div style={{ fontFamily: minorFont, fontSize: "11px", color: `#${dk2}`, borderTop: `1px solid #${lt2}`, paddingTop: spacingTokens.xs }}>
          Footer • Page 1
        </div>
      </div>
    </div>
  );
}

type FontEditorProps = {
  readonly title: string;
  readonly fontSpec?: FontSpec;
  readonly onChange: (spec: Partial<FontSpec>) => void;
};

function FontEditor({ title, fontSpec, onChange }: FontEditorProps) {
  const handleLatinChange = useCallback((v: string | number) => onChange({ latin: String(v) || undefined }), [onChange]);
  const handleEastAsianChange = useCallback((v: string | number) => onChange({ eastAsian: String(v) || undefined }), [onChange]);
  const handleComplexScriptChange = useCallback((v: string | number) => onChange({ complexScript: String(v) || undefined }), [onChange]);

  const latin = fontSpec?.latin ?? "";
  const eastAsian = fontSpec?.eastAsian ?? "";
  const complexScript = fontSpec?.complexScript ?? "";

  return (
    <div style={fontGroupStyle}>
      <div style={fontGroupTitleStyle}>{title}</div>
      <div style={fontInputRowStyle}>
        <span style={fontInputLabelStyle}>Latin</span>
        <Input value={latin} onChange={handleLatinChange} placeholder="e.g., Calibri" style={{ flex: 1 }} />
      </div>
      <div style={fontInputRowStyle}>
        <span style={fontInputLabelStyle}>East Asian</span>
        <Input value={eastAsian} onChange={handleEastAsianChange} placeholder="e.g., MS Gothic" style={{ flex: 1 }} />
      </div>
      <div style={fontInputRowStyle}>
        <span style={fontInputLabelStyle}>Complex</span>
        <Input value={complexScript} onChange={handleComplexScriptChange} placeholder="e.g., Arial" style={{ flex: 1 }} />
      </div>
      {latin && (
        <div style={fontPreviewStyle}>
          <span style={{ fontFamily: latin, fontSize: title.includes("Major") ? "20px" : "14px" }}>{latin}</span>
        </div>
      )}
    </div>
  );
}

type PresetCardProps = {
  readonly preset: ThemePreset;
  readonly onSelect: (preset: ThemePreset) => void;
};

function PresetCard({ preset, onSelect }: PresetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle: CSSProperties = {
    ...presetCardStyle,
    borderColor: isHovered ? colorTokens.accent.primary : colorTokens.border.subtle,
    backgroundColor: isHovered ? colorTokens.background.hover : colorTokens.background.primary,
  };

  const accentColors = [
    preset.colorScheme.accent1,
    preset.colorScheme.accent2,
    preset.colorScheme.accent3,
    preset.colorScheme.accent4,
    preset.colorScheme.accent5,
    preset.colorScheme.accent6,
  ];

  return (
    <div
      style={cardStyle}
      onClick={() => onSelect(preset)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={presetColorsStyle}>
        {accentColors.map((color, i) => (
          <div key={i} style={{ ...presetColorDotStyle, backgroundColor: `#${color}` }} />
        ))}
      </div>
      <span style={presetNameStyle}>{preset.name}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ThemeEditorCanvas({
  colorScheme,
  fontScheme,
  onColorChange,
  onMajorFontChange,
  onMinorFontChange,
  onPresetSelect,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onExport,
}: ThemeEditorCanvasProps) {
  const [colorViewMode, setColorViewMode] = useState<ColorViewMode>("tile");

  const baseColors = useMemo(() => COLOR_CONFIGS.filter((c) => c.category === "base"), []);
  const accentColors = useMemo(() => COLOR_CONFIGS.filter((c) => c.category === "accent"), []);
  const linkColors = useMemo(() => COLOR_CONFIGS.filter((c) => c.category === "link"), []);

  const renderColorSection = (title: string, colors: readonly ColorConfig[]) => (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      {colorViewMode === "tile" ? (
        <div style={colorTileGridStyle}>
          {colors.map((config) => (
            <ColorTile key={config.name} config={config} color={colorScheme[config.name]} onChange={onColorChange} />
          ))}
        </div>
      ) : (
        <div style={colorListStyle}>
          {colors.map((config) => (
            <ColorListItem key={config.name} config={config} color={colorScheme[config.name]} onChange={onColorChange} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={containerStyle}>
      {/* Theme Editor Toolbar */}
      <div style={toolbarStyle}>
        <div style={toolbarSectionStyle}>
          <Button variant="ghost" size="sm" disabled={!canUndo} onClick={onUndo} title="Undo">
            <UndoIcon size={iconTokens.size.md} />
          </Button>
          <Button variant="ghost" size="sm" disabled={!canRedo} onClick={onRedo} title="Redo">
            <RedoIcon size={iconTokens.size.md} />
          </Button>
        </div>
        <div style={toolbarDividerStyle} />
        <span style={{ fontSize: fontTokens.size.md, color: colorTokens.text.secondary }}>Theme Editor</span>
        <div style={{ flex: 1 }} />
        {onExport && (
          <Button variant="secondary" size="sm" onClick={onExport}>
            <DownloadIcon size={iconTokens.size.md} />
            <span style={{ marginLeft: spacingTokens.xs }}>Export</span>
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* Left Panel: Colors */}
        <div style={leftPanelStyle}>
          <div style={panelHeaderStyle}>
            <span style={panelTitleStyle}>Colors</span>
            <ViewModePivot mode={colorViewMode} onModeChange={setColorViewMode} />
          </div>
          <div style={panelContentStyle}>
            {renderColorSection("Base", baseColors)}
            {renderColorSection("Accent", accentColors)}
            {renderColorSection("Links", linkColors)}
          </div>
        </div>

        {/* Center: Preview */}
        <div style={centerPanelStyle}>
          <div style={{ ...panelTitleStyle, marginBottom: spacingTokens.md }}>Live Preview</div>
          <div style={previewContainerStyle}>
            <SampleSlidePreview colorScheme={colorScheme} fontScheme={fontScheme} />
          </div>
        </div>

        {/* Right Panel: Fonts & Presets */}
        <div style={rightPanelStyle}>
          <div style={panelHeaderStyle}>
            <span style={panelTitleStyle}>Fonts & Presets</span>
          </div>
          <div style={panelContentStyle}>
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Fonts</div>
              <FontEditor title="Major Font (Headings)" fontSpec={fontScheme?.majorFont} onChange={onMajorFontChange} />
              <FontEditor title="Minor Font (Body)" fontSpec={fontScheme?.minorFont} onChange={onMinorFontChange} />
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Theme Presets</div>
              <div style={presetGridStyle}>
                {THEME_PRESETS.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} onSelect={onPresetSelect} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
