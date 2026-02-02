/**
 * @file PPTX path adapters
 *
 * Converts between generic DrawingPath and PPTX-specific PathCommand/CustomGeometry.
 * This module bridges the generic @oxen-ui/path-tools types with PPTX domain types.
 */

import type { Point, PathCommand, GeometryPath, CustomGeometry, Geometry } from "@oxen-office/pptx/domain";
import type { Bounds, ShapeId } from "@oxen-office/pptx/domain/types";
import { px } from "@oxen-office/drawing-ml/domain/units";
import type { Pixels } from "@oxen-office/drawing-ml/domain/units";
import type {
  DrawingPath as GenericDrawingPath,
  PathAnchorPoint as GenericPathAnchorPoint,
  Point as GenericPoint,
  Bounds as GenericBounds,
} from "@oxen-ui/path-tools";

// =============================================================================
// PPTX-specific DrawingPath Types (with branded Pixels)
// =============================================================================

/**
 * PPTX-specific anchor point with branded Pixels coordinates
 */
export type PptxPathAnchorPoint = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly type: "smooth" | "corner";
  readonly handleIn?: Point;
  readonly handleOut?: Point;
};

/**
 * PPTX-specific drawing path with branded Pixels coordinates
 */
export type PptxDrawingPath = {
  readonly points: readonly PptxPathAnchorPoint[];
  readonly isClosed: boolean;
};

// =============================================================================
// Type Conversion: Generic <-> PPTX
// =============================================================================

/**
 * Convert generic DrawingPath (from @oxen-ui/path-tools) to PPTX DrawingPath (with Pixels)
 */
export function toPixelsPath(path: GenericDrawingPath): PptxDrawingPath {
  return {
    ...path,
    points: path.points.map((point) => ({
      x: px(point.x),
      y: px(point.y),
      type: point.type,
      handleIn: point.handleIn ? { x: px(point.handleIn.x), y: px(point.handleIn.y) } : undefined,
      handleOut: point.handleOut ? { x: px(point.handleOut.x), y: px(point.handleOut.y) } : undefined,
    })),
  };
}

/**
 * Convert PPTX DrawingPath (with Pixels) to generic DrawingPath (with numbers)
 */
export function fromPixelsPath(path: PptxDrawingPath): GenericDrawingPath {
  return {
    ...path,
    points: path.points.map((point) => ({
      x: point.x as number,
      y: point.y as number,
      type: point.type,
      handleIn: point.handleIn ? { x: point.handleIn.x as number, y: point.handleIn.y as number } : undefined,
      handleOut: point.handleOut ? { x: point.handleOut.x as number, y: point.handleOut.y as number } : undefined,
    })),
  };
}

// =============================================================================
// Drawing Path to Path Commands
// =============================================================================

/**
 * Convert a DrawingPath to PathCommand array for CustomGeometry
 *
 * @param path - The drawing path to convert (generic or PPTX)
 * @returns Array of path commands
 */
