/**
 * @file Transform utilities
 *
 * Shared transform calculation logic for both HTML and SVG renderers.
 */

import type { Transform } from "@oxen-office/pptx/domain/index";

// =============================================================================
// Transform Data Extraction
// =============================================================================

/**
 * Extracted transform data (plain numbers, format-agnostic)
 */
export type TransformData = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly flipH: boolean;
  readonly flipV: boolean;
};

/**
 * Extract transform data from domain Transform
 */
export function extractTransformData(transform: Transform): TransformData {
  return {
    x: transform.x as number,
    y: transform.y as number,
    width: transform.width as number,
    height: transform.height as number,
    rotation: transform.rotation as number,
    flipH: transform.flipH,
    flipV: transform.flipV,
  };
}

// =============================================================================
// Transform Calculations
// =============================================================================

/**
 * Calculate rotation center for transform-origin
 */
export function getRotationCenter(data: TransformData): { cx: number; cy: number } {
  return {
    cx: data.width / 2,
    cy: data.height / 2,
  };
}

/**
 * Check if transform has any transformations (rotation/flip)
 */
export function hasTransformations(data: TransformData): boolean {
  return [data.rotation !== 0, data.flipH, data.flipV].some(Boolean);
}

// =============================================================================
// CSS Transform Generation
// =============================================================================

/**
 * Build CSS transform string from transform data
 */
export function buildCssTransform(data: TransformData): string {
  const parts: string[] = [];

  if (data.rotation !== 0) {
    parts.push(`rotate(${data.rotation}deg)`);
  }

  if (data.flipH) {
    parts.push("scaleX(-1)");
  }

  if (data.flipV) {
    parts.push("scaleY(-1)");
  }

  return parts.length > 0 ? parts.join(" ") : "";
}

/**
 * Build CSS position/size styles from transform data
 */
export function buildCssPositionStyles(data: TransformData): Record<string, string> {
  const styles: Record<string, string> = {
    position: "absolute",
    left: `${data.x}px`,
    top: `${data.y}px`,
    width: `${data.width}px`,
    height: `${data.height}px`,
  };

  const cssTransform = buildCssTransform(data);
  if (cssTransform) {
    styles.transform = cssTransform;
    styles["transform-origin"] = "center center";
  }

  return styles;
}

// =============================================================================
// SVG Transform Generation
// =============================================================================

/**
 * Build SVG transform attribute from transform data
 */
export function buildSvgTransform(data: TransformData): string {
  const parts: string[] = [];

  // Translate to position
  if (data.x !== 0 || data.y !== 0) {
    parts.push(`translate(${data.x}, ${data.y})`);
  }

  // Rotation around center
  if (data.rotation !== 0) {
    const { cx, cy } = getRotationCenter(data);
    parts.push(`rotate(${data.rotation}, ${cx}, ${cy})`);
  }

  // Flip transforms (scale around center)
  if (data.flipH || data.flipV) {
    const { cx, cy } = getRotationCenter(data);
    const scaleX = data.flipH ? -1 : 1;
    const scaleY = data.flipV ? -1 : 1;
    parts.push(`translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})`);
  }

  return parts.join(" ");
}

/**
 * Build SVG transform attribute from domain Transform
 */
export function buildSvgTransformAttr(transform: Transform): string {
  return buildSvgTransform(extractTransformData(transform));
}
