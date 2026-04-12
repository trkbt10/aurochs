/**
 * @file Rectangle node builder
 *
 * Creates a basic rectangle without corner radius.
 * For rectangles with rounded corners, use roundedRectNode.
 */

import { createBaseShapeState, attachBaseShapeMethods, buildBaseData, colorOrPaintToPaint, type BaseShapeBuilderMethods } from "./base";
import type { RectangleNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

/** Rectangle node builder instance */
export type RectangleNodeBuilder = BaseShapeBuilderMethods<RectangleNodeBuilder> & {
  build: () => RectangleNodeData;
};

/** Create a rectangle node builder */
function createRectangleNodeBuilder(localID: number, parentID: number): RectangleNodeBuilder {
  const state = createBaseShapeState(localID, parentID);
  state.name = "Rectangle";
  state.fillPaints = [colorOrPaintToPaint({ r: 0.9, g: 0.9, b: 0.9, a: 1 })];

  const builder = {} as RectangleNodeBuilder;
  Object.assign(builder, attachBaseShapeMethods(state, builder), {
    build(): RectangleNodeData {
      return { ...buildBaseData(state), nodeType: SHAPE_NODE_TYPES.RECTANGLE };
    },
  });

  return builder;
}

/**
 * Create a new Rectangle node builder
 */
export function rectNode(localID: number, parentID: number): RectangleNodeBuilder {
  return createRectangleNodeBuilder(localID, parentID);
}
