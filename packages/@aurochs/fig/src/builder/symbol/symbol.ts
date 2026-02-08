/**
 * @file Symbol (component definition) node builder
 */

import type { Color, StackPadding } from "../types";
import type { SymbolNodeData } from "./types";
import type { ExportSettings } from "../frame";
import { DEFAULT_SVG_EXPORT_SETTINGS } from "../frame";
import {
  STACK_MODE_VALUES,
  STACK_ALIGN_VALUES,
  toEnumValue,
  type StackMode,
  type StackAlign,
} from "../../constants";

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

  // AutoLayout Methods
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

  // Export Settings
  addExportSettings(settings: ExportSettings): this {
    this._exportSettings.push(settings);
    return this;
  }

  exportAsSVG(): this {
    this._exportSettings.push(DEFAULT_SVG_EXPORT_SETTINGS);
    return this;
  }

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

/**
 * Create a new Symbol (component definition) builder
 */
export function symbolNode(localID: number, parentID: number): SymbolNodeBuilder {
  return new SymbolNodeBuilder(localID, parentID);
}
