/**
 * @file Geometry renderer
 *
 * Converts Geometry domain objects to SVG paths.
 */

import type {
  ArcToCommand,
  CubicBezierCommand,
  CustomGeometry,
  Geometry,
  GeometryGuide,
  GeometryPath,
  PathCommand,
  PresetGeometry,
  QuadBezierCommand,
  Transform,
} from "../../domain";
import { px } from "../../domain/types";
import type { HtmlString } from "../html/primitives";
import { path } from "./primitives";
import { renderFillToStyle, renderLineToStyle } from "./fill";
import { generateLineMarkers, type MarkerCollection } from "./marker";
import { resolveFill, formatRgba } from "../core";
import type { Fill, Line } from "../../domain";
import type { ColorContext } from "../../domain/resolution";
import { createGuideContext, evaluateGuides } from "../../core/geometry/guide-engine";

// =============================================================================
// Path Command Rendering
// =============================================================================

/**
 * Convert path command to SVG path data
 */
function commandToPath(command: PathCommand): string {
  switch (command.type) {
    case "moveTo":
      return `M ${command.point.x} ${command.point.y}`;
    case "lineTo":
      return `L ${command.point.x} ${command.point.y}`;
    case "arcTo":
      return renderArcTo(command);
    case "quadBezierTo":
      return renderQuadBezier(command);
    case "cubicBezierTo":
      return renderCubicBezier(command);
    case "close":
      return "Z";
  }
}

/**
 * Render arc to SVG path
 */
