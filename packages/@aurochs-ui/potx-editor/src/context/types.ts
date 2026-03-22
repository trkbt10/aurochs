/**
 * @file Theme editor state types
 *
 * State types for the potx-editor (theme template editor).
 * Canvas interaction state (selection, drag, text editing, undo/redo) is
 * managed by PresentationEditorProvider from pptx-editor.
 * This module only defines theme-level and layout-metadata state.
 */

import type { Shape, SlideLayoutType, SlideSize, Placeholder, Background } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { SlideLayoutBundle, SlideLayoutOption } from "@aurochs-office/pptx/app";
import type { PackageFile } from "@aurochs-office/opc";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme, FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { ColorMapping, ColorMapOverride } from "@aurochs-office/pptx/domain/color/types";
import type { CustomColor, ExtraColorScheme, FormatScheme, ObjectDefaults } from "@aurochs-office/pptx/domain/theme/types";
import type { MasterTextStyles } from "@aurochs-office/pptx/domain/text-style";
import type { ThemePreset } from "@aurochs-ui/ooxml-components/presentation-theme-layout";

// =============================================================================
// Layout Entry Types
// =============================================================================

/**
 * Layout list entry - metadata for a slide layout in the presentation
 */
export type LayoutListEntry = {
  readonly id: string;
  readonly name: string;
  readonly type: SlideLayoutType;
  readonly matchingName?: string;
  readonly showMasterShapes?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
  readonly overrides?: LayoutOverrides;
};

// =============================================================================
// Layout Edit State (reduced — canvas interaction delegated to PresentationEditorContext)
// =============================================================================

/**
 * Layout editing state — metadata and loaded shapes only.
 * Selection, drag, text editing, undo/redo are handled by PresentationEditorProvider.
 */
export type LayoutEditState = {
  readonly activeLayoutPath: string | undefined;
  readonly layoutShapes: readonly Shape[];
  readonly layoutBundle: SlideLayoutBundle | undefined;
  readonly isDirty: boolean;
  readonly layouts: readonly LayoutListEntry[];
};

// =============================================================================
// Theme Editor State
// =============================================================================

/**
 * Complete theme editor state
 */
export type ThemeEditorState = {
  readonly themeName: string;
  readonly colorScheme: ColorScheme;
  /** Required per ECMA-376 §20.1.6.10. */
  readonly fontScheme: FontScheme;
  readonly fontSchemeName: string;
  readonly formatScheme: FormatScheme | undefined;
  readonly customColors: readonly CustomColor[];
  readonly extraColorSchemes: readonly ExtraColorScheme[];
  readonly objectDefaults: ObjectDefaults | undefined;
  readonly masterTextStyles: MasterTextStyles | undefined;
  /**
   * Master background §19.3.1.2 — Background domain type as SoT.
   * Parsed from XmlElement via parseBackground(element, formatScheme) on import.
   * Serialized back to XML only on export.
   */
  readonly masterBackground: Background | undefined;
  readonly masterColorMapping: ColorMapping;
  readonly layoutEdit: LayoutEditState;
};

/**
 * Per-layout override state for background and color map
 */
export type LayoutOverrides = {
  readonly background?: Background;
  readonly colorMapOverride?: ColorMapOverride;
  readonly transition?: SlideTransition;
};

// =============================================================================
// Imported Theme Data
// =============================================================================

/**
 * Data for replacing all theme fields from an imported .potx file.
 * Maps from ExtractedTheme to editor state fields.
 */
export type ImportedThemeData = {
  readonly themeName: string;
  readonly colorScheme: ColorScheme;
  /** Required per ECMA-376 §20.1.6.10. */
  readonly fontScheme: FontScheme;
  readonly fontSchemeName?: string;
  readonly colorMapping?: ColorMapping;
  readonly formatScheme?: FormatScheme;
  readonly customColors?: readonly CustomColor[];
  readonly extraColorSchemes?: readonly ExtraColorScheme[];
  readonly objectDefaults?: ObjectDefaults;
  readonly masterTextStyles?: MasterTextStyles;
  /** Master background §19.3.1.2 — Background domain type (parsed by extractThemeFromBuffer). */
  readonly masterBackground?: Background;
};

// =============================================================================
// Theme Editor Actions
// =============================================================================

