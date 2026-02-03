/**
 * @file Symbol and Instance node builders with fluent API
 *
 * Provides builders for SYMBOL (component definition) and INSTANCE (component instance) nodes.
 */

import type { Color, Paint, StackPadding, ExportSettings } from "./text-builder";
import { DEFAULT_SVG_EXPORT_SETTINGS } from "./text-builder";
import {
  STACK_MODE_VALUES,
  STACK_ALIGN_VALUES,
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  CONSTRAINT_TYPE_VALUES,
  toEnumValue,
  type StackMode,
  type StackAlign,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
} from "../constants";

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

// =============================================================================
// Symbol Node Data
// =============================================================================

export type SymbolNodeData = {
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
  readonly visible: boolean;
  readonly opacity: number;
  readonly clipsContent: boolean;
  readonly cornerRadius?: number;
  readonly exportSettings?: readonly ExportSettings[];

  // AutoLayout - frame level (symbols support auto-layout)
  readonly stackMode?: { value: number; name: StackMode };
  readonly stackSpacing?: number;
  readonly stackPadding?: StackPadding;
  readonly stackPrimaryAlignItems?: { value: number; name: StackAlign };
  readonly stackCounterAlignItems?: { value: number; name: StackAlign };
  readonly stackPrimaryAlignContent?: { value: number; name: StackAlign };
  readonly stackWrap?: boolean;
  readonly stackCounterSpacing?: number;
  readonly itemReverseZIndex?: boolean;
};

// =============================================================================
// Symbol Node Builder
// =============================================================================

export class SymbolNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _width: number;
  private _height: number;
  private _x: number;
  private _y: number;
  private _fillColor: Color;
  private _clipsContent: boolean;
  private _cornerRadius?: number;
  private _visible: boolean;
  private _opacity: number;
  private _exportSettings: ExportSettings[] = [];

  // AutoLayout - frame level
  private _stackMode?: StackMode;
  private _stackSpacing?: number;
  private _stackPadding?: StackPadding;
  private _stackPrimaryAlignItems?: StackAlign;
  private _stackCounterAlignItems?: StackAlign;
  private _stackPrimaryAlignContent?: StackAlign;
  private _stackWrap?: boolean;
  private _stackCounterSpacing?: number;
  private _itemReverseZIndex?: boolean;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Component";
    this._width = 200;
    this._height = 100;
    this._x = 0;
    this._y = 0;
    this._fillColor = { r: 1, g: 1, b: 1, a: 1 };
    this._clipsContent = true;
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

  background(c: Color): this {
    this._fillColor = c;
    return this;
  }

  clipsContent(clips: boolean): this {
    this._clipsContent = clips;
    return this;
  }

  cornerRadius(radius: number): this {
    this._cornerRadius = radius;
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

  // ===========================================================================
  // AutoLayout Methods
  // ===========================================================================

  autoLayout(mode: StackMode): this {
    this._stackMode = mode;
    return this;
  }

  gap(spacing: number): this {
    this._stackSpacing = spacing;
    return this;
  }

  padding(value: number | StackPadding): this {
    if (typeof value === "number") {
      this._stackPadding = { top: value, right: value, bottom: value, left: value };
    } else {
      this._stackPadding = value;
    }
    return this;
  }

  primaryAlign(align: StackAlign): this {
    this._stackPrimaryAlignItems = align;
    return this;
  }

  counterAlign(align: StackAlign): this {
    this._stackCounterAlignItems = align;
    return this;
  }

  contentAlign(align: StackAlign): this {
    this._stackPrimaryAlignContent = align;
    return this;
  }

  wrap(enabled: boolean = true): this {
    this._stackWrap = enabled;
    if (enabled && !this._stackMode) {
      this._stackMode = "WRAP";
    }
    return this;
  }

  counterGap(spacing: number): this {
    this._stackCounterSpacing = spacing;
    return this;
  }

  reverseZIndex(enabled: boolean = true): this {
    this._itemReverseZIndex = enabled;
    return this;
  }

  // ===========================================================================
  // Export Settings
  // ===========================================================================

  addExportSettings(settings: ExportSettings): this {
    this._exportSettings.push(settings);
    return this;
  }

  exportAsSVG(): this {
    this._exportSettings.push(DEFAULT_SVG_EXPORT_SETTINGS);
    return this;
  }

  // ===========================================================================
  // Build
  // ===========================================================================

  build(): SymbolNodeData {
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
      fillPaints: [
        {
          type: { value: 0, name: "SOLID" },
          color: this._fillColor,
          opacity: 1,
          visible: true,
          blendMode: { value: 1, name: "NORMAL" },
        },
      ],
      visible: this._visible,
      opacity: this._opacity,
      clipsContent: this._clipsContent,
      cornerRadius: this._cornerRadius,
      exportSettings: this._exportSettings.length > 0 ? this._exportSettings : undefined,

      // AutoLayout
      stackMode: toEnumValue(this._stackMode, STACK_MODE_VALUES),
      stackSpacing: this._stackSpacing,
      stackPadding: this._stackPadding,
      stackPrimaryAlignItems: toEnumValue(this._stackPrimaryAlignItems, STACK_ALIGN_VALUES),
      stackCounterAlignItems: toEnumValue(this._stackCounterAlignItems, STACK_ALIGN_VALUES),
      stackPrimaryAlignContent: toEnumValue(this._stackPrimaryAlignContent, STACK_ALIGN_VALUES),
      stackWrap: this._stackWrap,
      stackCounterSpacing: this._stackCounterSpacing,
      itemReverseZIndex: this._itemReverseZIndex,
    };
  }
}

// =============================================================================
// Instance Node Data
// =============================================================================

export type InstanceNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly symbolID: { sessionID: number; localID: number };
  readonly size: { x: number; y: number };
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

  // Override properties
  readonly fillPaints?: readonly Paint[];
  readonly componentPropertyReferences?: readonly string[];

  // Child constraint properties (when inside auto-layout parent)
  readonly stackPositioning?: { value: number; name: StackPositioning };
  readonly stackPrimarySizing?: { value: number; name: StackSizing };
  readonly stackCounterSizing?: { value: number; name: StackSizing };
  readonly horizontalConstraint?: { value: number; name: ConstraintType };
  readonly verticalConstraint?: { value: number; name: ConstraintType };
};

// =============================================================================
// Instance Node Builder
// =============================================================================

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

  // ===========================================================================
  // Override Methods
  // ===========================================================================

  /**
   * Override the background color of this instance
   */
  overrideBackground(c: Color): this {
    this._fillColor = c;
    return this;
  }

  /**
   * Add a component property reference (for text overrides, etc.)
   */
  addPropertyReference(ref: string): this {
    this._componentPropertyRefs.push(ref);
    return this;
  }

  // ===========================================================================
  // Child Constraint Methods
  // ===========================================================================

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

  // ===========================================================================
  // Build
  // ===========================================================================

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

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new Symbol (component definition) builder
 */
export function symbolNode(localID: number, parentID: number): SymbolNodeBuilder {
  return new SymbolNodeBuilder(localID, parentID);
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
