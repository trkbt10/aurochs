/**
 * @file Theme editor reducer
 *
 * Standalone reducer for the potx-editor theme/layout editing state.
 * Uses editor-controls generic shape utilities for bounds/center calculations.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { Degrees } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type {
  ThemeEditorState,
  ThemeEditorAction,
  LayoutEditState,
  LayoutListEntry,
} from "../types";
import { createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { createHistory, pushHistory, undoHistory, redoHistory } from "@aurochs-ui/editor-core/history";
import { findShapeById, updateShapeById } from "@aurochs-ui/editor-controls/shape-editor";
import { collectBoundsForIds, getCombinedCenter } from "@aurochs-ui/editor-controls/shape-editor";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { pptxGetTransform, withUpdatedTransform } from "./pptx-transform";

// =============================================================================
// Initial State
// =============================================================================

/** Create the default empty layout editing state. */
export function createInitialLayoutEditState(): LayoutEditState {
  return {
    activeLayoutPath: undefined,
    layoutShapes: [],
    layoutBundle: undefined,
    layoutSelection: createEmptySelection<ShapeId>(),
    layoutDrag: { type: "idle" },
    isDirty: false,
    layouts: [],
    shapesHistory: createHistory<readonly Shape[]>([]),
  };
}

type InitialThemeOptions = {
  readonly colorScheme: ColorScheme;
  readonly fontScheme?: FontScheme;
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
    masterBackground: {},
    masterColorMapping: {
      bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2",
      accent1: "accent1", accent2: "accent2", accent3: "accent3",
      accent4: "accent4", accent5: "accent5", accent6: "accent6",
      hlink: "hlink", folHlink: "folHlink",
    },
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
    layoutSelection: createEmptySelection<ShapeId>(),
    layoutDrag: { type: "idle" },
    isDirty: false,
    shapesHistory: createHistory<readonly Shape[]>([]),
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
  return layouts.map((l) => {
    if (l.id === layoutId) {
      return updater(l);
    }
    return l;
  });
}

/**
 * Collect bounds using the generic utility with PPTX transform resolver.
 */
function collectLayoutBounds(shapes: readonly Shape[], ids: readonly ShapeId[]) {
  return collectBoundsForIds(shapes, ids, pptxGetTransform);
}

/**
 * Get combined bounding box from a bounds map.
 */
