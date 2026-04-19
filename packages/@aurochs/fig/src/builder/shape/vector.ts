/**
 * @file Vector node builder
 */

import { createBaseShapeState, attachBaseShapeMethods, buildBaseData, colorOrPaintToPaint, type BaseShapeBuilderMethods } from "./base";
import type { VectorNodeData } from "./types";
import { SHAPE_NODE_TYPES, WINDING_RULE_VALUES, type WindingRule } from "../../constants";

/** Vector node builder instance */
export interface VectorNodeBuilder extends BaseShapeBuilderMethods<VectorNodeBuilder> {
  windingRule: (rule: WindingRule) => VectorNodeBuilder;
  vectorNetworkBlob: (blobIndex: number) => VectorNodeBuilder;
  build: () => VectorNodeData;
}

/** Build vector data from extra state */
function buildVectorData(
  extra: { vectorNetworkBlob?: number },
  state: { width: number; height: number },
): VectorNodeData["vectorData"] {
  if (extra.vectorNetworkBlob === undefined) {
    return undefined;
  }
  return {
    vectorNetworkBlob: extra.vectorNetworkBlob,
    normalizedSize: { x: state.width, y: state.height },
  };
}

/** Create a vector node builder */
function createVectorNodeBuilder(localID: number, parentID: number): VectorNodeBuilder {
  const state = createBaseShapeState(localID, parentID);
  state.name = "Vector";
  state.fillPaints = [colorOrPaintToPaint({ r: 0.5, g: 0.5, b: 0.5, a: 1 })];
  const extra: { windingRule: WindingRule; vectorNetworkBlob: number | undefined } = {
    windingRule: "NONZERO",
    vectorNetworkBlob: undefined,
  };

  const builder = {} as VectorNodeBuilder;
  Object.assign(builder, attachBaseShapeMethods(state, builder), {
    /** Set winding rule for path filling */
    windingRule(rule: WindingRule) {
      extra.windingRule = rule;
      return builder;
    },
    /** Set vector network blob reference */
    vectorNetworkBlob(blobIndex: number) {
      extra.vectorNetworkBlob = blobIndex;
      return builder;
    },
    build(): VectorNodeData {
      const vectorData = buildVectorData(extra, state);
      return {
        ...buildBaseData(state),
        nodeType: SHAPE_NODE_TYPES.VECTOR,
        vectorData,
        handleMirroring: { value: WINDING_RULE_VALUES[extra.windingRule], name: extra.windingRule },
      };
    },
  });

  return builder;
}

/**
 * Create a new Vector node builder
 */
export function vectorNode(localID: number, parentID: number): VectorNodeBuilder {
  return createVectorNodeBuilder(localID, parentID);
}
