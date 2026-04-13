/**
 * @file Line node builder
 */

import { createBaseShapeState, attachBaseShapeMethods, buildBaseData, type BaseShapeBuilderMethods } from "./base";
import type { LineNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

/** Line node builder instance */
export interface LineNodeBuilder extends BaseShapeBuilderMethods<LineNodeBuilder> {
  length: (len: number) => LineNodeBuilder;
  build: () => LineNodeData;
}

/** Create a line node builder */
function createLineNodeBuilder(localID: number, parentID: number): LineNodeBuilder {
  const state = createBaseShapeState(localID, parentID);
  state.name = "Line";
  state.fillPaints = [];
  state.strokeColor = { r: 0, g: 0, b: 0, a: 1 };
  state.strokeWeight = 1;
  state.height = 0;

  const builder = {} as LineNodeBuilder;
  Object.assign(builder, attachBaseShapeMethods(state, builder), {
    /** Set line length */
    length(len: number) {
      state.width = len;
      return builder;
    },
    build(): LineNodeData {
      return { ...buildBaseData(state), nodeType: SHAPE_NODE_TYPES.LINE };
    },
  });

  return builder;
}

/**
 * Create a new Line node builder
 */
export function lineNode(localID: number, parentID: number): LineNodeBuilder {
  return createLineNodeBuilder(localID, parentID);
}
