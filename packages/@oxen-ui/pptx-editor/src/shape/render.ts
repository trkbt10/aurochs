/**
 * @file Shape render
 *
 * Rendering-related utilities for shapes (fill, stroke extraction).
 */

import type { Shape, SpShape, CxnShape } from "@oxen/pptx/domain";
import type { SolidFill } from "@oxen/ooxml/domain/fill";

/**
 * Extract fill color from shape as hex string
 */
export function getFillColor(shape: Shape): string | undefined {
  if (!("properties" in shape)) {return undefined;}
  const fill = shape.properties.fill;
  if (!fill) {return undefined;}
  if (fill.type === "solidFill") {
    const solidFill = fill as SolidFill;
    if (solidFill.color.spec.type === "srgb") {
      return `#${solidFill.color.spec.value}`;
    }
  }
  return "#cccccc"; // Default gray for other fill types
}

/**
 * Extract stroke color from shape as hex string
 */
export function getStrokeColor(shape: Shape): string | undefined {
  if (!("properties" in shape)) {return undefined;}
  // Only SpShape and CxnShape have line property
  if (shape.type !== "sp" && shape.type !== "cxnSp") {return undefined;}
  const shapeWithLine = shape as SpShape | CxnShape;
  const line = shapeWithLine.properties.line;
  if (!line?.fill) {return undefined;}
  if (line.fill.type === "solidFill") {
    const solidFill = line.fill as SolidFill;
    if (solidFill.color.spec.type === "srgb") {
      return `#${solidFill.color.spec.value}`;
    }
  }
  return "#333333";
}

/**
 * Get stroke width from shape
 */
export function getStrokeWidth(shape: Shape): number {
  if (!("properties" in shape)) {return 1;}
  // Only SpShape and CxnShape have line property
  if (shape.type !== "sp" && shape.type !== "cxnSp") {return 1;}
  const shapeWithLine = shape as SpShape | CxnShape;
  const line = shapeWithLine.properties.line;
  if (!line?.width) {return 1;}
  return line.width as number;
}
