/**
 * @file Ellipse node builder
 */

import { createBaseShapeState, attachBaseShapeMethods, buildBaseData, type BaseShapeBuilderMethods } from "./base";
import type { EllipseNodeData, ArcData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

/** Ellipse node builder instance */
export type EllipseNodeBuilder = BaseShapeBuilderMethods<EllipseNodeBuilder> & {
  arc: (startDegrees: number, endDegrees: number) => EllipseNodeBuilder;
  innerRadius: (ratio: number) => EllipseNodeBuilder;
  build: () => EllipseNodeData;
};

/** Build arc data from extra state */
function buildArcData(extra: { arcStartAngle?: number; arcEndAngle?: number; innerRadius: number }): ArcData | undefined {
  const hasArcData = extra.arcStartAngle !== undefined || extra.arcEndAngle !== undefined || extra.innerRadius > 0;
  if (!hasArcData) {
    return undefined;
  }
  return {
    startingAngle: extra.arcStartAngle ?? 0,
    endingAngle: extra.arcEndAngle ?? Math.PI * 2,
    innerRadius: extra.innerRadius,
  };
}

/** Create an ellipse node builder */
function createEllipseNodeBuilder(localID: number, parentID: number): EllipseNodeBuilder {
  const state = createBaseShapeState(localID, parentID);
  state.name = "Ellipse";
  state.fillColor = { r: 0.8, g: 0.8, b: 0.8, a: 1 };
  const extra = { arcStartAngle: undefined as number | undefined, arcEndAngle: undefined as number | undefined, innerRadius: 0 };

  const builder = {} as EllipseNodeBuilder;
  Object.assign(builder, attachBaseShapeMethods(state, builder), {
    arc(startDegrees: number, endDegrees: number) {
      extra.arcStartAngle = (startDegrees * Math.PI) / 180;
      extra.arcEndAngle = (endDegrees * Math.PI) / 180;
      return builder;
    },
    innerRadius(ratio: number) {
      extra.innerRadius = Math.max(0, Math.min(1, ratio));
      return builder;
    },
    build(): EllipseNodeData {
      return { ...buildBaseData(state), nodeType: SHAPE_NODE_TYPES.ELLIPSE, arcData: buildArcData(extra) };
    },
  });

  return builder;
}

/**
 * Create a new Ellipse node builder
 */
export function ellipseNode(localID: number, parentID: number): EllipseNodeBuilder {
  return createEllipseNodeBuilder(localID, parentID);
}
