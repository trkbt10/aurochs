/**
 * @file Build CustomGeometry domain object from CustomGeometrySpec
 *
 * This module converts CLI spec types to domain types.
 * For XML serialization, use serializeCustomGeometry from @oxen-builder/pptx/patcher.
 */

import type { CustomGeometry, GeometryPath, PathCommand } from "@oxen-office/pptx/domain/shape";
import type { Degrees, Pixels } from "@oxen-office/ooxml/domain/units";
import type { CustomGeometrySpec, GeometryPathSpec, PathCommandSpec } from "../types";

function requireNumber(name: string, value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) {
    throw new Error(`customGeometry: ${name} is required`);
  }
  return value;
}

function buildPathCommand(spec: PathCommandSpec): PathCommand {
  switch (spec.type) {
    case "moveTo":
      return {
        type: "moveTo",
        point: { x: requireNumber("moveTo.x", spec.x) as Pixels, y: requireNumber("moveTo.y", spec.y) as Pixels },
      };
    case "lineTo":
      return {
        type: "lineTo",
        point: { x: requireNumber("lineTo.x", spec.x) as Pixels, y: requireNumber("lineTo.y", spec.y) as Pixels },
      };
    case "arcTo":
      return {
        type: "arcTo",
        widthRadius: requireNumber("arcTo.widthRadius", spec.widthRadius) as Pixels,
        heightRadius: requireNumber("arcTo.heightRadius", spec.heightRadius) as Pixels,
        startAngle: requireNumber("arcTo.startAngle", spec.startAngle) as Degrees,
        swingAngle: requireNumber("arcTo.swingAngle", spec.swingAngle) as Degrees,
      };
    case "quadBezierTo":
      return {
        type: "quadBezierTo",
        control: {
          x: requireNumber("quadBezierTo.control.x", spec.control?.x) as Pixels,
          y: requireNumber("quadBezierTo.control.y", spec.control?.y) as Pixels,
        },
        end: {
          x: requireNumber("quadBezierTo.end.x", spec.end?.x) as Pixels,
          y: requireNumber("quadBezierTo.end.y", spec.end?.y) as Pixels,
        },
      };
    case "cubicBezierTo":
      return {
        type: "cubicBezierTo",
        control1: {
          x: requireNumber("cubicBezierTo.control1.x", spec.control1?.x) as Pixels,
          y: requireNumber("cubicBezierTo.control1.y", spec.control1?.y) as Pixels,
        },
        control2: {
          x: requireNumber("cubicBezierTo.control2.x", spec.control2?.x) as Pixels,
          y: requireNumber("cubicBezierTo.control2.y", spec.control2?.y) as Pixels,
        },
        end: {
          x: requireNumber("cubicBezierTo.end.x", spec.end?.x) as Pixels,
          y: requireNumber("cubicBezierTo.end.y", spec.end?.y) as Pixels,
        },
      };
    case "close":
      return { type: "close" };
  }
}

function buildGeometryPath(spec: GeometryPathSpec): GeometryPath {
  if (!spec.commands || spec.commands.length === 0) {
    throw new Error("customGeometry: path.commands is required");
  }

  return {
    width: requireNumber("path.width", spec.width) as Pixels,
    height: requireNumber("path.height", spec.height) as Pixels,
    fill: spec.fill,
    stroke: spec.stroke,
    extrusionOk: spec.extrusionOk,
    commands: spec.commands.map(buildPathCommand),
  };
}

/**
 * Build a CustomGeometry domain object from a CLI spec.
 */
export function buildCustomGeometryFromSpec(spec: CustomGeometrySpec): CustomGeometry {
  if (!spec) {
    throw new Error("customGeometry is required");
  }
  if (!spec.paths || spec.paths.length === 0) {
    throw new Error("customGeometry.paths is required");
  }
  return {
    type: "custom",
    paths: spec.paths.map(buildGeometryPath),
  };
}
