/**
 * @file Theme editor reducer
 *
 * Handles theme-level state mutations and layout metadata CRUD.
 * Canvas interaction (selection, drag, text editing, undo/redo)
 * is delegated to PresentationEditorProvider from pptx-editor.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type {
  ThemeEditorState,
  ThemeEditorAction,
  LayoutEditState,
  LayoutListEntry,
} from "../types";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_COLOR_MAPPING } from "@aurochs-office/pptx/domain/color/types";
import { findShapeById, updateShapeById } from "@aurochs-ui/editor-controls/shape-editor";

// =============================================================================
// Initial State
// =============================================================================

/** Create the default empty layout editing state. */
export function createInitialLayoutEditState(): LayoutEditState {
  return {
    activeLayoutPath: undefined,
    layoutShapes: [],
    layoutBundle: undefined,
    isDirty: false,
    layouts: [],
  };
}

type InitialThemeOptions = {
  readonly colorScheme: ColorScheme;
  /** Required per ECMA-376 §20.1.6.10. */
  readonly fontScheme: FontScheme;
  readonly themeName?: string;
  readonly fontSchemeName?: string;
};

/** Create the initial theme editor state from the provided options. */
export function createInitialThemeEditorState({
  colorScheme,
  fontScheme,
  themeName,
  fontSchemeName,
}: InitialThemeOptions): ThemeEditorState {
  return {
    themeName: themeName ?? "Office Theme",
    colorScheme,
    fontScheme,
    fontSchemeName: fontSchemeName ?? "",
    masterBackground: undefined,
    masterColorMapping: DEFAULT_COLOR_MAPPING,
    formatScheme: undefined,
    customColors: [],
    extraColorSchemes: [],
    objectDefaults: undefined,
    masterTextStyles: undefined,
    layoutEdit: createInitialLayoutEditState(),
  };
}

// =============================================================================
// Helpers
// =============================================================================

function updateLayoutEdit(state: ThemeEditorState, updates: Partial<LayoutEditState>): ThemeEditorState {
  return {
    ...state,
    layoutEdit: {
      ...state.layoutEdit,
      ...updates,
    },
  };
}

function resetLayoutEditForDeletion(): Partial<LayoutEditState> {
  return {
    layoutShapes: [],
    layoutBundle: undefined,
    isDirty: false,
  };
}

function insertLayout(
  layouts: readonly LayoutListEntry[],
  layout: LayoutListEntry,
  atIndex?: number,
): readonly LayoutListEntry[] {
  if (atIndex !== undefined) {
    return [...layouts.slice(0, atIndex), layout, ...layouts.slice(atIndex)];
  }
  return [...layouts, layout];
}

function resolveActiveAfterDelete(options: {
  activeLayoutPath: string | undefined;
  deletedId: string;
  remaining: readonly LayoutListEntry[];
  deletedIndex: number;
}): string | undefined {
  const { activeLayoutPath, deletedId, remaining, deletedIndex } = options;
  if (activeLayoutPath !== deletedId) {
    return activeLayoutPath;
  }
  const safeIndex = Math.min(deletedIndex, remaining.length - 1);
  return remaining[safeIndex]?.id ?? undefined;
}

function updateLayoutById(
  layouts: readonly LayoutListEntry[],
  layoutId: string,
  updater: (layout: LayoutListEntry) => LayoutListEntry,
): readonly LayoutListEntry[] {
  return layouts.map((l) => (l.id === layoutId ? updater(l) : l));
}

// =============================================================================
// Reducer
// =============================================================================

