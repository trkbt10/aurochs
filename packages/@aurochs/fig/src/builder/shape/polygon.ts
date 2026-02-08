/**
 * @file Polygon node builder
 */

import { BaseShapeBuilder } from "./base";
import type { PolygonNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

export class PolygonNodeBuilder extends BaseShapeBuilder<PolygonNodeData> {
  private _pointCount: number;

  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Polygon";
    this._pointCount = 6; // Default hexagon
    // Default fill
    this._fillColor = { r: 0.4, g: 0.6, b: 1, a: 1 }; // Blue
  }

  /**
   * Set number of sides
   */
  sides(count: number): this {
    this._pointCount = Math.max(3, Math.round(count));
    return this;
  }

  build(): PolygonNodeData {
    const base = this.buildBaseData();
    return {
      ...base,
      nodeType: SHAPE_NODE_TYPES.REGULAR_POLYGON,
      pointCount: this._pointCount,
    };
  }
}

/**
 * Create a new Polygon node builder
 */
export function polygonNode(localID: number, parentID: number): PolygonNodeBuilder {
  return new PolygonNodeBuilder(localID, parentID);
}
