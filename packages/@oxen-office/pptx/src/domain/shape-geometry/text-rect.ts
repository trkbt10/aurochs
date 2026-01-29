/**
 * @file Text Rectangle Calculator
 *
 * Calculates the text bounding box within custom geometry shapes.
 * Uses the guide engine to resolve formula-based coordinates.
 *
 * The text rectangle defines where text can be placed within a shape.
 * For custom geometry, this may be a subset of the shape bounds,
 * or it may extend outside the visible geometry.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.22 (rect - Shape Text Rectangle)
 */

import type { Geometry, TextRect } from "../shape";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { px } from "@oxen-office/ooxml/domain/units";
import {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  type GuideContext,
} from "./guide-engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved text rectangle with actual pixel coordinates.
 *
 * Represents the bounding box where text can be placed within a shape.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.22
 */
export type ResolvedTextRect = {
  /** Left edge X coordinate in pixels */
  readonly left: Pixels;
  /** Top edge Y coordinate in pixels */
  readonly top: Pixels;
  /** Right edge X coordinate in pixels */
  readonly right: Pixels;
  /** Bottom edge Y coordinate in pixels */
  readonly bottom: Pixels;
  /** Width of text area (right - left) */
  readonly width: Pixels;
  /** Height of text area (bottom - top) */
  readonly height: Pixels;
};

// =============================================================================
// Resolution Functions
// =============================================================================

/**
 * Resolve a text rectangle coordinate value.
 *
 * The l, t, r, b attributes of a:rect can be:
 * - ST_Coordinate: A direct numeric value (in EMU or shape coordinate units)
 * - ST_GeomGuideName: A reference to a guide (e.g., "g1", "hc", "w")
 *
 * @param value - Coordinate string (number or guide reference)
 * @param context - Guide context for resolution
 * @returns Resolved numeric value
 *
 * @see ECMA-376 Part 1, Section 20.1.10.2 (ST_AdjCoordinate)
 */
function resolveCoordinate(value: string, context: GuideContext): number {
  // Try to parse as a number first
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    return numValue;
  }

  // It's a guide reference - evaluate using guide engine
  return evaluateExpression(value, context);
}

/**
 * Calculate the default text rectangle for a shape.
 *
 * When no explicit text rectangle is specified, text fills
 * the entire shape bounding box.
 *
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @returns Default text rectangle (full shape bounds)
 *
 * @see ECMA-376 Part 1, Section 20.1.9.22
 */
function getDefaultTextRect(width: number, height: number): ResolvedTextRect {
  return {
    left: px(0),
    top: px(0),
    right: px(width),
    bottom: px(height),
    width: px(width),
    height: px(height),
  };
}

/**
 * Resolve a TextRect using the guide engine.
 *
 * The text rectangle coordinates may reference guides defined
 * in the custom geometry, allowing dynamic text positioning.
 *
 * @param textRect - Text rectangle with string coordinates
 * @param context - Guide context with evaluated guides
 * @returns Resolved text rectangle with pixel coordinates
 *
 * @see ECMA-376 Part 1, Section 20.1.9.22
 */