export type ThemeEditorAction =
  // Theme editing — color scheme
  | { readonly type: "UPDATE_COLOR_SCHEME"; readonly name: string; readonly color: string }
  | { readonly type: "ADD_SCHEME_COLOR"; readonly name: string; readonly color: string }
  | { readonly type: "REMOVE_SCHEME_COLOR"; readonly name: string }
  | { readonly type: "RENAME_SCHEME_COLOR"; readonly oldName: string; readonly newName: string }
  // Theme editing — names
  | { readonly type: "UPDATE_THEME_NAME"; readonly name: string }
  | { readonly type: "UPDATE_FONT_SCHEME_NAME"; readonly name: string }
  // Theme editing — font scheme & presets
  | { readonly type: "UPDATE_FONT_SCHEME"; readonly target: "major" | "minor"; readonly spec: Partial<FontSpec> }
  | { readonly type: "APPLY_THEME_PRESET"; readonly preset: ThemePreset }
  // Theme import (full replacement from .potx file)
  | { readonly type: "IMPORT_THEME"; readonly theme: ImportedThemeData }
  // Theme editing — custom colors
  | { readonly type: "ADD_CUSTOM_COLOR"; readonly color: CustomColor }
  | { readonly type: "REMOVE_CUSTOM_COLOR"; readonly index: number }
  | { readonly type: "UPDATE_CUSTOM_COLOR"; readonly index: number; readonly color: CustomColor }
  // Theme editing — extra color schemes
  | { readonly type: "ADD_EXTRA_COLOR_SCHEME"; readonly scheme: ExtraColorScheme }
  | { readonly type: "REMOVE_EXTRA_COLOR_SCHEME"; readonly index: number }
  | { readonly type: "UPDATE_EXTRA_COLOR_SCHEME"; readonly index: number; readonly scheme: ExtraColorScheme }
  // Theme editing — format scheme, object defaults, master text styles
  | { readonly type: "UPDATE_FORMAT_SCHEME"; readonly formatScheme: FormatScheme }
  | { readonly type: "UPDATE_OBJECT_DEFAULTS"; readonly objectDefaults: ObjectDefaults }
  | { readonly type: "UPDATE_MASTER_TEXT_STYLES"; readonly masterTextStyles: MasterTextStyles }
  // Theme editing — master background & color map
  | { readonly type: "UPDATE_MASTER_BACKGROUND"; readonly background: Background | undefined }
  | { readonly type: "UPDATE_MASTER_COLOR_MAPPING"; readonly mapping: ColorMapping }
  // Layout overrides
  | { readonly type: "UPDATE_LAYOUT_BACKGROUND"; readonly layoutId: string; readonly background: Background | undefined }
  | { readonly type: "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE"; readonly layoutId: string; readonly override: ColorMapOverride }
  | { readonly type: "UPDATE_LAYOUT_TRANSITION"; readonly layoutId: string; readonly transition: SlideTransition | undefined }

  // Layout selection & shape loading (metadata operations — not canvas interaction)
  | { readonly type: "SELECT_LAYOUT"; readonly layoutPath: string }
  | { readonly type: "LOAD_LAYOUT_SHAPES"; readonly layoutPath: string; readonly shapes: readonly Shape[]; readonly bundle: SlideLayoutBundle }

  // Layout shape placeholder (potx-specific concern)
  | { readonly type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER"; readonly shapeId: ShapeId; readonly placeholder: Placeholder | undefined }

  // Layout CRUD
  | { readonly type: "INIT_LAYOUT_LIST"; readonly layouts: readonly LayoutListEntry[] }
  | { readonly type: "ADD_LAYOUT"; readonly layout: LayoutListEntry; readonly atIndex?: number }
  | { readonly type: "DELETE_LAYOUT"; readonly layoutId: string }
  | { readonly type: "DUPLICATE_LAYOUT"; readonly layoutId: string }
  | { readonly type: "REORDER_LAYOUTS"; readonly layoutId: string; readonly toIndex: number }
  | { readonly type: "UPDATE_LAYOUT_ATTRIBUTES"; readonly layoutId: string; readonly updates: Partial<Omit<LayoutListEntry, "id">> }

  // Layout shape sync (from PresentationEditorContext back to theme state)
  | { readonly type: "SYNC_LAYOUT_SHAPES"; readonly layoutId: string; readonly shapes: readonly Shape[] };

// =============================================================================
// Context Props
// =============================================================================

/**
 * Props for initializing the theme editor
 */
export type ThemeEditorInitProps = {
  readonly presentationFile?: PackageFile;
  readonly slideSize: SlideSize;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly themeName?: string;
  readonly colorScheme: ColorScheme;
  /** Required per ECMA-376 §20.1.6.10. */
  readonly fontScheme: FontScheme;
  readonly fontSchemeName?: string;
};
