/**
 * @file Geometry parser
 *
 * Parses DrawingML geometry elements to Geometry domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */
/* eslint-disable curly -- parser uses single-line guards consistently */

import type {
  AdjustValue,
  AdjustHandle,
  XYAdjustHandle,
  PolarAdjustHandle,
  ArcToCommand,
  CloseCommand,
  ConnectionSite,
  CubicBezierCommand,
  CustomGeometry,
  Geometry,
  GeometryGuide,
  GeometryPath,
  LineToCommand,
  MoveToCommand,
  PathCommand,
  Point,
  PresetGeometry,
  QuadBezierCommand,
  TextRect,
} from "../../domain/index";
import type { Degrees } from "../../domain/types";
import { px, deg } from "../../domain/types";
import {
  getAttr,
  getChild,
  getChildren,
  isXmlElement,
  type XmlElement,
} from "../../../xml/index";
import { getAngleAttr, getEmuAttr, getBoolAttrOr } from "../primitive";

// =============================================================================
// Constants
// =============================================================================

/** EMU to pixels factor for geometry (points in geometry are in EMU) */

// =============================================================================
// OOXML to Domain Mapping Functions
// =============================================================================

/**
 * Map OOXML path fill mode to domain fill mode
 * @see ECMA-376 Part 1, Section 20.1.10.37 (ST_PathFillMode)
 */
function mapPathFillMode(fill: string | undefined): GeometryPath["fill"] {
  switch (fill) {
    case "none": return "none";
    case "norm": return "norm";
    case "lighten": return "lighten";
    case "lightenLess": return "lightenLess";
    case "darken": return "darken";
    case "darkenLess": return "darkenLess";
    default: return "norm";
  }
}

// =============================================================================
// Adjust Value Parsing
// =============================================================================

/**
 * Parse adjust value list (avLst)
 * @see ECMA-376 Part 1, Section 20.1.9.5
 */
function parseAdjustValues(element: XmlElement | undefined): readonly AdjustValue[] {
  if (!element) return [];

  const avLst = getChild(element, "a:avLst");
  if (!avLst) return [];

  const values: AdjustValue[] = [];

  for (const gd of getChildren(avLst, "a:gd")) {
    const name = getAttr(gd, "name");
    const fmla = getAttr(gd, "fmla");

    if (name && fmla) {
      // Parse formula value (usually "val X" format)
      const match = fmla.match(/^val\s+(\d+)$/);
      if (match) {
        values.push({ name, value: parseInt(match[1], 10) });
      }
    }
  }

  return values;
}

// =============================================================================
// Adjust Handle Parsing
// =============================================================================

function parseAdjustHandles(element: XmlElement | undefined): readonly AdjustHandle[] {
  if (!element) return [];

  const ahLst = getChild(element, "a:ahLst");
  if (!ahLst) return [];

  const handles: AdjustHandle[] = [];
  for (const child of ahLst.children) {
    if (!isXmlElement(child)) continue;

    if (child.name === "a:ahXY") {
      const handle = parseAdjustHandleXY(child);
      if (handle) handles.push(handle);
    }

    if (child.name === "a:ahPolar") {
      const handle = parseAdjustHandlePolar(child);
      if (handle) handles.push(handle);
    }
  }

  return handles;
}

function parseAdjCoordinate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseAdjAngleValue(element: XmlElement, attr: string): Degrees | string | undefined {
  const raw = getAttr(element, attr);
  if (!raw) return undefined;

  const parsed = getAngleAttr(element, attr);
  if (parsed !== undefined) return parsed;

  return raw;
}

function parseAdjustHandleXY(element: XmlElement): XYAdjustHandle | undefined {
  const pos = getChild(element, "a:pos");
  if (!pos) return undefined;

  return {
    type: "xy",
    position: parsePoint(pos),
    guideX: getAttr(element, "gdRefX"),
    guideY: getAttr(element, "gdRefY"),
    minX: parseAdjCoordinate(getAttr(element, "minX")),
    maxX: parseAdjCoordinate(getAttr(element, "maxX")),
    minY: parseAdjCoordinate(getAttr(element, "minY")),
    maxY: parseAdjCoordinate(getAttr(element, "maxY")),
  };
}

