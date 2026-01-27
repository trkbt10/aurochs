/**
 * @file DrawingML background type definitions
 *
 * Types for background parsing and rendering in DrawingML.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "@oxen/xml";

// =============================================================================
// Parse Result Types
// =============================================================================

/**
 * Background element result from p:bg
 *
 * Represents the parsed background element containing either
 * background properties (bgPr) or background reference (bgRef).
 */
export type BackgroundElement = {
  /** Background properties element (p:bgPr) */
  readonly bgPr?: XmlElement;
  /** Background reference element (p:bgRef) */
  readonly bgRef?: XmlElement;
};

/**
 * Result of parsing background properties
 *
 * Contains the fill element and optional placeholder color
 * for theme-based backgrounds.
 */
export type BackgroundParseResult = {
  /**
   * Fill element (XmlElement containing a:solidFill, a:gradFill, a:blipFill, etc.)
   */
  readonly fill: XmlElement;
  /**
   * Placeholder color resolved from p:bgRef child element.
   * This is the hex color (without #) to substitute for phClr in theme styles.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
   */
  readonly phClr?: string;
  /**
   * Whether the fill came from a theme style (via bgRef).
   * When true, blipFill rIds should be resolved from theme resources.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  readonly fromTheme?: boolean;
};

// =============================================================================
// Render Output Types
// =============================================================================

/**
 * Image fill mode for backgrounds
 *
 * - "stretch" - stretch to fill without preserving aspect ratio
 * - "tile" - tile the image
 * - "cover" - scale to cover while preserving aspect ratio (default)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.* (a:stretch, a:tile)
 */
export type ImageFillMode = "stretch" | "tile" | "cover";

/**
 * Gradient stop with resolved position and color
 *
 * Used in render output format with resolved values.
 */
export type GradientStop = {
  /** Position in percentage (0-100) */
  readonly position: number;
  /** Color in hex format (e.g., "4F81BD") */
  readonly color: string;
};

/**
 * Gradient data for backgrounds (render output format)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type GradientData = {
  /** Rotation angle in degrees */
  readonly angle: number;
  /** Gradient type: "linear" or "path" (radial) */
  readonly type?: "linear" | "path";
  /**
   * Path shade type for radial gradients
   * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path)
   */
  readonly pathShadeType?: "circle" | "rect" | "shape";
  /**
   * Fill-to-rect for radial gradients (defines center and extent)
   * Values are in 1/100000 percentages
   * @see ECMA-376 Part 1, Section 20.1.8.30 (a:fillToRect)
   */
  readonly fillToRect?: {
    readonly l: number;
    readonly t: number;
    readonly r: number;
    readonly b: number;
  };
  /** Gradient stops with positions */
  readonly stops: readonly GradientStop[];
};

/**
 * Background fill result (render output)
 *
 * Contains both CSS output and structured data for rendering.
 */
export type BackgroundFill = {
  /** CSS string for background styling */
  readonly css: string;
  /** Whether this is a solid color fill */
  readonly isSolid: boolean;
  /** Solid color in hex format with # prefix (e.g., "#4F81BD") */
  readonly color?: string;
  /** CSS gradient string (e.g., "linear-gradient(...)") */
  readonly gradient?: string;
  /** Structured gradient data for SVG/canvas rendering */
  readonly gradientData?: GradientData;
  /** Image URL or data URI */
  readonly image?: string;
  /** Image fill mode */
  readonly imageFillMode?: ImageFillMode;
};
