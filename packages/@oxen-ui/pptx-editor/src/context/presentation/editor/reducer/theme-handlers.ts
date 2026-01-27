/**
 * @file Theme handlers
 *
 * Handlers for theme editing actions: editor mode, color scheme, font scheme.
 */

import type {
  PresentationEditorState,
  PresentationEditorAction,
  EditorMode,
} from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../../slide/state";
import type { PresentationDocument } from "@oxen/pptx/app";
import type { ThemePreset } from "../../../../panels/theme-editor/types";
import type { SchemeColorName } from "@oxen/ooxml/domain/color";
import type { FontSpec } from "@oxen/pptx/domain/resolution";

type SetEditorModeAction = Extract<
  PresentationEditorAction,
  { type: "SET_EDITOR_MODE" }
>;

type UpdateColorSchemeAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_COLOR_SCHEME" }
>;

type UpdateFontSchemeAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_FONT_SCHEME" }
>;

type ApplyThemePresetAction = Extract<
  PresentationEditorAction,
  { type: "APPLY_THEME_PRESET" }
>;

/**
 * Handle SET_EDITOR_MODE action
 */
function handleSetEditorMode(
  state: PresentationEditorState,
  action: SetEditorModeAction
): PresentationEditorState {
  if (state.editorMode === action.mode) {
    return state;
  }
  return {
    ...state,
    editorMode: action.mode,
  };
}

/**
 * Update color scheme in document
 */
function updateDocumentColorScheme(
  doc: PresentationDocument,
  name: SchemeColorName,
  color: string
): PresentationDocument {
  return {
    ...doc,
    colorContext: {
      ...doc.colorContext,
      colorScheme: {
        ...doc.colorContext.colorScheme,
        [name]: color,
      },
    },
  };
}

/**
 * Handle UPDATE_COLOR_SCHEME action
 */
function handleUpdateColorScheme(
  state: PresentationEditorState,
  action: UpdateColorSchemeAction
): PresentationEditorState {
  const currentDoc = state.documentHistory.present;
  const newDoc = updateDocumentColorScheme(currentDoc, action.name, action.color);
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * Update font scheme in document
 */
function updateDocumentFontScheme(
  doc: PresentationDocument,
  target: "major" | "minor",
  spec: Partial<FontSpec>
): PresentationDocument {
  const currentFontScheme = doc.fontScheme ?? {
    majorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
  };

  const targetKey = target === "major" ? "majorFont" : "minorFont";
  const updatedFont = {
    ...currentFontScheme[targetKey],
    ...spec,
  };

  return {
    ...doc,
    fontScheme: {
      ...currentFontScheme,
      [targetKey]: updatedFont,
    },
  };
}

/**
 * Handle UPDATE_FONT_SCHEME action
 */
function handleUpdateFontScheme(
  state: PresentationEditorState,
  action: UpdateFontSchemeAction
): PresentationEditorState {
  const currentDoc = state.documentHistory.present;
  const newDoc = updateDocumentFontScheme(currentDoc, action.target, action.spec);
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * Apply theme preset to document
 */
function applyThemePresetToDocument(
  doc: PresentationDocument,
  preset: ThemePreset
): PresentationDocument {
  return {
    ...doc,
    colorContext: {
      ...doc.colorContext,
      colorScheme: { ...preset.colorScheme },
    },
    fontScheme: {
      majorFont: { ...preset.fontScheme.majorFont },
      minorFont: { ...preset.fontScheme.minorFont },
    },
  };
}

/**
 * Handle APPLY_THEME_PRESET action
 */
function handleApplyThemePreset(
  state: PresentationEditorState,
  action: ApplyThemePresetAction
): PresentationEditorState {
  const currentDoc = state.documentHistory.present;
  const newDoc = applyThemePresetToDocument(currentDoc, action.preset);
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * Theme handlers
 */
export const THEME_HANDLERS: HandlerMap = {
  SET_EDITOR_MODE: handleSetEditorMode,
  UPDATE_COLOR_SCHEME: handleUpdateColorScheme,
  UPDATE_FONT_SCHEME: handleUpdateFontScheme,
  APPLY_THEME_PRESET: handleApplyThemePreset,
};
