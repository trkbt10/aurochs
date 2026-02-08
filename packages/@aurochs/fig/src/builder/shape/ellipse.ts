/**
 * @file Ellipse node builder
 */

import { BaseShapeBuilder } from "./base";
import type { EllipseNodeData, ArcData } from "./types";
import { SHAPE_NODE_TYPES } from "../../constants";

export class EllipseNodeBuilder extends BaseShapeBuilder<EllipseNodeData> {
  private _arcStartAngle?: number;
  private _arcEndAngle?: number;
  private _innerRadius: number;

  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Ellipse";
    this._innerRadius = 0;
    // Default fill for ellipse
    this._fillColor = { r: 0.8, g: 0.8, b: 0.8, a: 1 };
  }

  /**
   * Set arc start and end angles (for pie/arc shapes)
   * @param startDegrees Start angle in degrees (0 = right, 90 = bottom)
   * @param endDegrees End angle in degrees
   */
  arc(startDegrees: number, endDegrees: number): this {
    this._arcStartAngle = (startDegrees * Math.PI) / 180;
    this._arcEndAngle = (endDegrees * Math.PI) / 180;
    return this;
  }

  /**
   * Set inner radius ratio for donut shapes
   * @param ratio Inner radius ratio (0 = full ellipse, 0.5 = donut with 50% hole)
   */
  innerRadius(ratio: number): this {
    this._innerRadius = Math.max(0, Math.min(1, ratio));
    return this;
  }

  private buildArcData(): ArcData | undefined {
    const hasArcData =
      this._arcStartAngle !== undefined ||
      this._arcEndAngle !== undefined ||
      this._innerRadius > 0;
    if (!hasArcData) {
      return undefined;
    }
    return {
      startingAngle: this._arcStartAngle ?? 0,
      endingAngle: this._arcEndAngle ?? Math.PI * 2,
      innerRadius: this._innerRadius,
    };
  }

  build(): EllipseNodeData {
    return {
      ...this.buildBaseData(),
      nodeType: SHAPE_NODE_TYPES.ELLIPSE,
      arcData: this.buildArcData(),
    };
  }
}

/**
 * Create a new Ellipse node builder
 */
export function ellipseNode(localID: number, parentID: number): EllipseNodeBuilder {
  return new EllipseNodeBuilder(localID, parentID);
}
