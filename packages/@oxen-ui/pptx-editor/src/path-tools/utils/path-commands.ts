/**
 * @file Path command conversion utilities
 *
 * Converts between DrawingPath (for editing) and PathCommand[] (for storage).
 */

import type { Point, PathCommand, GeometryPath, CustomGeometry, Geometry } from "@oxen/pptx/domain";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { Bounds } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";
import type { DrawingPath, PathAnchorPoint } from "../types";

// =============================================================================
// Drawing Path to Path Commands
// =============================================================================

/**
 * Convert a DrawingPath to PathCommand array for CustomGeometry
 *
 * @param path - The drawing path to convert
 * @returns Array of path commands
 */
export function drawingPathToCommands(path: DrawingPath): readonly PathCommand[] {
  const { points, isClosed } = path;
  if (points.length === 0) {
    return [];
  }

  const commands: PathCommand[] = [];

  // Start with moveTo
  commands.push({
    type: "moveTo",
    point: { x: points[0].x, y: points[0].y },
  });

  // Add segments between points
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    commands.push(createSegmentCommand(prev, curr));
  }

  // Handle closing
  if (isClosed && points.length > 1) {
    const last = points[points.length - 1];
    const first = points[0];

    // Add segment back to first point if needed
    const closingCommand = createSegmentCommand(last, first);
    if (closingCommand.type === "cubicBezierTo") {
      // Only add the closing bezier if it's not a simple close
      commands.push(closingCommand);
    }
    commands.push({ type: "close" });
  }

  return commands;
}

/**
 * Create a segment command between two anchor points
 */
function createSegmentCommand(from: PathAnchorPoint, to: PathAnchorPoint): PathCommand {
  // If either point has handles, use cubic bezier
  if (from.handleOut || to.handleIn) {
    return {
      type: "cubicBezierTo",
      control1: from.handleOut ?? { x: from.x, y: from.y },
      control2: to.handleIn ?? { x: to.x, y: to.y },
      end: { x: to.x, y: to.y },
    };
  }

  // Otherwise, straight line
  return {
    type: "lineTo",
    point: { x: to.x, y: to.y },
  };
}

// =============================================================================
// Path Commands to Drawing Path
// =============================================================================

/**
 * Convert PathCommand array back to DrawingPath for editing
 *
 * @param commands - The path commands to convert
 * @returns Drawing path suitable for editing
 */
export function commandsToDrawingPath(commands: readonly PathCommand[]): DrawingPath {
  if (commands.length === 0) {
    return { points: [], isClosed: false };
  }

  const points: PathAnchorPoint[] = [];
  let currentX: Pixels = px(0);
  let currentY: Pixels = px(0);
  let isClosed = false;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    switch (cmd.type) {
      case "moveTo": {
        // Start a new point
        currentX = cmd.point.x;
        currentY = cmd.point.y;
        points.push({
          x: currentX,
          y: currentY,
          type: "corner",
          handleIn: undefined,
          handleOut: undefined,
        });
        break;
      }

      case "lineTo": {
        // Add a corner point
        currentX = cmd.point.x;
        currentY = cmd.point.y;
        points.push({
          x: currentX,
          y: currentY,
          type: "corner",
          handleIn: undefined,
          handleOut: undefined,
        });
        break;
      }

      case "cubicBezierTo": {
        // Update the previous point's handleOut
        if (points.length > 0) {
          const prevIndex = points.length - 1;
          points[prevIndex] = {
            ...points[prevIndex],
            handleOut: cmd.control1,
          };
        }

        // Add a new point with handleIn
        currentX = cmd.end.x;
        currentY = cmd.end.y;
        const isSmoothPoint = isSmooth(
          cmd.control2,
          { x: currentX, y: currentY },
          commands[i + 1]
        );

        points.push({
          x: currentX,
          y: currentY,
          type: isSmoothPoint ? "smooth" : "corner",
          handleIn: cmd.control2,
          handleOut: undefined,
        });
        break;
      }

      case "quadBezierTo": {
        // Convert quadratic to cubic approximation
        const prevX = currentX;
        const prevY = currentY;
        const ctrl1: Point = {
          x: px((prevX as number) + (2 / 3) * ((cmd.control.x as number) - (prevX as number))),
          y: px((prevY as number) + (2 / 3) * ((cmd.control.y as number) - (prevY as number))),
        };
        const ctrl2: Point = {
          x: px((cmd.end.x as number) + (2 / 3) * ((cmd.control.x as number) - (cmd.end.x as number))),
          y: px((cmd.end.y as number) + (2 / 3) * ((cmd.control.y as number) - (cmd.end.y as number))),
        };

        // Update previous point's handleOut
        if (points.length > 0) {
          const prevIndex = points.length - 1;
          points[prevIndex] = {
            ...points[prevIndex],
            handleOut: ctrl1,
          };
        }

        currentX = cmd.end.x;
        currentY = cmd.end.y;
        points.push({
          x: currentX,
          y: currentY,
          type: "corner",
          handleIn: ctrl2,
          handleOut: undefined,
        });
        break;
      }

      case "arcTo": {
        // Arc commands are complex - we'll approximate with the current position
        // A full implementation would convert arcs to bezier curves
        // For now, we just note the arc parameters but keep the endpoint
        // This is a simplification that loses arc information
        break;
      }

      case "close": {
        isClosed = true;
        // If we have points, we might need to connect handles at the close
        if (points.length > 1) {
          // Check if the path was closed with a bezier back to start
          const lastCmd = commands[i - 1];
          if (lastCmd && lastCmd.type === "cubicBezierTo") {
            // The first point might need handleIn from the closing bezier
            points[0] = {
              ...points[0],
              handleIn: lastCmd.control2,
              type: isSmooth(lastCmd.control2, { x: points[0].x, y: points[0].y }, commands[1])
                ? "smooth"
                : points[0].type,
            };
          }
        }
        break;
      }
    }
  }

  return { points, isClosed };
}

