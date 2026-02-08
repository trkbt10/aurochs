/**
 * @file Boolean operation node builder
 *
 * BOOLEAN_OPERATION nodes combine multiple shapes using boolean operations:
 * - UNION: Combine shapes
 * - SUBTRACT: Remove overlapping areas
 * - INTERSECT: Keep only overlapping areas
 * - EXCLUDE: Keep only non-overlapping areas
 */

import type { Color, Paint } from "../types";
import { NODE_TYPE_VALUES } from "../../constants";

export type BooleanOperationType = "UNION" | "SUBTRACT" | "INTERSECT" | "EXCLUDE";

/** Boolean operation type values matching Figma schema */
export const BOOLEAN_OPERATION_TYPE_VALUES: Record<BooleanOperationType, number> = {
  UNION: 0,
  SUBTRACT: 1,
  INTERSECT: 2,
  EXCLUDE: 3,
};

export type BooleanOperationNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly booleanOperation: { value: number; name: BooleanOperationType };
  readonly size?: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly fillPaints?: readonly Paint[];
  readonly visible: boolean;
  readonly opacity: number;
};

export class BooleanOperationNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _operation: BooleanOperationType;
  private _width?: number;
  private _height?: number;
  private _x: number;
  private _y: number;
  private _fillColor?: Color;
  private _visible: boolean;
  private _opacity: number;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Boolean";
    this._operation = "UNION";
    this._x = 0;
    this._y = 0;
    this._visible = true;
    this._opacity = 1;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set the boolean operation type
   */
  operation(op: BooleanOperationType): this {
    this._operation = op;
    return this;
  }

  /**
   * Alias for operation("UNION")
   */
  union(): this {
    return this.operation("UNION");
  }

  /**
   * Alias for operation("SUBTRACT")
   */
  subtract(): this {
    return this.operation("SUBTRACT");
  }

  /**
   * Alias for operation("INTERSECT")
   */
  intersect(): this {
    return this.operation("INTERSECT");
  }

  /**
   * Alias for operation("EXCLUDE")
   */
  exclude(): this {
    return this.operation("EXCLUDE");
  }

  size(width: number, height: number): this {
    this._width = width;
    this._height = height;
    return this;
  }

  position(x: number, y: number): this {
    this._x = x;
    this._y = y;
    return this;
  }

  fill(color: Color): this {
    this._fillColor = color;
    return this;
  }

  visible(v: boolean): this {
    this._visible = v;
    return this;
  }

  opacity(o: number): this {
    this._opacity = o;
    return this;
  }

  private buildFillPaints(): readonly Paint[] | undefined {
    if (!this._fillColor) {
      return undefined;
    }
    return [
      {
        type: { value: 0, name: "SOLID" },
        color: this._fillColor,
        opacity: 1,
        visible: true,
        blendMode: { value: 1, name: "NORMAL" },
      },
    ];
  }

  build(): BooleanOperationNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      booleanOperation: {
        value: BOOLEAN_OPERATION_TYPE_VALUES[this._operation],
        name: this._operation,
      },
      size: this._width !== undefined && this._height !== undefined
        ? { x: this._width, y: this._height }
        : undefined,
      transform: {
        m00: 1,
        m01: 0,
        m02: this._x,
        m10: 0,
        m11: 1,
        m12: this._y,
      },
      fillPaints: this.buildFillPaints(),
      visible: this._visible,
      opacity: this._opacity,
    };
  }
}

/**
 * Create a new Boolean operation node builder
 */
export function booleanNode(localID: number, parentID: number): BooleanOperationNodeBuilder {
  return new BooleanOperationNodeBuilder(localID, parentID);
}
