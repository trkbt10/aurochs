/**
 * @file Section node builder
 *
 * SECTION nodes are canvas-level organizational elements.
 * They help organize frames on a canvas and have a distinct background color.
 */

import type { Color } from "../types";
import { NODE_TYPE_VALUES } from "../../constants";

export type SectionNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly size: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly sectionContentsHidden?: boolean;
  readonly visible: boolean;
  readonly opacity: number;
};

export class SectionNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _width: number;
  private _height: number;
  private _x: number;
  private _y: number;
  private _contentsHidden: boolean;
  private _visible: boolean;
  private _opacity: number;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Section";
    this._width = 800;
    this._height = 600;
    this._x = 0;
    this._y = 0;
    this._contentsHidden = false;
    this._visible = true;
    this._opacity = 1;
  }

  name(name: string): this {
    this._name = name;
    return this;
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

  /**
   * Hide or show the section contents
   */
  contentsHidden(hidden: boolean = true): this {
    this._contentsHidden = hidden;
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

  build(): SectionNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      size: { x: this._width, y: this._height },
      transform: {
        m00: 1,
        m01: 0,
        m02: this._x,
        m10: 0,
        m11: 1,
        m12: this._y,
      },
      sectionContentsHidden: this._contentsHidden || undefined,
      visible: this._visible,
      opacity: this._opacity,
    };
  }
}

/**
 * Create a new Section node builder
 */
export function sectionNode(localID: number, parentID: number): SectionNodeBuilder {
  return new SectionNodeBuilder(localID, parentID);
}