function getCombinedBoundsFromMap(
  boundsMap: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>,
): { x: number; y: number; width: number; height: number } | undefined {
  if (boundsMap.size === 0) {return undefined;}
  const values = Array.from(boundsMap.values());
  const minX = Math.min(...values.map((b) => b.x));
  const minY = Math.min(...values.map((b) => b.y));
  const maxX = Math.max(...values.map((b) => b.x + b.width));
  const maxY = Math.max(...values.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// =============================================================================
// Reducer
// =============================================================================

/** Reducer that handles all theme and layout editing actions. */
export function themeEditorReducer(state: ThemeEditorState, action: ThemeEditorAction): ThemeEditorState {
  switch (action.type) {
    // ---- Theme editing — names ----
    case "UPDATE_THEME_NAME":
      return { ...state, themeName: action.name };

    case "UPDATE_FONT_SCHEME_NAME":
      return { ...state, fontSchemeName: action.name };

    // ---- Theme editing — colors ----
    case "UPDATE_COLOR_SCHEME":
      return {
        ...state,
        colorScheme: { ...state.colorScheme, [action.name]: action.color },
      };

    case "ADD_SCHEME_COLOR":
      return {
        ...state,
        colorScheme: { ...state.colorScheme, [action.name]: action.color },
      };

    case "REMOVE_SCHEME_COLOR": {
      const { [action.name]: _, ...rest } = state.colorScheme;
      return { ...state, colorScheme: rest };
    }

    case "RENAME_SCHEME_COLOR": {
      const { [action.oldName]: colorValue, ...rest } = state.colorScheme;
      if (colorValue === undefined) {return state;}
      return { ...state, colorScheme: { ...rest, [action.newName]: colorValue } };
    }

    case "UPDATE_FONT_SCHEME": {
      if (!state.fontScheme) {return state;}
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
      };

    // ---- Master background & color map ----
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
      const newLayouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        overrides: { ...l.overrides, background: action.background },
      }));
      return updateLayoutEdit(state, { layouts: newLayouts });
    }

    case "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE": {
      const newLayouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        overrides: { ...l.overrides, colorMapOverride: action.override },
      }));
      return updateLayoutEdit(state, { layouts: newLayouts });
    }

    case "UPDATE_LAYOUT_TRANSITION": {
      const newLayouts = updateLayoutById(state.layoutEdit.layouts, action.layoutId, (l) => ({
        ...l,
        overrides: { ...l.overrides, transition: action.transition },
      }));
      return updateLayoutEdit(state, { layouts: newLayouts });
    }

    // ---- Layout selection ----
    case "SELECT_LAYOUT":
      return updateLayoutEdit(state, {
        activeLayoutPath: action.layoutPath,
        layoutShapes: [],
        layoutBundle: undefined,
        layoutSelection: createEmptySelection<ShapeId>(),
        layoutDrag: { type: "idle" },
        isDirty: false,
        shapesHistory: createHistory<readonly Shape[]>([]),
      });

    case "LOAD_LAYOUT_SHAPES":
      if (state.layoutEdit.activeLayoutPath !== action.layoutPath) {return state;}
      return updateLayoutEdit(state, {
        layoutShapes: action.shapes,
        layoutBundle: action.bundle,
        isDirty: false,
        shapesHistory: createHistory(action.shapes),
      });

    // ---- Layout shape selection ----
    case "SELECT_LAYOUT_SHAPE": {
      const { layoutSelection } = state.layoutEdit;
      const isAlreadySelected = layoutSelection.selectedIds.includes(action.shapeId);

      if (action.addToSelection) {
        if (action.toggle && isAlreadySelected) {
          const newSelectedIds = layoutSelection.selectedIds.filter((id) => id !== action.shapeId);
          return updateLayoutEdit(state, {
            layoutSelection: { selectedIds: newSelectedIds, primaryId: newSelectedIds[0] },
          });
        }
        if (isAlreadySelected) {
          return updateLayoutEdit(state, {
            layoutSelection: { ...layoutSelection, primaryId: action.shapeId },
          });
        }
        return updateLayoutEdit(state, {
          layoutSelection: {
            selectedIds: [...layoutSelection.selectedIds, action.shapeId],
            primaryId: action.shapeId,
          },
        });
      }
      return updateLayoutEdit(state, {
        layoutSelection: { selectedIds: [action.shapeId], primaryId: action.shapeId },
      });
    }

    case "SELECT_MULTIPLE_LAYOUT_SHAPES":
      return updateLayoutEdit(state, {
        layoutSelection: {
          selectedIds: action.shapeIds,
          primaryId: action.primaryId ?? action.shapeIds[0],
        },
      });

    case "CLEAR_LAYOUT_SHAPE_SELECTION":
      return updateLayoutEdit(state, {
        layoutSelection: createEmptySelection<ShapeId>(),
      });

    // ---- Layout drag start ----
    case "START_LAYOUT_MOVE": {
      const { layoutShapes, layoutSelection } = state.layoutEdit;
      if (layoutSelection.selectedIds.length === 0) {return state;}
      const initialBounds = collectLayoutBounds(layoutShapes as Shape[], layoutSelection.selectedIds);
      return updateLayoutEdit(state, {
        layoutDrag: {
          type: "move",
          startX: action.startX,
          startY: action.startY,
          shapeIds: layoutSelection.selectedIds,
          initialBounds,
          previewDelta: { dx: px(0), dy: px(0) },
        },
      });
    }

    case "START_LAYOUT_RESIZE": {
      const { layoutShapes, layoutSelection } = state.layoutEdit;
      const selectedIds = layoutSelection.selectedIds;
      if (selectedIds.length === 0) {return state;}
      const initialBoundsMap = collectLayoutBounds(layoutShapes as Shape[], selectedIds);
      const combinedBounds = getCombinedBoundsFromMap(initialBoundsMap);
      if (!combinedBounds) {return state;}
      const primaryId = layoutSelection.primaryId ?? selectedIds[0];
      const primaryBounds = initialBoundsMap.get(primaryId);
      return updateLayoutEdit(state, {
        layoutDrag: {
          type: "resize",
          handle: action.handle,
          startX: action.startX,
          startY: action.startY,
          shapeIds: selectedIds,
          initialBoundsMap,
          combinedBounds,
          aspectLocked: action.aspectLocked,
          shapeId: primaryId,
          initialBounds: primaryBounds ?? combinedBounds,
          previewDelta: { dx: px(0), dy: px(0) },
        },
      });
    }

    case "START_LAYOUT_ROTATE": {
      const { layoutShapes, layoutSelection } = state.layoutEdit;
      const selectedIds = layoutSelection.selectedIds;
      if (selectedIds.length === 0) {return state;}
      const initialBoundsMap = collectLayoutBounds(layoutShapes as Shape[], selectedIds);
      const centerResult = getCombinedCenter(initialBoundsMap);
      if (!centerResult) {return state;}
      const initialRotationsMap = new Map<string, Degrees>();
      for (const id of selectedIds) {
        const transform = pptxGetTransform(findShapeById(layoutShapes, id)!);
        if (transform) {
          initialRotationsMap.set(id, deg(transform.rotation));
        }
      }
      const primaryId = layoutSelection.primaryId ?? selectedIds[0];
      const primaryTransform = pptxGetTransform(findShapeById(layoutShapes, primaryId)!);
      const dxAngle = (action.startX as number) - centerResult.centerX;
      const dyAngle = (action.startY as number) - centerResult.centerY;
      const startAngle = deg(Math.atan2(dyAngle, dxAngle) * (180 / Math.PI));
      return updateLayoutEdit(state, {
        layoutDrag: {
          type: "rotate",
          startAngle,
          shapeIds: selectedIds,
          initialRotationsMap,
          initialBoundsMap,
          centerX: px(centerResult.centerX),
          centerY: px(centerResult.centerY),
          shapeId: primaryId,
          initialRotation: primaryTransform ? deg(primaryTransform.rotation) : deg(0),
          previewAngleDelta: deg(0),
        },
      });
    }

    // ---- Layout drag preview ----
    case "PREVIEW_LAYOUT_MOVE":
      if (state.layoutEdit.layoutDrag.type !== "move") {return state;}
      return updateLayoutEdit(state, {
        layoutDrag: { ...state.layoutEdit.layoutDrag, previewDelta: { dx: action.dx, dy: action.dy } },
      });

    case "PREVIEW_LAYOUT_RESIZE":
      if (state.layoutEdit.layoutDrag.type !== "resize") {return state;}
      return updateLayoutEdit(state, {
        layoutDrag: { ...state.layoutEdit.layoutDrag, previewDelta: { dx: action.dx, dy: action.dy } },
      });

    case "PREVIEW_LAYOUT_ROTATE":
      if (state.layoutEdit.layoutDrag.type !== "rotate") {return state;}
      return updateLayoutEdit(state, {
        layoutDrag: {
          ...state.layoutEdit.layoutDrag,
          previewAngleDelta: deg((action.currentAngle as number) - (state.layoutEdit.layoutDrag.startAngle as number)),
        },
      });

    // ---- Layout drag commit ----
    case "COMMIT_LAYOUT_DRAG":
      return commitLayoutDrag(state);

    case "END_LAYOUT_DRAG":
      return updateLayoutEdit(state, { layoutDrag: { type: "idle" } });

    // ---- Layout shape mutation ----
    case "DELETE_LAYOUT_SHAPES": {
      const idsToDelete = new Set(action.shapeIds);
      const newShapes = (state.layoutEdit.layoutShapes as Shape[]).filter(
        (s) => s.type === "contentPart" || !idsToDelete.has(s.nonVisual.id),
      );
      return updateLayoutEdit(state, {
        layoutShapes: newShapes,
        shapesHistory: pushHistory(state.layoutEdit.shapesHistory, newShapes),
        layoutSelection: createEmptySelection<ShapeId>(),
        isDirty: true,
      });
    }

    case "ADD_LAYOUT_SHAPE": {
      const newShapes = [...(state.layoutEdit.layoutShapes as Shape[]), action.shape];
      const shapeId = action.shape.type !== "contentPart" ? action.shape.nonVisual.id : undefined;
      return updateLayoutEdit(state, {
        layoutShapes: newShapes,
        shapesHistory: pushHistory(state.layoutEdit.shapesHistory, newShapes),
        layoutSelection: shapeId ? { selectedIds: [shapeId], primaryId: shapeId } : state.layoutEdit.layoutSelection,
        isDirty: true,
      });
    }

    case "UPDATE_LAYOUT_SHAPE": {
      const newShapes = updateShapeById(state.layoutEdit.layoutShapes as Shape[], action.shapeId, action.updater);
      return updateLayoutEdit(state, {
        layoutShapes: newShapes,
        shapesHistory: pushHistory(state.layoutEdit.shapesHistory, newShapes as readonly Shape[]),
        isDirty: true,
      });
    }

    // ---- Layout CRUD ----
    case "INIT_LAYOUT_LIST": {
      const activeLayoutPath = state.layoutEdit.activeLayoutPath ?? (action.layouts.length > 0 ? action.layouts[0].id : undefined);
      return updateLayoutEdit(state, { layouts: action.layouts, activeLayoutPath });
    }

    case "ADD_LAYOUT": {
      const { layouts } = state.layoutEdit;
      const newLayouts = insertLayout(layouts, action.layout, action.atIndex);
      return updateLayoutEdit(state, { layouts: newLayouts, activeLayoutPath: action.layout.id });
    }

    case "DELETE_LAYOUT": {
      const { layouts, activeLayoutPath } = state.layoutEdit;
      if (layouts.length <= 1) {return state;}
      const deletedIndex = layouts.findIndex((l) => l.id === action.layoutId);
      if (deletedIndex === -1) {return state;}
      const newLayouts = layouts.filter((l) => l.id !== action.layoutId);
      const newActive = resolveActiveAfterDelete({
        activeLayoutPath, deletedId: action.layoutId, remaining: newLayouts, deletedIndex,
      });
      const isActiveDeleted = activeLayoutPath === action.layoutId;
      const resetState = isActiveDeleted ? resetLayoutEditForDeletion() : {};
      return updateLayoutEdit(state, {
        layouts: newLayouts,
        activeLayoutPath: newActive,
        ...resetState,
      });
    }

    case "DUPLICATE_LAYOUT": {
      const { layouts } = state.layoutEdit;
      const sourceIndex = layouts.findIndex((l) => l.id === action.layoutId);
      if (sourceIndex === -1) {return state;}
      const source = layouts[sourceIndex];
      const newLayout: LayoutListEntry = {
        ...source,
        id: `ppt/slideLayouts/slideLayout${Date.now()}.xml`,
        name: `${source.name} (Copy)`,
      };
      const newLayouts = [...layouts.slice(0, sourceIndex + 1), newLayout, ...layouts.slice(sourceIndex + 1)];
      return updateLayoutEdit(state, { layouts: newLayouts, activeLayoutPath: newLayout.id });
    }

    case "REORDER_LAYOUTS": {
      const { layouts } = state.layoutEdit;
      const currentIndex = layouts.findIndex((l) => l.id === action.layoutId);
      if (currentIndex === -1) {return state;}
      const layout = layouts[currentIndex];
      const without = [...layouts.slice(0, currentIndex), ...layouts.slice(currentIndex + 1)];
      const targetIndex = Math.max(0, Math.min(action.toIndex, without.length));
      const newLayouts = [...without.slice(0, targetIndex), layout, ...without.slice(targetIndex)];
      return updateLayoutEdit(state, { layouts: newLayouts });
    }

    case "UPDATE_LAYOUT_ATTRIBUTES": {
      const newLayouts = state.layoutEdit.layouts.map((l) =>
        l.id === action.layoutId ? { ...l, ...action.updates } : l,
      );
      return updateLayoutEdit(state, { layouts: newLayouts });
    }

    // ---- Undo/Redo ----
    case "UNDO": {
      const undoResult = undoHistory(state.layoutEdit.shapesHistory);
      if (!undoResult) {return state;}
      return updateLayoutEdit(state, {
        shapesHistory: undoResult,
        layoutShapes: undoResult.present,
        isDirty: true,
      });
    }

    case "REDO": {
      const redoResult = redoHistory(state.layoutEdit.shapesHistory);
      if (!redoResult) {return state;}
      return updateLayoutEdit(state, {
        shapesHistory: redoResult,
        layoutShapes: redoResult.present,
        isDirty: true,
      });
    }
  }
}

