/**
 * @file Motion path animation utilities
 *
 * Provides SVG path parsing and point interpolation for PPTX motion path animations.
 * PPTX motion paths use a subset of SVG path syntax.
 *
 * @see ECMA-376 Part 1, Section 19.5.4 (p:animMotion)
 * @see SVG Path specification: https://www.w3.org/TR/SVG/paths.html
 */

import type { AnimateMotionBehavior, Point } from "@oxen-office/pptx/domain/animation";
import { lerp } from "./engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Path command types
 */
export type PathCommandType = "M" | "L" | "C" | "Q" | "Z" | "m" | "l" | "c" | "q" | "z";

/**
 * Parsed path command
 */
export type PathCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "Z" };

/**
 * Parsed motion path
 */
export type MotionPath = {
  readonly commands: readonly PathCommand[];
  readonly totalLength: number;
  readonly segments: readonly PathSegment[];
};

/**
 * Path segment with cached length
 */
export type PathSegment = {
  readonly command: PathCommand;
  readonly startPoint: Point;
  readonly endPoint: Point;
  readonly length: number;
  readonly cumulativeLength: number;
};

// =============================================================================
// Path Parsing
// =============================================================================

/**
 * Parse an SVG path string into commands.
 *
 * PPTX motion paths typically use:
 * - M (moveto): Starting point
 * - L (lineto): Straight line
 * - C (curveto): Cubic bezier curve
 * - Q (quadratic): Quadratic bezier curve
 * - Z (closepath): Close the path
 *
 * Coordinates in PPTX are typically in 0-1 range (percentage of slide size).
 *
 * @param pathString - SVG path string
 * @returns Array of parsed commands
 */
export function parsePathCommands(pathString: string): PathCommand[] {
  if (!pathString || typeof pathString !== "string") {
    return [];
  }

  const commands: PathCommand[] = [];
  let currentX = 0;
  let currentY = 0;

  // Normalize path string - split on command letters
  const normalized = pathString
    .replace(/,/g, " ")
    .replace(/([MmLlCcQqZz])/g, " $1 ")
    .trim();

  const tokens = normalized.split(/\s+/).filter(Boolean);
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i];
    const isRelative = cmd === cmd.toLowerCase();
    const cmdUpper = cmd.toUpperCase();

    switch (cmdUpper) {
      case "M": {
        i++;
        const x = parseFloat(tokens[i++]) || 0;
        const y = parseFloat(tokens[i++]) || 0;
        const absX = isRelative ? currentX + x : x;
        const absY = isRelative ? currentY + y : y;
        commands.push({ type: "M", x: absX, y: absY });
        currentX = absX;
        currentY = absY;

        // Subsequent coordinate pairs are treated as lineto
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const lx = parseFloat(tokens[i++]) || 0;
          const ly = parseFloat(tokens[i++]) || 0;
          const absLX = isRelative ? currentX + lx : lx;
          const absLY = isRelative ? currentY + ly : ly;
          commands.push({ type: "L", x: absLX, y: absLY });
          currentX = absLX;
          currentY = absLY;
        }
        break;
      }

      case "L": {
        i++;
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x = parseFloat(tokens[i++]) || 0;
          const y = parseFloat(tokens[i++]) || 0;
          const absX = isRelative ? currentX + x : x;
          const absY = isRelative ? currentY + y : y;
          commands.push({ type: "L", x: absX, y: absY });
          currentX = absX;
          currentY = absY;
        }
        break;
      }

      case "C": {
        i++;
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x1 = parseFloat(tokens[i++]) || 0;
          const y1 = parseFloat(tokens[i++]) || 0;
          const x2 = parseFloat(tokens[i++]) || 0;
          const y2 = parseFloat(tokens[i++]) || 0;
          const x = parseFloat(tokens[i++]) || 0;
          const y = parseFloat(tokens[i++]) || 0;

          const absX1 = isRelative ? currentX + x1 : x1;
          const absY1 = isRelative ? currentY + y1 : y1;
          const absX2 = isRelative ? currentX + x2 : x2;
          const absY2 = isRelative ? currentY + y2 : y2;
          const absX = isRelative ? currentX + x : x;
          const absY = isRelative ? currentY + y : y;

          commands.push({
            type: "C",
            x1: absX1,
            y1: absY1,
            x2: absX2,
            y2: absY2,
            x: absX,
            y: absY,
          });
          currentX = absX;
          currentY = absY;
        }
        break;
      }

      case "Q": {
        i++;
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x1 = parseFloat(tokens[i++]) || 0;
          const y1 = parseFloat(tokens[i++]) || 0;
          const x = parseFloat(tokens[i++]) || 0;
          const y = parseFloat(tokens[i++]) || 0;

          const absX1 = isRelative ? currentX + x1 : x1;
          const absY1 = isRelative ? currentY + y1 : y1;
          const absX = isRelative ? currentX + x : x;
          const absY = isRelative ? currentY + y : y;

          commands.push({
            type: "Q",
            x1: absX1,
            y1: absY1,
            x: absX,
            y: absY,
          });
          currentX = absX;
          currentY = absY;
        }
        break;
      }

      case "Z": {
        commands.push({ type: "Z" });
        // Find the last M command to reset position
        for (let j = commands.length - 2; j >= 0; j--) {
          const cmd = commands[j];
          if (cmd.type === "M") {
            currentX = cmd.x;
            currentY = cmd.y;
            break;
          }
        }
        i++;
        break;
      }

      default:
        // Unknown command, skip
        i++;
    }
  }

  return commands;
}

