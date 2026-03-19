/**
 * @file Theme preset selector component
 *
 * Grid of theme presets with color palette previews.
 */

import { useCallback, type CSSProperties } from "react";
import type { ThemePreset } from "./types";
import { THEME_PRESETS } from "./presets/office-themes";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

export type ThemePresetSelectorProps = {
  readonly currentThemeId?: string;
  readonly onPresetSelect: (preset: ThemePreset) => void;
  readonly disabled?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
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

const presetNameStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
  textAlign: "center",
};

const fontInfoStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
  const majorLatin = preset.fontScheme.majorFont.latin ?? "";
  const minorLatin = preset.fontScheme.minorFont.latin ?? "";
  const fontLabel = majorLatin === minorLatin ? majorLatin : `${majorLatin} / ${minorLatin}`;

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
      <div style={presetNameStyle}>{preset.name}</div>
      {fontLabel && <div style={fontInfoStyle}>{fontLabel}</div>}
    </div>
  );
}

/**
 * Theme preset selector component.
 *
 * Displays a grid of theme presets with:
 * - Theme name
 * - Font scheme (majorFont.latin / minorFont.latin)
 * - Selection indicator
 *
 * Color details are displayed by ColorSchemeEditor in the Theme tab.
 */
export function ThemePresetSelector({ currentThemeId, onPresetSelect, disabled }: ThemePresetSelectorProps) {
  const handlePresetClick = useCallback(
    (preset: ThemePreset) => () => {
      onPresetSelect(preset);
    },
    [onPresetSelect],
  );

  return (
    <div style={containerStyle}>
      <OptionalPropertySection title="Theme Presets" defaultExpanded>
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
      </OptionalPropertySection>
    </div>
  );
}