// =============================================================================
// Commit Helpers
// =============================================================================

function commitLayoutDrag(state: ThemeEditorState): ThemeEditorState {
  const { layoutDrag, layoutShapes } = state.layoutEdit;
  if (layoutDrag.type === "idle") {return state;}

  switch (layoutDrag.type) {
    case "move": {
      const dx = layoutDrag.previewDelta.dx as number;
      const dy = layoutDrag.previewDelta.dy as number;
      if (dx === 0 && dy === 0) {return updateLayoutEdit(state, { layoutDrag: { type: "idle" } });}

      // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
      let newShapes: readonly Shape[] = layoutShapes;
      for (const shapeId of layoutDrag.shapeIds) {
        const initial = layoutDrag.initialBounds.get(shapeId);
        if (!initial) {continue;}
        newShapes = updateShapeById([...newShapes] as Shape[], shapeId, (shape) =>
          withUpdatedTransform(shape as Shape, { x: px(initial.x + dx), y: px(initial.y + dy) }),
        ) as readonly Shape[];
      }
      return updateLayoutEdit(state, {
        layoutShapes: newShapes,
        shapesHistory: pushHistory(state.layoutEdit.shapesHistory, newShapes),
        layoutDrag: { type: "idle" },
        isDirty: true,
      });
    }

    case "resize": {
      const dx = layoutDrag.previewDelta.dx as number;
      const dy = layoutDrag.previewDelta.dy as number;
      if (dx === 0 && dy === 0) {return updateLayoutEdit(state, { layoutDrag: { type: "idle" } });}

      const { handle, initialBoundsMap, combinedBounds, aspectLocked, shapeIds } = layoutDrag;
      const baseX = combinedBounds.x;
      const baseY = combinedBounds.y;
      const baseWidth = combinedBounds.width;
      const baseHeight = combinedBounds.height;

      // eslint-disable-next-line no-restricted-syntax -- mutable bounds
      let newWidth = baseWidth,
        newHeight = baseHeight,
        newX = baseX,
        newY = baseY;
      if (handle.includes("e")) {newWidth += dx;}
      if (handle.includes("w")) {
        newWidth -= dx;
        newX += dx;
      }
      if (handle.includes("s")) {newHeight += dy;}
      if (handle.includes("n")) {
        newHeight -= dy;
        newY += dy;
      }

      const minSize = 10;
      if (newWidth < minSize) {
        if (handle.includes("w")) {newX = baseX + baseWidth - minSize;}
        newWidth = minSize;
      }
      if (newHeight < minSize) {
        if (handle.includes("n")) {newY = baseY + baseHeight - minSize;}
        newHeight = minSize;
      }

      if (aspectLocked && baseWidth > 0 && baseHeight > 0) {
        const ar = baseWidth / baseHeight;
        if (handle === "n" || handle === "s") {newWidth = newHeight * ar;}
        else if (handle === "e" || handle === "w") {newHeight = newWidth / ar;}
        else if (newWidth / baseWidth > newHeight / baseHeight) {newHeight = newWidth / ar;}
        else {newWidth = newHeight * ar;}
      }

      const scaleX = baseWidth > 0 ? newWidth / baseWidth : 1;
      const scaleY = baseHeight > 0 ? newHeight / baseHeight : 1;

      // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
      let newShapes: readonly Shape[] = layoutShapes;
      for (const shapeId of shapeIds) {
        const initial = initialBoundsMap.get(shapeId);
        if (!initial) {continue;}
        newShapes = updateShapeById([...newShapes] as Shape[], shapeId, (shape) =>
          withUpdatedTransform(shape as Shape, {
            x: px(newX + (initial.x - baseX) * scaleX),
            y: px(newY + (initial.y - baseY) * scaleY),
            width: px(initial.width * scaleX),
            height: px(initial.height * scaleY),
          }),
        ) as readonly Shape[];
      }
      return updateLayoutEdit(state, {
        layoutShapes: newShapes,
        shapesHistory: pushHistory(state.layoutEdit.shapesHistory, newShapes),
        layoutDrag: { type: "idle" },
        isDirty: true,
      });
    }

    case "rotate": {
      const angleDelta = layoutDrag.previewAngleDelta as number;
      if (angleDelta === 0) {return updateLayoutEdit(state, { layoutDrag: { type: "idle" } });}

      // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
      let newShapes: readonly Shape[] = layoutShapes;
      for (const shapeId of layoutDrag.shapeIds) {
        const initialRotation = layoutDrag.initialRotationsMap.get(shapeId);
        if (initialRotation === undefined) {continue;}
        // eslint-disable-next-line no-restricted-syntax -- rotation normalization
        let newRotation = ((initialRotation as number) + angleDelta) % 360;
        if (newRotation < 0) {newRotation += 360;}
        newShapes = updateShapeById([...newShapes] as Shape[], shapeId, (shape) =>
          withUpdatedTransform(shape as Shape, { rotation: deg(newRotation) }),
        ) as readonly Shape[];
      }
      return updateLayoutEdit(state, {
        layoutShapes: newShapes,
        shapesHistory: pushHistory(state.layoutEdit.shapesHistory, newShapes),
        layoutDrag: { type: "idle" },
        isDirty: true,
      });
    }
  }
}
