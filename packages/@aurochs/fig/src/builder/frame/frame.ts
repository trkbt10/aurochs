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

/** Frame node builder instance */
export type FrameNodeBuilder = {
  name: (name: string) => FrameNodeBuilder;
  size: (width: number, height: number) => FrameNodeBuilder;
  position: (x: number, y: number) => FrameNodeBuilder;
  background: (c: Color) => FrameNodeBuilder;
  clipsContent: (clips: boolean) => FrameNodeBuilder;
  cornerRadius: (radius: number) => FrameNodeBuilder;
  autoLayout: (mode: StackMode) => FrameNodeBuilder;
  gap: (spacing: number) => FrameNodeBuilder;
  padding: (value: number | StackPadding) => FrameNodeBuilder;
  primaryAlign: (align: StackAlign) => FrameNodeBuilder;
  counterAlign: (align: StackAlign) => FrameNodeBuilder;
  contentAlign: (align: StackAlign) => FrameNodeBuilder;
  wrap: (enabled?: boolean) => FrameNodeBuilder;
  counterGap: (spacing: number) => FrameNodeBuilder;
  reverseZIndex: (enabled?: boolean) => FrameNodeBuilder;
  positioning: (mode: StackPositioning) => FrameNodeBuilder;
  primarySizing: (sizing: StackSizing) => FrameNodeBuilder;
  counterSizing: (sizing: StackSizing) => FrameNodeBuilder;
  horizontalConstraint: (constraint: ConstraintType) => FrameNodeBuilder;
  verticalConstraint: (constraint: ConstraintType) => FrameNodeBuilder;
  addExportSettings: (settings: ExportSettings) => FrameNodeBuilder;
  exportAsSVG: () => FrameNodeBuilder;
  exportAsPNG: (scale?: number) => FrameNodeBuilder;
  build: () => FrameNodeData;
};

/** Create a frame node builder */
function createFrameNodeBuilder(localID: number, parentID: number): FrameNodeBuilder {
  const state = {
    name: "Frame",
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    fillColor: { r: 1, g: 1, b: 1, a: 1 } as Color,
    clipsContent: true,
    cornerRadius: undefined as number | undefined,
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
    stackPositioning: undefined as StackPositioning | undefined,
    stackPrimarySizing: undefined as StackSizing | undefined,
    stackCounterSizing: undefined as StackSizing | undefined,
    horizontalConstraint: undefined as ConstraintType | undefined,
    verticalConstraint: undefined as ConstraintType | undefined,
  };

  const builder: FrameNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    background(c: Color) { state.fillColor = c; return builder; },
    clipsContent(clips: boolean) { state.clipsContent = clips; return builder; },
    cornerRadius(radius: number) { state.cornerRadius = radius; return builder; },
    /** Set the auto-layout mode (direction) */
    autoLayout(mode: StackMode) { state.stackMode = mode; return builder; },
    /** Set gap between items (main axis spacing) */
    gap(spacing: number) { state.stackSpacing = spacing; return builder; },
    /** Set padding (uniform value or full padding object) */
    padding(value: number | StackPadding) {
      if (typeof value === "number") {
        state.stackPadding = { top: value, right: value, bottom: value, left: value };
      } else {
        state.stackPadding = value;
      }
      return builder;
    },
    /** Set primary axis alignment (justify-content equivalent) */
    primaryAlign(align: StackAlign) { state.stackPrimaryAlignItems = align; return builder; },
    /** Set counter axis alignment (align-items equivalent) */
    counterAlign(align: StackAlign) { state.stackCounterAlignItems = align; return builder; },
    /** Set content alignment for wrap mode (align-content equivalent) */
    contentAlign(align: StackAlign) { state.stackPrimaryAlignContent = align; return builder; },
    /** Enable wrap mode (auto-wrap items) */
    wrap(enabled: boolean = true) {
      state.stackWrap = enabled;
      if (enabled && !state.stackMode) {
        state.stackMode = "WRAP";
      }
      return builder;
    },
    /** Set counter axis spacing (for wrap mode) */
    counterGap(spacing: number) { state.stackCounterSpacing = spacing; return builder; },
    /** Reverse z-index order of items */
    reverseZIndex(enabled: boolean = true) { state.itemReverseZIndex = enabled; return builder; },
    /** Set positioning mode when inside auto-layout parent */
    positioning(mode: StackPositioning) { state.stackPositioning = mode; return builder; },
    /** Set sizing along primary axis (when inside auto-layout parent) */
    primarySizing(sizing: StackSizing) { state.stackPrimarySizing = sizing; return builder; },
    /** Set sizing along counter axis (when inside auto-layout parent) */
    counterSizing(sizing: StackSizing) { state.stackCounterSizing = sizing; return builder; },
    /** Set horizontal constraint */
    horizontalConstraint(constraint: ConstraintType) { state.horizontalConstraint = constraint; return builder; },
    /** Set vertical constraint */
    verticalConstraint(constraint: ConstraintType) { state.verticalConstraint = constraint; return builder; },
    /** Add export settings (can be called multiple times for multiple exports) */
    addExportSettings(settings: ExportSettings) { state.exportSettings.push(settings); return builder; },
    /** Add default SVG export settings */
    exportAsSVG() { state.exportSettings.push(DEFAULT_SVG_EXPORT_SETTINGS); return builder; },
    /** Add PNG export settings with optional scale */
    exportAsPNG(scale: number = 1) {
      state.exportSettings.push({
        suffix: scale === 1 ? "" : `@${scale}x`,
        imageType: { value: IMAGE_TYPE_VALUES.PNG, name: "PNG" },
        constraint: { type: { value: EXPORT_CONSTRAINT_VALUES.CONTENT_SCALE, name: "CONTENT_SCALE" }, value: scale },
        svgDataName: false,
        svgIDMode: { value: SVG_ID_MODE_VALUES.IF_NEEDED, name: "IF_NEEDED" },
        svgOutlineText: false,
        contentsOnly: true,
        svgForceStrokeMasks: false,
        useAbsoluteBounds: false,
        colorProfile: { value: EXPORT_COLOR_PROFILE_VALUES.DOCUMENT, name: "DOCUMENT" },
        useBicubicSampler: true,
      });
      return builder;
    },

    build(): FrameNodeData {
      return {
        localID,
        parentID,
        name: state.name,
        size: { x: state.width, y: state.height },
        transform: { m00: 1, m01: 0, m02: state.x, m10: 0, m11: 1, m12: state.y },
        fillPaints: [{ type: { value: 0, name: "SOLID" }, color: state.fillColor, opacity: 1, visible: true, blendMode: { value: 1, name: "NORMAL" } }],
        visible: true,
        opacity: 1,
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
        stackPositioning: toEnumValue(state.stackPositioning, STACK_POSITIONING_VALUES),
        stackPrimarySizing: toEnumValue(state.stackPrimarySizing, STACK_SIZING_VALUES),
        stackCounterSizing: toEnumValue(state.stackCounterSizing, STACK_SIZING_VALUES),
        horizontalConstraint: toEnumValue(state.horizontalConstraint, CONSTRAINT_TYPE_VALUES),
        verticalConstraint: toEnumValue(state.verticalConstraint, CONSTRAINT_TYPE_VALUES),
      };
    },
  };

  return builder;
}

/**
 * Create a new Frame node builder
 */
export function frameNode(localID: number, parentID: number): FrameNodeBuilder {
  return createFrameNodeBuilder(localID, parentID);
}