function parseAdjustHandlePolar(element: XmlElement): PolarAdjustHandle | undefined {
  const pos = getChild(element, "a:pos");
  if (!pos) return undefined;

  return {
    type: "polar",
    position: parsePoint(pos),
    guideAngle: getAttr(element, "gdRefAng"),
    guideRadius: getAttr(element, "gdRefR"),
    minAngle: parseAdjAngleValue(element, "minAng"),
    maxAngle: parseAdjAngleValue(element, "maxAng"),
    minRadius: parseAdjCoordinate(getAttr(element, "minR")),
    maxRadius: parseAdjCoordinate(getAttr(element, "maxR")),
  };
}

// =============================================================================
// Preset Geometry Parsing
// =============================================================================

/**
 * Parse preset geometry
 * @see ECMA-376 Part 1, Section 20.1.9.18
 */
function parsePresetGeometry(prstGeom: XmlElement): PresetGeometry | undefined {
  const preset = getAttr(prstGeom, "prst");
  if (!preset) return undefined;

  return {
    type: "preset",
    preset,
    adjustValues: parseAdjustValues(prstGeom),
  };
}

// =============================================================================
// Custom Geometry Parsing
// =============================================================================

/**
 * Parse point (a:pt)
 */
function parsePoint(element: XmlElement): Point {
  // Points in geometry are in EMU coordinate system
  // Using string attributes and converting to pixels
  const x = getEmuAttr(element, "x") ?? px(0);
  const y = getEmuAttr(element, "y") ?? px(0);
  return { x, y };
}

/**
 * Parse moveTo command
 */
function parseMoveToCommand(element: XmlElement): MoveToCommand | undefined {
  const pt = getChild(element, "a:pt");
  if (!pt) return undefined;

  return { type: "moveTo", point: parsePoint(pt) };
}

/**
 * Parse lineTo command
 */
function parseLineToCommand(element: XmlElement): LineToCommand | undefined {
  const pt = getChild(element, "a:pt");
  if (!pt) return undefined;

  return { type: "lineTo", point: parsePoint(pt) };
}

/**
 * Parse arcTo command
 * @see ECMA-376 Part 1, Section 20.1.9.1
 */
function parseArcToCommand(element: XmlElement): ArcToCommand | undefined {
  return {
    type: "arcTo",
    widthRadius: getEmuAttr(element, "wR") ?? px(0),
    heightRadius: getEmuAttr(element, "hR") ?? px(0),
    startAngle: getAngleAttr(element, "stAng") ?? deg(0),
    swingAngle: getAngleAttr(element, "swAng") ?? deg(0),
  };
}

/**
 * Parse quadratic bezier command
 */
function parseQuadBezierCommand(element: XmlElement): QuadBezierCommand | undefined {
  const pts = getChildren(element, "a:pt");
  if (pts.length < 2) return undefined;

  return {
    type: "quadBezierTo",
    control: parsePoint(pts[0]),
    end: parsePoint(pts[1]),
  };
}

/**
 * Parse cubic bezier command
 */
function parseCubicBezierCommand(element: XmlElement): CubicBezierCommand | undefined {
  const pts = getChildren(element, "a:pt");
  if (pts.length < 3) return undefined;

  return {
    type: "cubicBezierTo",
    control1: parsePoint(pts[0]),
    control2: parsePoint(pts[1]),
    end: parsePoint(pts[2]),
  };
}

/**
 * Parse path commands
 */
function parsePathCommands(path: XmlElement): readonly PathCommand[] {
  const commands: PathCommand[] = [];

  for (const child of path.children) {
    if (!isXmlElement(child)) continue;

    switch (child.name) {
      case "a:moveTo": {
        const cmd = parseMoveToCommand(child);
        if (cmd) commands.push(cmd);
        break;
      }
      case "a:lnTo": {
        const cmd = parseLineToCommand(child);
        if (cmd) commands.push(cmd);
        break;
      }
      case "a:arcTo": {
        const cmd = parseArcToCommand(child);
        if (cmd) commands.push(cmd);
        break;
      }
      case "a:quadBezTo": {
        const cmd = parseQuadBezierCommand(child);
        if (cmd) commands.push(cmd);
        break;
      }
      case "a:cubicBezTo": {
        const cmd = parseCubicBezierCommand(child);
        if (cmd) commands.push(cmd);
        break;
      }
      case "a:close":
        commands.push({ type: "close" } as CloseCommand);
        break;
    }
  }

  return commands;
}

