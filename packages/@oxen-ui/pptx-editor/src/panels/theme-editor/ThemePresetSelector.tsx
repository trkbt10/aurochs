/**
 * @file Theme preset selector component
 *
 * Grid of theme presets with color palette previews.
 */

import { useCallback, type CSSProperties } from "react";
import type { ThemePreset } from "./types";
import { THEME_PRESETS } from "./presets";
import { InspectorSection } from "@oxen-ui/ui-components/layout";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@oxen-ui/ui-components/design-tokens";

export type ThemePresetSelectorProps = {
  readonly currentThemeId?: string;
  readonly onPresetSelect: (preset: ThemePreset) => void;
  readonly disabled?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: spacingTokens.md,
  padding: spacingTokens.sm,
};

const presetCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
  borderRadius: radiusTokens.md,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  cursor: "pointer",
  transition: "all 150ms ease",
};

const presetCardSelectedStyle: CSSProperties = {
  ...presetCardStyle,
  borderColor: `var(--accent-primary, ${colorTokens.accent.primary})`,
  borderWidth: "2px",
};

const presetCardHoverStyle: CSSProperties = {
  borderColor: `var(--border-focus, ${colorTokens.border.subtle})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
};

const presetNameStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
  textAlign: "center",
};

const colorPaletteStyle: CSSProperties = {
  display: "flex",
  gap: "2px",
  height: "24px",
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
};

const colorSwatchStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

type PresetCardProps = {
  readonly preset: ThemePreset;
  readonly isSelected: boolean;
  readonly onClick: () => void;
  readonly disabled?: boolean;
};

function PresetCard({ preset, isSelected, onClick, disabled }: PresetCardProps) {
  const accentColors = [
    preset.colorScheme.accent1,
    preset.colorScheme.accent2,
    preset.colorScheme.accent3,
    preset.colorScheme.accent4,
    preset.colorScheme.accent5,
    preset.colorScheme.accent6,
  ];

  const cardStyle: CSSProperties = {
    ...(isSelected ? presetCardSelectedStyle : presetCardStyle),
    ...(disabled ? disabledStyle : {}),
  };

  return (
    <div
      style={cardStyle}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={colorPaletteStyle}>
        {accentColors.map((color, index) => (
          <div
            key={index}
            style={{
              ...colorSwatchStyle,
              backgroundColor: `#${color}`,
            }}
          />
        ))}
      </div>
      <div style={presetNameStyle}>{preset.name}</div>
    </div>
  );
}

/**
 * Theme preset selector component.
 *
 * Displays a grid of theme presets with:
 * - Color palette preview (6 accent colors)
 * - Theme name
 * - Selection indicator
 */
export function ThemePresetSelector({
  currentThemeId,
  onPresetSelect,
  disabled,
}: ThemePresetSelectorProps) {
  const handlePresetClick = useCallback(
    (preset: ThemePreset) => () => {
      onPresetSelect(preset);
    },
    [onPresetSelect]
  );

  return (
    <div style={containerStyle}>
      <InspectorSection title="Theme Presets">
        <div style={gridStyle}>
          {THEME_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={currentThemeId === preset.id}
              onClick={handlePresetClick(preset)}
              disabled={disabled}
            />
          ))}
        </div>
      </InspectorSection>
    </div>
  );
}
