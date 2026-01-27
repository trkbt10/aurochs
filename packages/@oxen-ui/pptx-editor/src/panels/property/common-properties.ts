/**
 * @file Common properties extraction for multi-selection editing
 *
 * Utilities to extract shared property values from multiple selected shapes.
 * When values differ across shapes, returns undefined (representing "Mixed" state).
 */

import type { Shape } from "@oxen/pptx/domain/index";
import type { Transform } from "@oxen/pptx/domain/types";
import type { Fill, Line } from "@oxen/pptx/domain/color/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of common property extraction.
 * undefined means "Mixed" (values differ across shapes)
 */
export type CommonValue<T> = T | undefined;

/**
 * Common transform properties across shapes.
 */
export type CommonTransform = {
  readonly x: CommonValue<number>;
  readonly y: CommonValue<number>;
  readonly width: CommonValue<number>;
  readonly height: CommonValue<number>;
  readonly rotation: CommonValue<number>;
  readonly flipH: CommonValue<boolean>;
  readonly flipV: CommonValue<boolean>;
};

/**
 * Shape type analysis result.
 */
export type ShapeTypeAnalysis = {
  /** All shapes are the same type */
  readonly isSameType: boolean;
  /** The common type (if same) */
  readonly commonType: Shape["type"] | undefined;
  /** Count of each type */
  readonly typeCounts: Readonly<Record<string, number>>;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get common value from array of values.
 * Returns the value if all are equal, undefined if mixed.
 */
function getCommonValue<T>(values: readonly T[]): CommonValue<T> {
  if (values.length === 0) {
    return undefined;
  }
  const first = values[0];
  const allSame = values.every((v) => {
    if (typeof v === "object" && v !== null) {
      return JSON.stringify(v) === JSON.stringify(first);
    }
    return v === first;
  });
  return allSame ? first : undefined;
}

/**
 * Get transform from any shape.
 */
function getShapeTransform(shape: Shape): Transform | undefined {
  // GraphicFrame has transform at top level
  if (shape.type === "graphicFrame") {
    const t = shape.transform;
    return {
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation,
      flipH: t.flipH,
      flipV: t.flipV,
    };
  }

  // Other shapes have transform in properties
  if ("properties" in shape && shape.properties && "transform" in shape.properties) {
    const t = shape.properties.transform;
    if (t && "x" in t) {
      return {
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        flipH: t.flipH,
        flipV: t.flipV,
      };
    }
  }
  return undefined;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Analyze shape types in selection.
 */
export function analyzeShapeTypes(shapes: readonly Shape[]): ShapeTypeAnalysis {
  const typeCounts: Record<string, number> = {};

  for (const shape of shapes) {
    typeCounts[shape.type] = (typeCounts[shape.type] ?? 0) + 1;
  }

  const types = Object.keys(typeCounts);
  const isSameType = types.length === 1;
  const commonType = isSameType ? (types[0] as Shape["type"]) : undefined;

  return { isSameType, commonType, typeCounts };
}

/**
 * Extract common transform values from shapes.
 */
export function getCommonTransform(shapes: readonly Shape[]): CommonTransform {
  const transforms = shapes.map(getShapeTransform).filter((t): t is Transform => t !== undefined);

  if (transforms.length === 0) {
    return {
      x: undefined,
      y: undefined,
      width: undefined,
      height: undefined,
      rotation: undefined,
      flipH: undefined,
      flipV: undefined,
    };
  }

  return {
    x: getCommonValue(transforms.map((t) => t.x)),
    y: getCommonValue(transforms.map((t) => t.y)),
    width: getCommonValue(transforms.map((t) => t.width)),
    height: getCommonValue(transforms.map((t) => t.height)),
    rotation: getCommonValue(transforms.map((t) => t.rotation)),
    flipH: getCommonValue(transforms.map((t) => t.flipH)),
    flipV: getCommonValue(transforms.map((t) => t.flipV)),
  };
}

/**
 * Extract common fill from sp/cxnSp shapes.
 */
export function getCommonFill(shapes: readonly Shape[]): CommonValue<Fill> {
  const fills: Fill[] = [];

  for (const shape of shapes) {
    if (shape.type === "sp" || shape.type === "cxnSp") {
      const fill = shape.properties.fill;
      if (fill) {
        fills.push(fill);
      }
    }
  }

  if (fills.length !== shapes.length) {
    // Not all shapes have fill
    return undefined;
  }

  return getCommonValue(fills);
}

/**
 * Extract common line properties from sp/cxnSp shapes.
 */
export function getCommonLine(shapes: readonly Shape[]): CommonValue<Line> {
  const lines: Line[] = [];

  for (const shape of shapes) {
    if (shape.type === "sp" || shape.type === "cxnSp") {
      const line = shape.properties.line;
      if (line) {
        lines.push(line);
      }
    }
  }

  if (lines.length !== shapes.length) {
    return undefined;
  }

  return getCommonValue(lines);
}

/**
 * Check if all shapes support fill editing.
 */
export function allShapesSupportFill(shapes: readonly Shape[]): boolean {
  return shapes.every((s) => s.type === "sp" || s.type === "cxnSp");
}

/**
 * Check if all shapes support line editing.
 */
export function allShapesSupportLine(shapes: readonly Shape[]): boolean {
  return shapes.every((s) => s.type === "sp" || s.type === "cxnSp");
}

/**
 * Apply transform change to a shape.
 */
export function applyTransformToShape(
  shape: Shape,
  update: Partial<Transform>
): Shape {
  const currentTransform = getShapeTransform(shape);
  if (!currentTransform) {
    return shape;
  }

  const newTransform = { ...currentTransform, ...update };

  // Handle graphicFrame first (has transform at top level)
  if (shape.type === "graphicFrame") {
    return {
      ...shape,
      transform: newTransform,
    };
  }

  // Other shapes need properties
  if (!("properties" in shape) || !shape.properties) {
    return shape;
  }

  // Handle shapes with properties.transform
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform: newTransform,
        },
      } as Shape;
    case "grpSp":
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform: {
            ...shape.properties.transform,
            ...newTransform,
          },
        },
      } as Shape;
    default:
      return shape;
  }
}

/**
 * Apply fill change to a shape (sp/cxnSp only).
 */
export function applyFillToShape(shape: Shape, fill: Fill): Shape {
  if (shape.type !== "sp" && shape.type !== "cxnSp") {
    return shape;
  }

  return {
    ...shape,
    properties: {
      ...shape.properties,
      fill,
    },
  } as Shape;
}

/**
 * Apply line change to a shape (sp/cxnSp only).
 */
export function applyLineToShape(shape: Shape, line: Line): Shape {
  if (shape.type !== "sp" && shape.type !== "cxnSp") {
    return shape;
  }

  return {
    ...shape,
    properties: {
      ...shape.properties,
      line,
    },
  } as Shape;
}
