/**
 * @file Transform Utilities for React SVG Renderer
 *
 * Provides utilities for building SVG transform attributes
 * from domain Transform objects.
 */

import type { Transform, GroupTransform } from "@oxen-office/pptx/domain";

// =============================================================================
// Transform Building
// =============================================================================

/**
 * Build SVG transform attribute from Transform domain object.
 *
 * @param transform - Transform to convert
 * @param w - Width for rotation/flip center calculation
 * @param h - Height for rotation/flip center calculation
 * @returns SVG transform attribute value (empty string if no transform)
 */
export function buildTransformAttr(
  transform: Transform | undefined,
  w: number,
  h: number,
): string {
  if (transform === undefined) {
    return "";
  }

  const x = transform.x as number;
  const y = transform.y as number;
  const rotation = transform.rotation as number;

  const transforms: string[] = [];
  if (x !== 0 || y !== 0) {
    transforms.push(`translate(${x}, ${y})`);
  }
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}, ${w / 2}, ${h / 2})`);
  }
  if (transform.flipH) {
    transforms.push(`scale(-1, 1) translate(${-w}, 0)`);
  }
  if (transform.flipV) {
    transforms.push(`scale(1, -1) translate(0, ${-h})`);
  }

  return transforms.join(" ");
}

/**
 * Build SVG transform attribute for group shapes (grpSp).
 *
 * ECMA-376 Part 1, Section 20.1.7.5 defines group transforms:
 * - ext (width/height): The visual size of the group
 * - chExt (childExtentWidth/Height): The coordinate space for children
 * - chOff (childOffsetX/Y): The origin of child coordinate space
 *
 * Children are positioned in chExt space and scaled to fit within ext.
 * Scale factors: scaleX = width / childExtentWidth, scaleY = height / childExtentHeight
 *
 * @see ECMA-376 Part 1, Section 20.1.7.5 (grpSpPr)
 */
export function buildGroupTransformAttr(transform: GroupTransform | undefined): string {
  if (transform === undefined) {
    return "";
  }

  const x = transform.x as number;
  const y = transform.y as number;
  const width = transform.width as number;
  const height = transform.height as number;
  const rotation = transform.rotation as number;
  const childOffsetX = (transform.childOffsetX as number) ?? 0;
  const childOffsetY = (transform.childOffsetY as number) ?? 0;
  const childExtentWidth = (transform.childExtentWidth as number) ?? width;
  const childExtentHeight = (transform.childExtentHeight as number) ?? height;

  // Calculate scale factors
  const scaleX = childExtentWidth > 0 ? width / childExtentWidth : 1;
  const scaleY = childExtentHeight > 0 ? height / childExtentHeight : 1;

  const transforms: string[] = [];

  // 1. Translate to group position
  if (x !== 0 || y !== 0) {
    transforms.push(`translate(${x}, ${y})`);
  }

  // 2. Apply rotation around center (before scaling for correct center)
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}, ${width / 2}, ${height / 2})`);
  }

  // 3. Apply flips
  if (transform.flipH) {
    transforms.push(`scale(-1, 1) translate(${-width}, 0)`);
  }
  if (transform.flipV) {
    transforms.push(`scale(1, -1) translate(0, ${-height})`);
  }

  // 4. Scale from child extent to actual size (if needed)
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }

  // 5. Translate by negative child offset to adjust child coordinate origin
  if (childOffsetX !== 0 || childOffsetY !== 0) {
    transforms.push(`translate(${-childOffsetX}, ${-childOffsetY})`);
  }

  return transforms.join(" ");
}
