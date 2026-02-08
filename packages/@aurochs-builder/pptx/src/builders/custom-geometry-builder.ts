/**
 * @file Build CustomGeometry domain object from CustomGeometrySpec
 *
 * This module converts CLI spec types to domain types.
 * For XML serialization, use serializeCustomGeometry from @aurochs-builder/pptx/patcher.
 */

import type { CustomGeometry, GeometryPath, PathCommand } from "@aurochs-office/pptx/domain/shape";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
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
        point: { x: px(requireNumber("moveTo.x", spec.x)), y: px(requireNumber("moveTo.y", spec.y)) },
      };
    case "lineTo":
      return {
        type: "lineTo",
        point: { x: px(requireNumber("lineTo.x", spec.x)), y: px(requireNumber("lineTo.y", spec.y)) },
      };
    case "arcTo":
      return {
        type: "arcTo",
        widthRadius: px(requireNumber("arcTo.widthRadius", spec.widthRadius)),
        heightRadius: px(requireNumber("arcTo.heightRadius", spec.heightRadius)),
        startAngle: deg(requireNumber("arcTo.startAngle", spec.startAngle)),
        swingAngle: deg(requireNumber("arcTo.swingAngle", spec.swingAngle)),
      };
    case "quadBezierTo":
      return {
        type: "quadBezierTo",
        control: {
          x: px(requireNumber("quadBezierTo.control.x", spec.control?.x)),
          y: px(requireNumber("quadBezierTo.control.y", spec.control?.y)),
        },
        end: {
          x: px(requireNumber("quadBezierTo.end.x", spec.end?.x)),
          y: px(requireNumber("quadBezierTo.end.y", spec.end?.y)),
        },
      };
    case "cubicBezierTo":
      return {
        type: "cubicBezierTo",
        control1: {
          x: px(requireNumber("cubicBezierTo.control1.x", spec.control1?.x)),
          y: px(requireNumber("cubicBezierTo.control1.y", spec.control1?.y)),
        },
        control2: {
          x: px(requireNumber("cubicBezierTo.control2.x", spec.control2?.x)),
          y: px(requireNumber("cubicBezierTo.control2.y", spec.control2?.y)),
        },
        end: {
          x: px(requireNumber("cubicBezierTo.end.x", spec.end?.x)),
          y: px(requireNumber("cubicBezierTo.end.y", spec.end?.y)),
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
    width: px(requireNumber("path.width", spec.width)),
    height: px(requireNumber("path.height", spec.height)),
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