/**
 * Parse geometry path
 * @see ECMA-376 Part 1, Section 20.1.9.15
 */
function parseGeometryPath(path: XmlElement): GeometryPath {
  return {
    width: getEmuAttr(path, "w") ?? px(0),
    height: getEmuAttr(path, "h") ?? px(0),
    fill: mapPathFillMode(getAttr(path, "fill")),
    stroke: getBoolAttrOr(path, "stroke", true),
    extrusionOk: getBoolAttrOr(path, "extrusionOk", true),
    commands: parsePathCommands(path),
  };
}

/**
 * Parse geometry guides
 * @see ECMA-376 Part 1, Section 20.1.9.11
 */
function parseGuides(element: XmlElement | undefined): readonly GeometryGuide[] {
  if (!element) return [];

  const gdLst = getChild(element, "a:gdLst");
  if (!gdLst) return [];

  const guides: GeometryGuide[] = [];

  for (const gd of getChildren(gdLst, "a:gd")) {
    const name = getAttr(gd, "name");
    const fmla = getAttr(gd, "fmla");

    if (name && fmla) {
      guides.push({ name, formula: fmla });
    }
  }

  return guides;
}

/**
 * Parse connection sites
 * @see ECMA-376 Part 1, Section 20.1.9.7
 */
function parseConnectionSites(element: XmlElement | undefined): readonly ConnectionSite[] {
  if (!element) return [];

  const cxnLst = getChild(element, "a:cxnLst");
  if (!cxnLst) return [];

  const sites: ConnectionSite[] = [];

  for (const cxn of getChildren(cxnLst, "a:cxn")) {
    const ang = getAngleAttr(cxn, "ang");
    const pos = getChild(cxn, "a:pos");

    if (ang !== undefined && pos) {
      sites.push({
        angle: ang,
        position: parsePoint(pos),
      });
    }
  }

  return sites;
}

/**
 * Parse text rectangle
 * @see ECMA-376 Part 1, Section 20.1.9.22
 */
function parseTextRect(element: XmlElement | undefined): TextRect | undefined {
  if (!element) return undefined;

  const rect = getChild(element, "a:rect");
  if (!rect) return undefined;

  return {
    left: getAttr(rect, "l") ?? "0",
    top: getAttr(rect, "t") ?? "0",
    right: getAttr(rect, "r") ?? "0",
    bottom: getAttr(rect, "b") ?? "0",
  };
}

/**
 * Parse custom geometry
 * @see ECMA-376 Part 1, Section 20.1.9.8
 */
function parseCustomGeometry(custGeom: XmlElement): CustomGeometry | undefined {
  const pathLst = getChild(custGeom, "a:pathLst");
  if (!pathLst) return undefined;

  const paths: GeometryPath[] = [];
  for (const path of getChildren(pathLst, "a:path")) {
    paths.push(parseGeometryPath(path));
  }

  if (paths.length === 0) return undefined;

  return {
    type: "custom",
    paths,
    adjustValues: parseAdjustValues(custGeom),
    adjustHandles: parseAdjustHandles(custGeom),
    guides: parseGuides(custGeom),
    connectionSites: parseConnectionSites(custGeom),
    textRect: parseTextRect(custGeom),
  };
}

// =============================================================================
// Main Geometry Parsing
// =============================================================================

/**
 * Parse geometry from shape properties
 */
export function parseGeometry(spPr: XmlElement | undefined): Geometry | undefined {
  if (!spPr) return undefined;

  // Check for preset geometry
  const prstGeom = getChild(spPr, "a:prstGeom");
  if (prstGeom) {
    return parsePresetGeometry(prstGeom);
  }

  // Check for custom geometry
  const custGeom = getChild(spPr, "a:custGeom");
  if (custGeom) {
    return parseCustomGeometry(custGeom);
  }

  return undefined;
}
