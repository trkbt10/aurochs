/**
 * @file Node factory for creating FigDesignNode from NodeSpec
 *
 * Converts declarative spec objects into concrete FigDesignNode instances
 * with proper defaults and transforms.
 */

import type { FigMatrix, FigPaint } from "@aurochs/fig/types";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { NodeSpec } from "../types/spec-types";
import { nextNodeId, createIdCounter } from "../types/node-id";


// =============================================================================
// Transform Construction
// =============================================================================

/**
 * Create a 2x3 affine transform matrix from position and rotation.
 */
function createTransform(x: number, y: number, rotation?: number): FigMatrix {
  if (rotation === undefined || rotation === 0) {
    return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
  }

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    m00: cos,
    m01: -sin,
    m02: x,
    m10: sin,
    m11: cos,
    m12: y,
  };
}

// =============================================================================
// Default Paint
// =============================================================================

/**
 * Default fill for shapes when none is specified.
 */
const DEFAULT_SHAPE_FILL: readonly FigPaint[] = [
  {
    type: "SOLID",
    color: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    visible: true,
    opacity: 1,
  },
];

/**
 * Default fill for text nodes.
 */
const DEFAULT_TEXT_FILL: readonly FigPaint[] = [
  {
    type: "SOLID",
    color: { r: 0, g: 0, b: 0, a: 1 },
    visible: true,
    opacity: 1,
  },
];

/**
 * Default fill for frames (white).
 */
const DEFAULT_FRAME_FILL: readonly FigPaint[] = [
  {
    type: "SOLID",
    color: { r: 1, g: 1, b: 1, a: 1 },
    visible: true,
    opacity: 1,
  },
];

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Shared counter for generating node IDs.
 * Uses session 1 for user-created nodes (session 0 is structural).
 */
// eslint-disable-next-line no-restricted-syntax -- module-level mutable singleton required for resettable ID counter
let sharedCounter = createIdCounter(1, 1000);

/**
 * Reset the shared counter (useful for testing).
 */
export function resetNodeIdCounter(startLocalID = 1000): void {
  sharedCounter = createIdCounter(1, startLocalID);
}

/**
 * Generate a new unique node ID.
 */
export function generateNodeId(): FigNodeId {
  return nextNodeId(sharedCounter);
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a FigDesignNode from a NodeSpec.
 *
 * Generates a unique ID and applies appropriate defaults based on node type.
 *
 * @param spec - Declarative spec describing the node to create
 * @param id - Optional pre-generated ID (defaults to auto-generated)
 */
export function createNodeFromSpec(spec: NodeSpec, id?: FigNodeId): FigDesignNode {
  const nodeId = id ?? generateNodeId();
  const transform = createTransform(spec.x, spec.y, spec.rotation);
  const size = { x: spec.width, y: spec.height };

  const base: FigDesignNode = {
    id: nodeId,
    type: spec.type,
    name: spec.name ?? getDefaultName(spec.type),
    visible: spec.visible ?? true,
    opacity: spec.opacity ?? 1,
    transform,
    size,
    fills: spec.fills ?? getDefaultFills(spec.type),
    strokes: spec.strokes ?? [],
    strokeWeight: spec.strokeWeight ?? 0,
    effects: spec.effects ?? [],
  };

  return applyTypeSpecificFields(base, spec);
}

// =============================================================================
// Type-Specific Fields
// =============================================================================

function applyTypeSpecificFields(base: FigDesignNode, spec: NodeSpec): FigDesignNode {
  switch (spec.type) {
    case "FRAME":
    case "COMPONENT":
      return {
        ...base,
        clipsContent: spec.clipsContent ?? true,
        autoLayout: spec.autoLayout,
        children: [],
      };

    case "GROUP":
    case "SECTION":
      return {
        ...base,
        children: [],
      };

    case "BOOLEAN_OPERATION":
      return {
        ...base,
        booleanOperation: spec.booleanOperation,
        children: [],
      };

    case "ROUNDED_RECTANGLE":
      return {
        ...base,
        cornerRadius: spec.cornerRadius,
        rectangleCornerRadii: spec.rectangleCornerRadii,
      };

    case "STAR":
      return {
        ...base,
        pointCount: spec.pointCount ?? 5,
        starInnerRadius: spec.starInnerRadius ?? 0.382,
      };

    case "REGULAR_POLYGON":
      return {
        ...base,
        pointCount: spec.pointCount ?? 3,
      };

    case "TEXT":
      return {
        ...base,
        textData: {
          characters: spec.characters,
          fontSize: spec.fontSize ?? 14,
          fontName: {
            family: spec.fontFamily ?? "Inter",
            style: spec.fontStyle ?? "Regular",
            postscript: `${spec.fontFamily ?? "Inter"}-${(spec.fontStyle ?? "Regular").replace(/\s+/g, "")}`,
          },
          textAlignHorizontal: spec.textAlignHorizontal,
          textAlignVertical: spec.textAlignVertical,
        },
      };

    case "INSTANCE":
      return {
        ...base,
        symbolId: spec.symbolId,
        children: [],
      };

    default:
      return base;
  }
}

// =============================================================================
// Defaults
// =============================================================================

function getDefaultName(type: string): string {
  switch (type) {
    case "RECTANGLE": return "Rectangle";
    case "ROUNDED_RECTANGLE": return "Rectangle";
    case "ELLIPSE": return "Ellipse";
    case "LINE": return "Line";
    case "STAR": return "Star";
    case "REGULAR_POLYGON": return "Polygon";
    case "VECTOR": return "Vector";
    case "FRAME": return "Frame";
    case "GROUP": return "Group";
    case "SECTION": return "Section";
    case "BOOLEAN_OPERATION": return "Union";
    case "TEXT": return "Text";
    case "COMPONENT": return "Component";
    case "INSTANCE": return "Instance";
    default: return type;
  }
}

function getDefaultFills(type: string): readonly FigPaint[] {
  switch (type) {
    case "TEXT":
      return DEFAULT_TEXT_FILL;
    case "FRAME":
    case "COMPONENT":
      return DEFAULT_FRAME_FILL;
    case "GROUP":
    case "LINE":
    case "BOOLEAN_OPERATION":
      return [];
    default:
      return DEFAULT_SHAPE_FILL;
  }
}