/**
 * Check if a point should be considered smooth based on handle alignment
 */
function isSmooth(
  handleIn: Point | undefined,
  anchor: Point,
  nextCmd: PathCommand | undefined
): boolean {
  if (!handleIn || !nextCmd) {
    return false;
  }

  let handleOut: Point | undefined;
  if (nextCmd.type === "cubicBezierTo") {
    handleOut = nextCmd.control1;
  } else if (nextCmd.type === "lineTo" || nextCmd.type === "moveTo") {
    return false;
  }

  if (!handleOut) {
    return false;
  }

  // Check if handles are roughly collinear (within 10 degrees)
  const inAngle = Math.atan2(
    (anchor.y as number) - (handleIn.y as number),
    (anchor.x as number) - (handleIn.x as number)
  );
  const outAngle = Math.atan2(
    (handleOut.y as number) - (anchor.y as number),
    (handleOut.x as number) - (anchor.x as number)
  );

  const angleDiff = Math.abs(inAngle - outAngle);
  const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

  return normalizedDiff < Math.PI / 18; // 10 degrees tolerance
}

// =============================================================================
// Path Bounds Calculation
// =============================================================================

/**
 * Calculate the bounding box of a drawing path
 *
 * @param path - The drawing path
 * @returns Bounding box
 */
export function calculatePathBounds(path: DrawingPath): Bounds {
  if (path.points.length === 0) {
    return { x: px(0), y: px(0), width: px(0), height: px(0) };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of path.points) {
    // Include anchor point
    minX = Math.min(minX, point.x as number);
    minY = Math.min(minY, point.y as number);
    maxX = Math.max(maxX, point.x as number);
    maxY = Math.max(maxY, point.y as number);

    // Include handles
    if (point.handleIn) {
      minX = Math.min(minX, point.handleIn.x as number);
      minY = Math.min(minY, point.handleIn.y as number);
      maxX = Math.max(maxX, point.handleIn.x as number);
      maxY = Math.max(maxY, point.handleIn.y as number);
    }
    if (point.handleOut) {
      minX = Math.min(minX, point.handleOut.x as number);
      minY = Math.min(minY, point.handleOut.y as number);
      maxX = Math.max(maxX, point.handleOut.x as number);
      maxY = Math.max(maxY, point.handleOut.y as number);
    }
  }

  return {
    x: px(minX),
    y: px(minY),
    width: px(maxX - minX),
    height: px(maxY - minY),
  };
}

/**
 * Create a GeometryPath from a DrawingPath
 *
 * @param path - The drawing path
 * @param width - Target width for the path coordinate system
 * @param height - Target height for the path coordinate system
 * @returns GeometryPath for CustomGeometry
 */
export function createGeometryPath(
  path: DrawingPath,
  width: Pixels,
  height: Pixels
): GeometryPath {
  return {
    width,
    height,
    fill: path.isClosed ? "norm" : "none",
    stroke: true,
    extrusionOk: false,
    commands: drawingPathToCommands(path),
  };
}

// =============================================================================
// Custom Geometry Utilities
// =============================================================================

/**
 * Check if a geometry is a custom geometry (editable path)
 */
export function isCustomGeometry(geometry: Geometry | undefined): geometry is CustomGeometry {
  return geometry !== undefined && geometry.type === "custom";
}

/**
 * Convert a CustomGeometry to DrawingPath for editing
 *
 * Note: This only converts the first path in the geometry.
 * Multi-path geometries are not fully supported for editing yet.
 *
 * @param geometry - The custom geometry to convert
 * @param shapeWidth - The shape's actual width (for coordinate scaling)
 * @param shapeHeight - The shape's actual height (for coordinate scaling)
 * @returns Drawing path suitable for editing, or undefined if not editable
 */
