/**
 * @file Frame node builder
 */

import type { Color, StackPadding } from "../types";
import type { ExportSettings, FrameNodeData } from "./types";
import {
  IMAGE_TYPE_VALUES,
  EXPORT_CONSTRAINT_VALUES,
  EXPORT_COLOR_PROFILE_VALUES,
  SVG_ID_MODE_VALUES,
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
} from "../../constants";

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

/**
 * Create a new Frame node builder
 */
export function frameNode(localID: number, parentID: number): FrameNodeBuilder {
  return new FrameNodeBuilder(localID, parentID);
}
