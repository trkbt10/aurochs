/**
 * @file ThemeSchemeEditorsSection — bundled theme color, font, and preset UI
 *
 * Groups a:clrScheme / a:fontScheme editors with an optional preset grid so PPTX, POTX,
 * and dev harnesses share one layout (single source of truth).
 */

import { ColorSchemeEditor, type ColorSchemeEditorProps } from "./ColorSchemeEditor";
import { FontSchemeEditor, type FontSchemeEditorProps } from "./FontSchemeEditor";
import { ThemePresetSelector, type ThemePresetSelectorProps } from "./ThemePresetSelector";

// =============================================================================
// Types
// =============================================================================

export type ThemeSchemeEditorsSectionProps = {
  /** Omit to hide preset grid */
  readonly presetSelector?: ThemePresetSelectorProps;
  readonly colorScheme: ColorSchemeEditorProps;
  readonly fontScheme: FontSchemeEditorProps;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Theme color list, theme fonts, and optionally Office-style preset cards.
 */
export function ThemeSchemeEditorsSection({
  presetSelector,
  colorScheme,
  fontScheme,
}: ThemeSchemeEditorsSectionProps) {
  return (
    <>
      {presetSelector !== undefined && <ThemePresetSelector {...presetSelector} />}
      <ColorSchemeEditor {...colorScheme} />
      <FontSchemeEditor {...fontScheme} />
    </>
  );
}
