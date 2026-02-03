/**
 * @file Text and Frame node builders with fluent API
 *
 * Provides a convenient way to create TEXT and FRAME nodes for testing,
 * including AutoLayout support.
 */

// Import and re-export types from constants for backwards compatibility
import {
  TEXT_ALIGN_H_VALUES,
  TEXT_ALIGN_V_VALUES,
  TEXT_AUTO_RESIZE_VALUES,
  TEXT_DECORATION_VALUES,
  TEXT_CASE_VALUES,
  NUMBER_UNITS_VALUES,
  STACK_MODE_VALUES,
  STACK_ALIGN_VALUES,
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  CONSTRAINT_TYPE_VALUES,
  IMAGE_TYPE_VALUES,
  EXPORT_CONSTRAINT_VALUES,
  EXPORT_COLOR_PROFILE_VALUES,
  SVG_ID_MODE_VALUES,
  toEnumValue,
  type TextAlignHorizontal,
  type TextAlignVertical,
  type TextAutoResize,
  type TextDecoration,
  type TextCase,
  type NumberUnits,
  type StackMode,
  type StackAlign,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
  type ImageType,
  type ExportConstraintType,
  type ExportColorProfile,
  type ExportSVGIDMode,
} from "../constants";

// Note: Types like TextAlignHorizontal, StackMode, etc. should be imported
// directly from "@oxen/fig/constants" by consumers.

// =============================================================================
// Types
// =============================================================================

export type StackPadding = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

export type ValueWithUnits = {
  readonly value: number;
  readonly units: { value: number; name: NumberUnits };
};

export type FontName = {
  readonly family: string;
  readonly style: string;
  readonly postscript: string;
};

export type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

export type Paint = {
  readonly type: { value: number; name: string };
  readonly color?: Color;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: { value: number; name: string };
};

export type TextNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly characters: string;
  readonly fontSize: number;
  readonly fontName: FontName;
  readonly size: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly textAlignHorizontal?: { value: number; name: TextAlignHorizontal };
  readonly textAlignVertical?: { value: number; name: TextAlignVertical };
  readonly textAutoResize?: { value: number; name: TextAutoResize };
  readonly textDecoration?: { value: number; name: TextDecoration };
  readonly textCase?: { value: number; name: TextCase };
  readonly lineHeight?: ValueWithUnits;
  readonly letterSpacing?: ValueWithUnits;
  readonly fillPaints: readonly Paint[];
  readonly visible: boolean;
  readonly opacity: number;
};

// =============================================================================
// Default Values (Figma's "Auto" equivalent)
// =============================================================================

/**
 * Default line height (100% = Figma's "Auto")
 */
export const DEFAULT_LINE_HEIGHT: ValueWithUnits = {
  value: 100,
  units: { value: NUMBER_UNITS_VALUES.PERCENT, name: "PERCENT" },
};

/**
 * Default letter spacing (0% = no extra spacing)
 */
export const DEFAULT_LETTER_SPACING: ValueWithUnits = {
  value: 0,
  units: { value: NUMBER_UNITS_VALUES.PERCENT, name: "PERCENT" },
};

/**
 * Default auto resize mode
 */
export const DEFAULT_AUTO_RESIZE: { value: number; name: TextAutoResize } = {
  value: TEXT_AUTO_RESIZE_VALUES.WIDTH_AND_HEIGHT,
  name: "WIDTH_AND_HEIGHT",
};

// =============================================================================
// Text Node Builder
// =============================================================================

