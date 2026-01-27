/**
 * @file Presentation editor types
 *
 * Types for the presentation-level editor.
 * Uses state/ module for shared state management primitives.
 */

import type { Slide, Shape, TextBody, SlideSize } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { Pixels, Degrees } from "@oxen/ooxml/domain/units";
import type { PresentationDocument, SlideWithId, SlideId, SlideLayoutBundle } from "@oxen/pptx/app";
import type { ShapeHierarchyTarget } from "../../../shape";
import type { FontSpec } from "@oxen/pptx/domain/resolution";
import type { ThemePreset } from "../../../panels/theme-editor/types";
import type { SchemeColorName } from "@oxen/ooxml/domain/color";
import type {
  UndoRedoHistory,
  SelectionState,
  DragState,
  ClipboardContent,
  ResizeHandlePosition,
  PathDrawState,
  PathEditState,
  PathEditAction,
} from "../../slide/state";
import type { TextEditState } from "../../../slide/text-edit";

// =============================================================================
// Editor Mode Types
// =============================================================================

/**
 * Editor mode - determines the main editing context
 */
export type EditorMode = "slide" | "theme" | "layout";

/**
 * Create default slide editor mode
 */
export function createSlideEditorMode(): EditorMode {
  return "slide";
}

// =============================================================================
// Creation Mode Types
// =============================================================================

/**
 * Preset shape types for creation
 */
export type CreationPresetShape =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "rtTriangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "star5"
  | "rightArrow"
  | "leftArrow"
  | "upArrow"
  | "downArrow"
  | "line";

/**
 * Chart types for creation
 */
export type CreationChartType = "bar" | "line" | "pie";

/**
 * Diagram types for creation
 */
export type CreationDiagramType = "process" | "cycle" | "hierarchy" | "relationship";

/**
 * Smoothing level for pencil tool
 */
export type SmoothingLevel = "low" | "medium" | "high";

/**
 * Creation mode - determines what happens on canvas click/drag
 */
export type CreationMode =
  | { readonly type: "select" }
  | { readonly type: "shape"; readonly preset: CreationPresetShape }
  | { readonly type: "textbox" }
  | { readonly type: "picture" }
  | { readonly type: "connector" }
  | { readonly type: "table"; readonly rows: number; readonly cols: number }
  | { readonly type: "chart"; readonly chartType: CreationChartType }
  | { readonly type: "diagram"; readonly diagramType: CreationDiagramType }
  | { readonly type: "pen" }
  | { readonly type: "pencil"; readonly smoothing: SmoothingLevel }
  | { readonly type: "path-edit" };

/**
 * Create default select mode
 */
export function createSelectMode(): CreationMode {
  return { type: "select" };
}

// =============================================================================
// Layout Editing Types
// =============================================================================

/**
 * Layout editing state - active when editorMode is "layout"
 *
 * Manages the editing of slide layouts including shape selection,
 * drag operations, and tracking of unsaved changes.
 */
export type LayoutEditState = {
  /** Currently selected layout path (e.g., "ppt/slideLayouts/slideLayout1.xml") */
  readonly activeLayoutPath: string | undefined;
  /** Loaded layout shapes (parsed from PPTX, EMU coordinates) */
  readonly layoutShapes: readonly Shape[];
  /** Layout bundle data (includes master/theme for rendering) */
  readonly layoutBundle: SlideLayoutBundle | undefined;
  /** Shape selection within the layout */
  readonly layoutSelection: SelectionState;
  /** Drag state for layout shapes */
  readonly layoutDrag: DragState;
  /** Dirty flag - indicates unsaved changes */
  readonly isDirty: boolean;
};

// =============================================================================
// Presentation Editor State
// =============================================================================

/**
 * Complete presentation editor state
 *
 * Uses presentation-level undo/redo history that tracks all changes
 * across slides for unified undo/redo behavior.
 */
