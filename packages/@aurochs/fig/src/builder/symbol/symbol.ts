/**
 * @file Symbol (component definition) node builder
 */

import { createTranslationMatrix } from "../../matrix";
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

/** Symbol node builder instance */
export type SymbolNodeBuilder = {
  name: (name: string) => SymbolNodeBuilder;
  size: (width: number, height: number) => SymbolNodeBuilder;
  position: (x: number, y: number) => SymbolNodeBuilder;
  background: (c: Color) => SymbolNodeBuilder;
  clipsContent: (clips: boolean) => SymbolNodeBuilder;
  cornerRadius: (radius: number) => SymbolNodeBuilder;
  visible: (v: boolean) => SymbolNodeBuilder;
  opacity: (o: number) => SymbolNodeBuilder;
  autoLayout: (mode: StackMode) => SymbolNodeBuilder;
  gap: (spacing: number) => SymbolNodeBuilder;
  padding: (value: number | StackPadding) => SymbolNodeBuilder;
  primaryAlign: (align: StackAlign) => SymbolNodeBuilder;
  counterAlign: (align: StackAlign) => SymbolNodeBuilder;
  contentAlign: (align: StackAlign) => SymbolNodeBuilder;
  wrap: (enabled?: boolean) => SymbolNodeBuilder;
  counterGap: (spacing: number) => SymbolNodeBuilder;
  reverseZIndex: (enabled?: boolean) => SymbolNodeBuilder;
  addExportSettings: (settings: ExportSettings) => SymbolNodeBuilder;
  exportAsSVG: () => SymbolNodeBuilder;
  build: () => SymbolNodeData;
};

/** Create a symbol node builder */
function createSymbolNodeBuilder(localID: number, parentID: number): SymbolNodeBuilder {
  const state = {
    name: "Component",
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    fillColor: { r: 1, g: 1, b: 1, a: 1 } as Color,
    clipsContent: true,
    cornerRadius: undefined as number | undefined,
    visible: true,
    opacity: 1,
    exportSettings: [] as ExportSettings[],
    stackMode: undefined as StackMode | undefined,
    stackSpacing: undefined as number | undefined,
    stackPadding: undefined as StackPadding | undefined,
    stackPrimaryAlignItems: undefined as StackAlign | undefined,
    stackCounterAlignItems: undefined as StackAlign | undefined,
    stackPrimaryAlignContent: undefined as StackAlign | undefined,
    stackWrap: undefined as boolean | undefined,
    stackCounterSpacing: undefined as number | undefined,
    itemReverseZIndex: undefined as boolean | undefined,
  };

  const builder: SymbolNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    background(c: Color) { state.fillColor = c; return builder; },
    clipsContent(clips: boolean) { state.clipsContent = clips; return builder; },
    cornerRadius(radius: number) { state.cornerRadius = radius; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },
    autoLayout(mode: StackMode) { state.stackMode = mode; return builder; },
    gap(spacing: number) { state.stackSpacing = spacing; return builder; },
    padding(value: number | StackPadding) {
      if (typeof value === "number") {
        state.stackPadding = { top: value, right: value, bottom: value, left: value };
      } else {
        state.stackPadding = value;
      }
      return builder;
    },
    primaryAlign(align: StackAlign) { state.stackPrimaryAlignItems = align; return builder; },
    counterAlign(align: StackAlign) { state.stackCounterAlignItems = align; return builder; },
    contentAlign(align: StackAlign) { state.stackPrimaryAlignContent = align; return builder; },
    wrap(enabled: boolean = true) {
      state.stackWrap = enabled;
      if (enabled && !state.stackMode) {
        state.stackMode = "WRAP";
      }
      return builder;
    },
    counterGap(spacing: number) { state.stackCounterSpacing = spacing; return builder; },
    reverseZIndex(enabled: boolean = true) { state.itemReverseZIndex = enabled; return builder; },
    addExportSettings(settings: ExportSettings) { state.exportSettings.push(settings); return builder; },
    exportAsSVG() { state.exportSettings.push(DEFAULT_SVG_EXPORT_SETTINGS); return builder; },

    build(): SymbolNodeData {
      return {
        localID,
        parentID,
        name: state.name,
        size: { x: state.width, y: state.height },
        transform: createTranslationMatrix(state.x, state.y),
        fillPaints: [{ type: { value: 0, name: "SOLID" }, color: state.fillColor, opacity: 1, visible: true, blendMode: { value: 1, name: "NORMAL" } }],
        visible: state.visible,
        opacity: state.opacity,
        clipsContent: state.clipsContent,
        cornerRadius: state.cornerRadius,
        exportSettings: state.exportSettings.length > 0 ? state.exportSettings : undefined,
        stackMode: toEnumValue(state.stackMode, STACK_MODE_VALUES),
        stackSpacing: state.stackSpacing,
        stackPadding: state.stackPadding,
        stackPrimaryAlignItems: toEnumValue(state.stackPrimaryAlignItems, STACK_ALIGN_VALUES),
        stackCounterAlignItems: toEnumValue(state.stackCounterAlignItems, STACK_ALIGN_VALUES),
        stackPrimaryAlignContent: toEnumValue(state.stackPrimaryAlignContent, STACK_ALIGN_VALUES),
        stackWrap: state.stackWrap,
        stackCounterSpacing: state.stackCounterSpacing,
        itemReverseZIndex: state.itemReverseZIndex,
      };
    },
  };

  return builder;
}

/**
 * Create a new Symbol (component definition) builder
 */
export function symbolNode(localID: number, parentID: number): SymbolNodeBuilder {
  return createSymbolNodeBuilder(localID, parentID);
}
