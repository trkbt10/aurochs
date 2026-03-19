/**
 * @file Theme editor state types
 *
 * Standalone state types for the potx-editor (theme template editor).
 * These are independent of pptx-editor's PresentationEditorState.
 */

import type { Shape, SlideLayoutType, SlideSize } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import type { SlideLayoutBundle, SlideLayoutOption } from "@aurochs-office/pptx/app";
import type { PresentationFile } from "@aurochs-office/pptx/domain";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme, FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type { UndoRedoHistory } from "@aurochs-ui/editor-core/history";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/drag-state";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { ColorMapping, ColorMapOverride } from "@aurochs-office/pptx/domain/color/types";
import type { CustomColor, ExtraColorScheme, FormatScheme, ObjectDefaults, RawMasterTextStyles } from "@aurochs-office/pptx/domain/theme/types";
import type { ThemePreset } from "../panels/types";

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
// Drag State (simplified for layout editing)
// =============================================================================

type PreviewDelta = {
  readonly dx: Pixels;
  readonly dy: Pixels;
};

export type IdleDragState = { readonly type: "idle" };

export type MoveDragState = {
  readonly type: "move";
  readonly startX: Pixels;
  readonly startY: Pixels;
  readonly shapeIds: readonly ShapeId[];
  readonly initialBounds: ReadonlyMap<ShapeId, { x: number; y: number; width: number; height: number }>;
  readonly previewDelta: PreviewDelta;
};

export type ResizeDragState = {
  readonly type: "resize";
  readonly handle: ResizeHandlePosition;
  readonly startX: Pixels;
  readonly startY: Pixels;
  readonly shapeIds: readonly ShapeId[];
  readonly shapeId: ShapeId;
  readonly initialBounds: { x: number; y: number; width: number; height: number };
  readonly initialBoundsMap: ReadonlyMap<ShapeId, { x: number; y: number; width: number; height: number }>;
  readonly combinedBounds: { x: number; y: number; width: number; height: number };
  readonly aspectLocked: boolean;
  readonly previewDelta: PreviewDelta;
};

export type RotateDragState = {
  readonly type: "rotate";
  readonly startAngle: Degrees;
  readonly shapeIds: readonly ShapeId[];
  readonly initialRotationsMap: ReadonlyMap<ShapeId, Degrees>;
  readonly initialBoundsMap: ReadonlyMap<ShapeId, { x: number; y: number; width: number; height: number }>;
  readonly centerX: Pixels;
  readonly centerY: Pixels;
  readonly shapeId: ShapeId;
  readonly initialRotation: Degrees;
  readonly previewAngleDelta: Degrees;
};

export type LayoutDragState = IdleDragState | MoveDragState | ResizeDragState | RotateDragState;

// =============================================================================
// Theme Editor State
// =============================================================================

/**
 * Layout editing state
 */
export type LayoutEditState = {
  readonly activeLayoutPath: string | undefined;
  readonly layoutShapes: readonly Shape[];
  readonly layoutBundle: SlideLayoutBundle | undefined;
  readonly layoutSelection: SelectionState<ShapeId>;
  readonly layoutDrag: LayoutDragState;
  readonly isDirty: boolean;
  readonly layouts: readonly LayoutListEntry[];
  readonly shapesHistory: UndoRedoHistory<readonly Shape[]>;
};

/**
 * Complete theme editor state
 */
export type ThemeEditorState = {
  readonly themeName: string;
  readonly colorScheme: ColorScheme;
  readonly fontScheme: FontScheme | undefined;
  readonly fontSchemeName: string;
  readonly formatScheme: FormatScheme | undefined;
  readonly customColors: readonly CustomColor[];
  readonly extraColorSchemes: readonly ExtraColorScheme[];
  readonly objectDefaults: ObjectDefaults | undefined;
  readonly masterTextStyles: RawMasterTextStyles | undefined;
  readonly masterBackground: MasterBackgroundState;
  readonly masterColorMapping: ColorMapping;
  readonly layoutEdit: LayoutEditState;
};

/**
 * Master slide background state
 */
export type MasterBackgroundState = {
  readonly fill?: BaseFill;
  readonly shadeToTitle?: boolean;
};

/**
 * Per-layout override state for background and color map
 */
