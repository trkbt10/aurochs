/**
 * @file Shape node builders with fluent API
 *
 * Provides builders for:
 * - ELLIPSE (type 9) - Circles and ellipses
 * - LINE (type 8) - Line segments
 * - STAR (type 7) - Star shapes
 * - REGULAR_POLYGON (type 11) - Regular polygons
 * - VECTOR (type 6) - Custom vector paths
 *
 * Node type values from Figma's schema:
 * BOOLEAN_OPERATION = 5, VECTOR = 6, STAR = 7, LINE = 8,
 * ELLIPSE = 9, RECTANGLE = 10, REGULAR_POLYGON = 11, ROUNDED_RECTANGLE = 12
 */

import type { Color, Paint } from "./text-builder";
import {
  SHAPE_NODE_TYPES,
  STROKE_CAP_VALUES,
  STROKE_JOIN_VALUES,
  STROKE_ALIGN_VALUES,
  WINDING_RULE_VALUES,
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  CONSTRAINT_TYPE_VALUES,
  toEnumValue,
  type StrokeCap,
  type StrokeJoin,
  type StrokeAlign,
  type WindingRule,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
} from "../constants";

// Note: StrokeCap, StrokeJoin, StrokeAlign, SHAPE_NODE_TYPES should be imported
// directly from "@oxen/fig/constants" by consumers.

// =============================================================================
// Stroke Types
// =============================================================================

export type Stroke = {
  readonly type: { value: number; name: string };
  readonly color?: Color;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: { value: number; name: string };
};

// =============================================================================
// Arc Data (for ELLIPSE)
// =============================================================================

export type ArcData = {
  readonly startingAngle: number; // radians
  readonly endingAngle: number; // radians
  readonly innerRadius: number; // 0-1 ratio (0 = full ellipse, >0 = donut)
};


// =============================================================================
// Base Shape Node Data
// =============================================================================

export type BaseShapeNodeData = {
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
  readonly fillPaints: readonly Paint[];
  readonly strokePaints?: readonly Stroke[];
  readonly strokeWeight?: number;
  readonly strokeCap?: { value: number; name: StrokeCap };
  readonly strokeJoin?: { value: number; name: StrokeJoin };
  readonly strokeAlign?: { value: number; name: StrokeAlign };
  readonly dashPattern?: readonly number[];
  readonly visible: boolean;
  readonly opacity: number;
  // Child constraint properties
  readonly stackPositioning?: { value: number; name: StackPositioning };
  readonly stackPrimarySizing?: { value: number; name: StackSizing };
  readonly stackCounterSizing?: { value: number; name: StackSizing };
  readonly horizontalConstraint?: { value: number; name: ConstraintType };
  readonly verticalConstraint?: { value: number; name: ConstraintType };
};

// =============================================================================
// Ellipse Node Data
// =============================================================================

export type EllipseNodeData = BaseShapeNodeData & {
  readonly nodeType: 9;
  readonly arcData?: ArcData;
};

// =============================================================================
// Line Node Data
// =============================================================================

export type LineNodeData = BaseShapeNodeData & {
  readonly nodeType: 8;
};

// =============================================================================
// Star Node Data
// =============================================================================

export type StarNodeData = BaseShapeNodeData & {
  readonly nodeType: 7;
  readonly pointCount: number;
  readonly starInnerRadius: number; // 0-1 ratio
};

// =============================================================================
// Polygon Node Data
// =============================================================================

export type PolygonNodeData = BaseShapeNodeData & {
  readonly nodeType: 11;
  readonly pointCount: number;
};

// =============================================================================
// Vector Node Data
// =============================================================================

export type VectorNodeData = BaseShapeNodeData & {
  readonly nodeType: 6;
  readonly vectorData?: {
    readonly vectorNetworkBlob?: number;
    readonly normalizedSize?: { x: number; y: number };
  };
  readonly handleMirroring?: { value: number; name: string };
};

// =============================================================================
// Abstract Shape Builder Base
// =============================================================================