export class TextNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _characters: string;
  private _fontSize: number;
  private _fontFamily: string;
  private _fontStyle: string;
  private _width: number;
  private _height: number;
  private _x: number;
  private _y: number;
  private _textAlignH?: TextAlignHorizontal;
  private _textAlignV?: TextAlignVertical;
  private _autoResize: TextAutoResize;
  private _decoration?: TextDecoration;
  private _textCase?: TextCase;
  private _lineHeight: { value: number; unit: NumberUnits };
  private _letterSpacing: { value: number; unit: NumberUnits };
  private _fillColor: Color;
  private _visible: boolean;
  private _opacity: number;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Text";
    this._characters = "";
    this._fontSize = 12;
    this._fontFamily = "Inter";
    this._fontStyle = "Regular";
    this._width = 100;
    this._height = 50;
    this._x = 0;
    this._y = 0;
    this._fillColor = { r: 0, g: 0, b: 0, a: 1 };
    this._visible = true;
    this._opacity = 1;
    // Figma defaults (Auto)
    this._lineHeight = { value: 100, unit: "PERCENT" };
    this._letterSpacing = { value: 0, unit: "PERCENT" };
    this._autoResize = "WIDTH_AND_HEIGHT";
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  text(characters: string): this {
    this._characters = characters;
    return this;
  }

  fontSize(size: number): this {
    this._fontSize = size;
    return this;
  }

  font(family: string, style: string = "Regular"): this {
    this._fontFamily = family;
    this._fontStyle = style;
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

  alignHorizontal(align: TextAlignHorizontal): this {
    this._textAlignH = align;
    return this;
  }

  alignVertical(align: TextAlignVertical): this {
    this._textAlignV = align;
    return this;
  }

  autoResize(mode: TextAutoResize): this {
    this._autoResize = mode;
    return this;
  }

  decoration(deco: TextDecoration): this {
    this._decoration = deco;
    return this;
  }

  textCase(tc: TextCase): this {
    this._textCase = tc;
    return this;
  }

  lineHeight(value: number, unit: NumberUnits = "PIXELS"): this {
    this._lineHeight = { value, unit };
    return this;
  }

  letterSpacing(value: number, unit: NumberUnits = "PERCENT"): this {
    this._letterSpacing = { value, unit };
    return this;
  }

  color(c: Color): this {
    this._fillColor = c;
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

  build(): TextNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      characters: this._characters,
      fontSize: this._fontSize,
      fontName: {
        family: this._fontFamily,
        style: this._fontStyle,
        postscript: `${this._fontFamily}-${this._fontStyle}`.replace(/\s+/g, ""),
      },
      size: { x: this._width, y: this._height },
      transform: {
        m00: 1,
        m01: 0,
        m02: this._x,
        m10: 0,
        m11: 1,
        m12: this._y,
      },
      textAlignHorizontal: toEnumValue(this._textAlignH, TEXT_ALIGN_H_VALUES),
      textAlignVertical: toEnumValue(this._textAlignV, TEXT_ALIGN_V_VALUES),
      // Always include these with defaults (Figma's "Auto")
      textAutoResize: { value: TEXT_AUTO_RESIZE_VALUES[this._autoResize], name: this._autoResize },
      textDecoration: toEnumValue(this._decoration, TEXT_DECORATION_VALUES),
      textCase: toEnumValue(this._textCase, TEXT_CASE_VALUES),
      // Always include lineHeight and letterSpacing (defaults = Figma's "Auto")
      lineHeight: {
        value: this._lineHeight.value,
        units: {
          value: NUMBER_UNITS_VALUES[this._lineHeight.unit],
          name: this._lineHeight.unit,
        },
      },
      letterSpacing: {
        value: this._letterSpacing.value,
        units: {
          value: NUMBER_UNITS_VALUES[this._letterSpacing.unit],
          name: this._letterSpacing.unit,
        },
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
    };
  }
}

// =============================================================================
// Frame Builder
// =============================================================================

// =============================================================================
// Export Settings Types
// =============================================================================

export type ExportSettings = {
  readonly suffix: string;
  readonly imageType: { value: number; name: ImageType };
  readonly constraint: {
    readonly type: { value: number; name: ExportConstraintType };
    readonly value: number;
  };
  readonly svgDataName: boolean;
  readonly svgIDMode: { value: number; name: ExportSVGIDMode };
  readonly svgOutlineText: boolean;
  readonly contentsOnly: boolean;
  readonly svgForceStrokeMasks: boolean;
  readonly useAbsoluteBounds: boolean;
  readonly colorProfile: { value: number; name: ExportColorProfile };
  readonly useBicubicSampler: boolean;
};

/**
 * Default SVG export settings (matches Figma's defaults)
 */
