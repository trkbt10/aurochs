/**
 * @file Symbol and Instance node builders with fluent API
 *
 * Provides builders for SYMBOL (component definition) and INSTANCE (component instance) nodes.
 */

import type {
  Color,
  Paint,
  StackMode,
  StackAlign,
  StackPositioning,
  StackSizing,
  ConstraintType,
  StackPadding,
  ExportSettings,
} from "./text-builder";
import { DEFAULT_SVG_EXPORT_SETTINGS } from "./text-builder";

// =============================================================================
// Value Maps (duplicated from text-builder for encapsulation)
// =============================================================================

const STACK_MODE_VALUES: Record<StackMode, number> = {
  NONE: 0,
  HORIZONTAL: 1,
  VERTICAL: 2,
  WRAP: 3,
};

const STACK_ALIGN_VALUES: Record<StackAlign, number> = {
  MIN: 0,
  CENTER: 1,
  MAX: 2,
  STRETCH: 3,
  BASELINE: 4,
  SPACE_BETWEEN: 5,
};

const STACK_POSITIONING_VALUES: Record<StackPositioning, number> = {
  AUTO: 0,
  ABSOLUTE: 1,
};

const STACK_SIZING_VALUES: Record<StackSizing, number> = {
  FIXED: 0,
  FILL: 1,
  HUG: 2,
};

const CONSTRAINT_TYPE_VALUES: Record<ConstraintType, number> = {
  MIN: 0,
  CENTER: 1,
  MAX: 2,
  STRETCH: 3,
  SCALE: 4,
};

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

  background(r: number, g: number, b: number, a: number = 1): this {
    this._fillColor = { r, g, b, a };
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

  padding(top: number, right?: number, bottom?: number, left?: number): this {
    this._stackPadding = {
      top,
      right: right ?? top,
      bottom: bottom ?? top,
      left: left ?? right ?? top,
    };
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
      stackMode: this._stackMode
        ? { value: STACK_MODE_VALUES[this._stackMode], name: this._stackMode }
        : undefined,
      stackSpacing: this._stackSpacing,
      stackPadding: this._stackPadding,
      stackPrimaryAlignItems: this._stackPrimaryAlignItems
        ? { value: STACK_ALIGN_VALUES[this._stackPrimaryAlignItems], name: this._stackPrimaryAlignItems }
        : undefined,
      stackCounterAlignItems: this._stackCounterAlignItems
        ? { value: STACK_ALIGN_VALUES[this._stackCounterAlignItems], name: this._stackCounterAlignItems }
        : undefined,
      stackPrimaryAlignContent: this._stackPrimaryAlignContent
        ? { value: STACK_ALIGN_VALUES[this._stackPrimaryAlignContent], name: this._stackPrimaryAlignContent }
        : undefined,
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
    this._symbolID =
      typeof symbolID === "number"
        ? { sessionID: 1, localID: symbolID }
        : symbolID;
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
  overrideBackground(r: number, g: number, b: number, a: number = 1): this {
    this._fillColor = { r, g, b, a };
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
      fillPaints: this._fillColor
        ? [
            {
              type: { value: 0, name: "SOLID" },
              color: this._fillColor,
              opacity: 1,
              visible: true,
              blendMode: { value: 1, name: "NORMAL" },
            },
          ]
        : undefined,
      componentPropertyReferences:
        this._componentPropertyRefs.length > 0
          ? this._componentPropertyRefs
          : undefined,

      // Child constraints
      stackPositioning: this._stackPositioning
        ? { value: STACK_POSITIONING_VALUES[this._stackPositioning], name: this._stackPositioning }
        : undefined,
      stackPrimarySizing: this._stackPrimarySizing
        ? { value: STACK_SIZING_VALUES[this._stackPrimarySizing], name: this._stackPrimarySizing }
        : undefined,
      stackCounterSizing: this._stackCounterSizing
        ? { value: STACK_SIZING_VALUES[this._stackCounterSizing], name: this._stackCounterSizing }
        : undefined,
      horizontalConstraint: this._horizontalConstraint
        ? { value: CONSTRAINT_TYPE_VALUES[this._horizontalConstraint], name: this._horizontalConstraint }
        : undefined,
      verticalConstraint: this._verticalConstraint
        ? { value: CONSTRAINT_TYPE_VALUES[this._verticalConstraint], name: this._verticalConstraint }
        : undefined,
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
