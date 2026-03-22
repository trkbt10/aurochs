/**
 * @file Shape factory functions
 *
 * Shared shape creation functions for both pptx-editor and potx-editor.
 * Creates basic shapes (SpShape, TextBox, Connector, Picture).
 * Does NOT include graphic-frame factories (table/chart/diagram) which remain in pptx-editor.
 */

import { DEFAULT_COLOR_SCHEME, type SpShape, type CxnShape, type PicShape, type Shape } from "@aurochs-office/pptx/domain";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeId, ResourceId } from "@aurochs-office/pptx/domain/types";
import { px, deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import type { CreationPresetShape, CreationMode } from "./creation-types";

// =============================================================================
// Shape Bounds
// =============================================================================

export type ShapeBounds = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};

// =============================================================================
// Default Values
// =============================================================================

/** Default fill color (Office theme accent1) */
const DEFAULT_FILL_COLOR = DEFAULT_COLOR_SCHEME.accent1;

/** Default stroke color (darker blue) */
const DEFAULT_STROKE_COLOR = "2F528F";

/** Default stroke width */
const DEFAULT_STROKE_WIDTH = px(1);

/** Default shape dimensions */
const DEFAULT_SHAPE_WIDTH = px(150);
const DEFAULT_SHAPE_HEIGHT = px(100);

/** Default text box dimensions */
const DEFAULT_TEXTBOX_WIDTH = px(200);
const DEFAULT_TEXTBOX_HEIGHT = px(40);

// =============================================================================
// ID Generation
// =============================================================================

// eslint-disable-next-line no-restricted-syntax -- Counter requires mutation
let shapeCounter = 0;

/**
 * Generate a unique shape ID
 */
export function generateShapeId(): ShapeId {
  shapeCounter += 1;
  return `shape-${Date.now()}-${shapeCounter}` as ShapeId;
}

/**
 * Reset shape counter (for testing)
 */
export function resetShapeCounter(): void {
  shapeCounter = 0;
}

// =============================================================================
// Shape Factory Functions
// =============================================================================

/**
 * Create a basic shape (SpShape) with preset geometry
 */
export function createSpShape(id: ShapeId, bounds: ShapeBounds, preset: CreationPresetShape): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name: `Shape ${id}`,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset,
        adjustValues: [],
      },
      fill: {
        type: "solidFill",
        color: {
          spec: { type: "srgb", value: DEFAULT_FILL_COLOR },
        },
      },
      line: {
        width: DEFAULT_STROKE_WIDTH,
        cap: "flat",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: DEFAULT_STROKE_COLOR },
          },
        },
        dash: "solid",
        join: "round",
      },
    },
  };
}

/**
 * Create a text box shape
 */
export function createTextBox(id: ShapeId, bounds: ShapeBounds): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name: `TextBox ${id}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody: {
      bodyProperties: {},
      paragraphs: [
        {
          properties: {},
          runs: [
            {
              type: "text",
              text: "",
            },
          ],
        },
      ],
    },
  };
}

/**
 * Create a connector shape
 */
export function createConnector(id: ShapeId, bounds: ShapeBounds): CxnShape {
  return {
    type: "cxnSp",
    nonVisual: {
      id,
      name: `Connector ${id}`,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "straightConnector1",
        adjustValues: [],
      },
      line: {
        width: DEFAULT_STROKE_WIDTH,
        cap: "flat",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: DEFAULT_STROKE_COLOR },
          },
        },
        dash: "solid",
        join: "round",
      },
    },
  };
}

/**
 * Create a picture shape
 *
 * For new pictures, resourceId is the dataURL of the image.
 * The rendering layer will handle dataURL resources.
 */
export function createPicShape(id: ShapeId, bounds: ShapeBounds, dataUrl: string): PicShape {
  return {
    type: "pic",
    nonVisual: {
      id,
      name: `Picture ${id}`,
    },
    blipFill: {
      resourceId: dataUrl as ResourceId,
      sourceRect: {
        left: pct(0),
        top: pct(0),
        right: pct(0),
        bottom: pct(0),
      },
      stretch: true,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
    },
  };
}

// =============================================================================
// Default Bounds
// =============================================================================

function getDimensionsForMode(mode: CreationMode): { width: Pixels; height: Pixels } {
  switch (mode.type) {
    case "textbox":
      return { width: DEFAULT_TEXTBOX_WIDTH, height: DEFAULT_TEXTBOX_HEIGHT };
    case "connector":
      return { width: px(100), height: px(0) };
    case "table":
      return { width: px(mode.cols * 100), height: px(mode.rows * 40) };
    default:
      return { width: DEFAULT_SHAPE_WIDTH, height: DEFAULT_SHAPE_HEIGHT };
  }
}

/**
 * Get default bounds for a creation mode
 */
export function getDefaultBoundsForMode(mode: CreationMode, centerX: Pixels, centerY: Pixels): ShapeBounds {
  const { width, height } = getDimensionsForMode(mode);

  return {
    x: px((centerX as number) - (width as number) / 2),
    y: px((centerY as number) - (height as number) / 2),
    width,
    height,
  };
}

/**
 * Create bounds from drag start/end coordinates
 */
export function createBoundsFromDrag({
  startX,
  startY,
  endX,
  endY,
}: {
  startX: Pixels;
  startY: Pixels;
  endX: Pixels;
  endY: Pixels;
}): ShapeBounds {
  const x1 = startX as number;
  const y1 = startY as number;
  const x2 = endX as number;
  const y2 = endY as number;

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const width = Math.max(10, Math.abs(x2 - x1));
  const height = Math.max(10, Math.abs(y2 - y1));

  return {
    x: px(minX),
    y: px(minY),
    width: px(width),
    height: px(height),
  };
}

// =============================================================================
// Create Shape from Mode (base version)
// =============================================================================

/**
 * Create a shape based on the current creation mode.
 *
 * Handles basic shapes: shape/textbox/connector.
 * Returns undefined for modes that require additional handling
 * (table/chart/diagram/picture/pen/pencil/path-edit/select).
 *
 * pptx-editor wraps this to add table/chart/diagram support.
 */
export function createShapeFromMode(mode: CreationMode, bounds: ShapeBounds): Shape | undefined {
  const id = generateShapeId();

  switch (mode.type) {
    case "shape":
      return createSpShape(id, bounds, mode.preset);
    case "textbox":
      return createTextBox(id, bounds);
    case "connector":
      return createConnector(id, bounds);
    default:
      return undefined;
  }
}
