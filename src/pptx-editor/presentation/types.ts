/**
 * @file Presentation editor types
 *
 * Types for the presentation-level editor.
 * Uses state/ module for shared state management primitives.
 */

import type { Slide, Shape, Presentation, TextBody } from "../../pptx/domain";
import type { ShapeId, Pixels, Degrees } from "../../pptx/domain/types";
import type { ColorContext, FontScheme } from "../../pptx/domain/resolution";
import type { ResourceResolver, ResolvedBackgroundFill } from "../../pptx/render/core";
import type { Slide as ApiSlide } from "../../pptx/types/api";
import type {
  UndoRedoHistory,
  SelectionState,
  DragState,
  ClipboardContent,
  ResizeHandlePosition,
  TextEditState,
} from "../state";

// =============================================================================
// Presentation Document Types
// =============================================================================

/**
 * Slide identifier
 */
export type SlideId = string;

/**
 * File cache entry for PPTX content
 */
export type FileCacheEntry = {
  readonly text: string;
  readonly buffer: ArrayBuffer;
};

/**
 * File cache for PPTX resources (images, XML, etc.)
 */
export type FileCache = ReadonlyMap<string, FileCacheEntry>;

/**
 * Presentation document for editing
 *
 * Contains all information needed to render slides correctly,
 * including theme colors, fonts, and resource resolution.
 */
export type PresentationDocument = {
  /** Original presentation data */
  readonly presentation: Presentation;
  /** Slides with their IDs */
  readonly slides: readonly SlideWithId[];
  /** Slide dimensions */
  readonly slideWidth: Pixels;
  readonly slideHeight: Pixels;

  // === Rendering Context ===
  /** Color context for resolving theme/scheme colors */
  readonly colorContext: ColorContext;
  /** Font scheme for resolving theme fonts (+mj-lt, +mn-lt, etc.) */
  readonly fontScheme?: FontScheme;
  /** Resource resolver for images and embedded content */
  readonly resources: ResourceResolver;

  /**
   * File cache from loaded PPTX.
   * Used to build SlideRenderContext for proper rendering after edits.
   */
  readonly fileCache?: FileCache;
};

/**
 * Slide with ID for tracking
 *
 * Contains the domain slide data plus the original API slide for proper rendering context.
 */
export type SlideWithId = {
  readonly id: SlideId;
  /** Parsed domain slide (for editing) */
  readonly slide: Slide;
  /**
   * Original API slide from the presentation reader.
   * Required for proper rendering with full context (theme, master, layout inheritance).
   * Contains all XML data needed to build SlideRenderContext.
   */
  readonly apiSlide?: ApiSlide;
  /** Pre-resolved background (from slide → layout → master inheritance) */
  readonly resolvedBackground?: ResolvedBackgroundFill;
};

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
 * Creation mode - determines what happens on canvas click/drag
 */
export type CreationMode =
  | { readonly type: "select" }
  | { readonly type: "shape"; readonly preset: CreationPresetShape }
  | { readonly type: "textbox" }
  | { readonly type: "picture" }
  | { readonly type: "connector" }
  | { readonly type: "table"; readonly rows: number; readonly cols: number };

/**
 * Create default select mode
 */
export function createSelectMode(): CreationMode {
  return { type: "select" };
}

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

  // Slide management
  | { readonly type: "ADD_SLIDE"; readonly slide: Slide; readonly afterSlideId?: SlideId }
  | { readonly type: "DELETE_SLIDE"; readonly slideId: SlideId }
  | { readonly type: "DUPLICATE_SLIDE"; readonly slideId: SlideId }
  | { readonly type: "MOVE_SLIDE"; readonly slideId: SlideId; readonly toIndex: number }
  | { readonly type: "SELECT_SLIDE"; readonly slideId: SlideId }

  // Active slide mutations
  | { readonly type: "UPDATE_ACTIVE_SLIDE"; readonly updater: (slide: Slide) => Slide }
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

  // Shape selection
  | {
      readonly type: "SELECT_SHAPE";
      readonly shapeId: ShapeId;
      readonly addToSelection: boolean;
    }
  | { readonly type: "SELECT_MULTIPLE_SHAPES"; readonly shapeIds: readonly ShapeId[] }
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
      readonly chartType: "bar" | "line" | "pie";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly width: Pixels;
      readonly height: Pixels;
    }

  // Diagram insertion
  | {
      readonly type: "ADD_DIAGRAM";
      readonly diagramType: "process" | "cycle" | "hierarchy" | "relationship";
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
};