export const DEFAULT_SVG_EXPORT_SETTINGS: ExportSettings = {
  suffix: "",
  imageType: { value: IMAGE_TYPE_VALUES.SVG, name: "SVG" },
  constraint: {
    type: { value: EXPORT_CONSTRAINT_VALUES.CONTENT_SCALE, name: "CONTENT_SCALE" },
    value: 1,
  },
  svgDataName: false,
  svgIDMode: { value: SVG_ID_MODE_VALUES.IF_NEEDED, name: "IF_NEEDED" },
  svgOutlineText: true,
  contentsOnly: true,
  svgForceStrokeMasks: false,
  useAbsoluteBounds: false,
  colorProfile: { value: EXPORT_COLOR_PROFILE_VALUES.DOCUMENT, name: "DOCUMENT" },
  useBicubicSampler: true,
};

// =============================================================================
// Frame Node Data
// =============================================================================

export type FrameNodeData = {
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

  // AutoLayout - frame level
  readonly stackMode?: { value: number; name: StackMode };
  readonly stackSpacing?: number;
  readonly stackPadding?: StackPadding;
  readonly stackPrimaryAlignItems?: { value: number; name: StackAlign };
  readonly stackCounterAlignItems?: { value: number; name: StackAlign };
  readonly stackPrimaryAlignContent?: { value: number; name: StackAlign };
  readonly stackWrap?: boolean;
  readonly stackCounterSpacing?: number;
  readonly itemReverseZIndex?: boolean;

  // AutoLayout - child level (constraints)
  readonly stackPositioning?: { value: number; name: StackPositioning };
  readonly stackPrimarySizing?: { value: number; name: StackSizing };
  readonly stackCounterSizing?: { value: number; name: StackSizing };
  readonly horizontalConstraint?: { value: number; name: ConstraintType };
  readonly verticalConstraint?: { value: number; name: ConstraintType };
};

export class FrameNodeBuilder {
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

  // AutoLayout - child level (constraints)
  private _stackPositioning?: StackPositioning;
  private _stackPrimarySizing?: StackSizing;
  private _stackCounterSizing?: StackSizing;
  private _horizontalConstraint?: ConstraintType;
  private _verticalConstraint?: ConstraintType;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Frame";
    this._width = 200;
    this._height = 100;
    this._x = 0;
    this._y = 0;
    this._fillColor = { r: 1, g: 1, b: 1, a: 1 };
    this._clipsContent = true;
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

  // ===========================================================================
  // AutoLayout Methods - Frame Level
  // ===========================================================================

  /**
   * Set the auto-layout mode (direction)
   */
  autoLayout(mode: StackMode): this {
    this._stackMode = mode;
    return this;
  }

  /**
   * Set gap between items (main axis spacing)
   */
  gap(spacing: number): this {
    this._stackSpacing = spacing;
    return this;
  }

  /**
   * Set padding (uniform value or full padding object)
   * @param value Uniform padding or StackPadding object
   */
  padding(value: number | StackPadding): this {
    if (typeof value === "number") {
      this._stackPadding = { top: value, right: value, bottom: value, left: value };
    } else {
      this._stackPadding = value;
    }
    return this;
  }

  /**
   * Set primary axis alignment (justify-content equivalent)
   */
  primaryAlign(align: StackAlign): this {
    this._stackPrimaryAlignItems = align;
    return this;
  }

  /**
   * Set counter axis alignment (align-items equivalent)
   */
  counterAlign(align: StackAlign): this {
    this._stackCounterAlignItems = align;
    return this;
  }

  /**
   * Set content alignment for wrap mode (align-content equivalent)
   */
  contentAlign(align: StackAlign): this {
    this._stackPrimaryAlignContent = align;
    return this;
  }

  /**
   * Enable wrap mode (auto-wrap items)
   */
  wrap(enabled: boolean = true): this {
    this._stackWrap = enabled;
    if (enabled && !this._stackMode) {
      this._stackMode = "WRAP";
    }
    return this;
  }

  /**
   * Set counter axis spacing (for wrap mode)
   */
  counterGap(spacing: number): this {
    this._stackCounterSpacing = spacing;
    return this;
  }

