/**
 * @file Star node builder
 */

import { createBaseShapeState, attachBaseShapeMethods, buildBaseData, colorOrPaintToPaint, type BaseShapeBuilderMethods } from "./base";
import type { StarNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

/** Star node builder instance */
export type StarNodeBuilder = BaseShapeBuilderMethods<StarNodeBuilder> & {
  points: (count: number) => StarNodeBuilder;
  innerRadius: (ratio: number) => StarNodeBuilder;
  build: () => StarNodeData;
};

/** Create a star node builder */
function createStarNodeBuilder(localID: number, parentID: number): StarNodeBuilder {
  const state = createBaseShapeState(localID, parentID);
  state.name = "Star";
  state.fillPaints = [colorOrPaintToPaint({ r: 1, g: 0.8, b: 0, a: 1 })];
  const extra = { pointCount: 5, starInnerRadius: 0.382 };

  const builder = {} as StarNodeBuilder;
  Object.assign(builder, attachBaseShapeMethods(state, builder), {
    /** Set number of points */
    points(count: number) {
      extra.pointCount = Math.max(3, Math.round(count));
      return builder;
    },
    /** Set inner radius ratio (0-1, lower = sharper points) */
    innerRadius(ratio: number) {
      extra.starInnerRadius = Math.max(0, Math.min(1, ratio));
      return builder;
    },
    build(): StarNodeData {
      return {
        ...buildBaseData(state),
        nodeType: SHAPE_NODE_TYPES.STAR,
        pointCount: extra.pointCount,
        starInnerRadius: extra.starInnerRadius,
      };
    },
  });

  return builder;
}

/**
 * Create a new Star node builder
 */
export function starNode(localID: number, parentID: number): StarNodeBuilder {
  return createStarNodeBuilder(localID, parentID);
}
