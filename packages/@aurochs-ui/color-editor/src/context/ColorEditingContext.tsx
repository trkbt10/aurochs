/**
 * @file ColorEditingContext
 *
 * Unified context for color editing. Centralizes theme color resolution
 * and preset color provisioning across all color editors.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorScheme, ColorMap, ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { resolveColor } from "@aurochs-office/drawing-ml/domain/color-resolution";
import { SCHEME_COLOR_NAMES } from "@aurochs-office/drawing-ml/domain/color";
import { toReactHex } from "../adapters/color-value-adapter";

// =============================================================================
// Context types
// =============================================================================

export type ColorEditingContextValue = {
  /** Resolve a DrawingML Color to react-editor-ui hex format ("#rrggbb"). */
  readonly resolveToHex: (color: Color) => string;
  /** Preset colors derived from theme color scheme ("#rrggbb" format). */
  readonly presetColors: readonly string[];
  /** DrawingML ColorContext for resolveColor calls. */
  readonly colorContext: ColorContext;
};

const EMPTY_COLOR_CONTEXT: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

const DEFAULT_PRESETS = [
  "#000000", "#ffffff",
  "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#3b82f6",
  "#8b5cf6", "#ec4899",
];

const defaultContextValue: ColorEditingContextValue = {
  resolveToHex: (color: Color) => {
    const resolved = resolveColor(color, EMPTY_COLOR_CONTEXT);
    return toReactHex(resolved ?? "000000");
  },
  presetColors: DEFAULT_PRESETS,
  colorContext: EMPTY_COLOR_CONTEXT,
};

const ColorEditingCtx = createContext<ColorEditingContextValue>(defaultContextValue);

// =============================================================================
// Provider
// =============================================================================

export type ColorEditingProviderProps = {
  readonly colorScheme?: ColorScheme;
  readonly colorMap?: ColorMap;
  readonly children: ReactNode;
};

/** Build preset color list from a theme color scheme. */
function buildPresetColors(colorScheme: ColorScheme): readonly string[] {
  const presets: string[] = [];

  for (const name of SCHEME_COLOR_NAMES) {
    const hex = colorScheme[name];
    if (hex) {
      presets.push(toReactHex(hex));
    }
  }

  if (presets.length === 0) {
    return DEFAULT_PRESETS;
  }

  return presets;
}

/** Provides theme color information to descendant color editing components. */
export function ColorEditingProvider({
  colorScheme,
  colorMap,
  children,
}: ColorEditingProviderProps) {
  const colorContext = useMemo<ColorContext>(
    () => ({
      colorScheme: colorScheme ?? {},
      colorMap: colorMap ?? {},
    }),
    [colorScheme, colorMap],
  );

  const presetColors = useMemo(
    () => buildPresetColors(colorContext.colorScheme),
    [colorContext.colorScheme],
  );

  const value = useMemo<ColorEditingContextValue>(
    () => ({
      resolveToHex: (color: Color) => {
        const resolved = resolveColor(color, colorContext);
        return toReactHex(resolved ?? "000000");
      },
      presetColors,
      colorContext,
    }),
    [colorContext, presetColors],
  );

  return (
    <ColorEditingCtx value={value}>
      {children}
    </ColorEditingCtx>
  );
}

// =============================================================================
// Hook
// =============================================================================

/** Access the color editing context (theme resolution, presets). */
export function useColorEditing(): ColorEditingContextValue {
  return useContext(ColorEditingCtx);
}
