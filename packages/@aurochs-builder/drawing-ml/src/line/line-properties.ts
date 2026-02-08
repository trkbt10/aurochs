/**
 * @file Line property builders for DrawingML
 */

import type { BaseLine, LineEnd } from "@aurochs-office/drawing-ml/domain/line";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ColorSpec, LineEndSpec, DashStyle, LineCap, LineJoin, CompoundLine } from "../types";
import { buildColor } from "../fill/solid-fill";

/**
 * Line end type mapping
 */
const LINE_END_TYPE_MAP: Record<string, LineEnd["type"]> = {
  none: "none",
  triangle: "triangle",
  stealth: "stealth",
  diamond: "diamond",
  oval: "oval",
  arrow: "arrow",
};

/**
 * Line end size mapping
 */
const LINE_END_SIZE_MAP: Record<string, LineEnd["width"]> = {
  sm: "sm",
  med: "med",
  lg: "lg",
};

/**
 * Map compound style
 */
const COMPOUND_MAP: Record<CompoundLine, BaseLine["compound"]> = {
  sng: "sng",
  dbl: "dbl",
  thickThin: "thickThin",
  thinThick: "thinThick",
  tri: "tri",
};

/**
 * Build a line end object
 */
export function buildLineEnd(spec: LineEndSpec): LineEnd {
  return {
    type: LINE_END_TYPE_MAP[spec.type] ?? "none",
    width: LINE_END_SIZE_MAP[spec.width ?? "med"] ?? "med",
    length: LINE_END_SIZE_MAP[spec.length ?? "med"] ?? "med",
  };
}

/**
 * Build a line object with extended properties (hex color)
 */
export function buildLine(
  lineColor: string,
  lineWidth: number,
  options?: {
    dash?: DashStyle;
    cap?: LineCap;
    join?: LineJoin;
    compound?: CompoundLine;
    headEnd?: LineEndSpec;
    tailEnd?: LineEndSpec;
  },
): BaseLine {
  const compound = options?.compound ? COMPOUND_MAP[options.compound] : "sng";
  return {
    width: lineWidth as Pixels,
    cap: (options?.cap ?? "flat") as BaseLine["cap"],
    compound: compound,
    alignment: "ctr",
    fill: {
      type: "solidFill",
      color: { spec: { type: "srgb", value: lineColor.startsWith("#") ? lineColor.slice(1) : lineColor } },
    },
    dash: options?.dash ?? "solid",
    join: (options?.join ?? "round") as BaseLine["join"],
    headEnd: options?.headEnd ? buildLineEnd(options.headEnd) : undefined,
    tailEnd: options?.tailEnd ? buildLineEnd(options.tailEnd) : undefined,
  };
}

/**
 * Build a line object with ColorSpec support (hex or theme color)
 */
export function buildLineFromSpec(
  lineColor: ColorSpec,
  lineWidth: number,
  options?: {
    dash?: DashStyle;
    cap?: LineCap;
    join?: LineJoin;
    compound?: CompoundLine;
    headEnd?: LineEndSpec;
    tailEnd?: LineEndSpec;
  },
): BaseLine {
  const compound = options?.compound ? COMPOUND_MAP[options.compound] : "sng";
  return {
    width: lineWidth as Pixels,
    cap: (options?.cap ?? "flat") as BaseLine["cap"],
    compound: compound,
    alignment: "ctr",
    fill: { type: "solidFill", color: buildColor(lineColor) },
    dash: options?.dash ?? "solid",
    join: (options?.join ?? "round") as BaseLine["join"],
    headEnd: options?.headEnd ? buildLineEnd(options.headEnd) : undefined,
    tailEnd: options?.tailEnd ? buildLineEnd(options.tailEnd) : undefined,
  };
}
