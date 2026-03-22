/**
 * @file Theme preset selector component
 *
 * Grid of theme presets with color palette previews.
 * Card styling follows LayoutInfoPanel convention (transparent bg, 2px border, accent tint).
 */

import { useCallback, type CSSProperties } from "react";
import type { ThemePreset } from "./theme-types";
import { THEME_PRESETS } from "./presets/office-themes";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

export type ThemePresetSelectorProps = {
  readonly currentThemeId?: string;
  readonly onPresetSelect: (preset: ThemePreset) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles — follows LayoutInfoPanel card convention
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

/** Base card: transparent bg, 2px invisible border (reserves space for selected state) */
const cardBaseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: spacingTokens.xs,
  borderRadius: radiusTokens.md,
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  border: `2px solid transparent`,
  backgroundColor: "transparent",
};

/** Selected card: accent border + accent tint background */
const cardSelectedStyle: CSSProperties = {
  ...cardBaseStyle,
  backgroundColor: `var(--accent-primary, ${colorTokens.accent.primary})20`,
  borderColor: `var(--accent-primary, ${colorTokens.accent.primary})`,
};

const presetNameStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
  width: "100%",
  marginTop: spacingTokens.xs,
};

const paletteRowStyle: CSSProperties = {
  display: "flex",
  gap: "1px",
  width: "100%",
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

// =============================================================================
// Helpers
// =============================================================================

/** Accent color keys shown as palette swatches */
const PALETTE_KEYS = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"] as const;

/** Resolve border-radius for first/last swatch in the palette row. */
function getSwatchRadius(key: string): string | undefined {
  if (key === "accent1") { return `${radiusTokens.sm} 0 0 ${radiusTokens.sm}`; }
  if (key === "accent6") { return `0 ${radiusTokens.sm} ${radiusTokens.sm} 0`; }
  return undefined;
}

// =============================================================================
// PresetCard
// =============================================================================

type PresetCardProps = {
  readonly preset: ThemePreset;
  readonly isSelected: boolean;
  readonly onClick: () => void;
  readonly disabled?: boolean;
};

/** Single preset card with color palette swatches and theme name. */
function PresetCard({ preset, isSelected, onClick, disabled }: PresetCardProps) {
  const cardStyle: CSSProperties = {
    ...(isSelected ? cardSelectedStyle : cardBaseStyle),
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
      <div style={paletteRowStyle}>
        {PALETTE_KEYS.map((key) => (
          <div
            key={key}
            style={{
              flex: 1,
              height: spacingTokens.lg,
              backgroundColor: `#${preset.colorScheme[key]}`,
              borderRadius: getSwatchRadius(key),
            }}
          />
        ))}
      </div>
      <div style={presetNameStyle}>{preset.name}</div>
    </div>
  );
}

// =============================================================================
// ThemePresetSelector
// =============================================================================

/**
 * Theme preset selector component.
 *
 * Displays a 2-column grid of theme presets with:
 * - Color palette swatches (accent1-6)
 * - Theme name
 * - Selection indicator (accent border + tint)
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
      <OptionalPropertySection title="Theme Presets" defaultExpanded={false}>
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
