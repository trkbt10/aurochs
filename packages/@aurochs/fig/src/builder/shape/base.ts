/**
 * @file Base shape builder shared state and helpers
 */

import type { FigMatrix } from "../../types";
import { createTranslationMatrix, createRotationMatrix, multiplyMatrices } from "../../matrix";
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

/** Shared state for all shape builders */
export type BaseShapeState = {
  localID: number;
  parentID: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  fillPaints: Paint[];
  strokeColor?: Color;
  strokeWeight?: number;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeAlign?: StrokeAlign;
  dashPattern?: number[];
  visible: boolean;
  opacity: number;
  stackPositioning?: StackPositioning;
  stackPrimarySizing?: StackSizing;
  stackCounterSizing?: StackSizing;
  horizontalConstraint?: ConstraintType;
  verticalConstraint?: ConstraintType;
  effects?: readonly EffectData[];
};

/** Create default base shape state */
export function createBaseShapeState(localID: number, parentID: number): BaseShapeState {
  return {
    localID,
    parentID,
    name: "Shape",
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    rotation: 0,
    fillPaints: [],
    visible: true,
    opacity: 1,
  };
}

/** Common shape builder methods type */
export type BaseShapeBuilderMethods<TBuilder> = {
  name: (name: string) => TBuilder;
  size: (width: number, height: number) => TBuilder;
  position: (x: number, y: number) => TBuilder;
  rotation: (degrees: number) => TBuilder;
  /** Set fill — accepts a Color (solid) or a Paint object (gradient, image, etc.) */
  fill: (colorOrPaint: Color | Paint) => TBuilder;
  noFill: () => TBuilder;
  stroke: (color: Color) => TBuilder;
  strokeWeight: (weight: number) => TBuilder;
  strokeCap: (cap: StrokeCap) => TBuilder;
  strokeJoin: (join: StrokeJoin) => TBuilder;
  strokeAlign: (align: StrokeAlign) => TBuilder;
  dashPattern: (pattern: number[]) => TBuilder;
  visible: (v: boolean) => TBuilder;
  opacity: (o: number) => TBuilder;
  positioning: (mode: StackPositioning) => TBuilder;
  primarySizing: (sizing: StackSizing) => TBuilder;
  counterSizing: (sizing: StackSizing) => TBuilder;
  horizontalConstraint: (constraint: ConstraintType) => TBuilder;
  verticalConstraint: (constraint: ConstraintType) => TBuilder;
  effects: (effects: readonly EffectData[]) => TBuilder;
};

/** Attach base shape methods to a builder object */
export function attachBaseShapeMethods<TBuilder>(state: BaseShapeState, builder: TBuilder): BaseShapeBuilderMethods<TBuilder> {
  return {
    name(n: string) { state.name = n; return builder; },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    rotation(degrees: number) { state.rotation = degrees; return builder; },
    fill(colorOrPaint: Color | Paint) {
      state.fillPaints = [colorOrPaintToPaint(colorOrPaint)];
      return builder;
    },
    noFill() { state.fillPaints = []; return builder; },
    stroke(color: Color) { state.strokeColor = color; return builder; },
    strokeWeight(weight: number) { state.strokeWeight = weight; return builder; },
    strokeCap(cap: StrokeCap) { state.strokeCap = cap; return builder; },
    strokeJoin(join: StrokeJoin) { state.strokeJoin = join; return builder; },
    strokeAlign(align: StrokeAlign) { state.strokeAlign = align; return builder; },
    dashPattern(pattern: number[]) { state.dashPattern = pattern; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },
    positioning(mode: StackPositioning) { state.stackPositioning = mode; return builder; },
    primarySizing(sizing: StackSizing) { state.stackPrimarySizing = sizing; return builder; },
    counterSizing(sizing: StackSizing) { state.stackCounterSizing = sizing; return builder; },
    horizontalConstraint(constraint: ConstraintType) { state.horizontalConstraint = constraint; return builder; },
    verticalConstraint(constraint: ConstraintType) { state.verticalConstraint = constraint; return builder; },
    effects(e: readonly EffectData[]) { state.effects = e; return builder; },
  };
}

/** Determine if a value is a Paint object (has `type` with `value` and `name`) */
function isPaint(value: Color | Paint): value is Paint {
  return "type" in value && typeof (value as Paint).type === "object";
}

/** Convert a Color or Paint to a Paint. Colors become SOLID paints. */
export function colorOrPaintToPaint(colorOrPaint: Color | Paint): Paint {
  if (isPaint(colorOrPaint)) {
    return colorOrPaint;
  }
  return {
    type: { value: 0, name: "SOLID" },
    color: colorOrPaint,
    opacity: 1,
    visible: true,
    blendMode: { value: 1, name: "NORMAL" },
  };
}

/** Build the transformation matrix from state */
function buildTransform(state: BaseShapeState): FigMatrix {
  const translation = createTranslationMatrix(state.x, state.y);
  if (state.rotation === 0) {
    return translation;
  }
  const rad = (state.rotation * Math.PI) / 180;
  return multiplyMatrices(translation, createRotationMatrix(rad));
}

/** Build fill paints array from state */
function buildFillPaints(state: BaseShapeState): readonly Paint[] {
  return state.fillPaints;
}

/** Build stroke paints array from state */
function buildStrokePaints(state: BaseShapeState): readonly Stroke[] | undefined {
  if (!state.strokeColor) {
    return undefined;
  }
  return [{
    type: { value: 0, name: "SOLID" },
    color: state.strokeColor,
    opacity: 1,
    visible: true,
    blendMode: { value: 1, name: "NORMAL" },
  }];
}

/** Build base node data from state */
export function buildBaseData(state: BaseShapeState): BaseShapeNodeData {
  return {
    localID: state.localID,
    parentID: state.parentID,
    name: state.name,
    size: { x: state.width, y: state.height },
    transform: buildTransform(state),
    fillPaints: buildFillPaints(state),
    strokePaints: buildStrokePaints(state),
    strokeWeight: state.strokeWeight ?? 0,
    strokeCap: toEnumValue(state.strokeCap, STROKE_CAP_VALUES),
    strokeJoin: toEnumValue(state.strokeJoin, STROKE_JOIN_VALUES) ?? { value: 0, name: "MITER" },
    strokeAlign: toEnumValue(state.strokeAlign, STROKE_ALIGN_VALUES) ?? { value: 0, name: "CENTER" },
    dashPattern: state.dashPattern,
    visible: state.visible,
    opacity: state.opacity,
    stackPositioning: toEnumValue(state.stackPositioning, STACK_POSITIONING_VALUES),
    stackPrimarySizing: toEnumValue(state.stackPrimarySizing, STACK_SIZING_VALUES),
    stackCounterSizing: toEnumValue(state.stackCounterSizing, STACK_SIZING_VALUES),
    horizontalConstraint: toEnumValue(state.horizontalConstraint, CONSTRAINT_TYPE_VALUES),
    verticalConstraint: toEnumValue(state.verticalConstraint, CONSTRAINT_TYPE_VALUES),
    effects: state.effects,
  };
}