export function customGeometryToDrawingPath(
  geometry: CustomGeometry,
  shapeWidth: number,
  shapeHeight: number
): DrawingPath | undefined {
  if (geometry.paths.length === 0) {
    return undefined;
  }

  // Get the first path (most common case)
  const geoPath = geometry.paths[0];

  // Scale factor from path coordinate space to shape space
  const scaleX = geoPath.width > 0 ? shapeWidth / (geoPath.width as number) : 1;
  const scaleY = geoPath.height > 0 ? shapeHeight / (geoPath.height as number) : 1;

  // Scale the commands
  const scaledCommands = geoPath.commands.map((cmd) =>
    scaleCommand(cmd, scaleX, scaleY)
  );

  // Convert to drawing path
  return commandsToDrawingPath(scaledCommands);
}

/**
 * Convert a DrawingPath back to CustomGeometry
 *
 * @param path - The drawing path
 * @param offsetX - X offset of the shape (from bounds)
 * @param offsetY - Y offset of the shape (from bounds)
 * @returns CustomGeometry ready for the shape
 */
export function drawingPathToCustomGeometry(
  path: DrawingPath,
  offsetX: number = 0,
  offsetY: number = 0
): { geometry: CustomGeometry; bounds: Bounds } {
  // Calculate bounds from the path
  const rawBounds = calculatePathBounds(path);

  // Translate points to be relative to the bounding box origin
  const translatedPoints = path.points.map((point) => ({
    ...point,
    x: px((point.x as number) - (rawBounds.x as number)),
    y: px((point.y as number) - (rawBounds.y as number)),
    handleIn: point.handleIn
      ? {
          x: px((point.handleIn.x as number) - (rawBounds.x as number)),
          y: px((point.handleIn.y as number) - (rawBounds.y as number)),
        }
      : undefined,
    handleOut: point.handleOut
      ? {
          x: px((point.handleOut.x as number) - (rawBounds.x as number)),
          y: px((point.handleOut.y as number) - (rawBounds.y as number)),
        }
      : undefined,
  }));

  const translatedPath: DrawingPath = {
    points: translatedPoints,
    isClosed: path.isClosed,
  };

  const width = Math.max(rawBounds.width as number, 10);
  const height = Math.max(rawBounds.height as number, 10);

  const geometry: CustomGeometry = {
    type: "custom",
    paths: [
      {
        width: px(width),
        height: px(height),
        fill: path.isClosed ? "norm" : "none",
        stroke: true,
        extrusionOk: false,
        commands: drawingPathToCommands(translatedPath),
      },
    ],
  };

  const bounds: Bounds = {
    x: px((rawBounds.x as number) + offsetX),
    y: px((rawBounds.y as number) + offsetY),
    width: px(width),
    height: px(height),
  };

  return { geometry, bounds };
}

/**
 * Scale a path command by given factors
 */
function scaleCommand(cmd: PathCommand, scaleX: number, scaleY: number): PathCommand {
  switch (cmd.type) {
    case "moveTo":
      return {
        type: "moveTo",
        point: {
          x: px((cmd.point.x as number) * scaleX),
          y: px((cmd.point.y as number) * scaleY),
        },
      };
    case "lineTo":
      return {
        type: "lineTo",
        point: {
          x: px((cmd.point.x as number) * scaleX),
          y: px((cmd.point.y as number) * scaleY),
        },
      };
    case "cubicBezierTo":
      return {
        type: "cubicBezierTo",
        control1: {
          x: px((cmd.control1.x as number) * scaleX),
          y: px((cmd.control1.y as number) * scaleY),
        },
        control2: {
          x: px((cmd.control2.x as number) * scaleX),
          y: px((cmd.control2.y as number) * scaleY),
        },
        end: {
          x: px((cmd.end.x as number) * scaleX),
          y: px((cmd.end.y as number) * scaleY),
        },
      };
    case "quadBezierTo":
      return {
        type: "quadBezierTo",
        control: {
          x: px((cmd.control.x as number) * scaleX),
          y: px((cmd.control.y as number) * scaleY),
        },
        end: {
          x: px((cmd.end.x as number) * scaleX),
          y: px((cmd.end.y as number) * scaleY),
        },
      };
    case "arcTo":
      return {
        type: "arcTo",
        widthRadius: px((cmd.widthRadius as number) * scaleX),
        heightRadius: px((cmd.heightRadius as number) * scaleY),
        startAngle: cmd.startAngle,
        swingAngle: cmd.swingAngle,
      };
    case "close":
      return { type: "close" };
  }
}