function resolveTextRect(
  textRect: TextRect,
  context: GuideContext,
): ResolvedTextRect {
  // Resolve each coordinate
  const left = resolveCoordinate(textRect.left, context);
  const top = resolveCoordinate(textRect.top, context);
  const right = resolveCoordinate(textRect.right, context);
  const bottom = resolveCoordinate(textRect.bottom, context);

  // Calculate dimensions
  const rectWidth = Math.max(0, right - left);
  const rectHeight = Math.max(0, bottom - top);

  return {
    left: px(left),
    top: px(top),
    right: px(right),
    bottom: px(bottom),
    width: px(rectWidth),
    height: px(rectHeight),
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Calculate the text rectangle for a geometry.
 *
 * For preset geometry, the text rectangle is typically the full shape bounds.
 * For custom geometry, a specific text rectangle may be defined that
 * constrains where text can be placed.
 *
 * Per ECMA-376 Part 1, Section 20.1.9.22:
 * - The rect element specifies the text bounding box
 * - Coordinates can be literals or guide references
 * - If not specified, text uses the full shape bounds
 *
 * @param geometry - Shape geometry (preset or custom)
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @returns Resolved text rectangle
 *
 * @see ECMA-376 Part 1, Section 20.1.9.22 (a:rect)
 */
export function calculateTextRect(
  geometry: Geometry | undefined,
  width: number,
  height: number,
): ResolvedTextRect {
  // No geometry - use full bounds
  if (!geometry) {
    return getDefaultTextRect(width, height);
  }

  // Preset geometry - use full bounds (preset shapes have implicit text rects)
  if (geometry.type === "preset") {
    // For certain preset shapes, we could apply specific text insets
    // For now, use full bounds as default
    return getPresetTextRect(geometry.preset, width, height);
  }

  // Custom geometry without explicit text rect - use full bounds
  if (!geometry.textRect) {
    return getDefaultTextRect(width, height);
  }

  // Custom geometry with text rect - resolve using guides
  const context = createGuideContext(width, height, geometry.adjustValues ?? []);
  evaluateGuides(geometry.guides ?? [], context);

  return resolveTextRect(geometry.textRect, context);
}

/**
 * Get the text rectangle for preset shapes.
 *
 * Many preset shapes have specific text placement rules.
 * This function provides appropriate text rectangles based
 * on the shape type.
 *
 * @param preset - Preset shape type name
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @returns Text rectangle for the preset shape
 *
 * @see ECMA-376 Part 1, Section 20.1.9.18 (prstGeom)
 */
function getPresetTextRect(
  preset: string,
  width: number,
  height: number,
): ResolvedTextRect {
  // Most preset shapes use full bounds for text
  // Some shapes have specific text insets for better appearance

  switch (preset) {
    // Callout shapes - text in the main body, not the callout pointer
    case "wedgeRectCallout":
    case "wedgeRoundRectCallout":
    case "wedgeEllipseCallout":
    case "cloudCallout":
      // Keep text away from the callout pointer area
      return {
        left: px(width * 0.1),
        top: px(height * 0.1),
        right: px(width * 0.9),
        bottom: px(height * 0.7),
        width: px(width * 0.8),
        height: px(height * 0.6),
      };

    // Arrow shapes - text in the main body
    case "rightArrow":
    case "leftArrow":
    case "downArrow":
      return {
        left: px(width * 0.15),
        top: px(height * 0.25),
        right: px(width * 0.7),
        bottom: px(height * 0.75),
        width: px(width * 0.55),
        height: px(height * 0.5),
      };

    // Block arrows - larger text area
    case "chevron":
    case "homePlate":
    case "pentagon":
      return {
        left: px(width * 0.1),
        top: px(height * 0.2),
        right: px(width * 0.9),
        bottom: px(height * 0.8),
        width: px(width * 0.8),
        height: px(height * 0.6),
      };

    // Triangles - text in the center
    case "triangle":
    case "rtTriangle":
      return {
        left: px(width * 0.2),
        top: px(height * 0.35),
        right: px(width * 0.8),
        bottom: px(height * 0.85),
        width: px(width * 0.6),
        height: px(height * 0.5),
      };

    // Stars - text in the inner area
    case "star4":
    case "star5":
    case "star6":
    case "star8":
    case "star10":
    case "star12":
    case "star16":
    case "star24":
    case "star32": {
      const starInset = 0.25;
      return {
        left: px(width * starInset),
        top: px(height * starInset),
        right: px(width * (1 - starInset)),
        bottom: px(height * (1 - starInset)),
        width: px(width * (1 - 2 * starInset)),
        height: px(height * (1 - 2 * starInset)),
      };
    }

    // Ribbons - text in the flat portion
    case "ribbon":
    case "ribbon2":
    case "ellipseRibbon":
    case "ellipseRibbon2":
      return {
        left: px(width * 0.15),
        top: px(height * 0.2),
        right: px(width * 0.85),
        bottom: px(height * 0.8),
        width: px(width * 0.7),
        height: px(height * 0.6),
      };

    // Frame shapes - text in the inner frame
    case "frame":
    case "halfFrame":
      return {
        left: px(width * 0.15),
        top: px(height * 0.15),
        right: px(width * 0.85),
        bottom: px(height * 0.85),
        width: px(width * 0.7),
        height: px(height * 0.7),
      };

    // Donut/ring - text in the center
    case "donut": {
      const donutInset = 0.3;
      return {
        left: px(width * donutInset),
        top: px(height * donutInset),
        right: px(width * (1 - donutInset)),
        bottom: px(height * (1 - donutInset)),
        width: px(width * (1 - 2 * donutInset)),
        height: px(height * (1 - 2 * donutInset)),
      };
    }

    // Cylinders (can) - text in the middle section
    case "can":
      return {
        left: px(width * 0.1),
        top: px(height * 0.2),
        right: px(width * 0.9),
        bottom: px(height * 0.8),
        width: px(width * 0.8),
        height: px(height * 0.6),
      };

    // Default - use full bounds
    default:
      return getDefaultTextRect(width, height);
  }
}

/**
 * Check if a point is inside the text rectangle.
 *
 * @param textRect - Text rectangle
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if point is inside the text area
 */
export function isInsideTextRect(
  textRect: ResolvedTextRect,
  x: number,
  y: number,
): boolean {
  return (
    x >= textRect.left &&
    x <= textRect.right &&
    y >= textRect.top &&
    y <= textRect.bottom
  );
}

/**
 * Calculate the available text dimensions after applying insets.
 *
 * @param textRect - Text rectangle
 * @param lIns - Left inset in pixels
 * @param rIns - Right inset in pixels
 * @param tIns - Top inset in pixels
 * @param bIns - Bottom inset in pixels
 * @returns Available text dimensions after insets
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (bodyPr insets)
 */
export type ApplyTextInsetsOptions = {
  readonly textRect: ResolvedTextRect;
  readonly lIns?: number;
  readonly rIns?: number;
  readonly tIns?: number;
  readonly bIns?: number;
};






export function applyTextInsets(
  {
    textRect,
    lIns = 0,
    rIns = 0,
    tIns = 0,
    bIns = 0,
  }: ApplyTextInsetsOptions,
): ResolvedTextRect {
  const left = textRect.left + lIns;
  const top = textRect.top + tIns;
  const right = textRect.right - rIns;
  const bottom = textRect.bottom - bIns;

  return {
    left: px(left),
    top: px(top),
    right: px(right),
    bottom: px(bottom),
    width: px(Math.max(0, right - left)),
    height: px(Math.max(0, bottom - top)),
  };
}