function renderArcTo(cmd: ArcToCommand): string {
  // Convert OOXML arc to SVG arc
  // SVG arc: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const rx = cmd.widthRadius;
  const ry = cmd.heightRadius;
  const startAngle = (cmd.startAngle * Math.PI) / 180;
  const swingAngle = (cmd.swingAngle * Math.PI) / 180;
  const endAngle = startAngle + swingAngle;

  // Calculate end point
  const endX = rx * Math.cos(endAngle);
  const endY = ry * Math.sin(endAngle);

  // Determine flags
  const largeArcFlag = Math.abs(swingAngle) > Math.PI ? 1 : 0;
  const sweepFlag = swingAngle > 0 ? 1 : 0;

  return `A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

/**
 * Render quadratic bezier to SVG path
 */
function renderQuadBezier(cmd: QuadBezierCommand): string {
  return `Q ${cmd.control.x} ${cmd.control.y} ${cmd.end.x} ${cmd.end.y}`;
}

/**
 * Render cubic bezier to SVG path
 */
function renderCubicBezier(cmd: CubicBezierCommand): string {
  return `C ${cmd.control1.x} ${cmd.control1.y} ${cmd.control2.x} ${cmd.control2.y} ${cmd.end.x} ${cmd.end.y}`;
}

// =============================================================================
// Geometry Path Rendering
// =============================================================================

/**
 * Render a geometry path to SVG path data
 */
export function renderGeometryPathData(geomPath: GeometryPath): string {
  return geomPath.commands.map(commandToPath).join(" ");
}

/**
 * Render a geometry path to SVG path element
 */
export function renderGeometryPath(
  geomPath: GeometryPath,
  fill: Fill | undefined,
  line: Line | undefined,
  transform?: Transform,
): HtmlString {
  const d = renderGeometryPathData(geomPath);

  const fillStyle = fill ? renderFillToStyle(fill) : undefined;
  const strokeStyle = line ? renderLineToStyle(line) : undefined;

  const pathAttrs: Record<string, string | number | undefined> = {
    d,
    fill: fillStyle?.fill ?? "none",
    stroke: strokeStyle?.stroke,
    "stroke-width": strokeStyle?.strokeWidth,
    "stroke-linecap": strokeStyle?.strokeLinecap,
    "stroke-linejoin": strokeStyle?.strokeLinejoin,
    "stroke-dasharray": strokeStyle?.strokeDasharray,
  };

  if (transform) {
    pathAttrs.transform = buildTransformAttr(transform);
  }

  return path(pathAttrs as Parameters<typeof path>[0]);
}

// =============================================================================
// Preset Geometry Rendering
// =============================================================================

/**
 * Preset shape path data generators
 */
function renderRightArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 50000;
  const adj2 = adj.get("adj2") ?? 50000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 100000 w ss" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "dx1", formula: "*/ ss a2 100000" },
    { name: "x1", formula: "+- r 0 dx1" },
    { name: "dy1", formula: "*/ h a1 200000" },
    { name: "y1", formula: "+- vc 0 dy1" },
    { name: "y2", formula: "+- vc dy1 0" },
    { name: "dx2", formula: "*/ y1 dx1 hd2" },
    { name: "x2", formula: "+- x1 dx2 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x1 = context.get("x1");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x1 === undefined ||
    y1 === undefined ||
    y2 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for rightArrow");
  }

  return `M ${l} ${y1} L ${x1} ${y1} L ${x1} ${t} L ${r} ${vc} L ${x1} ${b} L ${x1} ${y2} L ${l} ${y2} Z`;
}

function renderDownArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 50000;
  const adj2 = adj.get("adj2") ?? 50000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 100000 h ss" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "dy1", formula: "*/ ss a2 100000" },
    { name: "y1", formula: "+- b 0 dy1" },
    { name: "dx1", formula: "*/ w a1 200000" },
    { name: "x1", formula: "+- hc 0 dx1" },
    { name: "x2", formula: "+- hc dx1 0" },
    { name: "dy2", formula: "*/ x1 dy1 wd2" },
    { name: "y2", formula: "+- y1 dy2 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const hc = context.get("hc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const y1 = context.get("y1");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    hc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    y1 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for downArrow");
  }

  return `M ${l} ${y1} L ${x1} ${y1} L ${x1} ${t} L ${x2} ${t} L ${x2} ${y1} L ${r} ${y1} L ${hc} ${b} Z`;
}

function renderLeftArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 50000;
  const adj2 = adj.get("adj2") ?? 50000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 100000 w ss" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "dx2", formula: "*/ ss a2 100000" },
    { name: "x2", formula: "+- l dx2 0" },
    { name: "dy1", formula: "*/ h a1 200000" },
    { name: "y1", formula: "+- vc 0 dy1" },
    { name: "y2", formula: "+- vc dy1 0" },
    { name: "dx1", formula: "*/ y1 dx2 hd2" },
    { name: "x1", formula: "+- x2 0 dx1" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x2 = context.get("x2");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x2 === undefined ||
    y1 === undefined ||
    y2 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for leftArrow");
  }

  return `M ${l} ${vc} L ${x2} ${t} L ${x2} ${y1} L ${r} ${y1} L ${r} ${y2} L ${x2} ${y2} L ${x2} ${b} Z`;
}

function renderLeftRightArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 50000;
  const adj2 = adj.get("adj2") ?? 50000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 w ss" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "x2", formula: "*/ ss a2 100000" },
    { name: "x3", formula: "+- r 0 x2" },
    { name: "dy", formula: "*/ h a1 200000" },
    { name: "y1", formula: "+- vc 0 dy" },
    { name: "y2", formula: "+- vc dy 0" },
    { name: "dx1", formula: "*/ y1 x2 hd2" },
    { name: "x1", formula: "+- x2 0 dx1" },
    { name: "x4", formula: "+- x3 dx1 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    y1 === undefined ||
    y2 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for leftRightArrow");
  }

  return `M ${l} ${vc} L ${x2} ${t} L ${x2} ${y1} L ${x3} ${y1} L ${x3} ${t} L ${r} ${vc} L ${x3} ${b} L ${x3} ${y2} L ${x2} ${y2} L ${x2} ${b} Z`;
}

function renderUpDownArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 50000;
  const adj2 = adj.get("adj2") ?? 50000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 h ss" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "y2", formula: "*/ ss a2 100000" },
    { name: "y3", formula: "+- b 0 y2" },
    { name: "dx1", formula: "*/ w a1 200000" },
    { name: "x1", formula: "+- hc 0 dx1" },
    { name: "x2", formula: "+- hc dx1 0" },
    { name: "dy1", formula: "*/ x1 y2 wd2" },
    { name: "y1", formula: "+- y2 0 dy1" },
    { name: "y4", formula: "+- y3 dy1 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const hc = context.get("hc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    hc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    y2 === undefined ||
    y3 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for upDownArrow");
  }

  return `M ${l} ${y2} L ${hc} ${t} L ${r} ${y2} L ${x2} ${y2} L ${x2} ${y3} L ${r} ${y3} L ${hc} ${b} L ${l} ${y3} L ${x1} ${y3} L ${x1} ${y2} Z`;
}

function renderLeftArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 64977;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 h ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "*/ 100000 w ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 ss w" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "dy1", formula: "*/ ss a2 100000" },
    { name: "dy2", formula: "*/ ss a1 200000" },
    { name: "y1", formula: "+- vc 0 dy1" },
    { name: "y2", formula: "+- vc 0 dy2" },
    { name: "y3", formula: "+- vc dy2 0" },
    { name: "y4", formula: "+- vc dy1 0" },
    { name: "x1", formula: "*/ ss a3 100000" },
    { name: "dx2", formula: "*/ w a4 100000" },
    { name: "x2", formula: "+- r 0 dx2" },
    { name: "x3", formula: "+/ x2 r 2" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  const y4 = context.get("y4");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    y1 === undefined ||
    y2 === undefined ||
    y3 === undefined ||
    y4 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for leftArrowCallout");
  }

  return `M ${l} ${vc} L ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2} L ${x2} ${t} L ${r} ${t} L ${r} ${b} L ${x2} ${b} L ${x2} ${y3} L ${x1} ${y3} L ${x1} ${y4} Z`;
}

function renderRightArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 64977;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 h ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "*/ 100000 w ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 ss w" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "dy1", formula: "*/ ss a2 100000" },
    { name: "dy2", formula: "*/ ss a1 200000" },
    { name: "y1", formula: "+- vc 0 dy1" },
    { name: "y2", formula: "+- vc 0 dy2" },
    { name: "y3", formula: "+- vc dy2 0" },
    { name: "y4", formula: "+- vc dy1 0" },
    { name: "dx3", formula: "*/ ss a3 100000" },
    { name: "x3", formula: "+- r 0 dx3" },
    { name: "x2", formula: "*/ w a4 100000" },
    { name: "x1", formula: "*/ x2 1 2" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  const y4 = context.get("y4");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    y1 === undefined ||
    y2 === undefined ||
    y3 === undefined ||
    y4 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for rightArrowCallout");
  }

  return `M ${l} ${t} L ${x2} ${t} L ${x2} ${y2} L ${x3} ${y2} L ${x3} ${y1} L ${r} ${vc} L ${x3} ${y4} L ${x3} ${y3} L ${x2} ${y3} L ${x2} ${b} L ${l} ${b} Z`;
}

function renderUpArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 64977;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 w ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "*/ 100000 h ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 ss h" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "dx1", formula: "*/ ss a2 100000" },
    { name: "dx2", formula: "*/ ss a1 200000" },
    { name: "x1", formula: "+- hc 0 dx1" },
    { name: "x2", formula: "+- hc 0 dx2" },
    { name: "x3", formula: "+- hc dx2 0" },
    { name: "x4", formula: "+- hc dx1 0" },
    { name: "y1", formula: "*/ ss a3 100000" },
    { name: "dy2", formula: "*/ h a4 100000" },
    { name: "y2", formula: "+- b 0 dy2" },
    { name: "y3", formula: "+/ y2 b 2" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const hc = context.get("hc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    hc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    y1 === undefined ||
    y2 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for upArrowCallout");
  }

  return `M ${l} ${y2} L ${x2} ${y2} L ${x2} ${y1} L ${x1} ${y1} L ${hc} ${t} L ${x4} ${y1} L ${x3} ${y1} L ${x3} ${y2} L ${r} ${y2} L ${r} ${b} L ${l} ${b} Z`;
}

function renderDownArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 64977;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 w ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "*/ 100000 h ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 ss h" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "dx1", formula: "*/ ss a2 100000" },
    { name: "dx2", formula: "*/ ss a1 200000" },
    { name: "x1", formula: "+- hc 0 dx1" },
    { name: "x2", formula: "+- hc 0 dx2" },
    { name: "x3", formula: "+- hc dx2 0" },
    { name: "x4", formula: "+- hc dx1 0" },
    { name: "dy3", formula: "*/ ss a3 100000" },
    { name: "y3", formula: "+- b 0 dy3" },
    { name: "y2", formula: "*/ h a4 100000" },
    { name: "y1", formula: "*/ y2 1 2" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const hc = context.get("hc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    hc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    y2 === undefined ||
    y3 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for downArrowCallout");
  }

  return `M ${l} ${t} L ${r} ${t} L ${r} ${y2} L ${x3} ${y2} L ${x3} ${y3} L ${x4} ${y3} L ${hc} ${b} L ${x1} ${y3} L ${x2} ${y3} L ${x2} ${y2} L ${l} ${y2} Z`;
}

function renderLeftRightArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 48123;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 h ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "*/ 50000 w ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 ss wd2" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "dy1", formula: "*/ ss a2 100000" },
    { name: "dy2", formula: "*/ ss a1 200000" },
    { name: "y1", formula: "+- vc 0 dy1" },
    { name: "y2", formula: "+- vc 0 dy2" },
    { name: "y3", formula: "+- vc dy2 0" },
    { name: "y4", formula: "+- vc dy1 0" },
    { name: "x1", formula: "*/ ss a3 100000" },
    { name: "x4", formula: "+- r 0 x1" },
    { name: "dx2", formula: "*/ w a4 200000" },
    { name: "x2", formula: "+- hc 0 dx2" },
    { name: "x3", formula: "+- hc dx2 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  const y4 = context.get("y4");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    y1 === undefined ||
    y2 === undefined ||
    y3 === undefined ||
    y4 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for leftRightArrowCallout");
  }

  return `M ${l} ${vc} L ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2} L ${x2} ${t} L ${x3} ${t} L ${x3} ${y2} L ${x4} ${y2} L ${x4} ${y1} L ${r} ${vc} L ${x4} ${y4} L ${x4} ${y3} L ${x3} ${y3} L ${x3} ${b} L ${x2} ${b} L ${x2} ${y3} L ${x1} ${y3} L ${x1} ${y4} Z`;
}

function renderUpDownArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 48123;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 w ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "*/ 50000 h ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 ss hd2" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "dx1", formula: "*/ ss a2 100000" },
    { name: "dx2", formula: "*/ ss a1 200000" },
    { name: "x1", formula: "+- hc 0 dx1" },
    { name: "x2", formula: "+- hc 0 dx2" },
    { name: "x3", formula: "+- hc dx2 0" },
    { name: "x4", formula: "+- hc dx1 0" },
    { name: "y1", formula: "*/ ss a3 100000" },
    { name: "y4", formula: "+- b 0 y1" },
    { name: "dy2", formula: "*/ h a4 200000" },
    { name: "y2", formula: "+- vc 0 dy2" },
    { name: "y3", formula: "+- vc dy2 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const hc = context.get("hc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  const y4 = context.get("y4");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    hc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    y1 === undefined ||
    y2 === undefined ||
    y3 === undefined ||
    y4 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for upDownArrowCallout");
  }

  return `M ${l} ${y2} L ${x2} ${y2} L ${x2} ${y1} L ${x1} ${y1} L ${hc} ${t} L ${x4} ${y1} L ${x3} ${y1} L ${x3} ${y2} L ${r} ${y2} L ${r} ${y3} L ${x3} ${y3} L ${x3} ${y4} L ${x4} ${y4} L ${hc} ${b} L ${x1} ${y4} L ${x2} ${y4} L ${x2} ${y3} L ${l} ${y3} Z`;
}

function renderNotchedRightArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 50000;
  const adj2 = adj.get("adj2") ?? 50000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 100000 w ss" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "dx2", formula: "*/ ss a2 100000" },
    { name: "x2", formula: "+- r 0 dx2" },
    { name: "dy1", formula: "*/ h a1 200000" },
    { name: "y1", formula: "+- vc 0 dy1" },
    { name: "y2", formula: "+- vc dy1 0" },
    { name: "x1", formula: "*/ dy1 dx2 hd2" },
    { name: "x3", formula: "+- r 0 x1" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const vc = context.get("vc");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    vc === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    y1 === undefined ||
    y2 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for notchedRightArrow");
  }

  return `M ${l} ${y1} L ${x2} ${y1} L ${x2} ${t} L ${r} ${vc} L ${x2} ${b} L ${x2} ${y2} L ${l} ${y2} L ${x1} ${vc} Z`;
}

function renderQuadArrowCalloutPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 18515;
  const adj2 = adj.get("adj2") ?? 18515;
  const adj3 = adj.get("adj3") ?? 18515;
  const adj4 = adj.get("adj4") ?? 48123;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a2", formula: "pin 0 adj2 50000" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "+- 50000 0 a2" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q2", formula: "*/ a3 2 1" },
    { name: "maxAdj4", formula: "+- 100000 0 q2" },
    { name: "a4", formula: "pin a1 adj4 maxAdj4" },
    { name: "dx2", formula: "*/ ss a2 100000" },
    { name: "dx3", formula: "*/ ss a1 200000" },
    { name: "ah", formula: "*/ ss a3 100000" },
    { name: "dx1", formula: "*/ w a4 200000" },
    { name: "dy1", formula: "*/ h a4 200000" },
    { name: "x8", formula: "+- r 0 ah" },
    { name: "x2", formula: "+- hc 0 dx1" },
    { name: "x7", formula: "+- hc dx1 0" },
    { name: "x3", formula: "+- hc 0 dx2" },
    { name: "x6", formula: "+- hc dx2 0" },
    { name: "x4", formula: "+- hc 0 dx3" },
    { name: "x5", formula: "+- hc dx3 0" },
    { name: "y8", formula: "+- b 0 ah" },
    { name: "y2", formula: "+- vc 0 dy1" },
    { name: "y7", formula: "+- vc dy1 0" },
    { name: "y3", formula: "+- vc 0 dx2" },
    { name: "y6", formula: "+- vc dx2 0" },
    { name: "y4", formula: "+- vc 0 dx3" },
    { name: "y5", formula: "+- vc dx3 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const hc = context.get("hc");
  const vc = context.get("vc");
  const ah = context.get("ah");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const x5 = context.get("x5");
  const x6 = context.get("x6");
  const x7 = context.get("x7");
  const x8 = context.get("x8");
  const y2 = context.get("y2");
  const y3 = context.get("y3");
  const y4 = context.get("y4");
  const y5 = context.get("y5");
  const y6 = context.get("y6");
  const y7 = context.get("y7");
  const y8 = context.get("y8");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    hc === undefined ||
    vc === undefined ||
    ah === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    x5 === undefined ||
    x6 === undefined ||
    x7 === undefined ||
    x8 === undefined ||
    y2 === undefined ||
    y3 === undefined ||
    y4 === undefined ||
    y5 === undefined ||
    y6 === undefined ||
    y7 === undefined ||
    y8 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for quadArrowCallout");
  }

  return `M ${l} ${vc} L ${ah} ${y3} L ${ah} ${y4} L ${x2} ${y4} L ${x2} ${y2} L ${x4} ${y2} L ${x4} ${ah} L ${x3} ${ah} L ${hc} ${t} L ${x6} ${ah} L ${x5} ${ah} L ${x5} ${y2} L ${x7} ${y2} L ${x7} ${y4} L ${x8} ${y4} L ${x8} ${y3} L ${r} ${vc} L ${x8} ${y6} L ${x8} ${y5} L ${x7} ${y5} L ${x7} ${y7} L ${x5} ${y7} L ${x5} ${y8} L ${x6} ${y8} L ${hc} ${b} L ${x3} ${y8} L ${x4} ${y8} L ${x4} ${y7} L ${x2} ${y7} L ${x2} ${y5} L ${ah} ${y5} L ${ah} ${y6} Z`;
}

function renderBentArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 43750;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a2", formula: "pin 0 adj2 50000" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "a3", formula: "pin 0 adj3 50000" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "aw2", formula: "*/ ss a2 100000" },
    { name: "th2", formula: "*/ th 1 2" },
    { name: "dh2", formula: "+- aw2 0 th2" },
    { name: "ah", formula: "*/ ss a3 100000" },
    { name: "bw", formula: "+- r 0 ah" },
    { name: "bh", formula: "+- b 0 dh2" },
    { name: "bs", formula: "min bw bh" },
    { name: "maxAdj4", formula: "*/ 100000 bs ss" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "bd", formula: "*/ ss a4 100000" },
    { name: "bd3", formula: "+- bd 0 th" },
    { name: "bd2", formula: "max bd3 0" },
    { name: "x3", formula: "+- th bd2 0" },
    { name: "x4", formula: "+- r 0 ah" },
    { name: "y3", formula: "+- dh2 th 0" },
    { name: "y4", formula: "+- y3 dh2 0" },
    { name: "y5", formula: "+- dh2 bd 0" },
    { name: "y6", formula: "+- y3 bd2 0" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const th = context.get("th");
  const aw2 = context.get("aw2");
  const bd = context.get("bd");
  const bd2 = context.get("bd2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const y3 = context.get("y3");
  const y4 = context.get("y4");
  const y5 = context.get("y5");
  const y6 = context.get("y6");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    th === undefined ||
    aw2 === undefined ||
    bd === undefined ||
    bd2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    y3 === undefined ||
    y4 === undefined ||
    y5 === undefined ||
    y6 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for bentArrow");
  }

  return `M ${l} ${b} L ${l} ${y5} A ${bd} ${bd} 0 0 1 ${bd} ${y6} L ${x4} ${aw2} L ${x4} ${t} L ${r} ${aw2} L ${x4} ${y4} L ${x4} ${y3} L ${x3} ${y3} A ${bd2} ${bd2} 0 0 0 ${th} ${y6} L ${th} ${b} Z`;
}

function renderBentUpArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a1", formula: "pin 0 adj1 50000" },
    { name: "a2", formula: "pin 0 adj2 50000" },
    { name: "a3", formula: "pin 0 adj3 50000" },
    { name: "y1", formula: "*/ ss a3 100000" },
    { name: "dx1", formula: "*/ ss a2 50000" },
    { name: "x1", formula: "+- r 0 dx1" },
    { name: "dx3", formula: "*/ ss a2 100000" },
    { name: "x3", formula: "+- r 0 dx3" },
    { name: "dx2", formula: "*/ ss a1 200000" },
    { name: "x2", formula: "+- x3 0 dx2" },
    { name: "x4", formula: "+- x3 dx2 0" },
    { name: "dy2", formula: "*/ ss a1 100000" },
    { name: "y2", formula: "+- b 0 dy2" },
    { name: "x0", formula: "*/ x4 1 2" },
    { name: "y3", formula: "+/ y2 b 2" },
    { name: "y15", formula: "+/ y1 b 2" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const x1 = context.get("x1");
  const x2 = context.get("x2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const y1 = context.get("y1");
  const y2 = context.get("y2");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    x1 === undefined ||
    x2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    y1 === undefined ||
    y2 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for bentUpArrow");
  }

  return `M ${l} ${y2} L ${x2} ${y2} L ${x2} ${y1} L ${x1} ${y1} L ${x3} ${t} L ${r} ${y1} L ${x4} ${y1} L ${x4} ${b} L ${l} ${b} Z`;
}

function renderUturnArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const adj4 = adj.get("adj4") ?? 43750;
  const adj5 = adj.get("adj5") ?? 75000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
    { name: "adj5", value: adj5 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a2", formula: "pin 0 adj2 25000" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "q2", formula: "*/ a1 ss h" },
    { name: "q3", formula: "+- 100000 0 q2" },
    { name: "maxAdj3", formula: "*/ q3 h ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "q1", formula: "+- a3 a1 0" },
    { name: "minAdj5", formula: "*/ q1 ss h" },
    { name: "a5", formula: "pin minAdj5 adj5 100000" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "aw2", formula: "*/ ss a2 100000" },
    { name: "th2", formula: "*/ th 1 2" },
    { name: "dh2", formula: "+- aw2 0 th2" },
    { name: "y5", formula: "*/ h a5 100000" },
    { name: "ah", formula: "*/ ss a3 100000" },
    { name: "y4", formula: "+- y5 0 ah" },
    { name: "x9", formula: "+- r 0 dh2" },
    { name: "bw", formula: "*/ x9 1 2" },
    { name: "bs", formula: "min bw y4" },
    { name: "maxAdj4", formula: "*/ bs 100000 ss" },
    { name: "a4", formula: "pin 0 adj4 maxAdj4" },
    { name: "bd", formula: "*/ ss a4 100000" },
    { name: "bd3", formula: "+- bd 0 th" },
    { name: "bd2", formula: "max bd3 0" },
    { name: "x3", formula: "+- th bd2 0" },
    { name: "x8", formula: "+- r 0 aw2" },
    { name: "x6", formula: "+- x8 0 aw2" },
    { name: "x7", formula: "+- x6 dh2 0" },
    { name: "x4", formula: "+- x9 0 bd" },
    { name: "x5", formula: "+- x7 0 bd2" },
    { name: "cx", formula: "+/ th x7 2" },
  ];
  evaluateGuides(guides, context);

  const l = context.get("l");
  const r = context.get("r");
  const t = context.get("t");
  const b = context.get("b");
  const th = context.get("th");
  const bd = context.get("bd");
  const bd2 = context.get("bd2");
  const x3 = context.get("x3");
  const x4 = context.get("x4");
  const x6 = context.get("x6");
  const x7 = context.get("x7");
  const x8 = context.get("x8");
  const x9 = context.get("x9");
  const y4 = context.get("y4");
  const y5 = context.get("y5");
  if (
    l === undefined ||
    r === undefined ||
    t === undefined ||
    b === undefined ||
    th === undefined ||
    bd === undefined ||
    bd2 === undefined ||
    x3 === undefined ||
    x4 === undefined ||
    x6 === undefined ||
    x7 === undefined ||
    x8 === undefined ||
    x9 === undefined ||
    y4 === undefined ||
    y5 === undefined
  ) {
    throw new Error("Non-ECMA guide resolution for uturnArrow");
  }

  return `M ${l} ${b} L ${l} ${bd} A ${bd} ${bd} 0 0 1 ${bd} ${t} L ${x4} ${t} A ${bd} ${bd} 0 0 1 ${x9} ${y4} L ${r} ${y4} L ${x8} ${y5} L ${x6} ${y4} L ${x7} ${y4} L ${x7} ${x3} A ${bd2} ${bd2} 0 0 0 ${x3} ${th} A ${bd2} ${bd2} 0 0 0 ${th} ${b} Z`;
}

type PresetPathCommand =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "quadBezierTo"; cx: number; cy: number; x: number; y: number }
  | { type: "arcTo"; wR: number; hR: number; stAng: number; swAng: number }
  | { type: "close" };

const ANGLE_TO_RADIANS = Math.PI / (180 * 60000);
const HALF_CIRCLE = 10800000;

function requireGuideValues(
  context: Map<string, number>,
  names: readonly string[],
  shapeName: string,
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const name of names) {
    const value = context.get(name);
    if (value === undefined) {
      throw new Error(`Non-ECMA guide resolution for ${shapeName}`);
    }
    values[name] = value;
  }
  return values;
}

function buildPresetPath(commands: readonly PresetPathCommand[]): string {
  const segments: string[] = [];
  const current = { x: 0, y: 0 };

  for (const command of commands) {
    if (command.type === "moveTo") {
      current.x = command.x;
      current.y = command.y;
      segments.push(`M ${command.x} ${command.y}`);
      continue;
    }

    if (command.type === "lineTo") {
      current.x = command.x;
      current.y = command.y;
      segments.push(`L ${command.x} ${command.y}`);
      continue;
    }

    if (command.type === "arcTo") {
      const startRad = command.stAng * ANGLE_TO_RADIANS;
      const endRad = (command.stAng + command.swAng) * ANGLE_TO_RADIANS;
      const centerX = current.x - command.wR * Math.cos(startRad);
      const centerY = current.y - command.hR * Math.sin(startRad);
      const endX = centerX + command.wR * Math.cos(endRad);
      const endY = centerY + command.hR * Math.sin(endRad);
      const largeArcFlag = Math.abs(command.swAng) > HALF_CIRCLE ? 1 : 0;
      const sweepFlag = command.swAng >= 0 ? 1 : 0;
      segments.push(`A ${command.wR} ${command.hR} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`);
      current.x = endX;
      current.y = endY;
      continue;
    }

    if (command.type === "quadBezierTo") {
      current.x = command.x;
      current.y = command.y;
      segments.push(`Q ${command.cx} ${command.cy} ${command.x} ${command.y}`);
      continue;
    }

    segments.push("Z");
  }

  return segments.join(" ");
}

function renderLeftUpArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a2", formula: "pin 0 adj2 50000" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "maxAdj3", formula: "+- 100000 0 maxAdj1" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "x1", formula: "*/ ss a3 100000" },
    { name: "dx2", formula: "*/ ss a2 50000" },
    { name: "x2", formula: "+- r 0 dx2" },
    { name: "y2", formula: "+- b 0 dx2" },
    { name: "dx4", formula: "*/ ss a2 100000" },
    { name: "x4", formula: "+- r 0 dx4" },
    { name: "y4", formula: "+- b 0 dx4" },
    { name: "dx3", formula: "*/ ss a1 200000" },
    { name: "x3", formula: "+- x4 0 dx3" },
    { name: "x5", formula: "+- x4 dx3 0" },
    { name: "y3", formula: "+- y4 0 dx3" },
    { name: "y5", formula: "+- y4 dx3 0" },
    { name: "il", formula: "*/ dx3 x1 dx4" },
    { name: "cx1", formula: "+/ x1 x5 2" },
    { name: "cy1", formula: "+/ x1 y5 2" },
  ];
  evaluateGuides(guides, context);

  const { l, r, t, b, x1, x2, x3, x4, x5, y2, y3, y4, y5 } = requireGuideValues(
    context,
    ["l", "r", "t", "b", "x1", "x2", "x3", "x4", "x5", "y2", "y3", "y4", "y5"],
    "leftUpArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: l, y: y4 },
    { type: "lineTo", x: x1, y: y2 },
    { type: "lineTo", x: x1, y: y3 },
    { type: "lineTo", x: x3, y: y3 },
    { type: "lineTo", x: x3, y: x1 },
    { type: "lineTo", x: x2, y: x1 },
    { type: "lineTo", x: x4, y: t },
    { type: "lineTo", x: r, y: x1 },
    { type: "lineTo", x: x5, y: x1 },
    { type: "lineTo", x: x5, y: y5 },
    { type: "lineTo", x: x1, y: y5 },
    { type: "lineTo", x: x1, y: b },
    { type: "close" },
  ]);
}

function renderLeftRightUpArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 25000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a2", formula: "pin 0 adj2 50000" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "q1", formula: "+- 100000 0 maxAdj1" },
    { name: "maxAdj3", formula: "*/ q1 1 2" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "x1", formula: "*/ ss a3 100000" },
    { name: "dx2", formula: "*/ ss a2 100000" },
    { name: "x2", formula: "+- hc 0 dx2" },
    { name: "x5", formula: "+- hc dx2 0" },
    { name: "dx3", formula: "*/ ss a1 200000" },
    { name: "x3", formula: "+- hc 0 dx3" },
    { name: "x4", formula: "+- hc dx3 0" },
    { name: "x6", formula: "+- r 0 x1" },
    { name: "dy2", formula: "*/ ss a2 50000" },
    { name: "y2", formula: "+- b 0 dy2" },
    { name: "y4", formula: "+- b 0 dx2" },
    { name: "y3", formula: "+- y4 0 dx3" },
    { name: "y5", formula: "+- y4 dx3 0" },
    { name: "il", formula: "*/ dx3 x1 dx2" },
    { name: "ir", formula: "+- r 0 il" },
  ];
  evaluateGuides(guides, context);

  const { l, r, t, b, hc, x1, x2, x3, x4, x5, x6, y2, y3, y4, y5 } = requireGuideValues(
    context,
    ["l", "r", "t", "b", "hc", "x1", "x2", "x3", "x4", "x5", "x6", "y2", "y3", "y4", "y5"],
    "leftRightUpArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: l, y: y4 },
    { type: "lineTo", x: x1, y: y2 },
    { type: "lineTo", x: x1, y: y3 },
    { type: "lineTo", x: x3, y: y3 },
    { type: "lineTo", x: x3, y: x1 },
    { type: "lineTo", x: x2, y: x1 },
    { type: "lineTo", x: hc, y: t },
    { type: "lineTo", x: x5, y: x1 },
    { type: "lineTo", x: x4, y: x1 },
    { type: "lineTo", x: x4, y: y3 },
    { type: "lineTo", x: x6, y: y3 },
    { type: "lineTo", x: x6, y: y2 },
    { type: "lineTo", x: r, y: y4 },
    { type: "lineTo", x: x6, y: b },
    { type: "lineTo", x: x6, y: y5 },
    { type: "lineTo", x: x1, y: y5 },
    { type: "lineTo", x: x1, y: b },
    { type: "close" },
  ]);
}

function renderQuadArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 22500;
  const adj2 = adj.get("adj2") ?? 22500;
  const adj3 = adj.get("adj3") ?? 22500;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a2", formula: "pin 0 adj2 50000" },
    { name: "maxAdj1", formula: "*/ a2 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "q1", formula: "+- 100000 0 maxAdj1" },
    { name: "maxAdj3", formula: "*/ q1 1 2" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "x1", formula: "*/ ss a3 100000" },
    { name: "dx2", formula: "*/ ss a2 100000" },
    { name: "x2", formula: "+- hc 0 dx2" },
    { name: "x5", formula: "+- hc dx2 0" },
    { name: "dx3", formula: "*/ ss a1 200000" },
    { name: "x3", formula: "+- hc 0 dx3" },
    { name: "x4", formula: "+- hc dx3 0" },
    { name: "x6", formula: "+- r 0 x1" },
    { name: "y2", formula: "+- vc 0 dx2" },
    { name: "y5", formula: "+- vc dx2 0" },
    { name: "y3", formula: "+- vc 0 dx3" },
    { name: "y4", formula: "+- vc dx3 0" },
    { name: "y6", formula: "+- b 0 x1" },
    { name: "il", formula: "*/ dx3 x1 dx2" },
    { name: "ir", formula: "+- r 0 il" },
  ];
  evaluateGuides(guides, context);

  const { l, r, t, b, hc, vc, x1, x2, x3, x4, x5, x6, y2, y3, y4, y5, y6 } = requireGuideValues(
    context,
    ["l", "r", "t", "b", "hc", "vc", "x1", "x2", "x3", "x4", "x5", "x6", "y2", "y3", "y4", "y5", "y6"],
    "quadArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: l, y: vc },
    { type: "lineTo", x: x1, y: y2 },
    { type: "lineTo", x: x1, y: y3 },
    { type: "lineTo", x: x3, y: y3 },
    { type: "lineTo", x: x3, y: x1 },
    { type: "lineTo", x: x2, y: x1 },
    { type: "lineTo", x: hc, y: t },
    { type: "lineTo", x: x5, y: x1 },
    { type: "lineTo", x: x4, y: x1 },
    { type: "lineTo", x: x4, y: y3 },
    { type: "lineTo", x: x6, y: y3 },
    { type: "lineTo", x: x6, y: y2 },
    { type: "lineTo", x: r, y: vc },
    { type: "lineTo", x: x6, y: y5 },
    { type: "lineTo", x: x6, y: y4 },
    { type: "lineTo", x: x4, y: y4 },
    { type: "lineTo", x: x4, y: y6 },
    { type: "lineTo", x: x5, y: y6 },
    { type: "lineTo", x: hc, y: b },
    { type: "lineTo", x: x2, y: y6 },
    { type: "lineTo", x: x3, y: y6 },
    { type: "lineTo", x: x3, y: y4 },
    { type: "lineTo", x: x1, y: y4 },
    { type: "lineTo", x: x1, y: y5 },
    { type: "close" },
  ]);
}

function renderCircularArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 12500;
  const adj2 = adj.get("adj2") ?? 1142319;
  const adj3 = adj.get("adj3") ?? 20457681;
  const adj4 = adj.get("adj4") ?? 10800000;
  const adj5 = adj.get("adj5") ?? 12500;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
    { name: "adj5", value: adj5 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a5", formula: "pin 0 adj5 25000" },
    { name: "maxAdj1", formula: "*/ a5 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "enAng", formula: "pin 1 adj3 21599999" },
    { name: "stAng", formula: "pin 0 adj4 21599999" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "thh", formula: "*/ ss a5 100000" },
    { name: "th2", formula: "*/ th 1 2" },
    { name: "rw1", formula: "+- wd2 th2 thh" },
    { name: "rh1", formula: "+- hd2 th2 thh" },
    { name: "rw2", formula: "+- rw1 0 th" },
    { name: "rh2", formula: "+- rh1 0 th" },
    { name: "rw3", formula: "+- rw2 th2 0" },
    { name: "rh3", formula: "+- rh2 th2 0" },
    { name: "wtH", formula: "sin rw3 enAng" },
    { name: "htH", formula: "cos rh3 enAng" },
    { name: "dxH", formula: "cat2 rw3 htH wtH" },
    { name: "dyH", formula: "sat2 rh3 htH wtH" },
    { name: "xH", formula: "+- hc dxH 0" },
    { name: "yH", formula: "+- vc dyH 0" },
    { name: "rI", formula: "min rw2 rh2" },
    { name: "u1", formula: "*/ dxH dxH 1" },
    { name: "u2", formula: "*/ dyH dyH 1" },
    { name: "u3", formula: "*/ rI rI 1" },
    { name: "u4", formula: "+- u1 0 u3" },
    { name: "u5", formula: "+- u2 0 u3" },
    { name: "u6", formula: "*/ u4 u5 u1" },
    { name: "u7", formula: "*/ u6 1 u2" },
    { name: "u8", formula: "+- 1 0 u7" },
    { name: "u9", formula: "sqrt u8" },
    { name: "u10", formula: "*/ u4 1 dxH" },
    { name: "u11", formula: "*/ u10 1 dyH" },
    { name: "u12", formula: "+/ 1 u9 u11" },
    { name: "u13", formula: "at2 1 u12" },
    { name: "u14", formula: "+- u13 21600000 0" },
    { name: "u15", formula: "?: u13 u13 u14" },
    { name: "u16", formula: "+- u15 0 enAng" },
    { name: "u17", formula: "+- u16 21600000 0" },
    { name: "u18", formula: "?: u16 u16 u17" },
    { name: "u19", formula: "+- u18 0 cd2" },
    { name: "u20", formula: "+- u18 0 21600000" },
    { name: "u21", formula: "?: u19 u20 u18" },
    { name: "maxAng", formula: "abs u21" },
    { name: "aAng", formula: "pin 0 adj2 maxAng" },
    { name: "ptAng", formula: "+- enAng aAng 0" },
    { name: "wtA", formula: "sin rw3 ptAng" },
    { name: "htA", formula: "cos rh3 ptAng" },
    { name: "dxA", formula: "cat2 rw3 htA wtA" },
    { name: "dyA", formula: "sat2 rh3 htA wtA" },
    { name: "xA", formula: "+- hc dxA 0" },
    { name: "yA", formula: "+- vc dyA 0" },
    { name: "wtE", formula: "sin rw1 stAng" },
    { name: "htE", formula: "cos rh1 stAng" },
    { name: "dxE", formula: "cat2 rw1 htE wtE" },
    { name: "dyE", formula: "sat2 rh1 htE wtE" },
    { name: "xE", formula: "+- hc dxE 0" },
    { name: "yE", formula: "+- vc dyE 0" },
    { name: "dxG", formula: "cos thh ptAng" },
    { name: "dyG", formula: "sin thh ptAng" },
    { name: "xG", formula: "+- xH dxG 0" },
    { name: "yG", formula: "+- yH dyG 0" },
    { name: "dxB", formula: "cos thh ptAng" },
    { name: "dyB", formula: "sin thh ptAng" },
    { name: "xB", formula: "+- xH 0 dxB 0" },
    { name: "yB", formula: "+- yH 0 dyB 0" },
    { name: "sx1", formula: "+- xB 0 hc" },
    { name: "sy1", formula: "+- yB 0 vc" },
    { name: "sx2", formula: "+- xG 0 hc" },
    { name: "sy2", formula: "+- yG 0 vc" },
    { name: "rO", formula: "min rw1 rh1" },
    { name: "x1O", formula: "*/ sx1 rO rw1" },
    { name: "y1O", formula: "*/ sy1 rO rh1" },
    { name: "x2O", formula: "*/ sx2 rO rw1" },
    { name: "y2O", formula: "*/ sy2 rO rh1" },
    { name: "dxO", formula: "+- x2O 0 x1O" },
    { name: "dyO", formula: "+- y2O 0 y1O" },
    { name: "dO", formula: "mod dxO dyO 0" },
    { name: "q1", formula: "*/ x1O y2O 1" },
    { name: "q2", formula: "*/ x2O y1O 1" },
    { name: "DO", formula: "+- q1 0 q2" },
    { name: "q3", formula: "*/ rO rO 1" },
    { name: "q4", formula: "*/ dO dO 1" },
    { name: "q5", formula: "*/ q3 q4 1" },
    { name: "q6", formula: "*/ DO DO 1" },
    { name: "q7", formula: "+- q5 0 q6" },
    { name: "q8", formula: "max q7 0" },
    { name: "sdelO", formula: "sqrt q8" },
    { name: "ndyO", formula: "*/ dyO -1 1" },
    { name: "sdyO", formula: "?: ndyO -1 1" },
    { name: "q9", formula: "*/ sdyO dxO 1" },
    { name: "q10", formula: "*/ q9 sdelO 1" },
    { name: "q11", formula: "*/ DO dyO 1" },
    { name: "dxF1", formula: "+/ q11 q10 q4" },
    { name: "q12", formula: "+- q11 0 q10" },
    { name: "dxF2", formula: "*/ q12 1 q4" },
    { name: "adyO", formula: "abs dyO" },
    { name: "q13", formula: "*/ adyO sdelO 1" },
    { name: "q14", formula: "*/ DO dxO -1" },
    { name: "dyF1", formula: "+/ q14 q13 q4" },
    { name: "q15", formula: "+- q14 0 q13" },
    { name: "dyF2", formula: "*/ q15 1 q4" },
    { name: "q16", formula: "+- x2O 0 dxF1" },
    { name: "q17", formula: "+- x2O 0 dxF2" },
    { name: "q18", formula: "+- y2O 0 dyF1" },
    { name: "q19", formula: "+- y2O 0 dyF2" },
    { name: "q20", formula: "mod q16 q18 0" },
    { name: "q21", formula: "mod q17 q19 0" },
    { name: "q22", formula: "+- q21 0 q20" },
    { name: "dxF", formula: "?: q22 dxF1 dxF2" },
    { name: "dyF", formula: "?: q22 dyF1 dyF2" },
    { name: "sdxF", formula: "*/ dxF rw1 rO" },
    { name: "sdyF", formula: "*/ dyF rh1 rO" },
    { name: "xF", formula: "+- hc sdxF 0" },
    { name: "yF", formula: "+- vc sdyF 0" },
    { name: "x1I", formula: "*/ sx1 rI rw2" },
    { name: "y1I", formula: "*/ sy1 rI rh2" },
    { name: "x2I", formula: "*/ sx2 rI rw2" },
    { name: "y2I", formula: "*/ sy2 rI rh2" },
    { name: "dxI", formula: "+- x2I 0 x1I" },
    { name: "dyI", formula: "+- y2I 0 y1I" },
    { name: "dI", formula: "mod dxI dyI 0" },
    { name: "v1", formula: "*/ x1I y2I 1" },
    { name: "v2", formula: "*/ x2I y1I 1" },
    { name: "DI", formula: "+- v1 0 v2" },
    { name: "v3", formula: "*/ rI rI 1" },
    { name: "v4", formula: "*/ dI dI 1" },
    { name: "v5", formula: "*/ v3 v4 1" },
    { name: "v6", formula: "*/ DI DI 1" },
    { name: "v7", formula: "+- v5 0 v6" },
    { name: "v8", formula: "max v7 0" },
    { name: "sdelI", formula: "sqrt v8" },
    { name: "v9", formula: "*/ sdyO dxI 1" },
    { name: "v10", formula: "*/ v9 sdelI 1" },
    { name: "v11", formula: "*/ DI dyI 1" },
    { name: "dxC1", formula: "+/ v11 v10 v4" },
    { name: "v12", formula: "+- v11 0 v10" },
    { name: "dxC2", formula: "*/ v12 1 v4" },
    { name: "adyI", formula: "abs dyI" },
    { name: "v13", formula: "*/ adyI sdelI 1" },
    { name: "v14", formula: "*/ DI dxI -1" },
    { name: "dyC1", formula: "+/ v14 v13 v4" },
    { name: "v15", formula: "+- v14 0 v13" },
    { name: "dyC2", formula: "*/ v15 1 v4" },
    { name: "v16", formula: "+- x1I 0 dxC1" },
    { name: "v17", formula: "+- x1I 0 dxC2" },
    { name: "v18", formula: "+- y1I 0 dyC1" },
    { name: "v19", formula: "+- y1I 0 dyC2" },
    { name: "v20", formula: "mod v16 v18 0" },
    { name: "v21", formula: "mod v17 v19 0" },
    { name: "v22", formula: "+- v21 0 v20" },
    { name: "dxC", formula: "?: v22 dxC1 dxC2" },
    { name: "dyC", formula: "?: v22 dyC1 dyC2" },
    { name: "sdxC", formula: "*/ dxC rw2 rI" },
    { name: "sdyC", formula: "*/ dyC rh2 rI" },
    { name: "xC", formula: "+- hc sdxC 0" },
    { name: "yC", formula: "+- vc sdyC 0" },
    { name: "ist0", formula: "at2 sdxC sdyC" },
    { name: "ist1", formula: "+- ist0 21600000 0" },
    { name: "istAng", formula: "?: ist0 ist0 ist1" },
    { name: "isw1", formula: "+- stAng 0 istAng" },
    { name: "isw2", formula: "+- isw1 0 21600000" },
    { name: "iswAng", formula: "?: isw1 isw2 isw1" },
    { name: "p1", formula: "+- xF 0 xC" },
    { name: "p2", formula: "+- yF 0 yC" },
    { name: "p3", formula: "mod p1 p2 0" },
    { name: "p4", formula: "*/ p3 1 2" },
    { name: "p5", formula: "+- p4 0 thh" },
    { name: "xGp", formula: "?: p5 xF xG" },
    { name: "yGp", formula: "?: p5 yF yG" },
    { name: "xBp", formula: "?: p5 xC xB" },
    { name: "yBp", formula: "?: p5 yC yB" },
    { name: "en0", formula: "at2 sdxF sdyF" },
    { name: "en1", formula: "+- en0 21600000 0" },
    { name: "en2", formula: "?: en0 en0 en1" },
    { name: "sw0", formula: "+- en2 0 stAng" },
    { name: "sw1", formula: "+- sw0 21600000 0" },
    { name: "swAng", formula: "?: sw0 sw0 sw1" },
    { name: "wtI", formula: "sin rw3 stAng" },
    { name: "htI", formula: "cos rh3 stAng" },
    { name: "dxI", formula: "cat2 rw3 htI wtI" },
    { name: "dyI", formula: "sat2 rh3 htI wtI" },
    { name: "xI", formula: "+- hc dxI 0" },
    { name: "yI", formula: "+- vc dyI 0" },
    { name: "aI", formula: "+- stAng 0 cd4" },
    { name: "aA", formula: "+- ptAng cd4 0" },
    { name: "aB", formula: "+- ptAng cd2 0" },
    { name: "idx", formula: "cos rw1 2700000" },
    { name: "idy", formula: "sin rh1 2700000" },
    { name: "il", formula: "+- hc 0 idx" },
    { name: "ir", formula: "+- hc idx 0" },
    { name: "it", formula: "+- vc 0 idy" },
    { name: "ib", formula: "+- vc idy 0" },
  ];
  evaluateGuides(guides, context);

  const {
    xE,
    yE,
    rw1,
    rh1,
    stAng,
    swAng,
    xGp,
    yGp,
    xA,
    yA,
    xBp,
    yBp,
    xC,
    yC,
    rw2,
    rh2,
    istAng,
    iswAng,
  } = requireGuideValues(
    context,
    [
      "xE",
      "yE",
      "rw1",
      "rh1",
      "stAng",
      "swAng",
      "xGp",
      "yGp",
      "xA",
      "yA",
      "xBp",
      "yBp",
      "xC",
      "yC",
      "rw2",
      "rh2",
      "istAng",
      "iswAng",
    ],
    "circularArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: xE, y: yE },
    { type: "arcTo", wR: rw1, hR: rh1, stAng, swAng },
    { type: "lineTo", x: xGp, y: yGp },
    { type: "lineTo", x: xA, y: yA },
    { type: "lineTo", x: xBp, y: yBp },
    { type: "lineTo", x: xC, y: yC },
    { type: "arcTo", wR: rw2, hR: rh2, stAng: istAng, swAng: iswAng },
    { type: "close" },
  ]);
}

function renderLeftCircularArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 12500;
  const adj2 = adj.get("adj2") ?? -1142319;
  const adj3 = adj.get("adj3") ?? 1142319;
  const adj4 = adj.get("adj4") ?? 10800000;
  const adj5 = adj.get("adj5") ?? 12500;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
    { name: "adj5", value: adj5 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a5", formula: "pin 0 adj5 25000" },
    { name: "maxAdj1", formula: "*/ a5 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "enAng", formula: "pin 1 adj3 21599999" },
    { name: "stAng", formula: "pin 0 adj4 21599999" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "thh", formula: "*/ ss a5 100000" },
    { name: "th2", formula: "*/ th 1 2" },
    { name: "rw1", formula: "+- wd2 th2 thh" },
    { name: "rh1", formula: "+- hd2 th2 thh" },
    { name: "rw2", formula: "+- rw1 0 th" },
    { name: "rh2", formula: "+- rh1 0 th" },
    { name: "rw3", formula: "+- rw2 th2 0" },
    { name: "rh3", formula: "+- rh2 th2 0" },
    { name: "wtH", formula: "sin rw3 enAng" },
    { name: "htH", formula: "cos rh3 enAng" },
    { name: "dxH", formula: "cat2 rw3 htH wtH" },
    { name: "dyH", formula: "sat2 rh3 htH wtH" },
    { name: "xH", formula: "+- hc dxH 0" },
    { name: "yH", formula: "+- vc dyH 0" },
    { name: "rI", formula: "min rw2 rh2" },
    { name: "u1", formula: "*/ dxH dxH 1" },
    { name: "u2", formula: "*/ dyH dyH 1" },
    { name: "u3", formula: "*/ rI rI 1" },
    { name: "u4", formula: "+- u1 0 u3" },
    { name: "u5", formula: "+- u2 0 u3" },
    { name: "u6", formula: "*/ u4 u5 u1" },
    { name: "u7", formula: "*/ u6 1 u2" },
    { name: "u8", formula: "+- 1 0 u7" },
    { name: "u9", formula: "sqrt u8" },
    { name: "u10", formula: "*/ u4 1 dxH" },
    { name: "u11", formula: "*/ u10 1 dyH" },
    { name: "u12", formula: "+/ 1 u9 u11" },
    { name: "u13", formula: "at2 1 u12" },
    { name: "u14", formula: "+- u13 21600000 0" },
    { name: "u15", formula: "?: u13 u13 u14" },
    { name: "u16", formula: "+- u15 0 enAng" },
    { name: "u17", formula: "+- u16 21600000 0" },
    { name: "u18", formula: "?: u16 u16 u17" },
    { name: "u19", formula: "+- u18 0 cd2" },
    { name: "u20", formula: "+- u18 0 21600000" },
    { name: "u21", formula: "?: u19 u20 u18" },
    { name: "u22", formula: "abs u21" },
    { name: "minAng", formula: "*/ u22 -1 1" },
    { name: "u23", formula: "abs adj2" },
    { name: "a2", formula: "*/ u23 -1 1" },
    { name: "aAng", formula: "pin minAng a2 0" },
    { name: "ptAng", formula: "+- enAng aAng 0" },
    { name: "wtA", formula: "sin rw3 ptAng" },
    { name: "htA", formula: "cos rh3 ptAng" },
    { name: "dxA", formula: "cat2 rw3 htA wtA" },
    { name: "dyA", formula: "sat2 rh3 htA wtA" },
    { name: "xA", formula: "+- hc dxA 0" },
    { name: "yA", formula: "+- vc dyA 0" },
    { name: "wtE", formula: "sin rw1 stAng" },
    { name: "htE", formula: "cos rh1 stAng" },
    { name: "dxE", formula: "cat2 rw1 htE wtE" },
    { name: "dyE", formula: "sat2 rh1 htE wtE" },
    { name: "xE", formula: "+- hc dxE 0" },
    { name: "yE", formula: "+- vc dyE 0" },
    { name: "wtD", formula: "sin rw2 stAng" },
    { name: "htD", formula: "cos rh2 stAng" },
    { name: "dxD", formula: "cat2 rw2 htD wtD" },
    { name: "dyD", formula: "sat2 rh2 htD wtD" },
    { name: "xD", formula: "+- hc dxD 0" },
    { name: "yD", formula: "+- vc dyD 0" },
    { name: "dxG", formula: "cos thh ptAng" },
    { name: "dyG", formula: "sin thh ptAng" },
    { name: "xG", formula: "+- xH dxG 0" },
    { name: "yG", formula: "+- yH dyG 0" },
    { name: "dxB", formula: "cos thh ptAng" },
    { name: "dyB", formula: "sin thh ptAng" },
    { name: "xB", formula: "+- xH 0 dxB 0" },
    { name: "yB", formula: "+- yH 0 dyB 0" },
    { name: "sx1", formula: "+- xB 0 hc" },
    { name: "sy1", formula: "+- yB 0 vc" },
    { name: "sx2", formula: "+- xG 0 hc" },
    { name: "sy2", formula: "+- yG 0 vc" },
    { name: "rO", formula: "min rw1 rh1" },
    { name: "x1O", formula: "*/ sx1 rO rw1" },
    { name: "y1O", formula: "*/ sy1 rO rh1" },
    { name: "x2O", formula: "*/ sx2 rO rw1" },
    { name: "y2O", formula: "*/ sy2 rO rh1" },
    { name: "dxO", formula: "+- x2O 0 x1O" },
    { name: "dyO", formula: "+- y2O 0 y1O" },
    { name: "dO", formula: "mod dxO dyO 0" },
    { name: "q1", formula: "*/ x1O y2O 1" },
    { name: "q2", formula: "*/ x2O y1O 1" },
    { name: "DO", formula: "+- q1 0 q2" },
    { name: "q3", formula: "*/ rO rO 1" },
    { name: "q4", formula: "*/ dO dO 1" },
    { name: "q5", formula: "*/ q3 q4 1" },
    { name: "q6", formula: "*/ DO DO 1" },
    { name: "q7", formula: "+- q5 0 q6" },
    { name: "q8", formula: "max q7 0" },
    { name: "sdelO", formula: "sqrt q8" },
    { name: "ndyO", formula: "*/ dyO -1 1" },
    { name: "sdyO", formula: "?: ndyO -1 1" },
    { name: "q9", formula: "*/ sdyO dxO 1" },
    { name: "q10", formula: "*/ q9 sdelO 1" },
    { name: "q11", formula: "*/ DO dyO 1" },
    { name: "dxF1", formula: "+/ q11 q10 q4" },
    { name: "q12", formula: "+- q11 0 q10" },
    { name: "dxF2", formula: "*/ q12 1 q4" },
    { name: "adyO", formula: "abs dyO" },
    { name: "q13", formula: "*/ adyO sdelO 1" },
    { name: "q14", formula: "*/ DO dxO -1" },
    { name: "dyF1", formula: "+/ q14 q13 q4" },
    { name: "q15", formula: "+- q14 0 q13" },
    { name: "dyF2", formula: "*/ q15 1 q4" },
    { name: "q16", formula: "+- x2O 0 dxF1" },
    { name: "q17", formula: "+- x2O 0 dxF2" },
    { name: "q18", formula: "+- y2O 0 dyF1" },
    { name: "q19", formula: "+- y2O 0 dyF2" },
    { name: "q20", formula: "mod q16 q18 0" },
    { name: "q21", formula: "mod q17 q19 0" },
    { name: "q22", formula: "+- q21 0 q20" },
    { name: "dxF", formula: "?: q22 dxF1 dxF2" },
    { name: "dyF", formula: "?: q22 dyF1 dyF2" },
    { name: "sdxF", formula: "*/ dxF rw1 rO" },
    { name: "sdyF", formula: "*/ dyF rh1 rO" },
    { name: "xF", formula: "+- hc sdxF 0" },
    { name: "yF", formula: "+- vc sdyF 0" },
    { name: "x1I", formula: "*/ sx1 rI rw2" },
    { name: "y1I", formula: "*/ sy1 rI rh2" },
    { name: "x2I", formula: "*/ sx2 rI rw2" },
    { name: "y2I", formula: "*/ sy2 rI rh2" },
    { name: "dxI", formula: "+- x2I 0 x1I" },
    { name: "dyI", formula: "+- y2I 0 y1I" },
    { name: "dI", formula: "mod dxI dyI 0" },
    { name: "v1", formula: "*/ x1I y2I 1" },
    { name: "v2", formula: "*/ x2I y1I 1" },
    { name: "DI", formula: "+- v1 0 v2" },
    { name: "v3", formula: "*/ rI rI 1" },
    { name: "v4", formula: "*/ dI dI 1" },
    { name: "v5", formula: "*/ v3 v4 1" },
    { name: "v6", formula: "*/ DI DI 1" },
    { name: "v7", formula: "+- v5 0 v6" },
    { name: "v8", formula: "max v7 0" },
    { name: "sdelI", formula: "sqrt v8" },
    { name: "v9", formula: "*/ sdyO dxI 1" },
    { name: "v10", formula: "*/ v9 sdelI 1" },
    { name: "v11", formula: "*/ DI dyI 1" },
    { name: "dxC1", formula: "+/ v11 v10 v4" },
    { name: "v12", formula: "+- v11 0 v10" },
    { name: "dxC2", formula: "*/ v12 1 v4" },
    { name: "adyI", formula: "abs dyI" },
    { name: "v13", formula: "*/ adyI sdelI 1" },
    { name: "v14", formula: "*/ DI dxI -1" },
    { name: "dyC1", formula: "+/ v14 v13 v4" },
    { name: "v15", formula: "+- v14 0 v13" },
    { name: "dyC2", formula: "*/ v15 1 v4" },
    { name: "v16", formula: "+- x1I 0 dxC1" },
    { name: "v17", formula: "+- x1I 0 dxC2" },
    { name: "v18", formula: "+- y1I 0 dyC1" },
    { name: "v19", formula: "+- y1I 0 dyC2" },
    { name: "v20", formula: "mod v16 v18 0" },
    { name: "v21", formula: "mod v17 v19 0" },
    { name: "v22", formula: "+- v21 0 v20" },
    { name: "dxC", formula: "?: v22 dxC1 dxC2" },
    { name: "dyC", formula: "?: v22 dyC1 dyC2" },
    { name: "sdxC", formula: "*/ dxC rw2 rI" },
    { name: "sdyC", formula: "*/ dyC rh2 rI" },
    { name: "xC", formula: "+- hc sdxC 0" },
    { name: "yC", formula: "+- vc sdyC 0" },
    { name: "ist0", formula: "at2 sdxC sdyC" },
    { name: "ist1", formula: "+- ist0 21600000 0" },
    { name: "istAng0", formula: "?: ist0 ist0 ist1" },
    { name: "isw1", formula: "+- stAng 0 istAng0" },
    { name: "isw2", formula: "+- isw1 21600000 0" },
    { name: "iswAng0", formula: "?: isw1 isw1 isw2" },
    { name: "istAng", formula: "+- istAng0 iswAng0 0" },
    { name: "iswAng", formula: "+- 0 0 iswAng0" },
    { name: "p1", formula: "+- xF 0 xC" },
    { name: "p2", formula: "+- yF 0 yC" },
    { name: "p3", formula: "mod p1 p2 0" },
    { name: "p4", formula: "*/ p3 1 2" },
    { name: "p5", formula: "+- p4 0 thh" },
    { name: "xGp", formula: "?: p5 xF xG" },
    { name: "yGp", formula: "?: p5 yF yG" },
    { name: "xBp", formula: "?: p5 xC xB" },
    { name: "yBp", formula: "?: p5 yC yB" },
    { name: "en0", formula: "at2 sdxF sdyF" },
    { name: "en1", formula: "+- en0 21600000 0" },
    { name: "en2", formula: "?: en0 en0 en1" },
    { name: "sw0", formula: "+- en2 0 stAng" },
    { name: "sw1", formula: "+- sw0 0 21600000" },
    { name: "swAng", formula: "?: sw0 sw0 sw1" },
    { name: "stAng0", formula: "+- stAng swAng 0" },
    { name: "swAng0", formula: "+- 0 0 swAng" },
    { name: "wtI", formula: "sin rw3 stAng" },
    { name: "htI", formula: "cos rh3 stAng" },
    { name: "dxI", formula: "cat2 rw3 htI wtI" },
    { name: "dyI", formula: "sat2 rh3 htI wtI" },
    { name: "xI", formula: "+- hc dxI 0" },
    { name: "yI", formula: "+- vc dyI 0" },
    { name: "aI", formula: "+- stAng cd4 0" },
    { name: "aA", formula: "+- ptAng 0 cd4" },
    { name: "aB", formula: "+- ptAng cd2 0" },
    { name: "idx", formula: "cos rw1 2700000" },
    { name: "idy", formula: "sin rh1 2700000" },
    { name: "il", formula: "+- hc 0 idx" },
    { name: "ir", formula: "+- hc idx 0" },
    { name: "it", formula: "+- vc 0 idy" },
    { name: "ib", formula: "+- vc idy 0" },
  ];
  evaluateGuides(guides, context);

  const {
    xE,
    yE,
    xD,
    yD,
    rw2,
    rh2,
    istAng,
    iswAng,
    xBp,
    yBp,
    xA,
    yA,
    xGp,
    yGp,
    xF,
    yF,
    rw1,
    rh1,
    stAng0,
    swAng0,
  } = requireGuideValues(
    context,
    [
      "xE",
      "yE",
      "xD",
      "yD",
      "rw2",
      "rh2",
      "istAng",
      "iswAng",
      "xBp",
      "yBp",
      "xA",
      "yA",
      "xGp",
      "yGp",
      "xF",
      "yF",
      "rw1",
      "rh1",
      "stAng0",
      "swAng0",
    ],
    "leftCircularArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: xE, y: yE },
    { type: "lineTo", x: xD, y: yD },
    { type: "arcTo", wR: rw2, hR: rh2, stAng: istAng, swAng: iswAng },
    { type: "lineTo", x: xBp, y: yBp },
    { type: "lineTo", x: xA, y: yA },
    { type: "lineTo", x: xGp, y: yGp },
    { type: "lineTo", x: xF, y: yF },
    { type: "arcTo", wR: rw1, hR: rh1, stAng: stAng0, swAng: swAng0 },
    { type: "close" },
  ]);
}

function renderLeftRightCircularArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 12500;
  const adj2 = adj.get("adj2") ?? 1142319;
  const adj3 = adj.get("adj3") ?? 20457681;
  const adj4 = adj.get("adj4") ?? 11942319;
  const adj5 = adj.get("adj5") ?? 12500;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
    { name: "adj4", value: adj4 },
    { name: "adj5", value: adj5 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a5", formula: "pin 0 adj5 25000" },
    { name: "maxAdj1", formula: "*/ a5 2 1" },
    { name: "a1", formula: "pin 0 adj1 maxAdj1" },
    { name: "enAng", formula: "pin 1 adj3 21599999" },
    { name: "stAng", formula: "pin 0 adj4 21599999" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "thh", formula: "*/ ss a5 100000" },
    { name: "th2", formula: "*/ th 1 2" },
    { name: "rw1", formula: "+- wd2 th2 thh" },
    { name: "rh1", formula: "+- hd2 th2 thh" },
    { name: "rw2", formula: "+- rw1 0 th" },
    { name: "rh2", formula: "+- rh1 0 th" },
    { name: "rw3", formula: "+- rw2 th2 0" },
    { name: "rh3", formula: "+- rh2 th2 0" },
    { name: "wtH", formula: "sin rw3 enAng" },
    { name: "htH", formula: "cos rh3 enAng" },
    { name: "dxH", formula: "cat2 rw3 htH wtH" },
    { name: "dyH", formula: "sat2 rh3 htH wtH" },
    { name: "xH", formula: "+- hc dxH 0" },
    { name: "yH", formula: "+- vc dyH 0" },
    { name: "rI", formula: "min rw2 rh2" },
    { name: "u1", formula: "*/ dxH dxH 1" },
    { name: "u2", formula: "*/ dyH dyH 1" },
    { name: "u3", formula: "*/ rI rI 1" },
    { name: "u4", formula: "+- u1 0 u3" },
    { name: "u5", formula: "+- u2 0 u3" },
    { name: "u6", formula: "*/ u4 u5 u1" },
    { name: "u7", formula: "*/ u6 1 u2" },
    { name: "u8", formula: "+- 1 0 u7" },
    { name: "u9", formula: "sqrt u8" },
    { name: "u10", formula: "*/ u4 1 dxH" },
    { name: "u11", formula: "*/ u10 1 dyH" },
    { name: "u12", formula: "+/ 1 u9 u11" },
    { name: "u13", formula: "at2 1 u12" },
    { name: "u14", formula: "+- u13 21600000 0" },
    { name: "u15", formula: "?: u13 u13 u14" },
    { name: "u16", formula: "+- u15 0 enAng" },
    { name: "u17", formula: "+- u16 21600000 0" },
    { name: "u18", formula: "?: u16 u16 u17" },
    { name: "u19", formula: "+- u18 0 cd2" },
    { name: "u20", formula: "+- u18 0 21600000" },
    { name: "u21", formula: "?: u19 u20 u18" },
    { name: "maxAng", formula: "abs u21" },
    { name: "aAng", formula: "pin 0 adj2 maxAng" },
    { name: "ptAng", formula: "+- enAng aAng 0" },
    { name: "wtA", formula: "sin rw3 ptAng" },
    { name: "htA", formula: "cos rh3 ptAng" },
    { name: "dxA", formula: "cat2 rw3 htA wtA" },
    { name: "dyA", formula: "sat2 rh3 htA wtA" },
    { name: "xA", formula: "+- hc dxA 0" },
    { name: "yA", formula: "+- vc dyA 0" },
    { name: "dxG", formula: "cos thh ptAng" },
    { name: "dyG", formula: "sin thh ptAng" },
    { name: "xG", formula: "+- xH dxG 0" },
    { name: "yG", formula: "+- yH dyG 0" },
    { name: "dxB", formula: "cos thh ptAng" },
    { name: "dyB", formula: "sin thh ptAng" },
    { name: "xB", formula: "+- xH 0 dxB 0" },
    { name: "yB", formula: "+- yH 0 dyB 0" },
    { name: "sx1", formula: "+- xB 0 hc" },
    { name: "sy1", formula: "+- yB 0 vc" },
    { name: "sx2", formula: "+- xG 0 hc" },
    { name: "sy2", formula: "+- yG 0 vc" },
    { name: "rO", formula: "min rw1 rh1" },
    { name: "x1O", formula: "*/ sx1 rO rw1" },
    { name: "y1O", formula: "*/ sy1 rO rh1" },
    { name: "x2O", formula: "*/ sx2 rO rw1" },
    { name: "y2O", formula: "*/ sy2 rO rh1" },
    { name: "dxO", formula: "+- x2O 0 x1O" },
    { name: "dyO", formula: "+- y2O 0 y1O" },
    { name: "dO", formula: "mod dxO dyO 0" },
    { name: "q1", formula: "*/ x1O y2O 1" },
    { name: "q2", formula: "*/ x2O y1O 1" },
    { name: "DO", formula: "+- q1 0 q2" },
    { name: "q3", formula: "*/ rO rO 1" },
    { name: "q4", formula: "*/ dO dO 1" },
    { name: "q5", formula: "*/ q3 q4 1" },
    { name: "q6", formula: "*/ DO DO 1" },
    { name: "q7", formula: "+- q5 0 q6" },
    { name: "q8", formula: "max q7 0" },
    { name: "sdelO", formula: "sqrt q8" },
    { name: "ndyO", formula: "*/ dyO -1 1" },
    { name: "sdyO", formula: "?: ndyO -1 1" },
    { name: "q9", formula: "*/ sdyO dxO 1" },
    { name: "q10", formula: "*/ q9 sdelO 1" },
    { name: "q11", formula: "*/ DO dyO 1" },
    { name: "dxF1", formula: "+/ q11 q10 q4" },
    { name: "q12", formula: "+- q11 0 q10" },
    { name: "dxF2", formula: "*/ q12 1 q4" },
    { name: "adyO", formula: "abs dyO" },
    { name: "q13", formula: "*/ adyO sdelO 1" },
    { name: "q14", formula: "*/ DO dxO -1" },
    { name: "dyF1", formula: "+/ q14 q13 q4" },
    { name: "q15", formula: "+- q14 0 q13" },
    { name: "dyF2", formula: "*/ q15 1 q4" },
    { name: "q16", formula: "+- x2O 0 dxF1" },
    { name: "q17", formula: "+- x2O 0 dxF2" },
    { name: "q18", formula: "+- y2O 0 dyF1" },
    { name: "q19", formula: "+- y2O 0 dyF2" },
    { name: "q20", formula: "mod q16 q18 0" },
    { name: "q21", formula: "mod q17 q19 0" },
    { name: "q22", formula: "+- q21 0 q20" },
    { name: "dxF", formula: "?: q22 dxF1 dxF2" },
    { name: "dyF", formula: "?: q22 dyF1 dyF2" },
    { name: "sdxF", formula: "*/ dxF rw1 rO" },
    { name: "sdyF", formula: "*/ dyF rh1 rO" },
    { name: "xF", formula: "+- hc sdxF 0" },
    { name: "yF", formula: "+- vc sdyF 0" },
    { name: "x1I", formula: "*/ sx1 rI rw2" },
    { name: "y1I", formula: "*/ sy1 rI rh2" },
    { name: "x2I", formula: "*/ sx2 rI rw2" },
    { name: "y2I", formula: "*/ sy2 rI rh2" },
    { name: "dxI", formula: "+- x2I 0 x1I" },
    { name: "dyI", formula: "+- y2I 0 y1I" },
    { name: "dI", formula: "mod dxI dyI 0" },
    { name: "v1", formula: "*/ x1I y2I 1" },
    { name: "v2", formula: "*/ x2I y1I 1" },
    { name: "DI", formula: "+- v1 0 v2" },
    { name: "v3", formula: "*/ rI rI 1" },
    { name: "v4", formula: "*/ dI dI 1" },
    { name: "v5", formula: "*/ v3 v4 1" },
    { name: "v6", formula: "*/ DI DI 1" },
    { name: "v7", formula: "+- v5 0 v6" },
    { name: "v8", formula: "max v7 0" },
    { name: "sdelI", formula: "sqrt v8" },
    { name: "v9", formula: "*/ sdyO dxI 1" },
    { name: "v10", formula: "*/ v9 sdelI 1" },
    { name: "v11", formula: "*/ DI dyI 1" },
    { name: "dxC1", formula: "+/ v11 v10 v4" },
    { name: "v12", formula: "+- v11 0 v10" },
    { name: "dxC2", formula: "*/ v12 1 v4" },
    { name: "adyI", formula: "abs dyI" },
    { name: "v13", formula: "*/ adyI sdelI 1" },
    { name: "v14", formula: "*/ DI dxI -1" },
    { name: "dyC1", formula: "+/ v14 v13 v4" },
    { name: "v15", formula: "+- v14 0 v13" },
    { name: "dyC2", formula: "*/ v15 1 v4" },
    { name: "v16", formula: "+- x1I 0 dxC1" },
    { name: "v17", formula: "+- x1I 0 dxC2" },
    { name: "v18", formula: "+- y1I 0 dyC1" },
    { name: "v19", formula: "+- y1I 0 dyC2" },
    { name: "v20", formula: "mod v16 v18 0" },
    { name: "v21", formula: "mod v17 v19 0" },
    { name: "v22", formula: "+- v21 0 v20" },
    { name: "dxC", formula: "?: v22 dxC1 dxC2" },
    { name: "dyC", formula: "?: v22 dyC1 dyC2" },
    { name: "sdxC", formula: "*/ dxC rw2 rI" },
    { name: "sdyC", formula: "*/ dyC rh2 rI" },
    { name: "xC", formula: "+- hc sdxC 0" },
    { name: "yC", formula: "+- vc sdyC 0" },
    { name: "wtI", formula: "sin rw3 stAng" },
    { name: "htI", formula: "cos rh3 stAng" },
    { name: "dxI", formula: "cat2 rw3 htI wtI" },
    { name: "dyI", formula: "sat2 rh3 htI wtI" },
    { name: "xI", formula: "+- hc dxI 0" },
    { name: "yI", formula: "+- vc dyI 0" },
    { name: "lptAng", formula: "+- stAng 0 aAng" },
    { name: "wtL", formula: "sin rw3 lptAng" },
    { name: "htL", formula: "cos rh3 lptAng" },
    { name: "dxL", formula: "cat2 rw3 htL wtL" },
    { name: "dyL", formula: "sat2 rh3 htL wtL" },
    { name: "xL", formula: "+- hc dxL 0" },
    { name: "yL", formula: "+- vc dyL 0" },
    { name: "dxK", formula: "cos thh lptAng" },
    { name: "dyK", formula: "sin thh lptAng" },
    { name: "xK", formula: "+- xI dxK 0" },
    { name: "yK", formula: "+- yI dyK 0" },
    { name: "dxJ", formula: "cos thh lptAng" },
    { name: "dyJ", formula: "sin thh lptAng" },
    { name: "xJ", formula: "+- xI 0 dxJ 0" },
    { name: "yJ", formula: "+- yI 0 dyJ 0" },
    { name: "p1", formula: "+- xF 0 xC" },
    { name: "p2", formula: "+- yF 0 yC" },
    { name: "p3", formula: "mod p1 p2 0" },
    { name: "p4", formula: "*/ p3 1 2" },
    { name: "p5", formula: "+- p4 0 thh" },
    { name: "xGp", formula: "?: p5 xF xG" },
    { name: "yGp", formula: "?: p5 yF yG" },
    { name: "xBp", formula: "?: p5 xC xB" },
    { name: "yBp", formula: "?: p5 yC yB" },
    { name: "en0", formula: "at2 sdxF sdyF" },
    { name: "en1", formula: "+- en0 21600000 0" },
    { name: "en2", formula: "?: en0 en0 en1" },
    { name: "od0", formula: "+- en2 0 enAng" },
    { name: "od1", formula: "+- od0 21600000 0" },
    { name: "od2", formula: "?: od0 od0 od1" },
    { name: "st0", formula: "+- stAng 0 od2" },
    { name: "st1", formula: "+- st0 21600000 0" },
    { name: "st2", formula: "?: st0 st0 st1" },
    { name: "sw0", formula: "+- en2 0 st2" },
    { name: "sw1", formula: "+- sw0 21600000 0" },
    { name: "swAng", formula: "?: sw0 sw0 sw1" },
    { name: "ist0", formula: "at2 sdxC sdyC" },
    { name: "ist1", formula: "+- ist0 21600000 0" },
    { name: "istAng", formula: "?: ist0 ist0 ist1" },
    { name: "id0", formula: "+- istAng 0 enAng" },
    { name: "id1", formula: "+- id0 0 21600000" },
    { name: "id2", formula: "?: id0 id1 id0" },
    { name: "ien0", formula: "+- stAng 0 id2" },
    { name: "ien1", formula: "+- ien0 0 21600000" },
    { name: "ien2", formula: "?: ien1 ien1 ien0" },
    { name: "isw1", formula: "+- ien2 0 istAng" },
    { name: "isw2", formula: "+- isw1 0 21600000" },
    { name: "iswAng", formula: "?: isw1 isw2 isw1" },
    { name: "wtE", formula: "sin rw1 st2" },
    { name: "htE", formula: "cos rh1 st2" },
    { name: "dxE", formula: "cat2 rw1 htE wtE" },
    { name: "dyE", formula: "sat2 rh1 htE wtE" },
    { name: "xE", formula: "+- hc dxE 0" },
    { name: "yE", formula: "+- vc dyE 0" },
    { name: "wtD", formula: "sin rw2 ien2" },
    { name: "htD", formula: "cos rh2 ien2" },
    { name: "dxD", formula: "cat2 rw2 htD wtD" },
    { name: "dyD", formula: "sat2 rh2 htD wtD" },
    { name: "xD", formula: "+- hc dxD 0" },
    { name: "yD", formula: "+- vc dyD 0" },
    { name: "xKp", formula: "?: p5 xE xK" },
    { name: "yKp", formula: "?: p5 yE yK" },
    { name: "xJp", formula: "?: p5 xD xJ" },
    { name: "yJp", formula: "?: p5 yD yJ" },
    { name: "aL", formula: "+- lptAng 0 cd4" },
    { name: "aA", formula: "+- ptAng cd4 0" },
    { name: "aB", formula: "+- ptAng cd2 0" },
    { name: "aJ", formula: "+- lptAng cd2 0" },
    { name: "idx", formula: "cos rw1 2700000" },
    { name: "idy", formula: "sin rh1 2700000" },
    { name: "il", formula: "+- hc 0 idx" },
    { name: "ir", formula: "+- hc idx 0" },
    { name: "it", formula: "+- vc 0 idy" },
    { name: "ib", formula: "+- vc idy 0" },
  ];
  evaluateGuides(guides, context);

  const {
    xL,
    yL,
    xKp,
    yKp,
    xE,
    yE,
    rw1,
    rh1,
    st2,
    swAng,
    xGp,
    yGp,
    xA,
    yA,
    xBp,
    yBp,
    xC,
    yC,
    rw2,
    rh2,
    istAng,
    iswAng,
    xJp,
    yJp,
  } = requireGuideValues(
    context,
    [
      "xL",
      "yL",
      "xKp",
      "yKp",
      "xE",
      "yE",
      "rw1",
      "rh1",
      "st2",
      "swAng",
      "xGp",
      "yGp",
      "xA",
      "yA",
      "xBp",
      "yBp",
      "xC",
      "yC",
      "rw2",
      "rh2",
      "istAng",
      "iswAng",
      "xJp",
      "yJp",
    ],
    "leftRightCircularArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: xL, y: yL },
    { type: "lineTo", x: xKp, y: yKp },
    { type: "lineTo", x: xE, y: yE },
    { type: "arcTo", wR: rw1, hR: rh1, stAng: st2, swAng },
    { type: "lineTo", x: xGp, y: yGp },
    { type: "lineTo", x: xA, y: yA },
    { type: "lineTo", x: xBp, y: yBp },
    { type: "lineTo", x: xC, y: yC },
    { type: "arcTo", wR: rw2, hR: rh2, stAng: istAng, swAng: iswAng },
    { type: "lineTo", x: xJp, y: yJp },
    { type: "close" },
  ]);
}

function renderCurvedRightArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 50000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 h ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "a1", formula: "pin 0 adj1 a2" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "aw", formula: "*/ ss a2 100000" },
    { name: "q1", formula: "+/ th aw 4" },
    { name: "hR", formula: "+- hd2 0 q1" },
    { name: "q7", formula: "*/ hR 2 1" },
    { name: "q8", formula: "*/ q7 q7 1" },
    { name: "q9", formula: "*/ th th 1" },
    { name: "q10", formula: "+- q8 0 q9" },
    { name: "q11", formula: "sqrt q10" },
    { name: "idx", formula: "*/ q11 w q7" },
    { name: "maxAdj3", formula: "*/ 100000 idx ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "ah", formula: "*/ ss a3 100000" },
    { name: "y3", formula: "+- hR th 0" },
    { name: "q2", formula: "*/ w w 1" },
    { name: "q3", formula: "*/ ah ah 1" },
    { name: "q4", formula: "+- q2 0 q3" },
    { name: "q5", formula: "sqrt q4" },
    { name: "dy", formula: "*/ q5 hR w" },
    { name: "y5", formula: "+- hR dy 0" },
    { name: "y7", formula: "+- y3 dy 0" },
    { name: "q6", formula: "+- aw 0 th" },
    { name: "dh", formula: "*/ q6 1 2" },
    { name: "y4", formula: "+- y5 0 dh" },
    { name: "y8", formula: "+- y7 dh 0" },
    { name: "aw2", formula: "*/ aw 1 2" },
    { name: "y6", formula: "+- b 0 aw2" },
    { name: "x1", formula: "+- r 0 ah" },
    { name: "swAng", formula: "at2 ah dy" },
    { name: "stAng", formula: "+- cd2 0 swAng" },
    { name: "mswAng", formula: "+- 0 0 swAng" },
    { name: "ix", formula: "+- r 0 idx" },
    { name: "iy", formula: "+/ hR y3 2" },
    { name: "q12", formula: "*/ th 1 2" },
    { name: "dang2", formula: "at2 idx q12" },
    { name: "swAng2", formula: "+- dang2 0 cd4" },
    { name: "swAng3", formula: "+- cd4 dang2 0" },
    { name: "stAng3", formula: "+- cd2 0 dang2" },
  ];
  evaluateGuides(guides, context);

  const { l, r, w: width, hR, x1, y4, y6, y7, y8, stAng, swAng, mswAng, cd2 } = requireGuideValues(
    context,
    ["l", "r", "w", "hR", "x1", "y4", "y6", "y7", "y8", "stAng", "swAng", "mswAng", "cd2"],
    "curvedRightArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: l, y: hR },
    { type: "arcTo", wR: width, hR, stAng: cd2, swAng: mswAng },
    { type: "lineTo", x: x1, y: y4 },
    { type: "lineTo", x: r, y: y6 },
    { type: "lineTo", x: x1, y: y8 },
    { type: "lineTo", x: x1, y: y7 },
    { type: "arcTo", wR: width, hR, stAng, swAng },
    { type: "close" },
  ]);
}

function renderCurvedLeftArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 50000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 h ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "a1", formula: "pin 0 adj1 a2" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "aw", formula: "*/ ss a2 100000" },
    { name: "q1", formula: "+/ th aw 4" },
    { name: "hR", formula: "+- hd2 0 q1" },
    { name: "q7", formula: "*/ hR 2 1" },
    { name: "q8", formula: "*/ q7 q7 1" },
    { name: "q9", formula: "*/ th th 1" },
    { name: "q10", formula: "+- q8 0 q9" },
    { name: "q11", formula: "sqrt q10" },
    { name: "idx", formula: "*/ q11 w q7" },
    { name: "maxAdj3", formula: "*/ 100000 idx ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "ah", formula: "*/ ss a3 100000" },
    { name: "y3", formula: "+- hR th 0" },
    { name: "q2", formula: "*/ w w 1" },
    { name: "q3", formula: "*/ ah ah 1" },
    { name: "q4", formula: "+- q2 0 q3" },
    { name: "q5", formula: "sqrt q4" },
    { name: "dy", formula: "*/ q5 hR w" },
    { name: "y5", formula: "+- hR dy 0" },
    { name: "y7", formula: "+- y3 dy 0" },
    { name: "q6", formula: "+- aw 0 th" },
    { name: "dh", formula: "*/ q6 1 2" },
    { name: "y4", formula: "+- y5 0 dh" },
    { name: "y8", formula: "+- y7 dh 0" },
    { name: "aw2", formula: "*/ aw 1 2" },
    { name: "y6", formula: "+- b 0 aw2" },
    { name: "x1", formula: "+- l ah 0" },
    { name: "swAng", formula: "at2 ah dy" },
    { name: "mswAng", formula: "+- 0 0 swAng" },
    { name: "ix", formula: "+- l idx 0" },
    { name: "iy", formula: "+/ hR y3 2" },
    { name: "q12", formula: "*/ th 1 2" },
    { name: "dang2", formula: "at2 idx q12" },
    { name: "swAng2", formula: "+- dang2 0 swAng" },
    { name: "swAng3", formula: "+- swAng dang2 0" },
    { name: "stAng3", formula: "+- 0 0 dang2" },
  ];
  evaluateGuides(guides, context);

  const { l, w: width, hR, x1, y4, y5, y6, y8, swAng, swAng2, stAng3, swAng3 } = requireGuideValues(
    context,
    ["l", "w", "hR", "x1", "y4", "y5", "y6", "y8", "swAng", "swAng2", "stAng3", "swAng3"],
    "curvedLeftArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: l, y: y6 },
    { type: "lineTo", x: x1, y: y4 },
    { type: "lineTo", x: x1, y: y5 },
    { type: "arcTo", wR: width, hR, stAng: swAng, swAng: swAng2 },
    { type: "arcTo", wR: width, hR, stAng: stAng3, swAng: swAng3 },
    { type: "lineTo", x: x1, y: y8 },
    { type: "close" },
  ]);
}

function renderCurvedUpArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 50000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 w ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "aw", formula: "*/ ss a2 100000" },
    { name: "q1", formula: "+/ th aw 4" },
    { name: "wR", formula: "+- wd2 0 q1" },
    { name: "q7", formula: "*/ wR 2 1" },
    { name: "q8", formula: "*/ q7 q7 1" },
    { name: "q9", formula: "*/ th th 1" },
    { name: "q10", formula: "+- q8 0 q9" },
    { name: "q11", formula: "sqrt q10" },
    { name: "idy", formula: "*/ q11 h q7" },
    { name: "maxAdj3", formula: "*/ 100000 idy ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "ah", formula: "*/ ss adj3 100000" },
    { name: "x3", formula: "+- wR th 0" },
    { name: "q2", formula: "*/ h h 1" },
    { name: "q3", formula: "*/ ah ah 1" },
    { name: "q4", formula: "+- q2 0 q3" },
    { name: "q5", formula: "sqrt q4" },
    { name: "dx", formula: "*/ q5 wR h" },
    { name: "x5", formula: "+- wR dx 0" },
    { name: "x7", formula: "+- x3 dx 0" },
    { name: "q6", formula: "+- aw 0 th" },
    { name: "dh", formula: "*/ q6 1 2" },
    { name: "x4", formula: "+- x5 0 dh" },
    { name: "x8", formula: "+- x7 dh 0" },
    { name: "aw2", formula: "*/ aw 1 2" },
    { name: "x6", formula: "+- r 0 aw2" },
    { name: "y1", formula: "+- t ah 0" },
    { name: "swAng", formula: "at2 ah dx" },
    { name: "mswAng", formula: "+- 0 0 swAng" },
    { name: "iy", formula: "+- t idy 0" },
    { name: "ix", formula: "+/ wR x3 2" },
    { name: "q12", formula: "*/ th 1 2" },
    { name: "dang2", formula: "at2 idy q12" },
    { name: "swAng2", formula: "+- dang2 0 swAng" },
    { name: "mswAng2", formula: "+- 0 0 swAng2" },
    { name: "stAng3", formula: "+- cd4 0 swAng" },
    { name: "swAng3", formula: "+- swAng dang2 0" },
    { name: "stAng2", formula: "+- cd4 0 dang2" },
  ];
  evaluateGuides(guides, context);

  const { t, x6, x8, x7, y1, wR, h: height, stAng3, swAng3, stAng2, swAng2, x4 } = requireGuideValues(
    context,
    ["t", "x6", "x8", "x7", "y1", "wR", "h", "stAng3", "swAng3", "stAng2", "swAng2", "x4"],
    "curvedUpArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: x6, y: t },
    { type: "lineTo", x: x8, y: y1 },
    { type: "lineTo", x: x7, y: y1 },
    { type: "arcTo", wR, hR: height, stAng: stAng3, swAng: swAng3 },
    { type: "arcTo", wR, hR: height, stAng: stAng2, swAng: swAng2 },
    { type: "lineTo", x: x4, y: y1 },
    { type: "close" },
  ]);
}

function renderCurvedDownArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 50000;
  const adj3 = adj.get("adj3") ?? 25000;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
    { name: "adj3", value: adj3 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "maxAdj2", formula: "*/ 50000 w ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "a1", formula: "pin 0 adj1 100000" },
    { name: "th", formula: "*/ ss a1 100000" },
    { name: "aw", formula: "*/ ss a2 100000" },
    { name: "q1", formula: "+/ th aw 4" },
    { name: "wR", formula: "+- wd2 0 q1" },
    { name: "q7", formula: "*/ wR 2 1" },
    { name: "q8", formula: "*/ q7 q7 1" },
    { name: "q9", formula: "*/ th th 1" },
    { name: "q10", formula: "+- q8 0 q9" },
    { name: "q11", formula: "sqrt q10" },
    { name: "idy", formula: "*/ q11 h q7" },
    { name: "maxAdj3", formula: "*/ 100000 idy ss" },
    { name: "a3", formula: "pin 0 adj3 maxAdj3" },
    { name: "ah", formula: "*/ ss adj3 100000" },
    { name: "x3", formula: "+- wR th 0" },
    { name: "q2", formula: "*/ h h 1" },
    { name: "q3", formula: "*/ ah ah 1" },
    { name: "q4", formula: "+- q2 0 q3" },
    { name: "q5", formula: "sqrt q4" },
    { name: "dx", formula: "*/ q5 wR h" },
    { name: "x5", formula: "+- wR dx 0" },
    { name: "x7", formula: "+- x3 dx 0" },
    { name: "q6", formula: "+- aw 0 th" },
    { name: "dh", formula: "*/ q6 1 2" },
    { name: "x4", formula: "+- x5 0 dh" },
    { name: "x8", formula: "+- x7 dh 0" },
    { name: "aw2", formula: "*/ aw 1 2" },
    { name: "x6", formula: "+- r 0 aw2" },
    { name: "y1", formula: "+- b 0 ah" },
    { name: "swAng", formula: "at2 ah dx" },
    { name: "mswAng", formula: "+- 0 0 swAng" },
    { name: "iy", formula: "+- b 0 idy" },
    { name: "ix", formula: "+/ wR x3 2" },
    { name: "q12", formula: "*/ th 1 2" },
    { name: "dang2", formula: "at2 idy q12" },
    { name: "stAng", formula: "+- 3cd4 swAng 0" },
    { name: "stAng2", formula: "+- 3cd4 0 dang2" },
    { name: "swAng2", formula: "+- dang2 0 cd4" },
    { name: "swAng3", formula: "+- cd4 dang2 0" },
  ];
  evaluateGuides(guides, context);

  const values = requireGuideValues(
    context,
    ["b", "t", "x6", "x4", "x5", "y1", "wR", "h", "stAng", "mswAng", "x3", "swAng", "x8", "3cd4"],
    "curvedDownArrow",
  );
  const b = values.b;
  const t = values.t;
  const x6 = values.x6;
  const x4 = values.x4;
  const x5 = values.x5;
  const y1 = values.y1;
  const wR = values.wR;
  const height = values.h;
  const stAng = values.stAng;
  const mswAng = values.mswAng;
  const x3 = values.x3;
  const swAng = values.swAng;
  const x8 = values.x8;
  const threeCd4 = values["3cd4"];

  return buildPresetPath([
    { type: "moveTo", x: x6, y: b },
    { type: "lineTo", x: x4, y: y1 },
    { type: "lineTo", x: x5, y: y1 },
    { type: "arcTo", wR, hR: height, stAng, swAng: mswAng },
    { type: "lineTo", x: x3, y: t },
    { type: "arcTo", wR, hR: height, stAng: threeCd4, swAng },
    { type: "lineTo", x: x8, y: y1 },
    { type: "close" },
  ]);
}

function renderSwooshArrowPath(
  w: number,
  h: number,
  adj: Map<string, number>,
): string {
  const adj1 = adj.get("adj1") ?? 25000;
  const adj2 = adj.get("adj2") ?? 16667;
  const context = createGuideContext(w, h, [
    { name: "adj1", value: adj1 },
    { name: "adj2", value: adj2 },
  ]);
  const guides: GeometryGuide[] = [
    { name: "a1", formula: "pin 1 adj1 75000" },
    { name: "maxAdj2", formula: "*/ 70000 w ss" },
    { name: "a2", formula: "pin 0 adj2 maxAdj2" },
    { name: "ad1", formula: "*/ h a1 100000" },
    { name: "ad2", formula: "*/ ss a2 100000" },
    { name: "xB", formula: "+- r 0 ad2" },
    { name: "yB", formula: "+- t ssd8 0" },
    { name: "alfa", formula: "*/ cd4 1 14" },
    { name: "dx0", formula: "tan ssd8 alfa" },
    { name: "xC", formula: "+- xB 0 dx0" },
    { name: "dx1", formula: "tan ad1 alfa" },
    { name: "yF", formula: "+- yB ad1 0" },
    { name: "xF", formula: "+- xB dx1 0" },
    { name: "xE", formula: "+- xF dx0 0" },
    { name: "yE", formula: "+- yF ssd8 0" },
    { name: "dy2", formula: "+- yE 0 t" },
    { name: "dy22", formula: "*/ dy2 1 2" },
    { name: "dy3", formula: "*/ h 1 20" },
    { name: "yD", formula: "+- t dy22 dy3" },
    { name: "dy4", formula: "*/ hd6 1 1" },
    { name: "yP1", formula: "+- hd6 dy4 0" },
    { name: "xP1", formula: "val wd6" },
    { name: "dy5", formula: "*/ hd6 1 2" },
    { name: "yP2", formula: "+- yF dy5 0" },
    { name: "xP2", formula: "val wd4" },
  ];
  evaluateGuides(guides, context);

  const { l, r, t, b, xP1, yP1, xB, yB, xC, yD, xE, yE, xF, yF, xP2, yP2 } = requireGuideValues(
    context,
    ["l", "r", "t", "b", "xP1", "yP1", "xB", "yB", "xC", "yD", "xE", "yE", "xF", "yF", "xP2", "yP2"],
    "swooshArrow",
  );

  return buildPresetPath([
    { type: "moveTo", x: l, y: b },
    { type: "quadBezierTo", cx: xP1, cy: yP1, x: xB, y: yB },
    { type: "lineTo", x: xC, y: t },
    { type: "lineTo", x: r, y: yD },
    { type: "lineTo", x: xE, y: yE },
    { type: "lineTo", x: xF, y: yF },
    { type: "quadBezierTo", cx: xP2, cy: yP2, x: l, y: b },
    { type: "close" },
  ]);
}

const PRESET_SHAPES: Record<string, (w: number, h: number, adj: Map<string, number>) => string> = {
  rect: (w, h) => `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`,

  ellipse: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`;
  },

  roundRect: (w, h, adj) => {
    const r = Math.min(adj.get("adj") ?? 16667, 50000) / 100000 * Math.min(w, h);
    return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  },

  triangle: (w, h) => `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`,

  rtTriangle: (w, h) => `M 0 0 L ${w} ${h} L 0 ${h} Z`,

  diamond: (w, h) => `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`,

  parallelogram: (w, h, adj) => {
    const offset = (adj.get("adj") ?? 25000) / 100000 * w;
    return `M ${offset} 0 L ${w} 0 L ${w - offset} ${h} L 0 ${h} Z`;
  },

  trapezoid: (w, h, adj) => {
    const offset = (adj.get("adj") ?? 25000) / 100000 * w;
    return `M ${offset} 0 L ${w - offset} 0 L ${w} ${h} L 0 ${h} Z`;
  },

  pentagon: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    const points: string[] = [];
    for (const i of range(5)) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return points.join(" ") + " Z";
  },

  hexagon: (w, h, adj) => {
    const offset = (adj.get("adj") ?? 25000) / 100000 * w;
    return `M ${offset} 0 L ${w - offset} 0 L ${w} ${h / 2} L ${w - offset} ${h} L ${offset} ${h} L 0 ${h / 2} Z`;
  },

  octagon: (w, h, adj) => {
    const offset = (adj.get("adj") ?? 29289) / 100000 * Math.min(w, h);
    return `M ${offset} 0 L ${w - offset} 0 L ${w} ${offset} L ${w} ${h - offset} L ${w - offset} ${h} L ${offset} ${h} L 0 ${h - offset} L 0 ${offset} Z`;
  },

  star4: (w, h) => generateStar(w, h, 4, 0.382),
  star5: (w, h) => generateStar(w, h, 5, 0.382),
  star6: (w, h) => generateStar(w, h, 6, 0.5),
  star7: (w, h) => generateStar(w, h, 7, 0.382),
  star8: (w, h) => generateStar(w, h, 8, 0.382),
  star10: (w, h) => generateStar(w, h, 10, 0.382),
  star12: (w, h) => generateStar(w, h, 12, 0.382),
  star16: (w, h) => generateStar(w, h, 16, 0.382),
  star24: (w, h) => generateStar(w, h, 24, 0.382),
  star32: (w, h) => generateStar(w, h, 32, 0.382),

  plus: (w, h, adj) => {
    const arm = (adj.get("adj") ?? 25000) / 100000;
    const x1 = w * arm;
    const x2 = w * (1 - arm);
    const y1 = h * arm;
    const y2 = h * (1 - arm);
    return `M ${x1} 0 L ${x2} 0 L ${x2} ${y1} L ${w} ${y1} L ${w} ${y2} L ${x2} ${y2} L ${x2} ${h} L ${x1} ${h} L ${x1} ${y2} L 0 ${y2} L 0 ${y1} L ${x1} ${y1} Z`;
  },

  /**
   * Right arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  rightArrow: (w, h, adj) => renderRightArrowPath(w, h, adj),

  /**
   * Left arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftArrow: (w, h, adj) => renderLeftArrowPath(w, h, adj),

  /**
   * Left-up arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftUpArrow: (w, h, adj) => renderLeftUpArrowPath(w, h, adj),

  /**
   * Left-right-up arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftRightUpArrow: (w, h, adj) => renderLeftRightUpArrowPath(w, h, adj),

  /**
   * Quad arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  quadArrow: (w, h, adj) => renderQuadArrowPath(w, h, adj),

  /**
   * Down arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  downArrow: (w, h, adj) => renderDownArrowPath(w, h, adj),

  /**
   * Striped right arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  stripedRightArrow: (w, h, adj) => {
    const adj1 = adj.get("adj1") ?? 50000;
    const adj2 = adj.get("adj2") ?? 50000;
    const context = createGuideContext(w, h, [
      { name: "adj1", value: adj1 },
      { name: "adj2", value: adj2 },
    ]);
    const guides: GeometryGuide[] = [
      { name: "maxAdj2", formula: "*/ 84375 w ss" },
      { name: "a1", formula: "pin 0 adj1 100000" },
      { name: "a2", formula: "pin 0 adj2 maxAdj2" },
      { name: "x4", formula: "*/ ss 5 32" },
      { name: "dx5", formula: "*/ ss a2 100000" },
      { name: "x5", formula: "+- r 0 dx5" },
      { name: "dy1", formula: "*/ h a1 200000" },
      { name: "y1", formula: "+- vc 0 dy1" },
      { name: "y2", formula: "+- vc dy1 0" },
      { name: "dx6", formula: "*/ dy1 dx5 hd2" },
      { name: "x6", formula: "+- r 0 dx6" },
    ];
    evaluateGuides(guides, context);

    const l = context.get("l");
    const r = context.get("r");
    const t = context.get("t");
    const b = context.get("b");
    const vc = context.get("vc");
    const ssd32 = context.get("ssd32");
    const ssd16 = context.get("ssd16");
    const ssd8 = context.get("ssd8");
    const x4 = context.get("x4");
    const x5 = context.get("x5");
    const y1 = context.get("y1");
    const y2 = context.get("y2");
    if (
      l === undefined ||
      r === undefined ||
      t === undefined ||
      b === undefined ||
      vc === undefined ||
      ssd32 === undefined ||
      ssd16 === undefined ||
      ssd8 === undefined ||
      x4 === undefined ||
      x5 === undefined ||
      y1 === undefined ||
      y2 === undefined
    ) {
      throw new Error("Non-ECMA guide resolution for stripedRightArrow");
    }

    const path = [
      `M ${l} ${y1} L ${ssd32} ${y1} L ${ssd32} ${y2} L ${l} ${y2} Z `,
      `M ${ssd16} ${y1} L ${ssd8} ${y1} L ${ssd8} ${y2} L ${ssd16} ${y2} Z `,
      `M ${x4} ${y1} L ${x5} ${y1} L ${x5} ${t} L ${r} ${vc} L ${x5} ${b} L ${x5} ${y2} L ${x4} ${y2} Z`,
    ].join("");
    return path;
  },

  /**
   * Left-right double arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftRightArrow: (w, h, adj) => renderLeftRightArrowPath(w, h, adj),

  /**
   * Up-down double arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  upDownArrow: (w, h, adj) => renderUpDownArrowPath(w, h, adj),

  /**
   * Bent up arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bentUpArrow: (w, h, adj) => renderBentUpArrowPath(w, h, adj),

  /**
   * Chevron arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  chevron: (w, h, adj) => {
    const point = w * ((adj.get("adj") ?? 50000) / 100000);
    return `M 0 0 L ${w - point} 0 L ${w} ${h / 2} L ${w - point} ${h} L 0 ${h} L ${point} ${h / 2} Z`;
  },

  /**
   * Home plate (pentagon pointing right).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  homePlate: (w, h, adj) => {
    const point = w * ((adj.get("adj") ?? 50000) / 100000);
    return `M 0 0 L ${w - point} 0 L ${w} ${h / 2} L ${w - point} ${h} L 0 ${h} Z`;
  },

  /**
   * Notched right arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  notchedRightArrow: (w, h, adj) => renderNotchedRightArrowPath(w, h, adj),


  /**
   * Left arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftArrowCallout: (w, h, adj) => renderLeftArrowCalloutPath(w, h, adj),

  /**
   * Right arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  rightArrowCallout: (w, h, adj) => renderRightArrowCalloutPath(w, h, adj),

  /**
   * Up arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  upArrowCallout: (w, h, adj) => renderUpArrowCalloutPath(w, h, adj),

  /**
   * Down arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  downArrowCallout: (w, h, adj) => renderDownArrowCalloutPath(w, h, adj),

  /**
   * Left-right arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftRightArrowCallout: (w, h, adj) => renderLeftRightArrowCalloutPath(w, h, adj),

  /**
   * Up-down arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  upDownArrowCallout: (w, h, adj) => renderUpDownArrowCalloutPath(w, h, adj),

  /**
   * Quad arrow with callout box.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  quadArrowCallout: (w, h, adj) => renderQuadArrowCalloutPath(w, h, adj),

  /**
   * Bent arrow (L-shaped arrow).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bentArrow: (w, h, adj) => renderBentArrowPath(w, h, adj),

  /**
   * U-turn arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  uturnArrow: (w, h, adj) => renderUturnArrowPath(w, h, adj),

  /**
   * Circular arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  circularArrow: (w, h, adj) => renderCircularArrowPath(w, h, adj),

  /**
   * Left circular arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftCircularArrow: (w, h, adj) => renderLeftCircularArrowPath(w, h, adj),

  /**
   * Left-right circular arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftRightCircularArrow: (w, h, adj) => renderLeftRightCircularArrowPath(w, h, adj),

  /**
   * Curved right arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedRightArrow: (w, h, adj) => renderCurvedRightArrowPath(w, h, adj),

  /**
   * Curved left arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedLeftArrow: (w, h, adj) => renderCurvedLeftArrowPath(w, h, adj),

  /**
   * Curved up arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedUpArrow: (w, h, adj) => renderCurvedUpArrowPath(w, h, adj),

  /**
   * Curved down arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedDownArrow: (w, h, adj) => renderCurvedDownArrowPath(w, h, adj),

  /**
   * Swoosh arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  swooshArrow: (w, h, adj) => renderSwooshArrowPath(w, h, adj),


  /**
   * Line preset - handles both horizontal and vertical orientations.
   *
   * Per ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom prst="line"):
   * - When width > height: horizontal line through vertical center
   * - When height > width: vertical line through horizontal center
   */
  line: (w, h) => {
    if (h > w) {
      // Vertical line
      return `M ${w / 2} 0 L ${w / 2} ${h}`;
    }
    // Horizontal line (default)
    return `M 0 ${h / 2} L ${w} ${h / 2}`;
  },

  /**
   * Inverted line - diagonal from bottom-left to top-right.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  lineInv: (w, h) => `M 0 ${h} L ${w} 0`,

  /**
   * Rectangle with 1 rounded corner (top-right).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  round1Rect: (w, h, adj) => {
    const r = Math.min(adj.get("adj") ?? 16667, 50000) / 100000 * Math.min(w, h);
    return `M 0 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h} L 0 ${h} Z`;
  },

  /**
   * Rectangle with 2 same-side rounded corners (top-left and top-right).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  round2SameRect: (w, h, adj) => {
    const r1 = Math.min(adj.get("adj1") ?? 16667, 50000) / 100000 * Math.min(w, h);
    const r2 = Math.min(adj.get("adj2") ?? 0, 50000) / 100000 * Math.min(w, h);
    return `M ${r1} 0 L ${w - r1} 0 Q ${w} 0 ${w} ${r1} L ${w} ${h - r2} Q ${w} ${h} ${w - r2} ${h} L ${r2} ${h} Q 0 ${h} 0 ${h - r2} L 0 ${r1} Q 0 0 ${r1} 0 Z`;
  },

  /**
   * Rectangle with 2 diagonal rounded corners (top-right and bottom-left).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  round2DiagRect: (w, h, adj) => {
    const r1 = Math.min(adj.get("adj1") ?? 16667, 50000) / 100000 * Math.min(w, h);
    const r2 = Math.min(adj.get("adj2") ?? 0, 50000) / 100000 * Math.min(w, h);
    return `M 0 0 L ${w - r1} 0 Q ${w} 0 ${w} ${r1} L ${w} ${h} L ${r2} ${h} Q 0 ${h} 0 ${h - r2} L 0 0 Z`;
  },

  /**
   * Rectangle with 1 snipped corner + 1 rounded corner (top-right snipped, bottom-left rounded).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  snipRoundRect: (w, h, adj) => {
    const snip = Math.min(adj.get("adj1") ?? 16667, 50000) / 100000 * Math.min(w, h);
    const r = Math.min(adj.get("adj2") ?? 16667, 50000) / 100000 * Math.min(w, h);
    return `M 0 0 L ${w - snip} 0 L ${w} ${snip} L ${w} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 0 Z`;
  },

  /**
   * Rectangle with 1 snipped corner (top-right).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  snip1Rect: (w, h, adj) => {
    const snip = Math.min(adj.get("adj") ?? 16667, 50000) / 100000 * Math.min(w, h);
    return `M 0 0 L ${w - snip} 0 L ${w} ${snip} L ${w} ${h} L 0 ${h} Z`;
  },

  /**
   * Rectangle with 2 same-side snipped corners (top-left and top-right).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  snip2SameRect: (w, h, adj) => {
    const snip1 = Math.min(adj.get("adj1") ?? 16667, 50000) / 100000 * Math.min(w, h);
    const snip2 = Math.min(adj.get("adj2") ?? 0, 50000) / 100000 * Math.min(w, h);
    return `M ${snip1} 0 L ${w - snip1} 0 L ${w} ${snip1} L ${w} ${h - snip2} L ${w - snip2} ${h} L ${snip2} ${h} L 0 ${h - snip2} L 0 ${snip1} Z`;
  },

  /**
   * Rectangle with 2 diagonal snipped corners (top-right and bottom-left).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  snip2DiagRect: (w, h, adj) => {
    const snip1 = Math.min(adj.get("adj1") ?? 16667, 50000) / 100000 * Math.min(w, h);
    const snip2 = Math.min(adj.get("adj2") ?? 0, 50000) / 100000 * Math.min(w, h);
    return `M 0 0 L ${w - snip1} 0 L ${w} ${snip1} L ${w} ${h} L ${snip2} ${h} L 0 ${h - snip2} Z`;
  },

  /**
   * Non-isosceles trapezoid (different angles on left and right sides).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  nonIsoscelesTrapezoid: (w, h, adj) => {
    const leftOffset = (adj.get("adj1") ?? 25000) / 100000 * w;
    const rightOffset = (adj.get("adj2") ?? 25000) / 100000 * w;
    return `M ${leftOffset} 0 L ${w - rightOffset} 0 L ${w} ${h} L 0 ${h} Z`;
  },

  /**
   * Heptagon - 7-sided polygon.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  heptagon: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    const points: string[] = [];
    for (const i of range(7)) {
      const angle = (i * 360 / 7 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return points.join(" ") + " Z";
  },

  /**
   * Decagon - 10-sided polygon.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  decagon: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    const points: string[] = [];
    for (const i of range(10)) {
      const angle = (i * 36 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return points.join(" ") + " Z";
  },

  /**
   * Dodecagon - 12-sided polygon.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  dodecagon: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    const points: string[] = [];
    for (const i of range(12)) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return points.join(" ") + " Z";
  },

  /**
   * Teardrop shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  teardrop: (w, h, adj) => {
    const adjVal = (adj.get("adj") ?? 100000) / 100000;
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    // Teardrop: circle with pointed top-right corner
    const pointX = cx + rx * adjVal;
    const pointY = cy - ry * adjVal;
    return `M ${cx} 0 Q ${pointX} 0 ${pointX} ${pointY} Q ${w} 0 ${w} ${cy} A ${rx} ${ry} 0 1 1 ${cx} 0 Z`;
  },

  /**
   * Plaque - rectangle with concave (inward curving) corners.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  plaque: (w, h, adj) => {
    const r = Math.min(adj.get("adj") ?? 16667, 50000) / 100000 * Math.min(w, h);
    // Concave corners using quadratic bezier curves curving inward
    return `M ${r} 0 L ${w - r} 0 Q ${w} ${r} ${w} ${r} L ${w} ${h - r} Q ${w - r} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h - r} 0 ${h - r} L 0 ${r} Q ${r} 0 ${r} 0 Z`;
  },

  /**
   * Straight connector - diagonal line from start to end.
   *
   * Per ECMA-376 Part 1, Section 20.1.10.56 (ST_ShapeType):
   * Connectors are rendered as simple lines from corner to corner.
   * The transform (flipH/flipV) determines the actual direction.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  straightConnector1: (w, h) => `M 0 0 L ${w} ${h}`,

  /**
   * Bent connector - L-shaped connector.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bentConnector2: (w, h) => `M 0 0 L ${w} 0 L ${w} ${h}`,

  /**
   * Bent connector with 3 segments.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bentConnector3: (w, h, adj) => {
    const midX = w * ((adj.get("adj1") ?? 50000) / 100000);
    return `M 0 0 L ${midX} 0 L ${midX} ${h} L ${w} ${h}`;
  },

  /**
   * Bent connector with 4 segments.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bentConnector4: (w, h, adj) => {
    const midX = w * ((adj.get("adj1") ?? 50000) / 100000);
    const midY = h * ((adj.get("adj2") ?? 50000) / 100000);
    return `M 0 0 L ${midX} 0 L ${midX} ${midY} L ${w} ${midY} L ${w} ${h}`;
  },

  /**
   * Bent connector with 5 segments.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bentConnector5: (w, h, adj) => {
    const x1 = w * ((adj.get("adj1") ?? 25000) / 100000);
    const y1 = h * ((adj.get("adj2") ?? 50000) / 100000);
    const x2 = w * ((adj.get("adj3") ?? 75000) / 100000);
    return `M 0 0 L ${x1} 0 L ${x1} ${y1} L ${x2} ${y1} L ${x2} ${h} L ${w} ${h}`;
  },

  /**
   * Curved connector - S-curve.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedConnector2: (w, h) => `M 0 0 Q ${w} 0 ${w} ${h}`,

  /**
   * Curved connector with 3 control points.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedConnector3: (w, h, adj) => {
    const midX = w * ((adj.get("adj1") ?? 50000) / 100000);
    return `M 0 0 Q ${midX} 0 ${midX} ${h / 2} Q ${midX} ${h} ${w} ${h}`;
  },

  /**
   * Curved connector with 4 control points.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedConnector4: (w, h, adj) => {
    const midX = w * ((adj.get("adj1") ?? 50000) / 100000);
    const midY = h * ((adj.get("adj2") ?? 50000) / 100000);
    return `M 0 0 C ${midX} 0 ${midX} ${midY} ${w / 2} ${midY} C ${w - midX} ${midY} ${w - midX} ${h} ${w} ${h}`;
  },

  /**
   * Curved connector with 5 control points.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  curvedConnector5: (w, h, adj) => {
    const x1 = w * ((adj.get("adj1") ?? 25000) / 100000);
    const y1 = h * ((adj.get("adj2") ?? 50000) / 100000);
    const x2 = w * ((adj.get("adj3") ?? 75000) / 100000);
    return `M 0 0 C ${x1} 0 ${x1} ${y1 / 2} ${x1} ${y1} C ${x1} ${y1 + (h - y1) / 2} ${x2} ${y1 + (h - y1) / 2} ${x2} ${h} L ${w} ${h}`;
  },

  // =========================================================================
  // Flowchart Shapes
  // =========================================================================

  /**
   * Flowchart merge (inverted triangle).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartMerge: (w, h) => `M 0 0 L ${w} 0 L ${w / 2} ${h} Z`,

  /**
   * Flowchart extract (triangle pointing up).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartExtract: (w, h) => `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`,

  /**
   * Flowchart delay (half ellipse/D shape).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartDelay: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    return `M 0 0 L ${rx} 0 A ${rx} ${ry} 0 0 1 ${rx} ${h} L 0 ${h} Z`;
  },

  /**
   * Flowchart process (rectangle).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartProcess: (w, h) => `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`,

  /**
   * Flowchart decision (diamond).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartDecision: (w, h) => `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`,

  /**
   * Flowchart terminator (stadium/pill shape).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartTerminator: (w, h) => {
    const r = h / 2;
    return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  },

  /**
   * Flowchart connector (circle).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartConnector: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`;
  },

  /**
   * Flowchart input/output (parallelogram).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartInputOutput: (w, h) => {
    const offset = w * 0.2;
    return `M ${offset} 0 L ${w} 0 L ${w - offset} ${h} L 0 ${h} Z`;
  },

  /**
   * Flowchart document (rectangle with wavy bottom).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartDocument: (w, h) => {
    const waveHeight = h * 0.15;
    const waveY = h - waveHeight;
    return `M 0 0 L ${w} 0 L ${w} ${waveY} Q ${w * 0.75} ${h} ${w / 2} ${waveY} Q ${w * 0.25} ${waveY - waveHeight} 0 ${waveY} Z`;
  },

  /**
   * Flowchart alternate process (rounded rectangle).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartAlternateProcess: (w, h) => {
    const r = Math.min(w, h) * 0.18;
    return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  },

  /**
   * Flowchart predefined process (rectangle with side bars).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartPredefinedProcess: (w, h) => {
    const bar = w * 0.1;
    // Outer rectangle + two inner vertical lines
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${bar} 0 L ${bar} ${h} M ${w - bar} 0 L ${w - bar} ${h}`;
  },

  /**
   * Flowchart internal storage (rectangle with corner lines).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartInternalStorage: (w, h) => {
    const offset = Math.min(w, h) * 0.15;
    // Rectangle with a horizontal and vertical line near top-left corner
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${offset} 0 L ${offset} ${h} M 0 ${offset} L ${w} ${offset}`;
  },

  /**
   * Flowchart multidocument (stacked documents).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartMultidocument: (w, h) => {
    const offset = w * 0.08;
    const waveHeight = h * 0.1;
    const docH = h - offset * 2;
    const waveY = docH - waveHeight;
    // Three stacked document shapes
    // Back document
    const path = [
      `M ${offset * 2} 0 L ${w} 0 L ${w} ${waveY - offset * 2} Q ${w - w * 0.125} ${waveY - offset * 2 + waveHeight} ${w - w * 0.25} ${waveY - offset * 2} Q ${w - w * 0.375} ${waveY - offset * 2 - waveHeight} ${w - w * 0.5} ${waveY - offset * 2} L ${offset * 2} ${waveY - offset * 2} Z `,
      `M ${offset} ${offset} L ${w - offset} ${offset} L ${w - offset} ${waveY - offset} Q ${w - offset - w * 0.125} ${waveY - offset + waveHeight} ${w - offset - w * 0.25} ${waveY - offset} Q ${w - offset - w * 0.375} ${waveY - offset - waveHeight} ${w - offset - w * 0.5} ${waveY - offset} L ${offset} ${waveY - offset} Z `,
      `M 0 ${offset * 2} L ${w - offset * 2} ${offset * 2} L ${w - offset * 2} ${waveY} Q ${w - offset * 2 - w * 0.125} ${waveY + waveHeight} ${w - offset * 2 - w * 0.25} ${waveY} Q ${w - offset * 2 - w * 0.375} ${waveY - waveHeight} ${w - offset * 2 - w * 0.5} ${waveY} L 0 ${waveY} Z`,
    ].join("");
    return path;
  },

  /**
   * Flowchart preparation (hexagon).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartPreparation: (w, h) => {
    const offset = w * 0.2;
    return `M ${offset} 0 L ${w - offset} 0 L ${w} ${h / 2} L ${w - offset} ${h} L ${offset} ${h} L 0 ${h / 2} Z`;
  },

  /**
   * Flowchart manual input (parallelogram with slanted top).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartManualInput: (w, h) => {
    const slant = h * 0.2;
    return `M 0 ${slant} L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  },

  /**
   * Flowchart manual operation (inverted trapezoid).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartManualOperation: (w, h) => {
    const offset = w * 0.2;
    return `M 0 0 L ${w} 0 L ${w - offset} ${h} L ${offset} ${h} Z`;
  },

  /**
   * Flowchart punched card (card with corner cut).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartPunchedCard: (w, h) => {
    const cut = Math.min(w, h) * 0.2;
    return `M ${cut} 0 L ${w} 0 L ${w} ${h} L 0 ${h} L 0 ${cut} Z`;
  },

  /**
   * Flowchart punched tape (wavy tape shape).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartPunchedTape: (w, h) => {
    const wave = h * 0.15;
    return `M 0 ${wave} Q ${w * 0.25} 0 ${w * 0.5} ${wave} Q ${w * 0.75} ${wave * 2} ${w} ${wave} L ${w} ${h - wave} Q ${w * 0.75} ${h} ${w * 0.5} ${h - wave} Q ${w * 0.25} ${h - wave * 2} 0 ${h - wave} Z`;
  },

  /**
   * Flowchart summing junction (circle with X).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartSummingJunction: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    const offset = Math.min(rx, ry) * 0.707; // cos(45) = 0.707
    // Circle + X inside
    return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} Z M ${cx - offset} ${cy - offset} L ${cx + offset} ${cy + offset} M ${cx + offset} ${cy - offset} L ${cx - offset} ${cy + offset}`;
  },

  /**
   * Flowchart or (circle with +).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartOr: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    // Circle + cross inside
    return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} Z M ${cx} 0 L ${cx} ${h} M 0 ${cy} L ${w} ${cy}`;
  },

  /**
   * Flowchart collate (hourglass shape).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartCollate: (w, h) => {
    // Two triangles forming an hourglass (X shape)
    return `M 0 0 L ${w} 0 L ${w / 2} ${h / 2} L ${w} ${h} L 0 ${h} L ${w / 2} ${h / 2} Z`;
  },

  /**
   * Flowchart sort (diamond with horizontal line).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartSort: (w, h) => {
    // Diamond with horizontal line through middle
    return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z M 0 ${h / 2} L ${w} ${h / 2}`;
  },

  /**
   * Flowchart offline storage (inverted triangle with flat top).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartOfflineStorage: (w, h) => {
    const topOffset = h * 0.15;
    return `M 0 ${topOffset} L ${w} ${topOffset} L ${w / 2} ${h} Z M 0 0 L ${w} 0 L ${w} ${topOffset} L 0 ${topOffset} Z`;
  },

  /**
   * Flowchart online storage (cylinder side view / half-pipe).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartOnlineStorage: (w, h) => {
    const curve = w * 0.2;
    return `M ${curve} 0 L ${w} 0 L ${w} ${h} L ${curve} ${h} Q 0 ${h * 0.5} ${curve} 0 Z`;
  },

  /**
   * Flowchart magnetic tape (tape reel with tail).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartMagneticTape: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    // Circle with a small rectangle tail at bottom right
    return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx * 0.1} ${cy + ry * 0.995} L ${cx + rx * 0.1} ${h} L ${w} ${h} L ${w} ${cy + ry * 0.8} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} Z`;
  },

  /**
   * Flowchart magnetic disk (vertical cylinder).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartMagneticDisk: (w, h) => {
    const ellipseH = h * 0.15;
    const rx = w / 2;
    const ry = ellipseH;
    return `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} A ${rx} ${ry} 0 0 1 0 ${h - ry} Z M 0 ${ry} A ${rx} ${ry} 0 0 0 ${w} ${ry}`;
  },

  /**
   * Flowchart magnetic drum (horizontal cylinder).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartMagneticDrum: (w, h) => {
    const ellipseW = w * 0.15;
    const rx = ellipseW;
    const ry = h / 2;
    return `M ${rx} 0 L ${w - rx} 0 A ${rx} ${ry} 0 0 1 ${w - rx} ${h} L ${rx} ${h} A ${rx} ${ry} 0 0 1 ${rx} 0 Z M ${w - rx} 0 A ${rx} ${ry} 0 0 0 ${w - rx} ${h}`;
  },

  /**
   * Flowchart display (display screen with rounded right side).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartDisplay: (w, h) => {
    const leftPoint = w * 0.15;
    const rightCurve = w * 0.25;
    return `M ${leftPoint} 0 L ${w - rightCurve} 0 Q ${w} 0 ${w} ${h / 2} Q ${w} ${h} ${w - rightCurve} ${h} L ${leftPoint} ${h} L 0 ${h / 2} Z`;
  },

  /**
   * Flowchart offpage connector (pentagon / home plate shape).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  flowChartOffpageConnector: (w, h) => {
    const arrowH = h * 0.3;
    return `M 0 0 L ${w} 0 L ${w} ${h - arrowH} L ${w / 2} ${h} L 0 ${h - arrowH} Z`;
  },

  // =========================================================================
  // Callout Shapes
  // =========================================================================

  /**
   * Wedge rectangle callout.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  wedgeRectCallout: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const mainH = h * 0.7;
    return `M 0 0 L ${w} 0 L ${w} ${mainH} L ${w * 0.6} ${mainH} L ${tailX} ${tailY} L ${w * 0.4} ${mainH} L 0 ${mainH} Z`;
  },

  /**
   * Wedge round rectangle callout.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  wedgeRoundRectCallout: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const mainH = h * 0.7;
    const r = Math.min(w, mainH) * 0.1;
    return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${mainH - r} Q ${w} ${mainH} ${w - r} ${mainH} L ${w * 0.6} ${mainH} L ${tailX} ${tailY} L ${w * 0.4} ${mainH} L ${r} ${mainH} Q 0 ${mainH} 0 ${mainH - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  },

  /**
   * Wedge ellipse callout.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  wedgeEllipseCallout: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const rx = w / 2;
    const ry = h * 0.35;
    // Simplified: ellipse with tail
    return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${ry * 2} A ${rx} ${ry} 0 0 1 ${w * 0.6} ${ry * 1.9} L ${tailX} ${tailY} L ${w * 0.4} ${ry * 1.9} A ${rx} ${ry} 0 0 1 ${rx} 0 Z`;
  },

  /**
   * Cloud shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  cloud: (w, h) => {
    // Cloud is made of multiple overlapping circles/arcs using cubic bezier curves
    return `M ${w * 0.15} ${h * 0.6} ` +
           `C ${w * -0.05} ${h * 0.6} ${w * -0.05} ${h * 0.25} ${w * 0.15} ${h * 0.25} ` +
           `C ${w * 0.1} ${h * 0.05} ${w * 0.3} ${h * -0.05} ${w * 0.4} ${h * 0.15} ` +
           `C ${w * 0.45} ${h * -0.05} ${w * 0.65} ${h * -0.05} ${w * 0.7} ${h * 0.15} ` +
           `C ${w * 0.85} ${h * 0.0} ${w * 1.1} ${h * 0.2} ${w * 0.9} ${h * 0.45} ` +
           `C ${w * 1.1} ${h * 0.55} ${w * 1.05} ${h * 0.85} ${w * 0.8} ${h * 0.8} ` +
           `C ${w * 0.8} ${h * 1.0} ${w * 0.55} ${h * 1.05} ${w * 0.45} ${h * 0.85} ` +
           `C ${w * 0.3} ${h * 1.0} ${w * 0.1} ${h * 0.95} ${w * 0.15} ${h * 0.6} Z`;
  },

  /**
   * Cloud callout with tail (thought bubble style).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  cloudCallout: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);

    // Cloud body (scaled to leave room for tail)
    const cloudH = h * 0.7;
    const cloudPath = `M ${w * 0.15} ${cloudH * 0.6} ` +
           `C ${w * -0.05} ${cloudH * 0.6} ${w * -0.05} ${cloudH * 0.25} ${w * 0.15} ${cloudH * 0.25} ` +
           `C ${w * 0.1} ${cloudH * 0.05} ${w * 0.3} ${cloudH * -0.05} ${w * 0.4} ${cloudH * 0.15} ` +
           `C ${w * 0.45} ${cloudH * -0.05} ${w * 0.65} ${cloudH * -0.05} ${w * 0.7} ${cloudH * 0.15} ` +
           `C ${w * 0.85} ${cloudH * 0.0} ${w * 1.1} ${cloudH * 0.2} ${w * 0.9} ${cloudH * 0.45} ` +
           `C ${w * 1.1} ${cloudH * 0.55} ${w * 1.05} ${cloudH * 0.85} ${w * 0.8} ${cloudH * 0.8} ` +
           `C ${w * 0.8} ${cloudH * 1.0} ${w * 0.55} ${cloudH * 1.05} ${w * 0.45} ${cloudH * 0.85} ` +
           `C ${w * 0.3} ${cloudH * 1.0} ${w * 0.1} ${cloudH * 0.95} ${w * 0.15} ${cloudH * 0.6} Z`;

    // Thought bubbles leading to tail (3 circles decreasing in size)
    const bubble1X = w * 0.4;
    const bubble1Y = cloudH * 0.95;
    const bubble1R = w * 0.04;

    const bubble2X = (bubble1X + tailX) / 2;
    const bubble2Y = (bubble1Y + tailY) / 2;
    const bubble2R = w * 0.025;

    const bubble3X = tailX;
    const bubble3Y = tailY;
    const bubble3R = w * 0.015;

    // Draw cloud + bubbles
    return cloudPath +
           ` M ${bubble1X + bubble1R} ${bubble1Y} A ${bubble1R} ${bubble1R} 0 1 1 ${bubble1X - bubble1R} ${bubble1Y} A ${bubble1R} ${bubble1R} 0 1 1 ${bubble1X + bubble1R} ${bubble1Y} Z` +
           ` M ${bubble2X + bubble2R} ${bubble2Y} A ${bubble2R} ${bubble2R} 0 1 1 ${bubble2X - bubble2R} ${bubble2Y} A ${bubble2R} ${bubble2R} 0 1 1 ${bubble2X + bubble2R} ${bubble2Y} Z` +
           ` M ${bubble3X + bubble3R} ${bubble3Y} A ${bubble3R} ${bubble3R} 0 1 1 ${bubble3X - bubble3R} ${bubble3Y} A ${bubble3R} ${bubble3R} 0 1 1 ${bubble3X + bubble3R} ${bubble3Y} Z`;
  },

  /**
   * Line callout 1 - Simple line callout with rectangle and single line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  callout1: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);

    // Rectangle body
    const rectPath = `M 0 0 L ${boxW} 0 L ${boxW} ${boxH} L 0 ${boxH} Z`;

    // Line from bottom center to tail
    const linePath = ` M ${boxW / 2} ${boxH} L ${tailX} ${tailY}`;

    return rectPath + linePath;
  },

  /**
   * Line callout 2 - Line callout with rectangle and bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  callout2: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY = h * ((adj.get("adj5") ?? 50000) / 100000);

    // Rectangle body
    const rectPath = `M 0 0 L ${boxW} 0 L ${boxW} ${boxH} L 0 ${boxH} Z`;

    // Bent line: from bottom center, down, then to tail
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY} L ${tailX} ${tailY}`;

    return rectPath + linePath;
  },

  /**
   * Line callout 3 - Line callout with rectangle and double-bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  callout3: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY1 = h * ((adj.get("adj5") ?? 50000) / 100000);
    const bendX = w * ((adj.get("adj6") ?? 50000) / 100000);

    // Rectangle body
    const rectPath = `M 0 0 L ${boxW} 0 L ${boxW} ${boxH} L 0 ${boxH} Z`;

    // Double-bent line: from bottom center, down, horizontal, then to tail
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY1} L ${bendX} ${bendY1} L ${tailX} ${tailY}`;

    return rectPath + linePath;
  },

  /**
   * Accent callout 1 - Rectangle with accent bar and single line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  accentCallout1: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const accentWidth = w * 0.02;

    // Accent bar on left
    const accentPath = `M 0 0 L ${accentWidth} 0 L ${accentWidth} ${boxH} L 0 ${boxH} Z`;

    // Rectangle body (offset by accent)
    const rectPath = ` M ${accentWidth * 2} 0 L ${boxW} 0 L ${boxW} ${boxH} L ${accentWidth * 2} ${boxH} Z`;

    // Line from bottom center to tail
    const linePath = ` M ${boxW / 2} ${boxH} L ${tailX} ${tailY}`;

    return accentPath + rectPath + linePath;
  },

  /**
   * Accent callout 2 - Rectangle with accent bar and bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  accentCallout2: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY = h * ((adj.get("adj5") ?? 50000) / 100000);
    const accentWidth = w * 0.02;

    // Accent bar on left
    const accentPath = `M 0 0 L ${accentWidth} 0 L ${accentWidth} ${boxH} L 0 ${boxH} Z`;

    // Rectangle body
    const rectPath = ` M ${accentWidth * 2} 0 L ${boxW} 0 L ${boxW} ${boxH} L ${accentWidth * 2} ${boxH} Z`;

    // Bent line
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY} L ${tailX} ${tailY}`;

    return accentPath + rectPath + linePath;
  },

  /**
   * Accent callout 3 - Rectangle with accent bar and double-bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  accentCallout3: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY1 = h * ((adj.get("adj5") ?? 50000) / 100000);
    const bendX = w * ((adj.get("adj6") ?? 50000) / 100000);
    const accentWidth = w * 0.02;

    // Accent bar on left
    const accentPath = `M 0 0 L ${accentWidth} 0 L ${accentWidth} ${boxH} L 0 ${boxH} Z`;

    // Rectangle body
    const rectPath = ` M ${accentWidth * 2} 0 L ${boxW} 0 L ${boxW} ${boxH} L ${accentWidth * 2} ${boxH} Z`;

    // Double-bent line
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY1} L ${bendX} ${bendY1} L ${tailX} ${tailY}`;

    return accentPath + rectPath + linePath;
  },

  /**
   * Border callout 1 - Rectangle with visible border and single line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  borderCallout1: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);

    // Rectangle body with explicit border
    const rectPath = `M 0 0 L ${boxW} 0 L ${boxW} ${boxH} L 0 ${boxH} Z`;

    // Line from edge to tail
    const linePath = ` M ${boxW / 2} ${boxH} L ${tailX} ${tailY}`;

    return rectPath + linePath;
  },

  /**
   * Border callout 2 - Rectangle with visible border and bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  borderCallout2: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY = h * ((adj.get("adj5") ?? 50000) / 100000);

    // Rectangle body
    const rectPath = `M 0 0 L ${boxW} 0 L ${boxW} ${boxH} L 0 ${boxH} Z`;

    // Bent line
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY} L ${tailX} ${tailY}`;

    return rectPath + linePath;
  },

  /**
   * Border callout 3 - Rectangle with visible border and double-bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  borderCallout3: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY1 = h * ((adj.get("adj5") ?? 50000) / 100000);
    const bendX = w * ((adj.get("adj6") ?? 50000) / 100000);

    // Rectangle body
    const rectPath = `M 0 0 L ${boxW} 0 L ${boxW} ${boxH} L 0 ${boxH} Z`;

    // Double-bent line
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY1} L ${bendX} ${bendY1} L ${tailX} ${tailY}`;

    return rectPath + linePath;
  },

  /**
   * Accent border callout 1 - Rectangle with accent bar, border, and single line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  accentBorderCallout1: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const accentWidth = w * 0.02;

    // Accent bar on left
    const accentPath = `M 0 0 L ${accentWidth} 0 L ${accentWidth} ${boxH} L 0 ${boxH} Z`;

    // Rectangle body with border
    const rectPath = ` M ${accentWidth * 2} 0 L ${boxW} 0 L ${boxW} ${boxH} L ${accentWidth * 2} ${boxH} Z`;

    // Line from bottom center to tail
    const linePath = ` M ${boxW / 2} ${boxH} L ${tailX} ${tailY}`;

    return accentPath + rectPath + linePath;
  },

  /**
   * Accent border callout 2 - Rectangle with accent bar, border, and bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  accentBorderCallout2: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY = h * ((adj.get("adj5") ?? 50000) / 100000);
    const accentWidth = w * 0.02;

    // Accent bar on left
    const accentPath = `M 0 0 L ${accentWidth} 0 L ${accentWidth} ${boxH} L 0 ${boxH} Z`;

    // Rectangle body
    const rectPath = ` M ${accentWidth * 2} 0 L ${boxW} 0 L ${boxW} ${boxH} L ${accentWidth * 2} ${boxH} Z`;

    // Bent line
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY} L ${tailX} ${tailY}`;

    return accentPath + rectPath + linePath;
  },

  /**
   * Accent border callout 3 - Rectangle with accent bar, border, and double-bent line to tail.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  accentBorderCallout3: (w, h, adj) => {
    const tailX = w * ((adj.get("adj1") ?? -20833) / 100000 + 0.5);
    const tailY = h * ((adj.get("adj2") ?? 62500) / 100000);
    const boxW = w * ((adj.get("adj3") ?? 100000) / 100000);
    const boxH = h * ((adj.get("adj4") ?? 100000) / 100000);
    const bendY1 = h * ((adj.get("adj5") ?? 50000) / 100000);
    const bendX = w * ((adj.get("adj6") ?? 50000) / 100000);
    const accentWidth = w * 0.02;

    // Accent bar on left
    const accentPath = `M 0 0 L ${accentWidth} 0 L ${accentWidth} ${boxH} L 0 ${boxH} Z`;

    // Rectangle body
    const rectPath = ` M ${accentWidth * 2} 0 L ${boxW} 0 L ${boxW} ${boxH} L ${accentWidth * 2} ${boxH} Z`;

    // Double-bent line
    const midX = boxW / 2;
    const linePath = ` M ${midX} ${boxH} L ${midX} ${bendY1} L ${bendX} ${bendY1} L ${tailX} ${tailY}`;

    return accentPath + rectPath + linePath;
  },

  // =========================================================================
  // Brace/Bracket Shapes
  // =========================================================================

  /**
   * Left brace.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftBrace: (w, h, adj) => {
    const depth = w * ((adj.get("adj1") ?? 8333) / 100000);
    const midY = h * ((adj.get("adj2") ?? 50000) / 100000);
    return `M ${w} 0 Q ${w - depth} 0 ${w - depth} ${depth} L ${w - depth} ${midY - depth} Q ${w - depth} ${midY} ${w - depth * 2} ${midY} Q ${w - depth} ${midY} ${w - depth} ${midY + depth} L ${w - depth} ${h - depth} Q ${w - depth} ${h} ${w} ${h}`;
  },

  /**
   * Right brace.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  rightBrace: (w, h, adj) => {
    const depth = w * ((adj.get("adj1") ?? 8333) / 100000);
    const midY = h * ((adj.get("adj2") ?? 50000) / 100000);
    return `M 0 0 Q ${depth} 0 ${depth} ${depth} L ${depth} ${midY - depth} Q ${depth} ${midY} ${depth * 2} ${midY} Q ${depth} ${midY} ${depth} ${midY + depth} L ${depth} ${h - depth} Q ${depth} ${h} 0 ${h}`;
  },

  /**
   * Left bracket.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftBracket: (w, h, adj) => {
    const depth = w * ((adj.get("adj") ?? 8333) / 100000);
    return `M ${w} 0 L ${depth} 0 Q 0 0 0 ${depth} L 0 ${h - depth} Q 0 ${h} ${depth} ${h} L ${w} ${h}`;
  },

  /**
   * Right bracket.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  rightBracket: (w, h, adj) => {
    const depth = w * ((adj.get("adj") ?? 8333) / 100000);
    return `M 0 0 L ${w - depth} 0 Q ${w} 0 ${w} ${depth} L ${w} ${h - depth} Q ${w} ${h} ${w - depth} ${h} L 0 ${h}`;
  },

  // =========================================================================
  // Other Shapes
  // =========================================================================

  /**
   * Arc segment.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  arc: (w, h, adj) => {
    const startAngle = ((adj.get("adj1") ?? 270 * 60000) / 60000) * Math.PI / 180;
    const endAngle = ((adj.get("adj2") ?? 0) / 60000) * Math.PI / 180;
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    const x1 = cx + rx * Math.cos(startAngle);
    const y1 = cy + ry * Math.sin(startAngle);
    const x2 = cx + rx * Math.cos(endAngle);
    const y2 = cy + ry * Math.sin(endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} 1 ${x2} ${y2}`;
  },

  /**
   * Pie slice.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  pie: (w, h, adj) => {
    const startAngle = ((adj.get("adj1") ?? 0) / 60000) * Math.PI / 180;
    const endAngle = ((adj.get("adj2") ?? 270 * 60000) / 60000) * Math.PI / 180;
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    const x1 = cx + rx * Math.cos(startAngle);
    const y1 = cy + ry * Math.sin(startAngle);
    const x2 = cx + rx * Math.cos(endAngle);
    const y2 = cy + ry * Math.sin(endAngle);
    const sweep = endAngle - startAngle;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    const sweepDir = sweep > 0 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweepDir} ${x2} ${y2} Z`;
  },

  /**
   * Donut/ring.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  donut: (w, h, adj) => {
    const holeRatio = (adj.get("adj") ?? 25000) / 100000;
    const rx = w / 2;
    const ry = h / 2;
    const innerRx = rx * holeRatio;
    const innerRy = ry * holeRatio;
    // Outer circle
    const path = [
      `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z `,
      `M ${rx} ${ry - innerRy} A ${innerRx} ${innerRy} 0 1 0 ${rx} ${ry + innerRy} A ${innerRx} ${innerRy} 0 1 0 ${rx} ${ry - innerRy} Z`,
    ].join("");
    return path;
  },

  /**
   * Sun shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  sun: (w, h, adj) => {
    const rayLength = Math.min(w, h) * ((adj.get("adj") ?? 25000) / 100000);
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR - rayLength;
    // 8-point sun
    const segments = range(16).map((i) => {
      const angle = (i * 22.5 - 90) * Math.PI / 180;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return `${segments.join("")} Z`;
  },

  /**
   * Smiley face.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  smileyFace: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    const eyeR = r * 0.1;
    const eyeY = cy - r * 0.2;
    const leftEyeX = cx - r * 0.3;
    const rightEyeX = cx + r * 0.3;
    const smileY = cy + r * 0.1;
    const smileR = r * 0.5;
    // Face outline
    const path = [
      `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z `,
      `M ${leftEyeX + eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 1 1 ${leftEyeX - eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 1 1 ${leftEyeX + eyeR} ${eyeY} Z `,
      `M ${rightEyeX + eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 1 1 ${rightEyeX - eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 1 1 ${rightEyeX + eyeR} ${eyeY} Z `,
      `M ${cx - smileR} ${smileY} Q ${cx} ${smileY + smileR} ${cx + smileR} ${smileY}`,
    ].join("");
    return path;
  },

  /**
   * Action button blank.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonBlank: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    // Outer rectangle with beveled appearance
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z`;
  },

  // =========================================================================
  // Stars & Ribbons
  // =========================================================================

  /**
   * Ribbon banner shape with curved ends.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  ribbon: (w, h, adj) => {
    const ribbonHeight = h * ((adj.get("adj1") ?? 16667) / 100000);
    const foldWidth = w * ((adj.get("adj2") ?? 50000) / 100000) * 0.2;
    const foldHeight = h * 0.15;
    const mainTop = foldHeight;
    const mainBottom = h - foldHeight;
    const bandHeight = ribbonHeight;
    // Main ribbon body with curved ends
    return `M ${foldWidth} ${mainTop} ` +
      `L ${w - foldWidth} ${mainTop} ` +
      `Q ${w} ${mainTop} ${w} ${mainTop + bandHeight / 2} ` +
      `Q ${w} ${mainTop + bandHeight} ${w - foldWidth} ${mainTop + bandHeight} ` +
      `L ${w - foldWidth} ${mainBottom - bandHeight} ` +
      `Q ${w} ${mainBottom - bandHeight} ${w} ${mainBottom - bandHeight / 2} ` +
      `Q ${w} ${mainBottom} ${w - foldWidth} ${mainBottom} ` +
      `L ${foldWidth} ${mainBottom} ` +
      `Q 0 ${mainBottom} 0 ${mainBottom - bandHeight / 2} ` +
      `Q 0 ${mainBottom - bandHeight} ${foldWidth} ${mainBottom - bandHeight} ` +
      `L ${foldWidth} ${mainTop + bandHeight} ` +
      `Q 0 ${mainTop + bandHeight} 0 ${mainTop + bandHeight / 2} ` +
      `Q 0 ${mainTop} ${foldWidth} ${mainTop} Z ` +
      // Left fold
      `M 0 0 L ${foldWidth} ${foldHeight} L ${foldWidth} ${h - foldHeight} L 0 ${h} Z ` +
      // Right fold
      `M ${w} 0 L ${w - foldWidth} ${foldHeight} L ${w - foldWidth} ${h - foldHeight} L ${w} ${h} Z`;
  },

  /**
   * Ribbon banner variant (ribbon2) - inverted ribbon.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  ribbon2: (w, h, adj) => {
    const ribbonHeight = h * ((adj.get("adj1") ?? 16667) / 100000);
    const foldWidth = w * ((adj.get("adj2") ?? 50000) / 100000) * 0.2;
    const foldHeight = h * 0.15;
    const mainTop = 0;
    const mainBottom = h;
    const bandHeight = ribbonHeight;
    // Main ribbon body
    return `M 0 ${mainTop + bandHeight} ` +
      `Q 0 ${mainTop} ${foldWidth} ${mainTop} ` +
      `L ${w - foldWidth} ${mainTop} ` +
      `Q ${w} ${mainTop} ${w} ${mainTop + bandHeight} ` +
      `L ${w} ${mainBottom - bandHeight} ` +
      `Q ${w} ${mainBottom} ${w - foldWidth} ${mainBottom} ` +
      `L ${foldWidth} ${mainBottom} ` +
      `Q 0 ${mainBottom} 0 ${mainBottom - bandHeight} Z ` +
      // Left inner fold (going behind)
      `M ${foldWidth} ${foldHeight} L ${foldWidth * 2} ${foldHeight * 2} L ${foldWidth * 2} ${h - foldHeight * 2} L ${foldWidth} ${h - foldHeight} Z ` +
      // Right inner fold
      `M ${w - foldWidth} ${foldHeight} L ${w - foldWidth * 2} ${foldHeight * 2} L ${w - foldWidth * 2} ${h - foldHeight * 2} L ${w - foldWidth} ${h - foldHeight} Z`;
  },

  /**
   * Ellipse ribbon shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  ellipseRibbon: (w, h, adj) => {
    const curveDepth = h * ((adj.get("adj2") ?? 50000) / 100000) * 0.3;
    const tabWidth = w * 0.15;
    const tabHeight = h * 0.2;
    const mainY = tabHeight;
    const mainBottom = h - tabHeight;
    // Main curved ribbon body
    return `M ${tabWidth} ${mainY} ` +
      `Q ${w / 2} ${mainY - curveDepth} ${w - tabWidth} ${mainY} ` +
      `L ${w - tabWidth} ${mainBottom} ` +
      `Q ${w / 2} ${mainBottom + curveDepth} ${tabWidth} ${mainBottom} Z ` +
      // Left tab
      `M 0 0 L ${tabWidth} ${tabHeight} L ${tabWidth} ${h - tabHeight} L 0 ${h} Z ` +
      // Right tab
      `M ${w} 0 L ${w - tabWidth} ${tabHeight} L ${w - tabWidth} ${h - tabHeight} L ${w} ${h} Z`;
  },

  /**
   * Ellipse ribbon variant (ellipseRibbon2) - inverted ellipse ribbon.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  ellipseRibbon2: (w, h, adj) => {
    const curveDepth = h * ((adj.get("adj2") ?? 50000) / 100000) * 0.3;
    const tabWidth = w * 0.15;
    const tabHeight = h * 0.2;
    // Main curved ribbon body (inverted curve direction)
    return `M 0 ${tabHeight} ` +
      `Q ${w / 2} ${tabHeight + curveDepth} ${w} ${tabHeight} ` +
      `L ${w} ${h - tabHeight} ` +
      `Q ${w / 2} ${h - tabHeight - curveDepth} 0 ${h - tabHeight} Z ` +
      // Left inner tab
      `M ${tabWidth} ${tabHeight} L ${tabWidth * 2} 0 L ${tabWidth * 2} ${h} L ${tabWidth} ${h - tabHeight} Z ` +
      // Right inner tab
      `M ${w - tabWidth} ${tabHeight} L ${w - tabWidth * 2} 0 L ${w - tabWidth * 2} ${h} L ${w - tabWidth} ${h - tabHeight} Z`;
  },

  /**
   * Left-right ribbon shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  leftRightRibbon: (w, h, adj) => {
    const ribbonOffset = h * ((adj.get("adj") ?? 50000) / 100000) * 0.2;
    const tabWidth = w * 0.2;
    const halfH = h / 2;
    // Left ribbon going right
    const leftRibbonPath = `M 0 ${ribbonOffset} ` +
      `L ${w - tabWidth} ${ribbonOffset} ` +
      `L ${w - tabWidth} 0 ` +
      `L ${w} ${halfH / 2 + ribbonOffset / 2} ` +
      `L ${w - tabWidth} ${halfH} ` +
      `L ${w - tabWidth} ${halfH - ribbonOffset} ` +
      `L ${tabWidth} ${halfH - ribbonOffset} ` +
      `L ${tabWidth} ${halfH} ` +
      `L 0 ${halfH / 2 + ribbonOffset / 2} Z`;
    // Right ribbon going left
    const rightRibbonPath = `M ${w} ${h - ribbonOffset} ` +
      `L ${tabWidth} ${h - ribbonOffset} ` +
      `L ${tabWidth} ${h} ` +
      `L 0 ${h - halfH / 2 - ribbonOffset / 2} ` +
      `L ${tabWidth} ${halfH} ` +
      `L ${tabWidth} ${halfH + ribbonOffset} ` +
      `L ${w - tabWidth} ${halfH + ribbonOffset} ` +
      `L ${w - tabWidth} ${halfH} ` +
      `L ${w} ${h - halfH / 2 - ribbonOffset / 2} Z`;
    return leftRibbonPath + " " + rightRibbonPath;
  },

  // =========================================================================
  // Wave Shapes
  // =========================================================================

  /**
   * Wave shape - single wave.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  wave: (w, h, adj) => {
    const waveDepth = h * ((adj.get("adj1") ?? 12500) / 100000);
    const waveOffset = w * ((adj.get("adj2") ?? 0) / 100000);
    const cp1x = w * 0.25 + waveOffset;
    const cp2x = w * 0.75 + waveOffset;
    // Top wave (sine curve)
    return `M 0 ${waveDepth} ` +
      `Q ${cp1x} 0 ${w / 2} ${waveDepth} ` +
      `Q ${cp2x} ${waveDepth * 2} ${w} ${waveDepth} ` +
      `L ${w} ${h - waveDepth} ` +
      `Q ${cp2x} ${h} ${w / 2} ${h - waveDepth} ` +
      `Q ${cp1x} ${h - waveDepth * 2} 0 ${h - waveDepth} Z`;
  },

  /**
   * Double wave shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  doubleWave: (w, h, adj) => {
    const waveDepth = h * ((adj.get("adj1") ?? 6250) / 100000);
    const waveOffset = w * ((adj.get("adj2") ?? 0) / 100000);
    const cp1x = w * 0.125 + waveOffset;
    const cp2x = w * 0.375 + waveOffset;
    const cp3x = w * 0.625 + waveOffset;
    const cp4x = w * 0.875 + waveOffset;
    // Top double wave
    return `M 0 ${waveDepth} ` +
      `Q ${cp1x} 0 ${w * 0.25} ${waveDepth} ` +
      `Q ${cp2x} ${waveDepth * 2} ${w * 0.5} ${waveDepth} ` +
      `Q ${cp3x} 0 ${w * 0.75} ${waveDepth} ` +
      `Q ${cp4x} ${waveDepth * 2} ${w} ${waveDepth} ` +
      `L ${w} ${h - waveDepth} ` +
      `Q ${cp4x} ${h} ${w * 0.75} ${h - waveDepth} ` +
      `Q ${cp3x} ${h - waveDepth * 2} ${w * 0.5} ${h - waveDepth} ` +
      `Q ${cp2x} ${h} ${w * 0.25} ${h - waveDepth} ` +
      `Q ${cp1x} ${h - waveDepth * 2} 0 ${h - waveDepth} Z`;
  },

  // =========================================================================
  // Other Shapes (Part 1)
  // =========================================================================

  /**
   * Pie wedge (quarter circle).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  pieWedge: (w, h) => {
    return `M ${w} ${h} L ${w} 0 A ${w} ${h} 0 0 0 0 ${h} Z`;
  },

  /**
   * Block arc (thick arc segment).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  blockArc: (w, h, adj) => {
    const startAngle = ((adj.get("adj1") ?? 180 * 60000) / 60000) * Math.PI / 180;
    const endAngle = ((adj.get("adj2") ?? 0) / 60000) * Math.PI / 180;
    const thickness = (adj.get("adj3") ?? 25000) / 100000;
    const rx = w / 2;
    const ry = h / 2;
    const innerRx = rx * (1 - thickness);
    const innerRy = ry * (1 - thickness);
    const cx = rx;
    const cy = ry;
    // Outer arc points
    const x1 = cx + rx * Math.cos(startAngle);
    const y1 = cy + ry * Math.sin(startAngle);
    const x2 = cx + rx * Math.cos(endAngle);
    const y2 = cy + ry * Math.sin(endAngle);
    // Inner arc points
    const x3 = cx + innerRx * Math.cos(endAngle);
    const y3 = cy + innerRy * Math.sin(endAngle);
    const x4 = cx + innerRx * Math.cos(startAngle);
    const y4 = cy + innerRy * Math.sin(startAngle);
    const sweep = endAngle - startAngle;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRx} ${innerRy} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  },

  /**
   * Circle with diagonal slash (no smoking sign).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  noSmoking: (w, h, adj) => {
    const thickness = (adj.get("adj") ?? 18750) / 100000;
    const rx = w / 2;
    const ry = h / 2;
    const innerRx = rx * (1 - thickness);
    const innerRy = ry * (1 - thickness);
    const slashThickness = Math.min(w, h) * thickness * 0.5;
    const angle = Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const sx1 = rx - innerRx * cos;
    const sy1 = ry - innerRy * sin;
    const sx2 = rx + innerRx * cos;
    const sy2 = ry + innerRy * sin;
    const perpX = slashThickness * sin / 2;
    const perpY = slashThickness * cos / 2;
    // Outer circle
    const path = [
      `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z `,
      `M ${rx} ${ry - innerRy} A ${innerRx} ${innerRy} 0 1 0 ${rx} ${ry + innerRy} A ${innerRx} ${innerRy} 0 1 0 ${rx} ${ry - innerRy} Z `,
      `M ${sx1 - perpX} ${sy1 + perpY} L ${sx2 - perpX} ${sy2 + perpY} L ${sx2 + perpX} ${sy2 - perpY} L ${sx1 + perpX} ${sy1 - perpY} Z`,
    ].join("");
    return path;
  },

  /**
   * 3D cube (isometric view).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  cube: (w, h, adj) => {
    const depth = (adj.get("adj") ?? 25000) / 100000 * Math.min(w, h);
    // Front face
    const path = [
      `M 0 ${depth} L ${w - depth} ${depth} L ${w - depth} ${h} L 0 ${h} Z `,
      `M 0 ${depth} L ${depth} 0 L ${w} 0 L ${w - depth} ${depth} Z `,
      `M ${w - depth} ${depth} L ${w} 0 L ${w} ${h - depth} L ${w - depth} ${h} Z`,
    ].join("");
    return path;
  },

  /**
   * Cylinder shape (can).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  can: (w, h, adj) => {
    const capHeight = (adj.get("adj") ?? 25000) / 100000 * h;
    const rx = w / 2;
    const ry = capHeight / 2;
    // Body
    const path = [
      `M 0 ${ry} L 0 ${h - ry} `,
      `A ${rx} ${ry} 0 0 0 ${w} ${h - ry} `,
      `L ${w} ${ry} `,
      `A ${rx} ${ry} 0 0 0 0 ${ry} Z `,
      `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${w} ${ry} A ${rx} ${ry} 0 0 1 0 ${ry} Z`,
    ].join("");
    return path;
  },

  /**
   * Lightning bolt.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  lightningBolt: (w, h) => {
    return `M ${w * 0.58} 0 L ${w * 0.42} ${h * 0.35} L ${w * 0.58} ${h * 0.35} L ${w * 0.25} ${h} L ${w * 0.42} ${h * 0.55} L ${w * 0.25} ${h * 0.55} L ${w * 0.58} 0 Z`;
  },

  /**
   * Heart shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  heart: (w, h) => {
    const cx = w / 2;
    return `M ${cx} ${h * 0.25} C ${cx} ${h * 0.1} ${w * 0.25} 0 0 ${h * 0.2} C 0 ${h * 0.5} ${cx} ${h * 0.6} ${cx} ${h} C ${cx} ${h * 0.6} ${w} ${h * 0.5} ${w} ${h * 0.2} C ${w * 0.75} 0 ${cx} ${h * 0.1} ${cx} ${h * 0.25} Z`;
  },

  /**
   * Crescent moon.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  moon: (w, h, adj) => {
    const inset = (adj.get("adj") ?? 50000) / 100000 * w;
    const rx = w / 2;
    const ry = h / 2;
    const innerRx = rx - inset / 2;
    // Outer arc (full right side of ellipse)
    const path = [
      `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} `,
      `A ${innerRx} ${ry} 0 1 0 ${rx} 0 Z`,
    ].join("");
    return path;
  },

  /**
   * Explosion/starburst shape 1.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  irregularSeal1: (w, h) => {
    // Irregular explosion points
    return `M ${w * 0.4} 0 L ${w * 0.45} ${h * 0.2} L ${w * 0.65} ${h * 0.15} L ${w * 0.55} ${h * 0.3} L ${w} ${h * 0.35} L ${w * 0.7} ${h * 0.45} L ${w * 0.85} ${h * 0.7} L ${w * 0.6} ${h * 0.6} L ${w * 0.7} ${h} L ${w * 0.45} ${h * 0.75} L ${w * 0.25} ${h * 0.9} L ${w * 0.35} ${h * 0.65} L 0 ${h * 0.6} L ${w * 0.25} ${h * 0.5} L ${w * 0.1} ${h * 0.25} L ${w * 0.35} ${h * 0.35} Z`;
  },

  /**
   * Explosion/starburst shape 2.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  irregularSeal2: (w, h) => {
    return `M ${w * 0.45} 0 L ${w * 0.5} ${h * 0.15} L ${w * 0.75} ${h * 0.05} L ${w * 0.65} ${h * 0.25} L ${w} ${h * 0.3} L ${w * 0.75} ${h * 0.4} L ${w * 0.95} ${h * 0.65} L ${w * 0.7} ${h * 0.55} L ${w * 0.8} ${h * 0.85} L ${w * 0.55} ${h * 0.7} L ${w * 0.5} ${h} L ${w * 0.4} ${h * 0.75} L ${w * 0.15} ${h * 0.9} L ${w * 0.3} ${h * 0.6} L 0 ${h * 0.5} L ${w * 0.2} ${h * 0.45} L ${w * 0.05} ${h * 0.2} L ${w * 0.3} ${h * 0.3} Z`;
  },

  /**
   * Rectangle with folded corner.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  foldedCorner: (w, h, adj) => {
    const fold = (adj.get("adj") ?? 16667) / 100000 * Math.min(w, h);
    // Main rectangle with folded corner cut
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h - fold} L ${w - fold} ${h} L 0 ${h} Z `,
      `M ${w - fold} ${h} L ${w - fold} ${h - fold} L ${w} ${h - fold} Z`,
    ].join("");
    return path;
  },

  /**
   * Beveled rectangle.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bevel: (w, h, adj) => {
    const bevelSize = (adj.get("adj") ?? 12500) / 100000 * Math.min(w, h);
    // Outer rectangle
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${bevelSize} ${bevelSize} L ${w - bevelSize} ${bevelSize} L ${w - bevelSize} ${h - bevelSize} L ${bevelSize} ${h - bevelSize} Z`,
    ].join("");
    return path;
  },

  /**
   * Picture frame (rectangle with hole).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  frame: (w, h, adj) => {
    const frameWidth = (adj.get("adj1") ?? 12500) / 100000 * Math.min(w, h);
    // Outer rectangle
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${frameWidth} ${frameWidth} L ${frameWidth} ${h - frameWidth} L ${w - frameWidth} ${h - frameWidth} L ${w - frameWidth} ${frameWidth} Z`,
    ].join("");
    return path;
  },

  /**
   * L-shaped half frame.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  halfFrame: (w, h, adj) => {
    const armWidth = (adj.get("adj1") ?? 33333) / 100000 * w;
    const armHeight = (adj.get("adj2") ?? 33333) / 100000 * h;
    return `M 0 0 L ${w} 0 L ${w} ${armHeight} L ${armWidth} ${armHeight} L ${armWidth} ${h} L 0 ${h} Z`;
  },

  /**
   * Corner shape (L-shaped).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  corner: (w, h, adj) => {
    const armWidth = (adj.get("adj1") ?? 50000) / 100000 * w;
    const armHeight = (adj.get("adj2") ?? 50000) / 100000 * h;
    return `M 0 0 L ${armWidth} 0 L ${armWidth} ${h - armHeight} L ${w} ${h - armHeight} L ${w} ${h} L 0 ${h} Z`;
  },

  /**
   * Diagonal stripe.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  diagStripe: (w, h, adj) => {
    const stripeWidth = (adj.get("adj") ?? 50000) / 100000;
    const x1 = w * stripeWidth;
    const y1 = h * stripeWidth;
    return `M 0 ${y1} L 0 0 L ${x1} 0 L ${w} ${h - y1} L ${w} ${h} L ${w - x1} ${h} Z`;
  },

  /**
   * Chord (arc segment with straight line connecting endpoints).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  chord: (w, h, adj) => {
    const startAngle = ((adj.get("adj1") ?? 270 * 60000) / 60000) * Math.PI / 180;
    const endAngle = ((adj.get("adj2") ?? 0) / 60000) * Math.PI / 180;
    const rx = w / 2;
    const ry = h / 2;
    const cx = rx;
    const cy = ry;
    const x1 = cx + rx * Math.cos(startAngle);
    const y1 = cy + ry * Math.sin(startAngle);
    const x2 = cx + rx * Math.cos(endAngle);
    const y2 = cy + ry * Math.sin(endAngle);
    const sweep = endAngle - startAngle;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  },

  // =========================================================================
  // Other Shapes (Part 2)
  // =========================================================================

  /**
   * Vertical scroll shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  verticalScroll: (w, h, adj) => {
    const scrollWidth = w * ((adj.get("adj") ?? 12500) / 100000);
    const r = scrollWidth / 2;
    // Main scroll body with curled ends
    const path = [
      `M ${scrollWidth} 0 L ${w - scrollWidth} 0 `,
      `A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h - scrollWidth} `,
      `A ${r} ${r} 0 0 1 ${w - scrollWidth} ${h} L ${scrollWidth} ${h} `,
      `A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${scrollWidth} `,
      `A ${r} ${r} 0 0 1 ${scrollWidth} 0 Z`,
    ].join("");
    return path;
  },

  /**
   * Horizontal scroll shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  horizontalScroll: (w, h, adj) => {
    const scrollHeight = h * ((adj.get("adj") ?? 12500) / 100000);
    const r = scrollHeight / 2;
    // Main scroll body with curled ends
    const path = [
      `M 0 ${scrollHeight} L 0 ${h - scrollHeight} `,
      `A ${r} ${r} 0 0 0 ${scrollHeight} ${h} L ${w - scrollHeight} ${h} `,
      `A ${r} ${r} 0 0 0 ${w} ${h - scrollHeight} L ${w} ${scrollHeight} `,
      `A ${r} ${r} 0 0 0 ${w - scrollHeight} 0 L ${scrollHeight} 0 `,
      `A ${r} ${r} 0 0 0 0 ${scrollHeight} Z`,
    ].join("");
    return path;
  },

  /**
   * 6-tooth gear.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  gear6: (w, h, adj) => {
    const outerRatio = (adj.get("adj1") ?? 15000) / 100000;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR * (1 - outerRatio);
    const toothWidth = 360 / 6 / 3; // Each tooth takes 1/3 of its segment
    const segments = range(6).map((i) => {
      const baseAngle = i * 60;
      // Outer tooth edge
      const a1 = (baseAngle - toothWidth / 2 - 90) * Math.PI / 180;
      const a2 = (baseAngle + toothWidth / 2 - 90) * Math.PI / 180;
      // Inner valley
      const a3 = (baseAngle + 30 - toothWidth / 2 - 90) * Math.PI / 180;
      const a4 = (baseAngle + 30 + toothWidth / 2 - 90) * Math.PI / 180;

      const ox1 = cx + outerR * Math.cos(a1);
      const oy1 = cy + outerR * Math.sin(a1);
      const ox2 = cx + outerR * Math.cos(a2);
      const oy2 = cy + outerR * Math.sin(a2);
      const ix3 = cx + innerR * Math.cos(a3);
      const iy3 = cy + innerR * Math.sin(a3);
      const ix4 = cx + innerR * Math.cos(a4);
      const iy4 = cy + innerR * Math.sin(a4);

      if (i === 0) {
        return `M ${ox1} ${oy1} L ${ox2} ${oy2} L ${ix3} ${iy3} L ${ix4} ${iy4} `;
      }
      return `L ${ox2} ${oy2} L ${ix3} ${iy3} L ${ix4} ${iy4} `;
    });
    return `${segments.join("")}Z`;
  },

  /**
   * 9-tooth gear.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  gear9: (w, h, adj) => {
    const outerRatio = (adj.get("adj1") ?? 10000) / 100000;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR * (1 - outerRatio);
    const toothWidth = 360 / 9 / 3;
    const segments = range(9).map((i) => {
      const baseAngle = i * 40;
      const a1 = (baseAngle - toothWidth / 2 - 90) * Math.PI / 180;
      const a2 = (baseAngle + toothWidth / 2 - 90) * Math.PI / 180;
      const a3 = (baseAngle + 20 - toothWidth / 2 - 90) * Math.PI / 180;
      const a4 = (baseAngle + 20 + toothWidth / 2 - 90) * Math.PI / 180;

      const ox1 = cx + outerR * Math.cos(a1);
      const oy1 = cy + outerR * Math.sin(a1);
      const ox2 = cx + outerR * Math.cos(a2);
      const oy2 = cy + outerR * Math.sin(a2);
      const ix3 = cx + innerR * Math.cos(a3);
      const iy3 = cy + innerR * Math.sin(a3);
      const ix4 = cx + innerR * Math.cos(a4);
      const iy4 = cy + innerR * Math.sin(a4);

      if (i === 0) {
        return `M ${ox1} ${oy1} L ${ox2} ${oy2} L ${ix3} ${iy3} L ${ix4} ${iy4} `;
      }
      return `L ${ox2} ${oy2} L ${ix3} ${iy3} L ${ix4} ${iy4} `;
    });
    return `${segments.join("")}Z`;
  },

  /**
   * Funnel shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  funnel: (w, h, adj) => {
    const neckWidth = w * ((adj.get("adj1") ?? 25000) / 100000);
    const neckHeight = h * ((adj.get("adj2") ?? 25000) / 100000);
    const cx = w / 2;
    // Top ellipse
    const rx = w / 2;
    const ry = h * 0.15;
    const path = [
      `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${w} ${ry} `,
      `L ${cx + neckWidth / 2} ${h - neckHeight} `,
      `L ${cx + neckWidth / 2} ${h} L ${cx - neckWidth / 2} ${h} L ${cx - neckWidth / 2} ${h - neckHeight} `,
      `L 0 ${ry} Z`,
    ].join("");
    return path;
  },

  /**
   * Math plus sign.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  mathPlus: (w, h, adj) => {
    const thickness = Math.min(w, h) * ((adj.get("adj1") ?? 23520) / 100000);
    const cx = w / 2;
    const cy = h / 2;
    const hw = thickness / 2;
    return `M ${cx - hw} 0 L ${cx + hw} 0 L ${cx + hw} ${cy - hw} L ${w} ${cy - hw} L ${w} ${cy + hw} L ${cx + hw} ${cy + hw} L ${cx + hw} ${h} L ${cx - hw} ${h} L ${cx - hw} ${cy + hw} L 0 ${cy + hw} L 0 ${cy - hw} L ${cx - hw} ${cy - hw} Z`;
  },

  /**
   * Math minus sign.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  mathMinus: (w, h, adj) => {
    const thickness = h * ((adj.get("adj1") ?? 23520) / 100000);
    const cy = h / 2;
    const hw = thickness / 2;
    return `M 0 ${cy - hw} L ${w} ${cy - hw} L ${w} ${cy + hw} L 0 ${cy + hw} Z`;
  },

  /**
   * Math multiply (x).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  mathMultiply: (w, h, adj) => {
    const thickness = Math.min(w, h) * ((adj.get("adj1") ?? 23520) / 100000);
    const cx = w / 2;
    const cy = h / 2;
    const d = thickness / Math.sqrt(2) / 2;
    const r = Math.min(w, h) / 2 - d;
    // X shape - two crossed rectangles
    return `M ${cx - d} ${cy - r - d} L ${cx + d} ${cy - r - d} L ${cx + r + d} ${cy - d} L ${cx + r + d} ${cy + d} L ${cx + d} ${cy + r + d} L ${cx - d} ${cy + r + d} L ${cx - r - d} ${cy + d} L ${cx - r - d} ${cy - d} Z`;
  },

  /**
   * Math divide (division sign).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  mathDivide: (w, h, adj) => {
    const thickness = h * ((adj.get("adj1") ?? 23520) / 100000);
    const dotRadius = Math.min(w, h) * 0.1;
    const cx = w / 2;
    const cy = h / 2;
    const hw = thickness / 2;
    // Top dot
    const topDotY = cy - hw - dotRadius * 2;
    // Bottom dot
    const bottomDotY = cy + hw + dotRadius * 2;
    const path = [
      `M 0 ${cy - hw} L ${w} ${cy - hw} L ${w} ${cy + hw} L 0 ${cy + hw} Z `,
      `M ${cx + dotRadius} ${topDotY} A ${dotRadius} ${dotRadius} 0 1 1 ${cx - dotRadius} ${topDotY} A ${dotRadius} ${dotRadius} 0 1 1 ${cx + dotRadius} ${topDotY} Z `,
      `M ${cx + dotRadius} ${bottomDotY} A ${dotRadius} ${dotRadius} 0 1 1 ${cx - dotRadius} ${bottomDotY} A ${dotRadius} ${dotRadius} 0 1 1 ${cx + dotRadius} ${bottomDotY} Z`,
    ].join("");
    return path;
  },

  /**
   * Math equal sign.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  mathEqual: (w, h, adj) => {
    const thickness = h * ((adj.get("adj1") ?? 23520) / 100000);
    const gap = h * ((adj.get("adj2") ?? 11760) / 100000);
    const cy = h / 2;
    const hg = gap / 2;
    const path = [
      `M 0 ${cy - hg - thickness} L ${w} ${cy - hg - thickness} L ${w} ${cy - hg} L 0 ${cy - hg} Z `,
      `M 0 ${cy + hg} L ${w} ${cy + hg} L ${w} ${cy + hg + thickness} L 0 ${cy + hg + thickness} Z`,
    ].join("");
    return path;
  },

  /**
   * Math not equal sign.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  mathNotEqual: (w, h, adj) => {
    const thickness = h * ((adj.get("adj1") ?? 23520) / 100000);
    const gap = h * ((adj.get("adj2") ?? 11760) / 100000);
    const slashThickness = w * 0.1;
    const cy = h / 2;
    const hg = gap / 2;
    const path = [
      `M 0 ${cy - hg - thickness} L ${w} ${cy - hg - thickness} L ${w} ${cy - hg} L 0 ${cy - hg} Z `,
      `M 0 ${cy + hg} L ${w} ${cy + hg} L ${w} ${cy + hg + thickness} L 0 ${cy + hg + thickness} Z `,
      `M ${w * 0.3} ${h} L ${w * 0.3 + slashThickness} ${h} L ${w * 0.7 + slashThickness} 0 L ${w * 0.7} 0 Z`,
    ].join("");
    return path;
  },

  /**
   * Corner tabs.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  cornerTabs: (w, h) => {
    const tabSize = Math.min(w, h) * 0.2;
    const path = [
      `M 0 0 L ${tabSize} 0 L 0 ${tabSize} Z `,
      `M ${w - tabSize} 0 L ${w} 0 L ${w} ${tabSize} Z `,
      `M ${w} ${h - tabSize} L ${w} ${h} L ${w - tabSize} ${h} Z `,
      `M 0 ${h - tabSize} L 0 ${h} L ${tabSize} ${h} Z`,
    ].join("");
    return path;
  },

  /**
   * Square tabs.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  squareTabs: (w, h) => {
    const tabSize = Math.min(w, h) * 0.2;
    const path = [
      `M 0 0 L ${tabSize} 0 L ${tabSize} ${tabSize} L 0 ${tabSize} Z `,
      `M ${w - tabSize} 0 L ${w} 0 L ${w} ${tabSize} L ${w - tabSize} ${tabSize} Z `,
      `M ${w - tabSize} ${h - tabSize} L ${w} ${h - tabSize} L ${w} ${h} L ${w - tabSize} ${h} Z `,
      `M 0 ${h - tabSize} L ${tabSize} ${h - tabSize} L ${tabSize} ${h} L 0 ${h} Z`,
    ].join("");
    return path;
  },

  /**
   * Plaque tabs.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  plaqueTabs: (w, h) => {
    const tabSize = Math.min(w, h) * 0.2;
    const r = tabSize;
    const path = [
      `M 0 0 L ${tabSize} 0 A ${r} ${r} 0 0 0 0 ${tabSize} Z `,
      `M ${w - tabSize} 0 L ${w} 0 L ${w} ${tabSize} A ${r} ${r} 0 0 0 ${w - tabSize} 0 Z `,
      `M ${w} ${h - tabSize} A ${r} ${r} 0 0 0 ${w - tabSize} ${h} L ${w} ${h} Z `,
      `M 0 ${h - tabSize} L 0 ${h} L ${tabSize} ${h} A ${r} ${r} 0 0 0 0 ${h - tabSize} Z`,
    ].join("");
    return path;
  },

  /**
   * Chart X shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  chartX: (w, h) => {
    const thickness = Math.min(w, h) * 0.2;
    const d = thickness / Math.sqrt(2);
    const cx = w / 2;
    const cy = h / 2;
    // X shape
    return `M ${d} 0 L ${cx} ${cy - d} L ${w - d} 0 L ${w} ${d} L ${cx + d} ${cy} L ${w} ${h - d} L ${w - d} ${h} L ${cx} ${cy + d} L ${d} ${h} L 0 ${h - d} L ${cx - d} ${cy} L 0 ${d} Z`;
  },

  /**
   * Chart star shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  chartStar: (w, h) => {
    return generateStar(w, h, 6, 0.5);
  },

  /**
   * Chart plus shape.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  chartPlus: (w, h) => {
    const thickness = Math.min(w, h) * 0.3;
    const cx = w / 2;
    const cy = h / 2;
    const hw = thickness / 2;
    return `M ${cx - hw} 0 L ${cx + hw} 0 L ${cx + hw} ${cy - hw} L ${w} ${cy - hw} L ${w} ${cy + hw} L ${cx + hw} ${cy + hw} L ${cx + hw} ${h} L ${cx - hw} ${h} L ${cx - hw} ${cy + hw} L 0 ${cy + hw} L 0 ${cy - hw} L ${cx - hw} ${cy - hw} Z`;
  },

  /**
   * Paired brackets [ ].
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bracketPair: (w, h, adj) => {
    const depth = w * ((adj.get("adj") ?? 16667) / 100000);
    const r = Math.min(depth, h / 4);
    const path = [
      `M ${depth} 0 L ${r} 0 Q 0 0 0 ${r} L 0 ${h - r} Q 0 ${h} ${r} ${h} L ${depth} ${h} `,
      `M ${w - depth} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${w - depth} ${h}`,
    ].join("");
    return path;
  },

  /**
   * Paired braces { }.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  bracePair: (w, h, adj) => {
    const depth = w * ((adj.get("adj") ?? 8333) / 100000);
    const midY = h / 2;
    const path = [
      `M ${depth} 0 Q 0 0 0 ${depth} L 0 ${midY - depth} Q 0 ${midY} ${-depth * 0.5} ${midY} Q 0 ${midY} 0 ${midY + depth} L 0 ${h - depth} Q 0 ${h} ${depth} ${h} `,
      `M ${w - depth} 0 Q ${w} 0 ${w} ${depth} L ${w} ${midY - depth} Q ${w} ${midY} ${w + depth * 0.5} ${midY} Q ${w} ${midY} ${w} ${midY + depth} L ${w} ${h - depth} Q ${w} ${h} ${w - depth} ${h}`,
    ].join("");
    return path;
  },

  // =========================================================================
  // Action Buttons
  // =========================================================================

  /**
   * Action button - Home.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonHome: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const cx = w / 2;
    // House icon - roof
    const roofTop = iconMargin;
    const roofBottom = h * 0.45;
    const houseLeft = iconMargin;
    const houseRight = w - iconMargin;
    const houseBottom = h - iconMargin;
    // House body
    const bodyLeft = houseLeft + (houseRight - houseLeft) * 0.15;
    const bodyRight = houseRight - (houseRight - houseLeft) * 0.15;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${cx} ${roofTop} L ${houseRight} ${roofBottom} L ${houseLeft} ${roofBottom} Z `,
      `M ${bodyLeft} ${roofBottom} L ${bodyRight} ${roofBottom} L ${bodyRight} ${houseBottom} L ${bodyLeft} ${houseBottom} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Help (?).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonHelp: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.25;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Information (i).
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonInformation: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.25;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Forward/Next arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonForwardNext: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const cy = h / 2;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${iconMargin} L ${w - iconMargin} ${cy} L ${iconMargin} ${h - iconMargin} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Back/Previous arrow.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonBackPrevious: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const cy = h / 2;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${w - iconMargin} ${iconMargin} L ${iconMargin} ${cy} L ${w - iconMargin} ${h - iconMargin} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - End.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonEnd: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const cy = h / 2;
    const barWidth = (w - 2 * iconMargin) * 0.15;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${iconMargin} L ${w - iconMargin - barWidth} ${cy} L ${iconMargin} ${h - iconMargin} Z `,
      `M ${w - iconMargin - barWidth} ${iconMargin} L ${w - iconMargin} ${iconMargin} L ${w - iconMargin} ${h - iconMargin} L ${w - iconMargin - barWidth} ${h - iconMargin} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Beginning.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonBeginning: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const cy = h / 2;
    const barWidth = (w - 2 * iconMargin) * 0.15;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${iconMargin} L ${iconMargin + barWidth} ${iconMargin} L ${iconMargin + barWidth} ${h - iconMargin} L ${iconMargin} ${h - iconMargin} Z `,
      `M ${w - iconMargin} ${iconMargin} L ${iconMargin + barWidth} ${cy} L ${w - iconMargin} ${h - iconMargin} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Return.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonReturn: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const arrowHeight = (h - 2 * iconMargin) * 0.4;
    const cy = h / 2;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${cy} L ${iconMargin + arrowHeight} ${cy - arrowHeight} L ${iconMargin + arrowHeight} ${cy - arrowHeight / 2} `,
      `L ${w - iconMargin} ${cy - arrowHeight / 2} L ${w - iconMargin} ${cy + arrowHeight / 2} L ${iconMargin + arrowHeight} ${cy + arrowHeight / 2} `,
      `L ${iconMargin + arrowHeight} ${cy + arrowHeight} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Document.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonDocument: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const foldSize = (w - 2 * iconMargin) * 0.25;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${iconMargin} L ${w - iconMargin - foldSize} ${iconMargin} L ${w - iconMargin} ${iconMargin + foldSize} L ${w - iconMargin} ${h - iconMargin} L ${iconMargin} ${h - iconMargin} Z `,
      `M ${w - iconMargin - foldSize} ${iconMargin} L ${w - iconMargin - foldSize} ${iconMargin + foldSize} L ${w - iconMargin} ${iconMargin + foldSize}`,
    ].join("");
    return path;
  },

  /**
   * Action button - Sound.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonSound: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const cy = h / 2;
    const speakerWidth = (w - 2 * iconMargin) * 0.4;
    const speakerHeight = (h - 2 * iconMargin) * 0.6;
    // Speaker cone
    const speakerBaseWidth = speakerWidth * 0.4;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${cy - speakerHeight * 0.25} `,
      `L ${iconMargin + speakerBaseWidth} ${cy - speakerHeight * 0.25} `,
      `L ${iconMargin + speakerWidth} ${cy - speakerHeight * 0.5} `,
      `L ${iconMargin + speakerWidth} ${cy + speakerHeight * 0.5} `,
      `L ${iconMargin + speakerBaseWidth} ${cy + speakerHeight * 0.25} `,
      `L ${iconMargin} ${cy + speakerHeight * 0.25} Z`,
    ].join("");
    return path;
  },

  /**
   * Action button - Movie.
   *
   * @see ECMA-376 Part 1, Section 20.1.10.56
   */
  actionButtonMovie: (w, h) => {
    const border = Math.min(w, h) * 0.1;
    const iconMargin = Math.min(w, h) * 0.25;
    const filmWidth = w - 2 * iconMargin;
    const filmHeight = h - 2 * iconMargin;
    const holeSize = filmWidth * 0.08;
    const holeSpacing = filmWidth * 0.15;
    // Film holes (sprocket holes on sides)
    const holeY1 = iconMargin + filmHeight * 0.2;
    const holeY2 = iconMargin + filmHeight * 0.5;
    const holeY3 = iconMargin + filmHeight * 0.8;
    const path = [
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z `,
      `M ${border} ${border} L ${w - border} ${border} L ${w - border} ${h - border} L ${border} ${h - border} Z `,
      `M ${iconMargin} ${iconMargin} L ${w - iconMargin} ${iconMargin} L ${w - iconMargin} ${h - iconMargin} L ${iconMargin} ${h - iconMargin} Z `,
      `M ${iconMargin + holeSpacing - holeSize} ${holeY1 - holeSize} L ${iconMargin + holeSpacing + holeSize} ${holeY1 - holeSize} L ${iconMargin + holeSpacing + holeSize} ${holeY1 + holeSize} L ${iconMargin + holeSpacing - holeSize} ${holeY1 + holeSize} Z `,
      `M ${iconMargin + holeSpacing - holeSize} ${holeY2 - holeSize} L ${iconMargin + holeSpacing + holeSize} ${holeY2 - holeSize} L ${iconMargin + holeSpacing + holeSize} ${holeY2 + holeSize} L ${iconMargin + holeSpacing - holeSize} ${holeY2 + holeSize} Z `,
      `M ${iconMargin + holeSpacing - holeSize} ${holeY3 - holeSize} L ${iconMargin + holeSpacing + holeSize} ${holeY3 - holeSize} L ${iconMargin + holeSpacing + holeSize} ${holeY3 + holeSize} L ${iconMargin + holeSpacing - holeSize} ${holeY3 + holeSize} Z `,
      `M ${w - iconMargin - holeSpacing - holeSize} ${holeY1 - holeSize} L ${w - iconMargin - holeSpacing + holeSize} ${holeY1 - holeSize} L ${w - iconMargin - holeSpacing + holeSize} ${holeY1 + holeSize} L ${w - iconMargin - holeSpacing - holeSize} ${holeY1 + holeSize} Z `,
      `M ${w - iconMargin - holeSpacing - holeSize} ${holeY2 - holeSize} L ${w - iconMargin - holeSpacing + holeSize} ${holeY2 - holeSize} L ${w - iconMargin - holeSpacing + holeSize} ${holeY2 + holeSize} L ${w - iconMargin - holeSpacing - holeSize} ${holeY2 + holeSize} Z `,
      `M ${w - iconMargin - holeSpacing - holeSize} ${holeY3 - holeSize} L ${w - iconMargin - holeSpacing + holeSize} ${holeY3 - holeSize} L ${w - iconMargin - holeSpacing + holeSize} ${holeY3 + holeSize} L ${w - iconMargin - holeSpacing - holeSize} ${holeY3 + holeSize} Z`,
    ].join("");
    return path;
  },

};

/**
 * Generate a star polygon path
 */
function generateStar(w: number, h: number, points: number, innerRatio: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * innerRatio;
  const pathParts: string[] = [];

  for (const i of range(points * 2)) {
    const angle = (i * 180 / points - 90) * Math.PI / 180;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pathParts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }

  return pathParts.join(" ") + " Z";
}

/**
 * Render preset geometry to SVG path data
 */
export function renderPresetGeometryData(
  geom: PresetGeometry,
  width: number,
  height: number,
): string {
  const generator = PRESET_SHAPES[geom.preset];
  if (!generator) {
    throw new Error(`Unsupported preset geometry: ${geom.preset}`);
  }

  const adjMap = new Map(geom.adjustValues.map((av) => [av.name, av.value]));
  return generator(width, height, adjMap);
}

// =============================================================================
// Custom Geometry Rendering
// =============================================================================

/**
 * Scale a path command's coordinates from path space to shape space.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.15 (a:path)
 */
function scaleCommand(
  command: PathCommand,
  scaleX: number,
  scaleY: number,
): PathCommand {
  switch (command.type) {
    case "moveTo":
      return {
        type: "moveTo",
        point: { x: px(command.point.x * scaleX), y: px(command.point.y * scaleY) },
      };
    case "lineTo":
      return {
        type: "lineTo",
        point: { x: px(command.point.x * scaleX), y: px(command.point.y * scaleY) },
      };
    case "arcTo":
      return {
        type: "arcTo",
        widthRadius: px(command.widthRadius * scaleX),
        heightRadius: px(command.heightRadius * scaleY),
        startAngle: command.startAngle,
        swingAngle: command.swingAngle,
      };
    case "quadBezierTo":
      return {
        type: "quadBezierTo",
        control: { x: px(command.control.x * scaleX), y: px(command.control.y * scaleY) },
        end: { x: px(command.end.x * scaleX), y: px(command.end.y * scaleY) },
      };
    case "cubicBezierTo":
      return {
        type: "cubicBezierTo",
        control1: { x: px(command.control1.x * scaleX), y: px(command.control1.y * scaleY) },
        control2: { x: px(command.control2.x * scaleX), y: px(command.control2.y * scaleY) },
        end: { x: px(command.end.x * scaleX), y: px(command.end.y * scaleY) },
      };
    case "close":
      return command;
  }
}

/**
 * Render custom geometry to SVG path data with scaling.
 *
 * Per ECMA-376 Part 1, Section 20.1.9.15 (a:path):
 * - The path's w and h attributes define its coordinate system
 * - Path coordinates must be scaled to fit the shape's actual dimensions
 *
 * @param geom - Custom geometry with paths
 * @param targetWidth - Target shape width
 * @param targetHeight - Target shape height
 * @returns SVG path data string with scaled coordinates
 *
 * @see ECMA-376 Part 1, Section 20.1.9.8 (a:custGeom)
 * @see ECMA-376 Part 1, Section 20.1.9.15 (a:path)
 */
export function renderCustomGeometryData(
  geom: CustomGeometry,
  targetWidth?: number,
  targetHeight?: number,
): string {
  return geom.paths
    .map((p) => {
      // If no target dimensions or path dimensions are zero, use unscaled
      if (
        targetWidth === undefined ||
        targetHeight === undefined ||
        p.width === 0 ||
        p.height === 0
      ) {
        return renderGeometryPathData(p);
      }

      // Calculate scale factors from path coordinate space to shape space
      const scaleX = targetWidth / p.width;
      const scaleY = targetHeight / p.height;

      // Scale all commands
      const scaledCommands = p.commands.map((cmd) =>
        scaleCommand(cmd, scaleX, scaleY)
      );

      // Create a virtual scaled path for rendering
      const scaledPath: GeometryPath = {
        ...p,
        commands: scaledCommands,
      };

      return renderGeometryPathData(scaledPath);
    })
    .join(" ");
}

// =============================================================================
// Main Geometry Rendering
// =============================================================================

/**
 * Render geometry to SVG path data
 *
 * @param geom - Geometry (preset or custom)
 * @param width - Target shape width
 * @param height - Target shape height
 * @returns SVG path data string
 */
export function renderGeometryData(
  geom: Geometry,
  width: number,
  height: number,
): string {
  switch (geom.type) {
    case "preset":
      return renderPresetGeometryData(geom, width, height);
    case "custom":
      return renderCustomGeometryData(geom, width, height);
  }
}

/**
 * Build SVG transform attribute from Transform
 */
export function buildTransformAttr(transform: Transform): string {
  const parts: string[] = [];

  // Translate to position
  if (transform.x !== 0 || transform.y !== 0) {
    parts.push(`translate(${transform.x}, ${transform.y})`);
  }

  // Apply rotation around center
  if (transform.rotation !== 0) {
    const cx = transform.width / 2;
    const cy = transform.height / 2;
    parts.push(`rotate(${transform.rotation}, ${cx}, ${cy})`);
  }

  // Apply flips
  if (transform.flipH || transform.flipV) {
    const sx = transform.flipH ? -1 : 1;
    const sy = transform.flipV ? -1 : 1;
    const tx = transform.flipH ? transform.width : 0;
    const ty = transform.flipV ? transform.height : 0;
    parts.push(`translate(${tx}, ${ty}) scale(${sx}, ${sy})`);
  }

  return parts.join(" ");
}

// =============================================================================
// Geometry Path with Markers
// =============================================================================

/**
 * Extract stroke color from line fill.
 */
function getStrokeColorFromLine(
  line: Line,
  colorContext?: ColorContext,
): string {
  if (line.fill.type !== "solidFill") {
    return "#000000";
  }
  const resolved = resolveFill(line.fill, colorContext);
  if (resolved.type !== "solid") {
    return "#000000";
  }
  return formatRgba(resolved.color.hex, resolved.color.alpha);
}

/**
 * Generate markers for a line if it has headEnd or tailEnd.
 */
function generateMarkersForLine(
  line: Line | undefined,
  strokeStyle: { strokeWidth: number } | undefined,
  colorContext?: ColorContext,
): MarkerCollection {
  if (!line) {
    return { defs: [] };
  }
  if (!line.headEnd && !line.tailEnd) {
    return { defs: [] };
  }
  if (!strokeStyle) {
    return { defs: [] };
  }

  const strokeColor = getStrokeColorFromLine(line, colorContext);
  return generateLineMarkers(
    line.headEnd,
    line.tailEnd,
    strokeStyle.strokeWidth,
    strokeColor,
  );
}

/**
 * Result of rendering a geometry path with markers
 */
export type GeometryPathWithMarkersResult = {
  /** The rendered path element */
  pathElement: HtmlString;
  /** Marker definitions to include in <defs> */
  markerDefs: HtmlString[];
};

/**
 * Render a geometry path to SVG path element with marker support.
 *
 * This function generates both the path element and any required marker
 * definitions for line ends (arrows).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd)
 * @see ECMA-376 Part 1, Section 20.1.8.57 (tailEnd)
 */
export function renderGeometryPathWithMarkers(
  geomPath: GeometryPath,
  fill: Fill | undefined,
  line: Line | undefined,
  colorContext?: ColorContext,
  transform?: Transform,
): GeometryPathWithMarkersResult {
  const d = renderGeometryPathData(geomPath);

  const fillStyle = fill ? renderFillToStyle(fill) : undefined;
  const strokeStyle = line ? renderLineToStyle(line) : undefined;

  // Generate markers if line has headEnd or tailEnd
  const markers = generateMarkersForLine(line, strokeStyle, colorContext);

  const pathAttrs: Record<string, string | number | undefined> = {
    d,
    fill: fillStyle?.fill ?? "none",
    stroke: strokeStyle?.stroke,
    "stroke-width": strokeStyle?.strokeWidth,
    "stroke-linecap": strokeStyle?.strokeLinecap,
    "stroke-linejoin": strokeStyle?.strokeLinejoin,
    "stroke-dasharray": strokeStyle?.strokeDasharray,
    "marker-start": markers.markerStart,
    "marker-end": markers.markerEnd,
  };

  if (transform) {
    pathAttrs.transform = buildTransformAttr(transform);
  }

  return {
    pathElement: path(pathAttrs as Parameters<typeof path>[0]),
    markerDefs: markers.defs,
  };
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}
