/**
 * @file Line node builder
 */

import { BaseShapeBuilder } from "./base";
import type { LineNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

export class LineNodeBuilder extends BaseShapeBuilder<LineNodeData> {
  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Line";
    // Lines typically have no fill
    this._fillColor = undefined;
    // Default stroke
    this._strokeColor = { r: 0, g: 0, b: 0, a: 1 };
    this._strokeWeight = 1;
    // Line width is length, height is stroke weight representation
    this._height = 0;
  }

  /**
   * Set line length
   */
  length(len: number): this {
    this._width = len;
    return this;
  }

  build(): LineNodeData {
    const base = this.buildBaseData();
    return {
      ...base,
      nodeType: SHAPE_NODE_TYPES.LINE,
    };
  }
}

/**
 * Create a new Line node builder
 */
export function lineNode(localID: number, parentID: number): LineNodeBuilder {
  return new LineNodeBuilder(localID, parentID);
}
