/**
 * @file Group node builder
 *
 * GROUP nodes are containers for grouping multiple nodes together.
 * Unlike FRAME, GROUP nodes don't have their own fill or background.
 */

import type { Color, Paint } from "../types";
import { NODE_TYPE_VALUES } from "../../constants";

export type GroupNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly size?: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly visible: boolean;
  readonly opacity: number;
};

export class GroupNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _width?: number;
  private _height?: number;
  private _x: number;
  private _y: number;
  private _rotation: number;
  private _visible: boolean;
  private _opacity: number;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Group";
    this._x = 0;
    this._y = 0;
    this._rotation = 0;
    this._visible = true;
    this._opacity = 1;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set the size of the group.
   * Note: In Figma, group size is usually auto-calculated from children bounds.
   * Only set this if you know the exact bounds.
   */
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

  rotation(degrees: number): this {
    this._rotation = degrees;
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

  private buildTransform(): {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  } {
    if (this._rotation === 0) {
      return {
        m00: 1,
        m01: 0,
        m02: this._x,
        m10: 0,
        m11: 1,
        m12: this._y,
      };
    }
    const rad = (this._rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      m00: cos,
      m01: -sin,
      m02: this._x,
      m10: sin,
      m11: cos,
      m12: this._y,
    };
  }

  build(): GroupNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      size: this._width !== undefined && this._height !== undefined
        ? { x: this._width, y: this._height }
        : undefined,
      transform: this.buildTransform(),
      visible: this._visible,
      opacity: this._opacity,
    };
  }
}

/**
 * Create a new Group node builder
 */
export function groupNode(localID: number, parentID: number): GroupNodeBuilder {
  return new GroupNodeBuilder(localID, parentID);
}
