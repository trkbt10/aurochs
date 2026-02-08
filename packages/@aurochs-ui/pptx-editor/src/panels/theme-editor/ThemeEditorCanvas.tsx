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

import { useState, useCallback, useMemo, useRef, type CSSProperties, type ChangeEvent } from "react";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme, FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";
import type { PresentationFile, SlideSize } from "@aurochs-office/pptx/domain";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import type { ThemePreset } from "./types";
import { THEME_PRESETS, OFFICE_THEME } from "./presets";
import { LayoutEditor } from "./LayoutEditor";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import {
  colorTokens,
  fontTokens,
  spacingTokens,
  radiusTokens,
  iconTokens,
} from "@aurochs-ui/ui-components/design-tokens";
import {
  TileViewIcon,
  ListViewIcon,
  UndoIcon,
  RedoIcon,
  DownloadIcon,
  FolderIcon,
} from "@aurochs-ui/ui-components/icons";
import { hexToRgb } from "@aurochs/color";

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
  readonly onThemeImport?: (file: File) => void;
  // Layout editing props
  readonly presentationFile?: PresentationFile;
  readonly layoutOptions?: readonly SlideLayoutOption[];
  readonly currentLayoutPath?: string;
  readonly slideSize?: SlideSize;
  readonly onLayoutSelect?: (layoutPath: string) => void;
};

type ThemeEditorTab = "colors" | "layouts";

