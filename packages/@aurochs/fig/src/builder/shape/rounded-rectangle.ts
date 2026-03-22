/**
 * @file Rounded rectangle node builder
 */

import { createBaseShapeState, attachBaseShapeMethods, buildBaseData, type BaseShapeBuilderMethods } from "./base";
import type { RoundedRectangleNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

/** Rounded rectangle node builder instance */
export type RoundedRectangleNodeBuilder = BaseShapeBuilderMethods<RoundedRectangleNodeBuilder> & {
  cornerRadius: (radius: number) => RoundedRectangleNodeBuilder;
  corners: (radii: [number, number, number, number]) => RoundedRectangleNodeBuilder;
  build: () => RoundedRectangleNodeData;
};

/** Create a rounded rectangle node builder */
function createRoundedRectangleNodeBuilder(localID: number, parentID: number): RoundedRectangleNodeBuilder {
  const state = createBaseShapeState(localID, parentID);
  state.name = "Rectangle";
  state.fillColor = { r: 0.9, g: 0.9, b: 0.9, a: 1 };
  const extra = { cornerRadius: undefined as number | undefined, cornerRadii: undefined as [number, number, number, number] | undefined };

  const builder = {} as RoundedRectangleNodeBuilder;
  Object.assign(builder, attachBaseShapeMethods(state, builder), {
    /** Set uniform corner radius */
    cornerRadius(radius: number) {
      extra.cornerRadius = radius;
      extra.cornerRadii = undefined;
      return builder;
    },

    /** Set individual corner radii [topLeft, topRight, bottomRight, bottomLeft] */
    corners(radii: [number, number, number, number]) {
      extra.cornerRadii = radii;
      extra.cornerRadius = undefined;
      return builder;
    },

    build(): RoundedRectangleNodeData {
      return {
        ...buildBaseData(state),
        nodeType: SHAPE_NODE_TYPES.ROUNDED_RECTANGLE,
        cornerRadius: extra.cornerRadius,
        rectangleCornerRadii: extra.cornerRadii,
      };
    },
  });

  return builder;
}

/**
 * Create a new Rounded Rectangle node builder
 */
export function roundedRectNode(localID: number, parentID: number): RoundedRectangleNodeBuilder {
  return createRoundedRectangleNodeBuilder(localID, parentID);
}