export type PresentationEditorState = {
  /** Presentation document with undo/redo history */
  readonly documentHistory: UndoRedoHistory<PresentationDocument>;
  /** Currently active slide ID */
  readonly activeSlideId: SlideId | undefined;
  /** Shape selection within the active slide */
  readonly shapeSelection: SelectionState;
  /** Current drag operation */
  readonly drag: DragState;
  /** Clipboard content */
  readonly clipboard: ClipboardContent | undefined;
  /** Current creation mode */
  readonly creationMode: CreationMode;
  /** Text editing state */
  readonly textEdit: TextEditState;
  /** Path drawing state (pen/pencil tool) */
  readonly pathDraw: PathDrawState;
  /** Path editing state (for editing existing paths) */
  readonly pathEdit: PathEditState;
  /** Current editor mode (slide or theme) */
  readonly editorMode: EditorMode;
  /** Layout editing state (active when editorMode is "layout") */
  readonly layoutEdit: LayoutEditState;
};

// =============================================================================
// Presentation Editor Actions
// =============================================================================

/**
 * Actions for presentation editor reducer
 */
export type PresentationEditorAction =
  // Document mutations
  | { readonly type: "SET_DOCUMENT"; readonly document: PresentationDocument }
  | { readonly type: "SET_SLIDE_SIZE"; readonly slideSize: SlideSize }

  // Slide management
  | { readonly type: "ADD_SLIDE"; readonly slide: Slide; readonly afterSlideId?: SlideId; readonly atIndex?: number }
  | { readonly type: "DELETE_SLIDE"; readonly slideId: SlideId }
  | { readonly type: "DUPLICATE_SLIDE"; readonly slideId: SlideId }
  | { readonly type: "MOVE_SLIDE"; readonly slideId: SlideId; readonly toIndex: number }
  | { readonly type: "SELECT_SLIDE"; readonly slideId: SlideId }
  | {
      readonly type: "UPDATE_SLIDE";
      readonly slideId: SlideId;
      readonly updater: (slide: Slide) => Slide;
    }

  // Active slide mutations
  | { readonly type: "UPDATE_ACTIVE_SLIDE"; readonly updater: (slide: Slide) => Slide }
  | { readonly type: "UPDATE_ACTIVE_SLIDE_ENTRY"; readonly updater: (slide: SlideWithId) => SlideWithId }
  | {
      readonly type: "UPDATE_SHAPE";
      readonly shapeId: ShapeId;
      readonly updater: (shape: Shape) => Shape;
    }
  | { readonly type: "DELETE_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "ADD_SHAPE"; readonly shape: Shape }
  | {
      readonly type: "REORDER_SHAPE";
      readonly shapeId: ShapeId;
      readonly direction: "front" | "back" | "forward" | "backward";
    }
  | { readonly type: "UNGROUP_SHAPE"; readonly shapeId: ShapeId }
  | { readonly type: "GROUP_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | {
      readonly type: "MOVE_SHAPE_TO_INDEX";
      readonly shapeId: ShapeId;
      readonly newIndex: number;
    }
  | {
      readonly type: "MOVE_SHAPE_IN_HIERARCHY";
      readonly shapeId: ShapeId;
      readonly target: ShapeHierarchyTarget;
    }

  // Shape selection
  | {
      readonly type: "SELECT_SHAPE";
      readonly shapeId: ShapeId;
      /** Add to existing selection (Shift+Click) */
      readonly addToSelection: boolean;
      /** Toggle selection state - deselect if already selected (Cmd/Ctrl+Click) */
      readonly toggle?: boolean;
    }
  | {
      readonly type: "SELECT_MULTIPLE_SHAPES";
      readonly shapeIds: readonly ShapeId[];
      readonly primaryId?: ShapeId;
    }
  | { readonly type: "CLEAR_SHAPE_SELECTION" }

  // Drag operations
  | { readonly type: "START_MOVE"; readonly startX: Pixels; readonly startY: Pixels }
  | {
      readonly type: "START_RESIZE";
      readonly handle: ResizeHandlePosition;
      readonly startX: Pixels;
      readonly startY: Pixels;
      readonly aspectLocked: boolean;
    }
  | { readonly type: "START_ROTATE"; readonly startX: Pixels; readonly startY: Pixels }
  | { readonly type: "END_DRAG" }

  // Drag preview (updates visual state without adding to history)
  | { readonly type: "PREVIEW_MOVE"; readonly dx: Pixels; readonly dy: Pixels }
  | { readonly type: "PREVIEW_RESIZE"; readonly dx: Pixels; readonly dy: Pixels }
  | { readonly type: "PREVIEW_ROTATE"; readonly currentAngle: Degrees }

  // Drag commit (applies preview delta and adds single history entry)
  | { readonly type: "COMMIT_DRAG" }

  // Undo/Redo (presentation-wide)
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }

  // Clipboard
  | { readonly type: "COPY" }
  | { readonly type: "PASTE" }

  // Creation mode
  | { readonly type: "SET_CREATION_MODE"; readonly mode: CreationMode }
  | {
      readonly type: "CREATE_SHAPE";
      readonly shape: Shape;
    }

  // Picture insertion
  | {
      readonly type: "ADD_PICTURE";
      readonly dataUrl: string;
      readonly x: Pixels;
      readonly y: Pixels;
      readonly width: Pixels;
      readonly height: Pixels;
    }

  // Chart insertion
  | {
      readonly type: "ADD_CHART";
      readonly chartType: CreationChartType;
      readonly x: Pixels;
      readonly y: Pixels;
      readonly width: Pixels;
      readonly height: Pixels;
    }

  // Diagram insertion
  | {
      readonly type: "ADD_DIAGRAM";
      readonly diagramType: CreationDiagramType;
      readonly x: Pixels;
      readonly y: Pixels;
      readonly width: Pixels;
      readonly height: Pixels;
    }

  // Text editing
  | {
      readonly type: "ENTER_TEXT_EDIT";
      readonly shapeId: ShapeId;
    }
  | { readonly type: "EXIT_TEXT_EDIT" }
  | {
      readonly type: "UPDATE_TEXT_BODY";
      readonly shapeId: ShapeId;
      readonly textBody: TextBody;
    }
  | {
      readonly type: "UPDATE_TEXT_BODY_IN_EDIT";
      readonly shapeId: ShapeId;
      readonly textBody: TextBody;
    }

  // Text formatting (in-place, while editing)
  | {
      readonly type: "APPLY_RUN_FORMAT";
      readonly shapeId: ShapeId;
      readonly textBody: TextBody;
    }
  | {
      readonly type: "APPLY_PARAGRAPH_FORMAT";
      readonly shapeId: ShapeId;
      readonly textBody: TextBody;
    }

  // Path drawing (pen/pencil tool)
  | { readonly type: "START_PEN_DRAW" }
  | {
      readonly type: "ADD_PEN_POINT";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly pointType: "smooth" | "corner";
    }
  | {
      readonly type: "UPDATE_PEN_POINT_HANDLES";
      readonly pointIndex: number;
      readonly handleIn?: { x: Pixels; y: Pixels };
      readonly handleOut?: { x: Pixels; y: Pixels };
    }
  | { readonly type: "SET_PEN_HOVER_POINT"; readonly index: number | undefined }
  | { readonly type: "SET_PEN_PREVIEW_POINT"; readonly point: { x: Pixels; y: Pixels } | undefined }
  | { readonly type: "CLOSE_PEN_PATH" }
  | { readonly type: "COMMIT_PEN_PATH" }
  | { readonly type: "CANCEL_PEN_PATH" }
  | {
      readonly type: "START_PENCIL_DRAW";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly pressure: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "ADD_PENCIL_POINT";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly pressure: number;
      readonly timestamp: number;
    }
  | { readonly type: "END_PENCIL_DRAW" }

  // Path editing (editing existing paths)
  | PathEditAction

  // Editor mode
  | { readonly type: "SET_EDITOR_MODE"; readonly mode: EditorMode }

  // Theme editing
  | {
      readonly type: "UPDATE_COLOR_SCHEME";
      readonly name: SchemeColorName;
      readonly color: string;
    }
  | {
      readonly type: "UPDATE_FONT_SCHEME";
      readonly target: "major" | "minor";
      readonly spec: Partial<FontSpec>;
    }
  | {
      readonly type: "APPLY_THEME_PRESET";
      readonly preset: ThemePreset;
    }

  // Layout editing
  | { readonly type: "SELECT_LAYOUT"; readonly layoutPath: string }
  | {
      readonly type: "LOAD_LAYOUT_SHAPES";
      readonly layoutPath: string;
      readonly shapes: readonly Shape[];
      readonly bundle: SlideLayoutBundle;
    }
  | {
      readonly type: "SELECT_LAYOUT_SHAPE";
      readonly shapeId: ShapeId;
      readonly addToSelection: boolean;
      readonly toggle?: boolean;
    }
  | {
      readonly type: "SELECT_MULTIPLE_LAYOUT_SHAPES";
      readonly shapeIds: readonly ShapeId[];
      readonly primaryId?: ShapeId;
    }
  | { readonly type: "CLEAR_LAYOUT_SHAPE_SELECTION" }
  | { readonly type: "START_LAYOUT_MOVE"; readonly startX: Pixels; readonly startY: Pixels }
  | {
      readonly type: "START_LAYOUT_RESIZE";
      readonly handle: ResizeHandlePosition;
      readonly startX: Pixels;
      readonly startY: Pixels;
      readonly aspectLocked: boolean;
    }
  | { readonly type: "START_LAYOUT_ROTATE"; readonly startX: Pixels; readonly startY: Pixels }
  | { readonly type: "PREVIEW_LAYOUT_MOVE"; readonly dx: Pixels; readonly dy: Pixels }
  | { readonly type: "PREVIEW_LAYOUT_RESIZE"; readonly dx: Pixels; readonly dy: Pixels }
  | { readonly type: "PREVIEW_LAYOUT_ROTATE"; readonly currentAngle: Degrees }
  | { readonly type: "COMMIT_LAYOUT_DRAG" }
  | { readonly type: "END_LAYOUT_DRAG" }
  | { readonly type: "DELETE_LAYOUT_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "ADD_LAYOUT_SHAPE"; readonly shape: Shape }
  | {
      readonly type: "UPDATE_LAYOUT_SHAPE";
      readonly shapeId: ShapeId;
      readonly updater: (shape: Shape) => Shape;
    };

// =============================================================================
// Context Value Types
// =============================================================================

/**
 * Presentation editor context value
 */
export type PresentationEditorContextValue = {
  readonly state: PresentationEditorState;
  readonly dispatch: (action: PresentationEditorAction) => void;
  /** Current document (from history.present) */
  readonly document: PresentationDocument;
  /** Active slide */
  readonly activeSlide: SlideWithId | undefined;
  /** Selected shapes in active slide */
  readonly selectedShapes: readonly Shape[];
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
  /** Current creation mode */
  readonly creationMode: CreationMode;
  /** Text editing state */
  readonly textEdit: TextEditState;
  /** Path drawing state */
  readonly pathDraw: PathDrawState;
  /** Path editing state */
  readonly pathEdit: PathEditState;
  /** Current editor mode (slide or theme) */
  readonly editorMode: EditorMode;
};

// =============================================================================
// Creation Mode Helpers
// =============================================================================

/**
 * Create pen mode
 */
export function createPenMode(): CreationMode {
  return { type: "pen" };
}

/**
 * Create pencil mode with specified smoothing level
 */
export function createPencilMode(smoothing: SmoothingLevel = "medium"): CreationMode {
  return { type: "pencil", smoothing };
}

/**
 * Create path edit mode
 */
export function createPathEditMode(): CreationMode {
  return { type: "path-edit" };
}

/**
 * Check if creation mode is pen
 */
export function isPenMode(mode: CreationMode): mode is { type: "pen" } {
  return mode.type === "pen";
}

/**
 * Check if creation mode is pencil
 */
export function isPencilMode(mode: CreationMode): mode is { type: "pencil"; smoothing: SmoothingLevel } {
  return mode.type === "pencil";
}

/**
 * Check if creation mode is path edit
 */
export function isPathEditMode(mode: CreationMode): mode is { type: "path-edit" } {
  return mode.type === "path-edit";
}

/**
 * Check if creation mode is any path-related mode
 */
export function isPathMode(mode: CreationMode): boolean {
  return mode.type === "pen" || mode.type === "pencil" || mode.type === "path-edit";
}