// =============================================================================
// Segment Length Calculation
// =============================================================================

/**
 * Calculate the length of a line segment.
 */
type LineLengthArgs = [x1: number, y1: number, x2: number, y2: number];

function lineLength(...args: LineLengthArgs): number {
  const [x1, y1, x2, y2] = args;
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate approximate length of a cubic bezier curve.
 * Uses subdivision for accuracy.
 */
type CubicBezierLengthArgs = [
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  subdivisions?: number,
];

function cubicBezierLength(...args: CubicBezierLengthArgs): number {
  const [x0, y0, x1, y1, x2, y2, x3, y3, subdivisions = 10] = args;
  let length = 0;
  let prevX = x0;
  let prevY = y0;

  for (let i = 1; i <= subdivisions; i++) {
    const t = i / subdivisions;
    const point = cubicBezierPoint(x0, y0, x1, y1, x2, y2, x3, y3, t);
    length += lineLength(prevX, prevY, point.x, point.y);
    prevX = point.x;
    prevY = point.y;
  }

  return length;
}

/**
 * Calculate approximate length of a quadratic bezier curve.
 */
type QuadraticBezierLengthArgs = [
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  subdivisions?: number,
];

function quadraticBezierLength(...args: QuadraticBezierLengthArgs): number {
  const [x0, y0, x1, y1, x2, y2, subdivisions = 10] = args;
  let length = 0;
  let prevX = x0;
  let prevY = y0;

  for (let i = 1; i <= subdivisions; i++) {
    const t = i / subdivisions;
    const point = quadraticBezierPoint(x0, y0, x1, y1, x2, y2, t);
    length += lineLength(prevX, prevY, point.x, point.y);
    prevX = point.x;
    prevY = point.y;
  }

  return length;
}

// =============================================================================
// Bezier Point Calculation
// =============================================================================

/**
 * Calculate point on cubic bezier curve at parameter t.
 */
type CubicBezierPointArgs = [
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  t: number,
];

function cubicBezierPoint(...args: CubicBezierPointArgs): Point {
  const [x0, y0, x1, y1, x2, y2, x3, y3, t] = args;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
    y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3,
  };
}

/**
 * Calculate point on quadratic bezier curve at parameter t.
 */
type QuadraticBezierPointArgs = [
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  t: number,
];

function quadraticBezierPoint(...args: QuadraticBezierPointArgs): Point {
  const [x0, y0, x1, y1, x2, y2, t] = args;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * x0 + 2 * mt * t * x1 + t2 * x2,
    y: mt2 * y0 + 2 * mt * t * y1 + t2 * y2,
  };
}