/** Reducer that handles theme and layout metadata actions. */
export function themeEditorReducer(state: ThemeEditorState, action: ThemeEditorAction): ThemeEditorState {
  switch (action.type) {
    // ---- Theme editing — names ----
    case "UPDATE_THEME_NAME":
      return { ...state, themeName: action.name };

    case "UPDATE_FONT_SCHEME_NAME":
      return { ...state, fontSchemeName: action.name };

    // ---- Theme editing — color scheme ----
    case "UPDATE_COLOR_SCHEME":
      return { ...state, colorScheme: { ...state.colorScheme, [action.name]: action.color } };

    case "ADD_SCHEME_COLOR":
      return { ...state, colorScheme: { ...state.colorScheme, [action.name]: action.color } };

    case "REMOVE_SCHEME_COLOR": {
      const { [action.name]: _, ...rest } = state.colorScheme;
      return { ...state, colorScheme: rest as ColorScheme };
    }

    case "RENAME_SCHEME_COLOR": {
      const { [action.oldName]: color, ...rest } = state.colorScheme;
      return { ...state, colorScheme: { ...rest, [action.newName]: color } as ColorScheme };
    }

    // ---- Theme editing — font scheme ----
    case "UPDATE_FONT_SCHEME": {
      const target = action.target === "major" ? "majorFont" : "minorFont";
      return {
        ...state,
        fontScheme: {
          ...state.fontScheme,
          [target]: { ...state.fontScheme[target], ...action.spec },
        },
      };
    }

    case "APPLY_THEME_PRESET":
      return {
        ...state,
        colorScheme: action.preset.colorScheme,
        fontScheme: action.preset.fontScheme,
        themeName: action.preset.name ?? state.themeName,
      };

    // ---- Theme import ----
    case "IMPORT_THEME": {
      const t = action.theme;
      return {
        ...state,
        themeName: t.themeName,
        colorScheme: t.colorScheme,
        fontScheme: t.fontScheme,
        fontSchemeName: t.fontSchemeName ?? state.fontSchemeName,
        masterColorMapping: t.colorMapping ?? DEFAULT_COLOR_MAPPING,
        formatScheme: t.formatScheme ?? state.formatScheme,
        customColors: t.customColors ?? state.customColors,
        extraColorSchemes: t.extraColorSchemes ?? state.extraColorSchemes,
        objectDefaults: t.objectDefaults ?? state.objectDefaults,
        masterTextStyles: t.masterTextStyles ?? state.masterTextStyles,
        masterBackground: t.masterBackground,
      };
    }

    // ---- Master background & color mapping ----
    case "UPDATE_MASTER_BACKGROUND":
      return { ...state, masterBackground: action.background };

    case "UPDATE_MASTER_COLOR_MAPPING":
      return { ...state, masterColorMapping: action.mapping };

    // ---- Custom colors ----
    case "ADD_CUSTOM_COLOR":
      return { ...state, customColors: [...state.customColors, action.color] };

    case "REMOVE_CUSTOM_COLOR":
      return { ...state, customColors: state.customColors.filter((_, i) => i !== action.index) };

    case "UPDATE_CUSTOM_COLOR":
      return { ...state, customColors: state.customColors.map((c, i) => (i === action.index ? action.color : c)) };

    // ---- Extra color schemes ----
    case "ADD_EXTRA_COLOR_SCHEME":
      return { ...state, extraColorSchemes: [...state.extraColorSchemes, action.scheme] };

    case "REMOVE_EXTRA_COLOR_SCHEME":
      return { ...state, extraColorSchemes: state.extraColorSchemes.filter((_, i) => i !== action.index) };

    case "UPDATE_EXTRA_COLOR_SCHEME":
      return { ...state, extraColorSchemes: state.extraColorSchemes.map((s, i) => (i === action.index ? action.scheme : s)) };

    // ---- Format scheme, object defaults, master text styles ----
    case "UPDATE_FORMAT_SCHEME":
      return { ...state, formatScheme: action.formatScheme };

    case "UPDATE_OBJECT_DEFAULTS":
      return { ...state, objectDefaults: action.objectDefaults };

    case "UPDATE_MASTER_TEXT_STYLES":
      return { ...state, masterTextStyles: action.masterTextStyles };

    // ---- Layout overrides ----
    case "UPDATE_LAYOUT_BACKGROUND": {
      const layouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        overrides: { ...l.overrides, background: action.background },
      }));
      return updateLayoutEdit(state, { layouts });
    }

    case "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE": {
      const layouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        overrides: { ...l.overrides, colorMapOverride: action.override },
      }));
      return updateLayoutEdit(state, { layouts });
    }

    case "UPDATE_LAYOUT_TRANSITION": {
      const layouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        overrides: { ...l.overrides, transition: action.transition },
      }));
      return updateLayoutEdit(state, { layouts });
    }

    // ---- Layout selection & shape loading (metadata only) ----
    case "SELECT_LAYOUT":
      return updateLayoutEdit(state, {
        activeLayoutPath: action.layoutPath,
        layoutShapes: [],
        layoutBundle: undefined,
        isDirty: false,
      });

    case "LOAD_LAYOUT_SHAPES":
      return updateLayoutEdit(state, {
        layoutShapes: action.shapes,
        layoutBundle: action.bundle,
        isDirty: false,
      });

    // ---- Layout shape placeholder (potx-specific) ----
    case "UPDATE_LAYOUT_SHAPE_PLACEHOLDER": {
      const updated = updateShapeById(state.layoutEdit.layoutShapes, action.shapeId, (shape: Shape): Shape => {
        if (shape.type !== "sp") { return shape; }
        return { ...shape, placeholder: action.placeholder };
      });
      return updateLayoutEdit(state, { layoutShapes: updated, isDirty: true });
    }

    // ---- Layout CRUD ----
    case "INIT_LAYOUT_LIST": {
      return updateLayoutEdit(state, { layouts: action.layouts });
    }

    case "ADD_LAYOUT": {
      const layouts = insertLayout(state.layoutEdit.layouts, action.layout, action.atIndex);
      return updateLayoutEdit(state, { layouts });
    }

    case "DELETE_LAYOUT": {
      const idx = state.layoutEdit.layouts.findIndex((l) => l.id === action.layoutId);
      if (idx === -1) { return state; }
      const remaining = state.layoutEdit.layouts.filter((l) => l.id !== action.layoutId);
      const newActive = resolveActiveAfterDelete({
        activeLayoutPath: state.layoutEdit.activeLayoutPath,
        deletedId: action.layoutId,
        remaining,
        deletedIndex: idx,
      });
      const isActiveDeleted = state.layoutEdit.activeLayoutPath === action.layoutId;
      return updateLayoutEdit(state, {
        layouts: remaining,
        activeLayoutPath: newActive,
        ...(isActiveDeleted ? resetLayoutEditForDeletion() : {}),
      });
    }

    case "DUPLICATE_LAYOUT": {
      const source = state.layoutEdit.layouts.find((l) => l.id === action.layoutId);
      if (!source) { return state; }
      const idx = state.layoutEdit.layouts.indexOf(source);
      const newId = `${source.id}_copy_${Date.now()}`;
      const copy: LayoutListEntry = { ...source, id: newId, name: `${source.name} (Copy)` };
      const layouts = insertLayout(state.layoutEdit.layouts, copy, idx + 1);
      return updateLayoutEdit(state, { layouts });
    }

    case "REORDER_LAYOUTS": {
      const mutable = [...state.layoutEdit.layouts];
      const fromIndex = mutable.findIndex((l) => l.id === action.layoutId);
      if (fromIndex === -1) { return state; }
      const [item] = mutable.splice(fromIndex, 1);
      mutable.splice(action.toIndex, 0, item);
      return updateLayoutEdit(state, { layouts: mutable });
    }

    case "UPDATE_LAYOUT_ATTRIBUTES": {
      const layouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        ...action.updates,
      }));
      return updateLayoutEdit(state, { layouts });
    }

    // ---- Shape sync from PresentationEditorContext ----
    case "SYNC_LAYOUT_SHAPES": {
      if (action.layoutId !== state.layoutEdit.activeLayoutPath) { return state; }
      return updateLayoutEdit(state, { layoutShapes: action.shapes, isDirty: true });
    }

    default:
      return state;
  }
}
