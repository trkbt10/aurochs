/**
 * @file Base shape builder abstract class
 */

import type { Color, Paint, Stroke } from "../types";
import type { EffectData } from "../effect/types";
import type { BaseShapeNodeData } from "./types";
import {
  STROKE_CAP_VALUES,
  STROKE_JOIN_VALUES,
  STROKE_ALIGN_VALUES,
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  CONSTRAINT_TYPE_VALUES,
  toEnumValue,
  type StrokeCap,
  type StrokeJoin,
  type StrokeAlign,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
} from "../../constants";

export abstract class BaseShapeBuilder<TData extends BaseShapeNodeData> {
  protected _localID: number;
  protected _parentID: number;
  protected _name: string;
  protected _width: number;
  protected _height: number;
  protected _x: number;
  protected _y: number;
  protected _rotation: number; // degrees
  protected _fillColor?: Color;
  protected _strokeColor?: Color;
  protected _strokeWeight?: number;
  protected _strokeCap?: StrokeCap;
  protected _strokeJoin?: StrokeJoin;
  protected _strokeAlign?: StrokeAlign;
  protected _dashPattern?: number[];
  protected _visible: boolean;
  protected _opacity: number;
  // Child constraints
  protected _stackPositioning?: StackPositioning;
  protected _stackPrimarySizing?: StackSizing;
  protected _stackCounterSizing?: StackSizing;
  protected _horizontalConstraint?: ConstraintType;
  protected _verticalConstraint?: ConstraintType;
  // Effects
  protected _effects?: readonly EffectData[];

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Shape";
    this._width = 100;
    this._height = 100;
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

  fill(color: Color): this {
    this._fillColor = color;
    return this;
  }

  noFill(): this {
    this._fillColor = undefined;
    return this;
  }

  stroke(color: Color): this {
    this._strokeColor = color;
    return this;
  }

  strokeWeight(weight: number): this {
    this._strokeWeight = weight;
    return this;
  }

  strokeCap(cap: StrokeCap): this {
    this._strokeCap = cap;
    return this;
  }

  strokeJoin(join: StrokeJoin): this {
    this._strokeJoin = join;
    return this;
  }

  strokeAlign(align: StrokeAlign): this {
    this._strokeAlign = align;
    return this;
  }

  dashPattern(pattern: number[]): this {
    this._dashPattern = pattern;
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

  // Child constraint methods
  positioning(mode: StackPositioning): this {
    this._stackPositioning = mode;
    return this;
  }

  primarySizing(sizing: StackSizing): this {
    this._stackPrimarySizing = sizing;
    return this;
  }

  counterSizing(sizing: StackSizing): this {
    this._stackCounterSizing = sizing;
    return this;
  }

  horizontalConstraint(constraint: ConstraintType): this {
    this._horizontalConstraint = constraint;
    return this;
  }

  verticalConstraint(constraint: ConstraintType): this {
    this._verticalConstraint = constraint;
    return this;
  }

  /**
   * Add effects (drop shadow, inner shadow, blur, etc.)
   */
  effects(effects: readonly EffectData[]): this {
    this._effects = effects;
    return this;
  }

  /**
   * Build the transformation matrix
   */
  protected buildTransform(): {
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
    // Rotation matrix (degrees to radians)
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

  /**
   * Build fill paints array
   */
  protected buildFillPaints(): readonly Paint[] {
    if (!this._fillColor) {
      return [];
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

  /**
   * Build stroke paints array
   */
  protected buildStrokePaints(): readonly Stroke[] | undefined {
    if (!this._strokeColor) {
      return undefined;
    }
    return [
      {
        type: { value: 0, name: "SOLID" },
        color: this._strokeColor,
        opacity: 1,
        visible: true,
        blendMode: { value: 1, name: "NORMAL" },
      },
    ];
  }

  /**
   * Build base node data (shared by all shapes)
   */
  protected buildBaseData(): BaseShapeNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      size: { x: this._width, y: this._height },
      transform: this.buildTransform(),
      fillPaints: this.buildFillPaints(),
      strokePaints: this.buildStrokePaints(),
      strokeWeight: this._strokeWeight ?? 0,
      strokeCap: toEnumValue(this._strokeCap, STROKE_CAP_VALUES),
      strokeJoin: toEnumValue(this._strokeJoin, STROKE_JOIN_VALUES) ?? { value: 0, name: "MITER" },
      strokeAlign: toEnumValue(this._strokeAlign, STROKE_ALIGN_VALUES) ?? { value: 0, name: "CENTER" },
      dashPattern: this._dashPattern,
      visible: this._visible,
      opacity: this._opacity,
      stackPositioning: toEnumValue(this._stackPositioning, STACK_POSITIONING_VALUES),
      stackPrimarySizing: toEnumValue(this._stackPrimarySizing, STACK_SIZING_VALUES),
      stackCounterSizing: toEnumValue(this._stackCounterSizing, STACK_SIZING_VALUES),
      horizontalConstraint: toEnumValue(this._horizontalConstraint, CONSTRAINT_TYPE_VALUES),
      verticalConstraint: toEnumValue(this._verticalConstraint, CONSTRAINT_TYPE_VALUES),
      effects: this._effects,
    };
  }

  abstract build(): TData;
}
