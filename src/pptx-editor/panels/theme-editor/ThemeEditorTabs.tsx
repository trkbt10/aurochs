/**
 * @file Theme editor tabs component
 *
 * Tab container for theme editing mode with Colors, Fonts, and Presets tabs.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import type { ColorScheme } from "../../../pptx/domain/color/context";
import type { FontScheme, FontSpec } from "../../../pptx/domain/resolution";
import type { ThemePreset, SchemeColorName } from "./types";
import { ColorSchemeEditor } from "./ColorSchemeEditor";
import { FontSchemeEditor } from "./FontSchemeEditor";
import { ThemePresetSelector } from "./ThemePresetSelector";
import { Tabs, type TabItem } from "../../ui/primitives/Tabs";

export type ThemeEditorTabsProps = {
  readonly colorScheme: ColorScheme;
  readonly fontScheme?: FontScheme;
  readonly onColorChange: (name: SchemeColorName, color: string) => void;
  readonly onMajorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onMinorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onPresetSelect: (preset: ThemePreset) => void;
  readonly disabled?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  padding: "8px",
};

type ThemeTabId = "colors" | "fonts" | "presets";

/**
 * Theme editor tabs component.
 *
 * Provides three tabs for theme editing:
 * - Colors: Edit the 12 theme colors
 * - Fonts: Edit major and minor fonts
 * - Presets: Select from built-in theme presets
 */
export function ThemeEditorTabs({
  colorScheme,
  fontScheme,
  onColorChange,
  onMajorFontChange,
  onMinorFontChange,
  onPresetSelect,
  disabled,
}: ThemeEditorTabsProps) {
  const [activeTab, setActiveTab] = useState<ThemeTabId>("colors");

  const handleTabChange = useCallback((value: ThemeTabId) => {
    setActiveTab(value);
  }, []);

  const tabItems = useMemo<TabItem<ThemeTabId>[]>(() => [
    {
      id: "colors",
      label: "Colors",
      content: (
        <ColorSchemeEditor
          colorScheme={colorScheme}
          onColorChange={onColorChange}
          disabled={disabled}
        />
      ),
    },
    {
      id: "fonts",
      label: "Fonts",
      content: (
        <FontSchemeEditor
          fontScheme={fontScheme}
          onMajorFontChange={onMajorFontChange}
          onMinorFontChange={onMinorFontChange}
          disabled={disabled}
        />
      ),
    },
    {
      id: "presets",
      label: "Presets",
      content: (
        <ThemePresetSelector
          onPresetSelect={onPresetSelect}
          disabled={disabled}
        />
      ),
    },
  ], [colorScheme, fontScheme, onColorChange, onMajorFontChange, onMinorFontChange, onPresetSelect, disabled]);

  return (
    <div style={containerStyle}>
      <Tabs
        items={tabItems}
        value={activeTab}
        onChange={handleTabChange}
        size="sm"
      />
    </div>
  );
}
