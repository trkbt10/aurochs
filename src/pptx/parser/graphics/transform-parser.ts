/**
 * @file Transform parser
 *
 * Parses a:xfrm elements to Transform/GroupTransform domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.7.6 (xfrm)
 */

import type { GroupTransform, Transform } from "../../domain/index";
import { px, deg } from "../../domain/types";
import { getChild, type XmlElement } from "../../../xml/index";
import { getAngleAttr, getBoolAttrOr, getEmuAttrOr } from "../primitive";

/**
 * Parse a:xfrm element to Transform
 *
 * @see ECMA-376 Part 1, Section 20.1.7.6
 *
 * Expected structure:
 * ```xml
 * <a:xfrm rot="5400000" flipH="1" flipV="0">
 *   <a:off x="914400" y="914400"/>
 *   <a:ext cx="1828800" cy="914400"/>
 * </a:xfrm>
 * ```
 */
export function parseTransform(xfrm: XmlElement | undefined): Transform | undefined {
  if (!xfrm) {return undefined;}

  const off = getChild(xfrm, "a:off");
  const ext = getChild(xfrm, "a:ext");

  // Position and size are required
  if (!off || !ext) {return undefined;}

  return {
    x: getEmuAttrOr(off, "x", px(0)),
    y: getEmuAttrOr(off, "y", px(0)),
    width: getEmuAttrOr(ext, "cx", px(0)),
    height: getEmuAttrOr(ext, "cy", px(0)),
    rotation: getAngleAttr(xfrm, "rot") ?? deg(0),
    flipH: getBoolAttrOr(xfrm, "flipH", false),
    flipV: getBoolAttrOr(xfrm, "flipV", false),
  };
}

/**
 * Parse a:xfrm element for group shape to GroupTransform
 *
 * Group transforms include child offset and extent for coordinate mapping.
 *
 * Expected structure:
 * ```xml
 * <a:xfrm rot="0" flipH="0" flipV="0">
 *   <a:off x="0" y="0"/>
 *   <a:ext cx="9144000" cy="6858000"/>
 *   <a:chOff x="0" y="0"/>
 *   <a:chExt cx="9144000" cy="6858000"/>
 * </a:xfrm>
 * ```
 */
export function parseGroupTransform(xfrm: XmlElement | undefined): GroupTransform | undefined {
  if (!xfrm) {return undefined;}

  const off = getChild(xfrm, "a:off");
  const ext = getChild(xfrm, "a:ext");
  const chOff = getChild(xfrm, "a:chOff");
  const chExt = getChild(xfrm, "a:chExt");

  // All elements are required for group transform
  if (!off || !ext || !chOff || !chExt) {return undefined;}

  return {
    x: getEmuAttrOr(off, "x", px(0)),
    y: getEmuAttrOr(off, "y", px(0)),
    width: getEmuAttrOr(ext, "cx", px(0)),
    height: getEmuAttrOr(ext, "cy", px(0)),
    rotation: getAngleAttr(xfrm, "rot") ?? deg(0),
    flipH: getBoolAttrOr(xfrm, "flipH", false),
    flipV: getBoolAttrOr(xfrm, "flipV", false),
    childOffsetX: getEmuAttrOr(chOff, "x", px(0)),
    childOffsetY: getEmuAttrOr(chOff, "y", px(0)),
    childExtentWidth: getEmuAttrOr(chExt, "cx", px(0)),
    childExtentHeight: getEmuAttrOr(chExt, "cy", px(0)),
  };
}

/**
 * Get transform from shape properties element
 *
 * Works with p:spPr, p:grpSpPr, etc.
 */
export function getTransformFromProperties(spPr: XmlElement | undefined): Transform | undefined {
  if (!spPr) {return undefined;}
  return parseTransform(getChild(spPr, "a:xfrm"));
}

/**
 * Get group transform from group shape properties element
 */
export function getGroupTransformFromProperties(grpSpPr: XmlElement | undefined): GroupTransform | undefined {
  if (!grpSpPr) {return undefined;}
  return parseGroupTransform(getChild(grpSpPr, "a:xfrm"));
}

/**
 * Apply group transform to a child transform
 *
 * Converts child coordinates from group local space to parent space.
 */
export function applyGroupTransform(
  childTransform: Transform,
  groupTransform: GroupTransform,
): Transform {
  // Calculate scale factors
  const scaleX = resolveScale(groupTransform.width, groupTransform.childExtentWidth);
  const scaleY = resolveScale(groupTransform.height, groupTransform.childExtentHeight);

  // Transform child coordinates
  const x = groupTransform.x + (childTransform.x - groupTransform.childOffsetX) * scaleX;
  const y = groupTransform.y + (childTransform.y - groupTransform.childOffsetY) * scaleY;
  const width = childTransform.width * scaleX;
  const height = childTransform.height * scaleY;

  // Combine rotations
  const rotation = (childTransform.rotation + groupTransform.rotation) % 360;

  // XOR flip states
  const flipH = childTransform.flipH !== groupTransform.flipH;
  const flipV = childTransform.flipV !== groupTransform.flipV;

  return {
    x: px(x),
    y: px(y),
    width: px(width),
    height: px(height),
    rotation: deg(rotation),
    flipH,
    flipV,
  };
}

function resolveScale(total: number, extent: number): number {
  if (extent > 0) {
    return total / extent;
  }
  return 1;
}