export function drawingPathToCommands(path: GenericDrawingPath | PptxDrawingPath): readonly PathCommand[] {
  const { points, isClosed } = path;
  if (points.length === 0) {
    return [];
  }

  const commands: PathCommand[] = [];

  // Start with moveTo
  commands.push({
    type: "moveTo",
    point: { x: px(points[0].x as number), y: px(points[0].y as number) },
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
function createSegmentCommand(
  from: GenericPathAnchorPoint | PptxPathAnchorPoint,
  to: GenericPathAnchorPoint | PptxPathAnchorPoint
): PathCommand {
  // If either point has handles, use cubic bezier
  if (from.handleOut || to.handleIn) {
    return {
      type: "cubicBezierTo",
      control1: from.handleOut
        ? { x: px(from.handleOut.x as number), y: px(from.handleOut.y as number) }
        : { x: px(from.x as number), y: px(from.y as number) },
      control2: to.handleIn
        ? { x: px(to.handleIn.x as number), y: px(to.handleIn.y as number) }
        : { x: px(to.x as number), y: px(to.y as number) },
      end: { x: px(to.x as number), y: px(to.y as number) },
    };
  }

  // Otherwise, straight line
  return {
    type: "lineTo",
    point: { x: px(to.x as number), y: px(to.y as number) },
  };
}

// =============================================================================
// Path Commands to Drawing Path
// =============================================================================

/**
 * Convert PathCommand array back to DrawingPath for editing
 *
 * @param commands - The path commands to convert
 * @returns Drawing path suitable for editing (generic number-based)
 */
export function commandsToDrawingPath(commands: readonly PathCommand[]): GenericDrawingPath {
  if (commands.length === 0) {
    return { points: [], isClosed: false };
  }

  const points: GenericPathAnchorPoint[] = [];
  // eslint-disable-next-line no-restricted-syntax -- tracking current position through commands
  let currentX = 0;
  // eslint-disable-next-line no-restricted-syntax -- tracking current position through commands
  let currentY = 0;
  // eslint-disable-next-line no-restricted-syntax -- tracking closed state
  let isClosed = false;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    switch (cmd.type) {
      case "moveTo": {
        // Start a new point
        currentX = cmd.point.x as number;
        currentY = cmd.point.y as number;
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
        currentX = cmd.point.x as number;
        currentY = cmd.point.y as number;
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
            handleOut: { x: cmd.control1.x as number, y: cmd.control1.y as number },
          };
        }

        // Add a new point with handleIn
        currentX = cmd.end.x as number;
        currentY = cmd.end.y as number;
        const isSmoothPoint = isSmooth(
          { x: cmd.control2.x as number, y: cmd.control2.y as number },
          { x: currentX, y: currentY },
          commands[i + 1]
        );

        points.push({
          x: currentX,
          y: currentY,
          type: isSmoothPoint ? "smooth" : "corner",
          handleIn: { x: cmd.control2.x as number, y: cmd.control2.y as number },
          handleOut: undefined,
        });
        break;
      }

      case "quadBezierTo": {
        // Convert quadratic to cubic approximation
        const prevX = currentX;
        const prevY = currentY;
        const ctrl1: GenericPoint = {
          x: prevX + (2 / 3) * ((cmd.control.x as number) - prevX),
          y: prevY + (2 / 3) * ((cmd.control.y as number) - prevY),
        };
        const ctrl2: GenericPoint = {
          x: (cmd.end.x as number) + (2 / 3) * ((cmd.control.x as number) - (cmd.end.x as number)),
          y: (cmd.end.y as number) + (2 / 3) * ((cmd.control.y as number) - (cmd.end.y as number)),
        };

        // Update previous point's handleOut
        if (points.length > 0) {
          const prevIndex = points.length - 1;
          points[prevIndex] = {
            ...points[prevIndex],
            handleOut: ctrl1,
          };
        }

        currentX = cmd.end.x as number;
        currentY = cmd.end.y as number;
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
            const shouldBeSmooth = isSmooth(
              { x: lastCmd.control2.x as number, y: lastCmd.control2.y as number },
              { x: points[0].x, y: points[0].y },
              commands[1]
            );
            const smoothType = shouldBeSmooth ? "smooth" : points[0].type;
            points[0] = {
              ...points[0],
              handleIn: { x: lastCmd.control2.x as number, y: lastCmd.control2.y as number },
              type: smoothType,
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
  handleIn: GenericPoint | undefined,
  anchor: GenericPoint,
  nextCmd: PathCommand | undefined
): boolean {
  if (!handleIn || !nextCmd) {
    return false;
  }

  // eslint-disable-next-line no-restricted-syntax -- computed from next command
  let handleOut: GenericPoint | undefined;
  if (nextCmd.type === "cubicBezierTo") {
    handleOut = { x: nextCmd.control1.x as number, y: nextCmd.control1.y as number };
  } else if (nextCmd.type === "lineTo" || nextCmd.type === "moveTo") {
    return false;
  }

  if (!handleOut) {
    return false;
  }

  // Check if handles are roughly collinear (within 10 degrees)
  const inAngle = Math.atan2(anchor.y - handleIn.y, anchor.x - handleIn.x);
  const outAngle = Math.atan2(handleOut.y - anchor.y, handleOut.x - anchor.x);

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
 * @returns Bounding box with Pixels
 */
export function calculatePathBounds(path: GenericDrawingPath | PptxDrawingPath): Bounds {
  if (path.points.length === 0) {
    return { x: px(0), y: px(0), width: px(0), height: px(0) };
  }

  // eslint-disable-next-line no-restricted-syntax -- tracking bounds
  let minX = Number.POSITIVE_INFINITY;
  // eslint-disable-next-line no-restricted-syntax -- tracking bounds
  let minY = Number.POSITIVE_INFINITY;
  // eslint-disable-next-line no-restricted-syntax -- tracking bounds
  let maxX = Number.NEGATIVE_INFINITY;
  // eslint-disable-next-line no-restricted-syntax -- tracking bounds
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
  path: GenericDrawingPath | PptxDrawingPath,
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
): GenericDrawingPath | undefined {
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
  path: GenericDrawingPath | PptxDrawingPath,
  offsetX: number = 0,
  offsetY: number = 0
): { geometry: CustomGeometry; bounds: Bounds } {
  // Calculate bounds from the path
  const rawBounds = calculatePathBounds(path);

  function translatePoint(p: GenericPoint | Point): Point {
    return {
      x: px((p.x as number) - (rawBounds.x as number)),
      y: px((p.y as number) - (rawBounds.y as number)),
    };
  }

  function translateOptionalHandle(handle: GenericPoint | Point | undefined): Point | undefined {
    if (!handle) {
      return undefined;
    }
    return translatePoint(handle);
  }

  // Translate points to be relative to the bounding box origin
  const translatedPoints = path.points.map((point) => ({
    ...point,
    x: px((point.x as number) - (rawBounds.x as number)),
    y: px((point.y as number) - (rawBounds.y as number)),
    handleIn: translateOptionalHandle(point.handleIn),
    handleOut: translateOptionalHandle(point.handleOut),
  }));

  const translatedPath: PptxDrawingPath = {
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

// =============================================================================
// Path Element Selection Types (PPTX-specific, uses ShapeId)
// =============================================================================

/**
 * Selectable path element types
 */
export type PathElementType =
  | "anchor" // Main anchor point
  | "handleIn" // Incoming bezier handle
  | "handleOut"; // Outgoing bezier handle

/**
 * Unique identifier for a path element
 */
export type PathElementId = {
  /** Shape containing the path */
  readonly shapeId: ShapeId;
  /** Which path in CustomGeometry.paths */
  readonly pathIndex: number;
  /** Which point in the path (command index for anchors) */
  readonly pointIndex: number;
  /** Type of element */
  readonly elementType: PathElementType;
};

/**
 * Path point selection state
 */
export type PathPointSelection = {
  /** Selected element IDs */
  readonly selectedElements: readonly PathElementId[];
  /** Primary selected element (for single-element operations) */
  readonly primaryElement: PathElementId | undefined;
};

/**
 * Create empty path point selection
 */
export function createEmptyPathSelection(): PathPointSelection {
  return {
    selectedElements: [],
    primaryElement: undefined,
  };
}

/**
 * Check if a path element is selected
 */
export function isPathElementSelected(
  selection: PathPointSelection,
  element: PathElementId
): boolean {
  return selection.selectedElements.some((e) => pathElementIdsEqual(e, element));
}

/**
 * Add a point to selection (without toggle)
 */
export function addPointToSelection(
  selection: PathPointSelection,
  element: PathElementId
): PathPointSelection {
  if (isPathElementSelected(selection, element)) {
    return selection;
  }
  return {
    selectedElements: [...selection.selectedElements, element],
    primaryElement: selection.primaryElement ?? element,
  };
}

/**
 * Toggle a point in selection
 */
export function togglePointInSelection(
  selection: PathPointSelection,
  element: PathElementId
): PathPointSelection {
  if (isPathElementSelected(selection, element)) {
    // Remove from selection
    const filtered = selection.selectedElements.filter(
      (e) => !pathElementIdsEqual(e, element)
    );
    const shouldRemovePrimary = selection.primaryElement && pathElementIdsEqual(selection.primaryElement, element);
    const primaryElement = shouldRemovePrimary ? filtered[0] : selection.primaryElement;
    return {
      selectedElements: filtered,
      primaryElement,
    };
  }
  // Add to selection
  return addPointToSelection(selection, element);
}

/**
 * Create a path element ID string for use as map keys
 */
export function pathElementIdToString(id: PathElementId): string {
  return `${id.shapeId}:${id.pathIndex}:${id.pointIndex}:${id.elementType}`;
}

/**
 * Check if two path element IDs are equal
 */
export function pathElementIdsEqual(
  a: PathElementId,
  b: PathElementId
): boolean {
  return (
    a.shapeId === b.shapeId &&
    a.pathIndex === b.pathIndex &&
    a.pointIndex === b.pointIndex &&
    a.elementType === b.elementType
  );
}