// Default color scheme from OFFICE_THEME for consistent fallbacks
const DEFAULT_COLORS = OFFICE_THEME.colorScheme;
const DEFAULT_FONTS = OFFICE_THEME.fontScheme;

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
    [config.name, onChange],
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
    [config.name, onChange],
  );

  const itemStyle: CSSProperties = {
    ...colorListItemStyle,
    backgroundColor: isHovered ? colorTokens.background.hover : "transparent",
  };

  const triggerElement = (
    <div style={itemStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
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
  // Use shared defaults from OFFICE_THEME
  const majorFont = fontScheme?.majorFont?.latin ?? DEFAULT_FONTS.majorFont.latin ?? "Calibri Light";
  const minorFont = fontScheme?.minorFont?.latin ?? DEFAULT_FONTS.minorFont.latin ?? "Calibri";
  const majorEastAsian = fontScheme?.majorFont?.eastAsian;
  const minorEastAsian = fontScheme?.minorFont?.eastAsian;

  // Colors with proper defaults
  const dk1 = colorScheme?.dk1 ?? DEFAULT_COLORS.dk1;
  const dk2 = colorScheme?.dk2 ?? DEFAULT_COLORS.dk2;
  const lt1 = colorScheme?.lt1 ?? DEFAULT_COLORS.lt1;
  const lt2 = colorScheme?.lt2 ?? DEFAULT_COLORS.lt2;
  const hlink = colorScheme?.hlink ?? DEFAULT_COLORS.hlink;
  const folHlink = colorScheme?.folHlink ?? DEFAULT_COLORS.folHlink;
  const accent1 = colorScheme?.accent1 ?? DEFAULT_COLORS.accent1;
  const accent2 = colorScheme?.accent2 ?? DEFAULT_COLORS.accent2;
  const accent3 = colorScheme?.accent3 ?? DEFAULT_COLORS.accent3;
  const accent4 = colorScheme?.accent4 ?? DEFAULT_COLORS.accent4;
  const accent5 = colorScheme?.accent5 ?? DEFAULT_COLORS.accent5;
  const accent6 = colorScheme?.accent6 ?? DEFAULT_COLORS.accent6;

  const colorLabelStyle: CSSProperties = {
    fontSize: "9px",
    color: colorTokens.text.tertiary,
    textAlign: "center",
    marginTop: "2px",
  };

  return (
    <div style={slidePreviewStyle}>
      {/* Slide Background (lt1) */}
      <div
        style={{
          flex: 1,
          backgroundColor: `#${lt1}`,
          padding: spacingTokens.lg,
          display: "flex",
          flexDirection: "column",
          gap: spacingTokens.sm,
          overflow: "auto",
        }}
      >
        {/* Title Area (Major Font + dk1) */}
        <div style={{ marginBottom: spacingTokens.xs }}>
          <div style={{ fontFamily: majorFont, fontSize: "24px", fontWeight: 600, color: `#${dk1}` }}>
            Presentation Title
          </div>
          {majorEastAsian && (
            <div style={{ fontFamily: majorEastAsian, fontSize: "14px", color: `#${dk2}`, marginTop: "4px" }}>
              {majorEastAsian} フォント
            </div>
          )}
          <div style={{ fontFamily: minorFont, fontSize: "14px", color: `#${dk2}`, marginTop: "4px" }}>
            Subtitle text using {minorFont}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", gap: spacingTokens.md }}>
          {/* Left: Text samples */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: spacingTokens.xs }}>
            {/* Body text (Minor Font + dk1/dk2) */}
            <div style={{ fontFamily: minorFont, fontSize: "12px", color: `#${dk1}` }}>• Primary body text (dk1)</div>
            <div style={{ fontFamily: minorFont, fontSize: "12px", color: `#${dk2}` }}>• Secondary text (dk2)</div>
            {minorEastAsian && (
              <div style={{ fontFamily: minorEastAsian, fontSize: "12px", color: `#${dk1}` }}>
                • {minorEastAsian} テキスト
              </div>
            )}

            {/* Links */}
            <div style={{ fontFamily: minorFont, fontSize: "12px", marginTop: spacingTokens.xs }}>
              <span style={{ color: `#${hlink}`, textDecoration: "underline", cursor: "pointer" }}>Hyperlink</span>
              <span style={{ color: `#${dk2}`, margin: "0 6px" }}>|</span>
              <span style={{ color: `#${folHlink}`, textDecoration: "underline", cursor: "pointer" }}>
                Followed Link
              </span>
            </div>

            {/* Accent colored text samples */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: spacingTokens.sm }}>
              <span style={{ fontFamily: minorFont, fontSize: "11px", color: `#${accent1}` }}>Accent 1</span>
              <span style={{ fontFamily: minorFont, fontSize: "11px", color: `#${accent2}` }}>Accent 2</span>
              <span style={{ fontFamily: minorFont, fontSize: "11px", color: `#${accent3}` }}>Accent 3</span>
            </div>
          </div>

          {/* Right: Color palette visualization */}
          <div style={{ width: "100px", display: "flex", flexDirection: "column", gap: spacingTokens.xs }}>
            {/* Base colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${dk1}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>dk1</div>
              </div>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${lt1}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.2)",
                  }}
                />
                <div style={colorLabelStyle}>lt1</div>
              </div>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${dk2}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>dk2</div>
              </div>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${lt2}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>lt2</div>
              </div>
            </div>

            {/* Accent colors */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", marginTop: "4px" }}>
              {[accent1, accent2, accent3, accent4, accent5, accent6].map((c, i) => (
                <div key={i}>
                  <div
                    style={{
                      height: "16px",
                      backgroundColor: `#${c}`,
                      borderRadius: "3px",
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                  />
                  <div style={colorLabelStyle}>{i + 1}</div>
                </div>
              ))}
            </div>

            {/* Link colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginTop: "4px" }}>
              <div>
                <div
                  style={{
                    height: "14px",
                    backgroundColor: `#${hlink}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>hlink</div>
              </div>
              <div>
                <div
                  style={{
                    height: "14px",
                    backgroundColor: `#${folHlink}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>fol</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (lt2 background) */}
        <div
          style={{
            fontFamily: minorFont,
            fontSize: "10px",
            color: `#${dk2}`,
            backgroundColor: `#${lt2}`,
            padding: "6px 8px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Footer text on lt2 background</span>
          <span>Page 1</span>
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
  const handleLatinChange = useCallback(
    (v: string | number) => onChange({ latin: String(v) || undefined }),
    [onChange],
  );
  const handleEastAsianChange = useCallback(
    (v: string | number) => onChange({ eastAsian: String(v) || undefined }),
    [onChange],
  );
  const handleComplexScriptChange = useCallback(
    (v: string | number) => onChange({ complexScript: String(v) || undefined }),
    [onChange],
  );

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
        <Input
          value={complexScript}
          onChange={handleComplexScriptChange}
          placeholder="e.g., Arial"
          style={{ flex: 1 }}
        />
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

/** Graphical theme editor canvas with color palette, fonts, and presets */
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
  onThemeImport,
  presentationFile,
  layoutOptions = [],
  currentLayoutPath,
  slideSize,
  onLayoutSelect,
}: ThemeEditorCanvasProps) {
  const [colorViewMode, setColorViewMode] = useState<ColorViewMode>("tile");
  const [activeTab, setActiveTab] = useState<ThemeEditorTab>("colors");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseColors = useMemo(() => COLOR_CONFIGS.filter((c) => c.category === "base"), []);
  const accentColors = useMemo(() => COLOR_CONFIGS.filter((c) => c.category === "accent"), []);
  const linkColors = useMemo(() => COLOR_CONFIGS.filter((c) => c.category === "link"), []);

  const handleFileImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onThemeImport) {
        onThemeImport(file);
      }
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onThemeImport],
  );

  const renderColorItems = (colors: readonly ColorConfig[]) => {
    if (colorViewMode === "tile") {
      return (
        <div style={colorTileGridStyle}>
          {colors.map((config) => (
            <ColorTile key={config.name} config={config} color={colorScheme[config.name]} onChange={onColorChange} />
          ))}
        </div>
      );
    }

    return (
      <div style={colorListStyle}>
        {colors.map((config) => (
          <ColorListItem key={config.name} config={config} color={colorScheme[config.name]} onChange={onColorChange} />
        ))}
      </div>
    );
  };

  const renderColorSection = (title: string, colors: readonly ColorConfig[]) => (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      {renderColorItems(colors)}
    </div>
  );

  const renderMainContent = () => {
    if (activeTab === "colors") {
      return (
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
                <FontEditor
                  title="Major Font (Headings)"
                  fontSpec={fontScheme?.majorFont}
                  onChange={onMajorFontChange}
                />
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
      );
    }

    return (
      <LayoutEditor
        presentationFile={presentationFile}
        layoutOptions={layoutOptions}
        currentLayoutPath={currentLayoutPath}
        slideSize={slideSize}
        onLayoutSelect={onLayoutSelect}
        onImportTemplate={onThemeImport ? handleFileImportClick : undefined}
        colorScheme={colorScheme}
      />
    );
  };

  return (
    <div style={containerStyle}>
      {/* Hidden file input for theme import */}
      <input ref={fileInputRef} type="file" accept=".pptx" style={{ display: "none" }} onChange={handleFileChange} />

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

        {/* Tab Pivot */}
        <div style={pivotContainerStyle}>
          <button
            type="button"
            style={{
              ...pivotButtonBaseStyle,
              ...(activeTab === "colors" ? pivotButtonActiveStyle : {}),
            }}
            onClick={() => setActiveTab("colors")}
          >
            Colors & Fonts
          </button>
          <button
            type="button"
            style={{
              ...pivotButtonBaseStyle,
              ...(activeTab === "layouts" ? pivotButtonActiveStyle : {}),
            }}
            onClick={() => setActiveTab("layouts")}
          >
            Layouts
          </button>
        </div>

        <div style={{ flex: 1 }} />
        {onThemeImport && (
          <Button variant="ghost" size="sm" onClick={handleFileImportClick} title="Import theme from PPTX">
            <FolderIcon size={iconTokens.size.md} />
            <span style={{ marginLeft: spacingTokens.xs }}>Import</span>
          </Button>
        )}
        {onExport && (
          <Button variant="secondary" size="sm" onClick={onExport}>
            <DownloadIcon size={iconTokens.size.md} />
            <span style={{ marginLeft: spacingTokens.xs }}>Export</span>
          </Button>
        )}
      </div>

      {/* Main Content - Conditional based on active tab */}
      {renderMainContent()}
    </div>
  );
}
