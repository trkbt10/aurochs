/**
 * @file Star node builder
 */

import { BaseShapeBuilder } from "./base";
import type { StarNodeData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

export class StarNodeBuilder extends BaseShapeBuilder<StarNodeData> {
  private _pointCount: number;
  private _starInnerRadius: number;

  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Star";
    this._pointCount = 5;
    this._starInnerRadius = 0.382; // Golden ratio default
    // Default fill
    this._fillColor = { r: 1, g: 0.8, b: 0, a: 1 }; // Yellow/gold
  }

  /**
   * Set number of points
   */
  points(count: number): this {
    this._pointCount = Math.max(3, Math.round(count));
    return this;
  }

  /**
   * Set inner radius ratio
   * @param ratio Inner radius ratio (0-1, lower = sharper points)
   */
  innerRadius(ratio: number): this {
    this._starInnerRadius = Math.max(0, Math.min(1, ratio));
    return this;
  }

  build(): StarNodeData {
    const base = this.buildBaseData();
    return {
      ...base,
      nodeType: SHAPE_NODE_TYPES.STAR,
      pointCount: this._pointCount,
      starInnerRadius: this._starInnerRadius,
    };
  }
}

/**
 * Create a new Star node builder
 */
export function starNode(localID: number, parentID: number): StarNodeBuilder {
  return new StarNodeBuilder(localID, parentID);
}
