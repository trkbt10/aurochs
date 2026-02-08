/**
 * @file Instance (component instance) node builder
 */

import type { Color, Paint } from "../types";
import type { InstanceNodeData } from "./types";
import {
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  CONSTRAINT_TYPE_VALUES,
  toEnumValue,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
} from "../../constants";

type SymbolID = { sessionID: number; localID: number };

function normalizeSymbolID(symbolID: number | SymbolID): SymbolID {
  if (typeof symbolID === "number") {
    return { sessionID: 1, localID: symbolID };
  }
  return symbolID;
}

function buildFillPaintsOverride(fillColor: Color | undefined): Paint[] | undefined {
  if (!fillColor) {
    return undefined;
  }
  return [
    {
      type: { value: 0, name: "SOLID" },
      color: fillColor,
      opacity: 1,
      visible: true,
      blendMode: { value: 1, name: "NORMAL" },
    },
  ];
}

function optionalArray<T>(arr: readonly T[]): readonly T[] | undefined {
  return arr.length > 0 ? arr : undefined;
}

export class InstanceNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _symbolID: { sessionID: number; localID: number };
  private _width: number;
  private _height: number;
  private _x: number;
  private _y: number;
  private _visible: boolean;
  private _opacity: number;

  // Override fields
  private _fillColor?: Color;
  private _componentPropertyRefs: string[] = [];
  private _overriddenSymbolID?: SymbolID;

  // Child constraint fields
  private _stackPositioning?: StackPositioning;
  private _stackPrimarySizing?: StackSizing;
  private _stackCounterSizing?: StackSizing;
  private _horizontalConstraint?: ConstraintType;
  private _verticalConstraint?: ConstraintType;

  constructor(
    localID: number,
    parentID: number,
    symbolID: number | { sessionID: number; localID: number }
  ) {
    this._localID = localID;
    this._parentID = parentID;
    this._symbolID = normalizeSymbolID(symbolID);
    this._name = "Instance";
    this._width = 100;
    this._height = 100;
    this._x = 0;
    this._y = 0;
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

  visible(v: boolean): this {
    this._visible = v;
    return this;
  }

  opacity(o: number): this {
    this._opacity = o;
    return this;
  }

  // Override Methods
  /**
   * Override the background color of this instance
   */
  overrideBackground(c: Color): this {
    this._fillColor = c;
    return this;
  }

  /**
   * Override the symbol reference (for variant switching).
   * When set, the instance renders the overridden symbol's content
   * instead of the original symbolID.
   */
  overrideSymbol(symbolID: number | SymbolID): this {
    this._overriddenSymbolID = normalizeSymbolID(symbolID);
    return this;
  }

  /**
   * Add a component property reference (for text overrides, etc.)
   */
  addPropertyReference(ref: string): this {
    this._componentPropertyRefs.push(ref);
    return this;
  }

  // Child Constraint Methods
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

  build(): InstanceNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      symbolID: this._symbolID,
      size: { x: this._width, y: this._height },
      transform: {
        m00: 1,
        m01: 0,
        m02: this._x,
        m10: 0,
        m11: 1,
        m12: this._y,
      },
      visible: this._visible,
      opacity: this._opacity,

      // Overrides
      fillPaints: buildFillPaintsOverride(this._fillColor),
      overriddenSymbolID: this._overriddenSymbolID,
      componentPropertyReferences: optionalArray(this._componentPropertyRefs),

      // Child constraints
      stackPositioning: toEnumValue(this._stackPositioning, STACK_POSITIONING_VALUES),
      stackPrimarySizing: toEnumValue(this._stackPrimarySizing, STACK_SIZING_VALUES),
      stackCounterSizing: toEnumValue(this._stackCounterSizing, STACK_SIZING_VALUES),
      horizontalConstraint: toEnumValue(this._horizontalConstraint, CONSTRAINT_TYPE_VALUES),
      verticalConstraint: toEnumValue(this._verticalConstraint, CONSTRAINT_TYPE_VALUES),
    };
  }
}

/**
 * Create a new Instance (component instance) builder
 * @param localID Local ID for this node
 * @param parentID Parent node ID
 * @param symbolID ID of the symbol to instantiate (number uses sessionID=1, or provide full GUID)
 */
export function instanceNode(
  localID: number,
  parentID: number,
  symbolID: number | { sessionID: number; localID: number }
): InstanceNodeBuilder {
  return new InstanceNodeBuilder(localID, parentID, symbolID);
}
