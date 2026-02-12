/**
 * @file Path command to SVG conversion
 *
 * Converts DrawingML path commands to SVG path data strings.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.15 (a:path)
 */

import type {
  PathCommand,
  ArcToCommand,
  QuadBezierCommand,
  CubicBezierCommand,
  GeometryPath,
} from "@aurochs-office/drawing-ml/domain/geometry";
import { px } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Path Command Rendering
// =============================================================================

/**
 * Convert path command to SVG path data
 */
export function commandToPath(command: PathCommand): string {
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
 * Scale a path command's coordinates from path space to shape space.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.15 (a:path)
 */
export function scaleCommand(command: PathCommand, scaleX: number, scaleY: number): PathCommand {
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