// =============================================================================
// Motion Path Processing
// =============================================================================

/**
 * Parse a path string and create a MotionPath with segment information.
 *
 * @param pathString - SVG path string
 * @returns MotionPath with commands, segments, and total length
 */
export function parseMotionPath(pathString: string): MotionPath {
  const commands = parsePathCommands(pathString);

  if (commands.length === 0) {
    return {
      commands: [],
      segments: [],
      totalLength: 0,
    };
  }

  const segments: PathSegment[] = [];
  let currentPoint: Point = { x: 0, y: 0 };
  let cumulativeLength = 0;

  for (const cmd of commands) {
    const startPoint = { ...currentPoint };
    let endPoint: Point;
    let length: number;

    switch (cmd.type) {
      case "M":
        endPoint = { x: cmd.x, y: cmd.y };
        length = 0; // Move doesn't contribute to length
        break;

      case "L":
        endPoint = { x: cmd.x, y: cmd.y };
        length = lineLength(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        break;

      case "C":
        endPoint = { x: cmd.x, y: cmd.y };
        length = cubicBezierLength(
          startPoint.x, startPoint.y,
          cmd.x1, cmd.y1,
          cmd.x2, cmd.y2,
          cmd.x, cmd.y
        );
        break;

      case "Q":
        endPoint = { x: cmd.x, y: cmd.y };
        length = quadraticBezierLength(
          startPoint.x, startPoint.y,
          cmd.x1, cmd.y1,
          cmd.x, cmd.y
        );
        break;

      case "Z":
        // Find starting point (last M command)
        {
          const startCmd = commands.find((c) => c.type === "M");
          endPoint = startCmd ? { x: startCmd.x, y: startCmd.y } : { x: 0, y: 0 };
          length = lineLength(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        }
        break;

      default:
        continue;
    }

    segments.push({
      command: cmd,
      startPoint,
      endPoint,
      length,
      cumulativeLength,
    });

    cumulativeLength += length;
    currentPoint = endPoint;
  }

  return {
    commands,
    segments,
    totalLength: cumulativeLength,
  };
}

/**
 * Get a point along the motion path at a given progress (0-1).
 *
 * @param path - Parsed motion path
 * @param progress - Progress along the path (0-1)
 * @returns Point coordinates
 */
export function getPointAtProgress(path: MotionPath, progress: number): Point {
  if (path.segments.length === 0) {
    return { x: 0, y: 0 };
  }

  // Handle edge cases
  if (progress <= 0) {
    const firstSeg = path.segments[0];
    return firstSeg.startPoint;
  }

  if (progress >= 1) {
    const lastSeg = path.segments[path.segments.length - 1];
    return lastSeg.endPoint;
  }

  // Find target length along path
  const targetLength = progress * path.totalLength;

  // Find the segment containing this point
  let segment: PathSegment | undefined;
  for (const seg of path.segments) {
    if (seg.cumulativeLength + seg.length >= targetLength) {
      segment = seg;
      break;
    }
  }

  if (!segment) {
    segment = path.segments[path.segments.length - 1];
  }

  // Calculate local progress within segment
  const localProgress = getLocalProgress(segment, targetLength);

  // Interpolate based on segment type
  const cmd = segment.command;

  switch (cmd.type) {
    case "M":
      return { x: cmd.x, y: cmd.y };

    case "L":
    case "Z":
      return {
        x: lerp(segment.startPoint.x, segment.endPoint.x, localProgress),
        y: lerp(segment.startPoint.y, segment.endPoint.y, localProgress),
      };

    case "C":
      return cubicBezierPoint(
        segment.startPoint.x, segment.startPoint.y,
        cmd.x1, cmd.y1,
        cmd.x2, cmd.y2,
        cmd.x, cmd.y,
        localProgress
      );

    case "Q":
      return quadraticBezierPoint(
        segment.startPoint.x, segment.startPoint.y,
        cmd.x1, cmd.y1,
        cmd.x, cmd.y,
        localProgress
      );

    default:
      return segment.endPoint;
  }
}

// =============================================================================
// AnimateMotionBehavior Processing
// =============================================================================

/**
 * Create an animation function for motion path animation.
 *
 * @param behavior - AnimateMotionBehavior from timing tree
 * @param element - Target DOM element
 * @param slideWidth - Slide width in pixels
 * @param slideHeight - Slide height in pixels
 * @returns Animation update function (progress: 0-1) => void
 */
export function createMotionPathFunction(
  ...args: [
    behavior: AnimateMotionBehavior,
    element: HTMLElement | SVGElement,
    slideWidth?: number,
    slideHeight?: number,
  ]
): (progress: number) => void {
  const [behavior, element, slideWidth = 960, slideHeight = 540] = args;
  const { path, from, to, by, origin: _origin } = behavior;

  // If we have a path string, use path-based animation
  if (path) {
    const motionPath = parseMotionPath(path);

    if (motionPath.totalLength > 0) {
      // Get initial position for relative animation (if element supports getAttribute)
      const getAttr = (name: string): string => {
        if (typeof element.getAttribute === "function") {
          return element.getAttribute(name) || "0";
        }
        return "0";
      };
      const initialX = parseFloat(getAttr("data-initial-x"));
      const initialY = parseFloat(getAttr("data-initial-y"));

      return (progress: number) => {
        const point = getPointAtProgress(motionPath, progress);

        // PPTX coordinates are 0-1 range, convert to pixels
        const px = point.x * slideWidth;
        const py = point.y * slideHeight;

        // Apply relative to initial position
        const translateX = initialX + px;
        const translateY = initialY + py;

        element.style.transform = `translate(${translateX}px, ${translateY}px)`;
      };
    }
  }

  // Fall back to from/to/by point animation
  const fromPoint = from ?? { x: 0, y: 0 };
  const toPoint = resolveToPoint(fromPoint, to, by);

  return (progress: number) => {
    const x = lerp(fromPoint.x, toPoint.x, progress) * slideWidth;
    const y = lerp(fromPoint.y, toPoint.y, progress) * slideHeight;
    element.style.transform = `translate(${x}px, ${y}px)`;
  };
}

function getLocalProgress(segment: PathSegment, targetLength: number): number {
  if (segment.length <= 0) {
    return 0;
  }
  return (targetLength - segment.cumulativeLength) / segment.length;
}

function resolveToPoint(fromPoint: Point, to?: Point, by?: Point): Point {
  if (to !== undefined) {
    return to;
  }
  if (by !== undefined) {
    return { x: fromPoint.x + by.x, y: fromPoint.y + by.y };
  }
  return fromPoint;
}

/**
 * Convert a motion path to an SVG path string for CSS offset-path.
 * This enables hardware-accelerated path animation in modern browsers.
 *
 * @param path - Parsed motion path
 * @param slideWidth - Slide width in pixels
 * @param slideHeight - Slide height in pixels
 * @returns SVG path string
 */
export function toSVGPathString(
  path: MotionPath,
  slideWidth: number = 960,
  slideHeight: number = 540
): string {
  const parts: string[] = [];

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M ${cmd.x * slideWidth} ${cmd.y * slideHeight}`);
        break;

      case "L":
        parts.push(`L ${cmd.x * slideWidth} ${cmd.y * slideHeight}`);
        break;

      case "C":
        parts.push(
          `C ${cmd.x1 * slideWidth} ${cmd.y1 * slideHeight} ` +
          `${cmd.x2 * slideWidth} ${cmd.y2 * slideHeight} ` +
          `${cmd.x * slideWidth} ${cmd.y * slideHeight}`
        );
        break;

      case "Q":
        parts.push(
          `Q ${cmd.x1 * slideWidth} ${cmd.y1 * slideHeight} ` +
          `${cmd.x * slideWidth} ${cmd.y * slideHeight}`
        );
        break;

      case "Z":
        parts.push("Z");
        break;
    }
  }

  return parts.join(" ");
}