  /**
   * Reverse z-index order of items
   */
  reverseZIndex(enabled: boolean = true): this {
    this._itemReverseZIndex = enabled;
    return this;
  }

  // ===========================================================================
  // AutoLayout Methods - Child Level (Constraints)
  // ===========================================================================

  /**
   * Set positioning mode when inside auto-layout parent
   */
  positioning(mode: StackPositioning): this {
    this._stackPositioning = mode;
    return this;
  }

  /**
   * Set sizing along primary axis (when inside auto-layout parent)
   */
  primarySizing(sizing: StackSizing): this {
    this._stackPrimarySizing = sizing;
    return this;
  }

  /**
   * Set sizing along counter axis (when inside auto-layout parent)
   */
  counterSizing(sizing: StackSizing): this {
    this._stackCounterSizing = sizing;
    return this;
  }

  /**
   * Set horizontal constraint (for non-auto-layout or absolute positioning)
   */
  horizontalConstraint(constraint: ConstraintType): this {
    this._horizontalConstraint = constraint;
    return this;
  }

  /**
   * Set vertical constraint (for non-auto-layout or absolute positioning)
   */
  verticalConstraint(constraint: ConstraintType): this {
    this._verticalConstraint = constraint;
    return this;
  }

  // ===========================================================================
  // Export Settings Methods
  // ===========================================================================

  /**
   * Add export settings (can be called multiple times for multiple exports)
   */
  addExportSettings(settings: ExportSettings): this {
    this._exportSettings.push(settings);
    return this;
  }

  /**
   * Add default SVG export settings
   */
  exportAsSVG(): this {
    this._exportSettings.push(DEFAULT_SVG_EXPORT_SETTINGS);
    return this;
  }

  /**
   * Add PNG export settings with optional scale
   */
  exportAsPNG(scale: number = 1): this {
    this._exportSettings.push({
      suffix: scale === 1 ? "" : `@${scale}x`,
      imageType: { value: IMAGE_TYPE_VALUES.PNG, name: "PNG" },
      constraint: {
        type: { value: EXPORT_CONSTRAINT_VALUES.CONTENT_SCALE, name: "CONTENT_SCALE" },
        value: scale,
      },
      svgDataName: false,
      svgIDMode: { value: SVG_ID_MODE_VALUES.IF_NEEDED, name: "IF_NEEDED" },
      svgOutlineText: false,
      contentsOnly: true,
      svgForceStrokeMasks: false,
      useAbsoluteBounds: false,
      colorProfile: { value: EXPORT_COLOR_PROFILE_VALUES.DOCUMENT, name: "DOCUMENT" },
      useBicubicSampler: true,
    });
    return this;
  }

  // ===========================================================================
  // Build
  // ===========================================================================

  build(): FrameNodeData {
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
      visible: true,
      opacity: 1,
      clipsContent: this._clipsContent,
      cornerRadius: this._cornerRadius,
      exportSettings: this._exportSettings.length > 0 ? this._exportSettings : undefined,

      // AutoLayout - frame level
      stackMode: toEnumValue(this._stackMode, STACK_MODE_VALUES),
      stackSpacing: this._stackSpacing,
      stackPadding: this._stackPadding,
      stackPrimaryAlignItems: toEnumValue(this._stackPrimaryAlignItems, STACK_ALIGN_VALUES),
      stackCounterAlignItems: toEnumValue(this._stackCounterAlignItems, STACK_ALIGN_VALUES),
      stackPrimaryAlignContent: toEnumValue(this._stackPrimaryAlignContent, STACK_ALIGN_VALUES),
      stackWrap: this._stackWrap,
      stackCounterSpacing: this._stackCounterSpacing,
      itemReverseZIndex: this._itemReverseZIndex,

      // AutoLayout - child level
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

export function textNode(localID: number, parentID: number): TextNodeBuilder {
  return new TextNodeBuilder(localID, parentID);
}

export function frameNode(localID: number, parentID: number): FrameNodeBuilder {
  return new FrameNodeBuilder(localID, parentID);
}
