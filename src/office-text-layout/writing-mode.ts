/**
 * @file Writing Mode and Directional Coordinate Utilities
 *
 * Abstracts text direction handling to support both horizontal (lrTb)
 * and vertical (tbRl) writing modes from ECMA-376 WordprocessingML.
 *
 * The inline/block coordinate system allows layout calculations to be
 * direction-agnostic, with conversion to physical X/Y only at render time.
 *
 * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
 */

import type { Pixels } from "../ooxml/domain/units";
import { px } from "../ooxml/domain/units";
import type { EcmaTextDirection } from "../docx/domain/ecma376-defaults";

// =============================================================================
// Writing Mode Type
// =============================================================================

/**
 * CSS Writing Mode equivalent for layout calculations.
 *
 * Maps from ECMA-376 textDirection values to CSS writing-mode semantics:
 * - horizontal-tb: Horizontal text, top to bottom block flow (lrTb, btLr)
 * - vertical-rl: Vertical text, right to left block flow (tbRl)
 * - vertical-lr: Vertical text, left to right block flow (tbLrV)
 */
export type WritingMode = "horizontal-tb" | "vertical-rl" | "vertical-lr";

// =============================================================================
// Directional Coordinates
// =============================================================================

/**
 * Direction-agnostic coordinate representation.
 *
 * - inline: Position along the line direction (X in horizontal, Y in vertical)
 * - block: Position perpendicular to lines (Y in horizontal, X in vertical)
 *
 * This abstraction allows layout algorithms to work uniformly regardless
 * of text direction, with conversion to physical coordinates at render time.
 */
export type DirectionalCoords = {
  /** Position along the inline (line) direction */
  readonly inline: Pixels;
  /** Position along the block (cross-line) direction */
  readonly block: Pixels;
};

/**
 * Direction-agnostic size representation.
 */
export type DirectionalSize = {
  /** Size along the inline (line) direction */
  readonly inlineSize: Pixels;
  /** Size along the block (cross-line) direction */
  readonly blockSize: Pixels;
};

/**
 * Complete directional bounds (position + size).
 */
export type DirectionalBounds = DirectionalCoords & DirectionalSize;

// =============================================================================
// Physical Coordinates
// =============================================================================

/**
 * Physical (X/Y) coordinate representation.
 */
export type PhysicalCoords = {
  readonly x: Pixels;
  readonly y: Pixels;
};

/**
 * Physical (width/height) size representation.
 */
export type PhysicalSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Complete physical bounds (position + size).
 */
export type PhysicalBounds = PhysicalCoords & PhysicalSize;

// =============================================================================
// Conversion: ECMA-376 textDirection → WritingMode
// =============================================================================

/**
 * Convert ECMA-376 textDirection to CSS WritingMode.
 *
 * @param textDirection - ECMA-376 text direction value
 * @returns CSS writing-mode equivalent
 */
export function textDirectionToWritingMode(textDirection: EcmaTextDirection): WritingMode {
  switch (textDirection) {
    case "lrTb":
    case "lrTbV":
      return "horizontal-tb";
    case "tbRl":
    case "tbRlV":
      return "vertical-rl";
    case "btLr":
    case "tbLrV":
      return "vertical-lr";
    default:
      return "horizontal-tb";
  }
}

// =============================================================================
// Coordinate Conversion
// =============================================================================

/**
 * Convert physical (X/Y) coordinates to directional (inline/block) coordinates.
 *
 * @param coords - Physical X/Y coordinates
 * @param mode - Writing mode
 * @returns Directional inline/block coordinates
 */
export function toDirectional(coords: PhysicalCoords, mode: WritingMode): DirectionalCoords {
  switch (mode) {
    case "horizontal-tb":
      return {
        inline: coords.x,
        block: coords.y,
      };
    case "vertical-rl":
      return {
        inline: coords.y,
        block: px(-1 * (coords.x as number)), // X increases leftward
      };
    case "vertical-lr":
      return {
        inline: coords.y,
        block: coords.x,
      };
  }
}

/**
 * Convert directional (inline/block) coordinates to physical (X/Y) coordinates.
 *
 * @param coords - Directional inline/block coordinates
 * @param mode - Writing mode
 * @returns Physical X/Y coordinates
 */
export function fromDirectional(coords: DirectionalCoords, mode: WritingMode): PhysicalCoords {
  switch (mode) {
    case "horizontal-tb":
      return {
        x: coords.inline,
        y: coords.block,
      };
    case "vertical-rl":
      return {
        x: px(-1 * (coords.block as number)), // Block increases leftward
        y: coords.inline,
      };
    case "vertical-lr":
      return {
        x: coords.block,
        y: coords.inline,
      };
  }
}

/**
 * Convert physical (width/height) size to directional (inline/block) size.
 *
 * @param size - Physical width/height size
 * @param mode - Writing mode
 * @returns Directional inline/block size
 */
export function toDirectionalSize(size: PhysicalSize, mode: WritingMode): DirectionalSize {
  switch (mode) {
    case "horizontal-tb":
      return {
        inlineSize: size.width,
        blockSize: size.height,
      };
    case "vertical-rl":
    case "vertical-lr":
      return {
        inlineSize: size.height,
        blockSize: size.width,
      };
  }
}

/**
 * Convert directional (inline/block) size to physical (width/height) size.
 *
 * @param size - Directional inline/block size
 * @param mode - Writing mode
 * @returns Physical width/height size
 */
export function fromDirectionalSize(size: DirectionalSize, mode: WritingMode): PhysicalSize {
  switch (mode) {
    case "horizontal-tb":
      return {
        width: size.inlineSize,
        height: size.blockSize,
      };
    case "vertical-rl":
    case "vertical-lr":
      return {
        width: size.blockSize,
        height: size.inlineSize,
      };
  }
}

/**
 * Convert physical bounds to directional bounds.
 *
 * @param bounds - Physical X/Y/width/height bounds
 * @param mode - Writing mode
 * @returns Directional inline/block bounds
 */
export function toDirectionalBounds(bounds: PhysicalBounds, mode: WritingMode): DirectionalBounds {
  const coords = toDirectional(bounds, mode);
  const size = toDirectionalSize(bounds, mode);
  return { ...coords, ...size };
}

/**
 * Convert directional bounds to physical bounds.
 *
 * @param bounds - Directional inline/block bounds
 * @param mode - Writing mode
 * @returns Physical X/Y/width/height bounds
 */
export function fromDirectionalBounds(bounds: DirectionalBounds, mode: WritingMode): PhysicalBounds {
  const coords = fromDirectional(bounds, mode);
  const size = fromDirectionalSize(bounds, mode);
  return { ...coords, ...size };
}

// =============================================================================
// Writing Mode Predicates
// =============================================================================

/**
 * Check if writing mode is horizontal.
 */
export function isHorizontal(mode: WritingMode): boolean {
  return mode === "horizontal-tb";
}

/**
 * Check if writing mode is vertical.
 */
export function isVertical(mode: WritingMode): boolean {
  return mode === "vertical-rl" || mode === "vertical-lr";
}

/**
 * Get the CSS writing-mode property value.
 */
export function getCssWritingMode(mode: WritingMode): string {
  return mode;
}
