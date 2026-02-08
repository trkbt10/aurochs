/**
 * @file Rectangle node builder
 *
 * Creates a basic rectangle without corner radius.
 * For rectangles with rounded corners, use RoundedRectangleNodeBuilder.
 */

import { BaseShapeBuilder } from "./base";
import type { RectangleNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

export class RectangleNodeBuilder extends BaseShapeBuilder<RectangleNodeData> {
  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Rectangle";
    // Default fill
    this._fillColor = { r: 0.9, g: 0.9, b: 0.9, a: 1 };
  }

  build(): RectangleNodeData {
    const base = this.buildBaseData();
    return {
      ...base,
      nodeType: SHAPE_NODE_TYPES.RECTANGLE,
    };
  }
}

/**
 * Create a new Rectangle node builder
 */
export function rectNode(localID: number, parentID: number): RectangleNodeBuilder {
  return new RectangleNodeBuilder(localID, parentID);
}
