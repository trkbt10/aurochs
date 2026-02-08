/**
 * @file Rounded rectangle node builder
 */

import { BaseShapeBuilder } from "./base";
import type { RoundedRectangleNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

export class RoundedRectangleNodeBuilder extends BaseShapeBuilder<RoundedRectangleNodeData> {
  private _cornerRadius?: number;
  private _cornerRadii?: [number, number, number, number];

  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Rectangle";
    // Default fill
    this._fillColor = { r: 0.9, g: 0.9, b: 0.9, a: 1 };
  }

  /**
   * Set uniform corner radius
   */
  cornerRadius(radius: number): this {
    this._cornerRadius = radius;
    this._cornerRadii = undefined;
    return this;
  }

  /**
   * Set individual corner radii [topLeft, topRight, bottomRight, bottomLeft]
   */
  corners(radii: [number, number, number, number]): this {
    this._cornerRadii = radii;
    this._cornerRadius = undefined;
    return this;
  }

  build(): RoundedRectangleNodeData {
    const base = this.buildBaseData();
    return {
      ...base,
      nodeType: SHAPE_NODE_TYPES.ROUNDED_RECTANGLE,
      cornerRadius: this._cornerRadius,
      rectangleCornerRadii: this._cornerRadii,
    };
  }
}

/**
 * Create a new Rounded Rectangle node builder
 */
export function roundedRectNode(localID: number, parentID: number): RoundedRectangleNodeBuilder {
  return new RoundedRectangleNodeBuilder(localID, parentID);
}