abstract class BaseShapeBuilder<TData extends BaseShapeNodeData> {
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
      strokeWeight: this._strokeWeight,
      strokeCap: toEnumValue(this._strokeCap, STROKE_CAP_VALUES),
      strokeJoin: toEnumValue(this._strokeJoin, STROKE_JOIN_VALUES),
      strokeAlign: toEnumValue(this._strokeAlign, STROKE_ALIGN_VALUES),
      dashPattern: this._dashPattern,
      visible: this._visible,
      opacity: this._opacity,
      stackPositioning: toEnumValue(this._stackPositioning, STACK_POSITIONING_VALUES),
      stackPrimarySizing: toEnumValue(this._stackPrimarySizing, STACK_SIZING_VALUES),
      stackCounterSizing: toEnumValue(this._stackCounterSizing, STACK_SIZING_VALUES),
      horizontalConstraint: toEnumValue(this._horizontalConstraint, CONSTRAINT_TYPE_VALUES),
      verticalConstraint: toEnumValue(this._verticalConstraint, CONSTRAINT_TYPE_VALUES),
    };
  }

  abstract build(): TData;
}

// =============================================================================
// Ellipse Node Builder
// =============================================================================

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

// =============================================================================
// Line Node Builder
// =============================================================================

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

// =============================================================================
// Star Node Builder
// =============================================================================

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

// =============================================================================
// Polygon Node Builder
// =============================================================================

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

// =============================================================================
// Vector Node Builder
// =============================================================================

export class VectorNodeBuilder extends BaseShapeBuilder<VectorNodeData> {
  private _windingRule: WindingRule;
  private _vectorNetworkBlob?: number;

  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Vector";
    this._windingRule = "NONZERO";
    // Default fill
    this._fillColor = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
  }

  /**
   * Set winding rule for path filling
   */
  windingRule(rule: WindingRule): this {
    this._windingRule = rule;
    return this;
  }

  /**
   * Set vector network blob reference
   * (Used for complex vector data stored in blobs)
   */
  vectorNetworkBlob(blobIndex: number): this {
    this._vectorNetworkBlob = blobIndex;
    return this;
  }

  private buildVectorData(): VectorNodeData["vectorData"] {
    if (this._vectorNetworkBlob === undefined) {
      return undefined;
    }
    return {
      vectorNetworkBlob: this._vectorNetworkBlob,
      normalizedSize: { x: this._width, y: this._height },
    };
  }

  build(): VectorNodeData {
    return {
      ...this.buildBaseData(),
      nodeType: SHAPE_NODE_TYPES.VECTOR,
      vectorData: this.buildVectorData(),
      handleMirroring: { value: WINDING_RULE_VALUES[this._windingRule], name: this._windingRule },
    };
  }
}

// =============================================================================
// Rounded Rectangle Node Builder (added for completeness)
// =============================================================================

export type RoundedRectangleNodeData = BaseShapeNodeData & {
  readonly nodeType: 12;
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly [number, number, number, number];
};

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

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new Ellipse node builder
 */
export function ellipseNode(localID: number, parentID: number): EllipseNodeBuilder {
  return new EllipseNodeBuilder(localID, parentID);
}

/**
 * Create a new Line node builder
 */
export function lineNode(localID: number, parentID: number): LineNodeBuilder {
  return new LineNodeBuilder(localID, parentID);
}

/**
 * Create a new Star node builder
 */
export function starNode(localID: number, parentID: number): StarNodeBuilder {
  return new StarNodeBuilder(localID, parentID);
}

/**
 * Create a new Polygon node builder
 */
export function polygonNode(localID: number, parentID: number): PolygonNodeBuilder {
  return new PolygonNodeBuilder(localID, parentID);
}

/**
 * Create a new Vector node builder
 */
export function vectorNode(localID: number, parentID: number): VectorNodeBuilder {
  return new VectorNodeBuilder(localID, parentID);
}

/**
 * Create a new Rounded Rectangle node builder
 */
export function roundedRectNode(localID: number, parentID: number): RoundedRectangleNodeBuilder {
  return new RoundedRectangleNodeBuilder(localID, parentID);
}