export type LayoutOverrides = {
  readonly background?: MasterBackgroundState;
  readonly colorMapOverride?: ColorMapOverride;
  readonly transition?: SlideTransition;
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
  | { readonly type: "UPDATE_MASTER_TEXT_STYLES"; readonly masterTextStyles: RawMasterTextStyles }
  // Theme editing — master background & color map
  | { readonly type: "UPDATE_MASTER_BACKGROUND"; readonly background: MasterBackgroundState }
  | { readonly type: "UPDATE_MASTER_COLOR_MAPPING"; readonly mapping: ColorMapping }
  // Layout overrides
  | { readonly type: "UPDATE_LAYOUT_BACKGROUND"; readonly layoutId: string; readonly background: MasterBackgroundState }
  | { readonly type: "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE"; readonly layoutId: string; readonly override: ColorMapOverride }
  | { readonly type: "UPDATE_LAYOUT_TRANSITION"; readonly layoutId: string; readonly transition: SlideTransition | undefined }

  // Layout selection
  | { readonly type: "SELECT_LAYOUT"; readonly layoutPath: string }
  | { readonly type: "LOAD_LAYOUT_SHAPES"; readonly layoutPath: string; readonly shapes: readonly Shape[]; readonly bundle: SlideLayoutBundle }

  // Layout shape selection
  | { readonly type: "SELECT_LAYOUT_SHAPE"; readonly shapeId: ShapeId; readonly addToSelection: boolean; readonly toggle?: boolean }
  | { readonly type: "SELECT_MULTIPLE_LAYOUT_SHAPES"; readonly shapeIds: readonly ShapeId[]; readonly primaryId?: ShapeId }
  | { readonly type: "CLEAR_LAYOUT_SHAPE_SELECTION" }

  // Layout shape drag
  | { readonly type: "START_LAYOUT_MOVE"; readonly startX: Pixels; readonly startY: Pixels }
  | { readonly type: "START_LAYOUT_RESIZE"; readonly handle: ResizeHandlePosition; readonly startX: Pixels; readonly startY: Pixels; readonly aspectLocked: boolean }
  | { readonly type: "START_LAYOUT_ROTATE"; readonly startX: Pixels; readonly startY: Pixels }
  | { readonly type: "PREVIEW_LAYOUT_MOVE"; readonly dx: Pixels; readonly dy: Pixels }
  | { readonly type: "PREVIEW_LAYOUT_RESIZE"; readonly dx: Pixels; readonly dy: Pixels }
  | { readonly type: "PREVIEW_LAYOUT_ROTATE"; readonly currentAngle: Degrees }
  | { readonly type: "COMMIT_LAYOUT_DRAG" }
  | { readonly type: "END_LAYOUT_DRAG" }

  // Layout shape mutation
  | { readonly type: "DELETE_LAYOUT_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "ADD_LAYOUT_SHAPE"; readonly shape: Shape }
  | { readonly type: "UPDATE_LAYOUT_SHAPE"; readonly shapeId: ShapeId; readonly updater: (shape: Shape) => Shape }

  // Layout CRUD
  | { readonly type: "INIT_LAYOUT_LIST"; readonly layouts: readonly LayoutListEntry[] }
  | { readonly type: "ADD_LAYOUT"; readonly layout: LayoutListEntry; readonly atIndex?: number }
  | { readonly type: "DELETE_LAYOUT"; readonly layoutId: string }
  | { readonly type: "DUPLICATE_LAYOUT"; readonly layoutId: string }
  | { readonly type: "REORDER_LAYOUTS"; readonly layoutId: string; readonly toIndex: number }
  | { readonly type: "UPDATE_LAYOUT_ATTRIBUTES"; readonly layoutId: string; readonly updates: Partial<Omit<LayoutListEntry, "id">> }

  // Undo/Redo
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" };

// =============================================================================
// Context Props
// =============================================================================

/**
 * Props for initializing the theme editor
 */
export type ThemeEditorInitProps = {
  readonly presentationFile?: PresentationFile;
  readonly slideSize: SlideSize;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly themeName?: string;
  readonly colorScheme: ColorScheme;
  readonly fontScheme?: FontScheme;
  readonly fontSchemeName?: string;
};
