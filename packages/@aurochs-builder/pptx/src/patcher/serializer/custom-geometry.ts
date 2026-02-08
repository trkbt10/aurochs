/**
 * @file Custom geometry serializer
 *
 * Serializes CustomGeometry domain objects to DrawingML XML elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.8 (custGeom)
 */

import { createElement, type XmlElement, type XmlNode } from "@aurochs/xml";
import { ooxmlAngleUnits, ooxmlEmu } from "@aurochs-builder/core";
import type { CustomGeometry, GeometryPath, PathCommand } from "@aurochs-office/pptx/domain/shape";

/**
 * Serialize a move-to command
 */
function serializeMoveToCommand(cmd: Extract<PathCommand, { type: "moveTo" }>): XmlElement {
  return createElement("a:moveTo", {}, [
    createElement("a:pt", {
      x: ooxmlEmu(cmd.point.x),
      y: ooxmlEmu(cmd.point.y),
    }),
  ]);
}

/**
 * Serialize a line-to command
 */
function serializeLineToCommand(cmd: Extract<PathCommand, { type: "lineTo" }>): XmlElement {
  return createElement("a:lnTo", {}, [
    createElement("a:pt", {
      x: ooxmlEmu(cmd.point.x),
      y: ooxmlEmu(cmd.point.y),
    }),
  ]);
}

/**
 * Serialize an arc-to command
 */
function serializeArcToCommand(cmd: Extract<PathCommand, { type: "arcTo" }>): XmlElement {
  return createElement("a:arcTo", {
    wR: ooxmlEmu(cmd.widthRadius),
    hR: ooxmlEmu(cmd.heightRadius),
    stAng: ooxmlAngleUnits(cmd.startAngle),
    swAng: ooxmlAngleUnits(cmd.swingAngle),
  });
}

/**
 * Serialize a quadratic bezier command
 */
function serializeQuadBezierCommand(cmd: Extract<PathCommand, { type: "quadBezierTo" }>): XmlElement {
  return createElement("a:quadBezTo", {}, [
    createElement("a:pt", {
      x: ooxmlEmu(cmd.control.x),
      y: ooxmlEmu(cmd.control.y),
    }),
    createElement("a:pt", {
      x: ooxmlEmu(cmd.end.x),
      y: ooxmlEmu(cmd.end.y),
    }),
  ]);
}

/**
 * Serialize a cubic bezier command
 */
function serializeCubicBezierCommand(cmd: Extract<PathCommand, { type: "cubicBezierTo" }>): XmlElement {
  return createElement("a:cubicBezTo", {}, [
    createElement("a:pt", {
      x: ooxmlEmu(cmd.control1.x),
      y: ooxmlEmu(cmd.control1.y),
    }),
    createElement("a:pt", {
      x: ooxmlEmu(cmd.control2.x),
      y: ooxmlEmu(cmd.control2.y),
    }),
    createElement("a:pt", {
      x: ooxmlEmu(cmd.end.x),
      y: ooxmlEmu(cmd.end.y),
    }),
  ]);
}

/**
 * Serialize a close command
 */
function serializeCloseCommand(): XmlElement {
  return createElement("a:close");
}

/**
 * Serialize a single path command to an XML element.
 *
 * @param command - The path command to serialize
 * @returns XmlElement representing the command
 */
export function serializePathCommand(command: PathCommand): XmlElement {
  switch (command.type) {
    case "moveTo":
      return serializeMoveToCommand(command);
    case "lineTo":
      return serializeLineToCommand(command);
    case "arcTo":
      return serializeArcToCommand(command);
    case "quadBezierTo":
      return serializeQuadBezierCommand(command);
    case "cubicBezierTo":
      return serializeCubicBezierCommand(command);
    case "close":
      return serializeCloseCommand();
  }
}

/**
 * Serialize a geometry path to an XML element.
 *
 * @param path - The geometry path to serialize
 * @returns XmlElement representing the a:path element
 *
 * @see ECMA-376 Part 1, Section 20.1.9.15 (path)
 */
export function serializeGeometryPath(path: GeometryPath): XmlElement {
  const attrs: Record<string, string> = {
    w: ooxmlEmu(path.width),
    h: ooxmlEmu(path.height),
  };

  if (path.fill !== "norm") {
    attrs.fill = path.fill;
  }
  if (!path.stroke) {
    attrs.stroke = "0";
  }
  if (!path.extrusionOk) {
    attrs.extrusionOk = "0";
  }

  const children: XmlNode[] = path.commands.map(serializePathCommand);

  return createElement("a:path", attrs, children);
}

/**
 * Serialize a CustomGeometry to an a:custGeom XML element.
 *
 * @param geometry - The custom geometry to serialize
 * @returns XmlElement representing the a:custGeom element
 *
 * @example
 * ```typescript
 * const geom: CustomGeometry = {
 *   type: "custom",
 *   paths: [{
 *     width: 100,
 *     height: 100,
 *     fill: "norm",
 *     stroke: true,
 *     extrusionOk: true,
 *     commands: [
 *       { type: "moveTo", point: { x: 0, y: 0 } },
 *       { type: "lineTo", point: { x: 100, y: 100 } },
 *       { type: "close" },
 *     ],
 *   }],
 * };
 * const el = serializeCustomGeometry(geom);
 * ```
 *
 * @see ECMA-376 Part 1, Section 20.1.9.8 (custGeom)
 */
export function serializeCustomGeometry(geometry: CustomGeometry): XmlElement {
  if (geometry.paths.length === 0) {
    throw new Error("serializeCustomGeometry: paths must not be empty");
  }

  const children: XmlNode[] = [];

  // avLst is required but can be empty
  children.push(createElement("a:avLst"));

  // gdLst is optional - add if present and non-empty
  if (geometry.guides && geometry.guides.length > 0) {
    // For now, guides serialization is not implemented
    // This would require formula serialization
    children.push(createElement("a:gdLst"));
  }

  // ahLst is optional - add if present and non-empty
  if (geometry.adjustHandles && geometry.adjustHandles.length > 0) {
    // For now, adjust handles serialization is not implemented
    children.push(createElement("a:ahLst"));
  }

  // cxnLst is optional - add if present and non-empty
  if (geometry.connectionSites && geometry.connectionSites.length > 0) {
    // For now, connection sites serialization is not implemented
    children.push(createElement("a:cxnLst"));
  }

  // rect is optional - add if present
  if (geometry.textRect) {
    children.push(
      createElement("a:rect", {
        l: geometry.textRect.left,
        t: geometry.textRect.top,
        r: geometry.textRect.right,
        b: geometry.textRect.bottom,
      }),
    );
  }

  // pathLst is required
  const pathElements = geometry.paths.map(serializeGeometryPath);
  children.push(createElement("a:pathLst", {}, pathElements));

  return createElement("a:custGeom", {}, children);
}
