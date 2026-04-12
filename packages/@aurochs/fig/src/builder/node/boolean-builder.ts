/**
 * @file Boolean operation node builder
 *
 * BOOLEAN_OPERATION nodes combine multiple shapes using boolean operations:
 * - UNION: Combine shapes
 * - SUBTRACT: Remove overlapping areas
 * - INTERSECT: Keep only overlapping areas
 * - EXCLUDE: Keep only non-overlapping areas
 */

import { createTranslationMatrix } from "../../matrix";
import type { Color, Paint } from "../types";

export type BooleanOperationType = "UNION" | "SUBTRACT" | "INTERSECT" | "EXCLUDE";

/** Boolean operation type values matching Figma schema */
export const BOOLEAN_OPERATION_TYPE_VALUES: Record<BooleanOperationType, number> = {
  UNION: 0,
  SUBTRACT: 1,
  INTERSECT: 2,
  EXCLUDE: 3,
};

export type BooleanOperationNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly booleanOperation: { value: number; name: BooleanOperationType };
  readonly size?: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly fillPaints?: readonly Paint[];
  readonly visible: boolean;
  readonly opacity: number;
};

/** Boolean operation node builder instance */
export type BooleanOperationNodeBuilder = {
  name: (name: string) => BooleanOperationNodeBuilder;
  operation: (op: BooleanOperationType) => BooleanOperationNodeBuilder;
  union: () => BooleanOperationNodeBuilder;
  subtract: () => BooleanOperationNodeBuilder;
  intersect: () => BooleanOperationNodeBuilder;
  exclude: () => BooleanOperationNodeBuilder;
  size: (width: number, height: number) => BooleanOperationNodeBuilder;
  position: (x: number, y: number) => BooleanOperationNodeBuilder;
  fill: (color: Color) => BooleanOperationNodeBuilder;
  visible: (v: boolean) => BooleanOperationNodeBuilder;
  opacity: (o: number) => BooleanOperationNodeBuilder;
  build: () => BooleanOperationNodeData;
};

/** Build fill paints from color */
function buildBooleanFillPaints(fillColor: Color | undefined): readonly Paint[] | undefined {
  if (!fillColor) {
    return undefined;
  }
  return [{ type: { value: 0, name: "SOLID" }, color: fillColor, opacity: 1, visible: true, blendMode: { value: 1, name: "NORMAL" } }];
}

/** Build size from optional dimensions */
function buildBooleanSize(width: number | undefined, height: number | undefined): { x: number; y: number } | undefined {
  if (width !== undefined && height !== undefined) {
    return { x: width, y: height };
  }
  return undefined;
}

/** Create a boolean operation node builder */
function createBooleanOperationNodeBuilder(localID: number, parentID: number): BooleanOperationNodeBuilder {
  const state = {
    name: "Boolean",
    operation: "UNION" as BooleanOperationType,
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    x: 0,
    y: 0,
    fillColor: undefined as Color | undefined,
    visible: true,
    opacity: 1,
  };

  const builder: BooleanOperationNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    /** Set the boolean operation type */
    operation(op: BooleanOperationType) { state.operation = op; return builder; },
    /** Alias for operation("UNION") */
    union() { return builder.operation("UNION"); },
    /** Alias for operation("SUBTRACT") */
    subtract() { return builder.operation("SUBTRACT"); },
    /** Alias for operation("INTERSECT") */
    intersect() { return builder.operation("INTERSECT"); },
    /** Alias for operation("EXCLUDE") */
    exclude() { return builder.operation("EXCLUDE"); },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    fill(color: Color) { state.fillColor = color; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },

    build(): BooleanOperationNodeData {
      return {
        localID,
        parentID,
        name: state.name,
        booleanOperation: { value: BOOLEAN_OPERATION_TYPE_VALUES[state.operation], name: state.operation },
        size: buildBooleanSize(state.width, state.height),
        transform: createTranslationMatrix(state.x, state.y),
        fillPaints: buildBooleanFillPaints(state.fillColor),
        visible: state.visible,
        opacity: state.opacity,
      };
    },
  };

  return builder;
}

/**
 * Create a new Boolean operation node builder
 */
export function booleanNode(localID: number, parentID: number): BooleanOperationNodeBuilder {
  return createBooleanOperationNodeBuilder(localID, parentID);
}
