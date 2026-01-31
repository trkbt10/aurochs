/**
 * @file 3D property serialization
 *
 * @see ECMA-376 Part 1, Section 20.1.5 - 3D Rendering
 */

import { createElement, type XmlElement } from "@oxen/xml";
import { ooxmlEmu } from "@oxen-builder/core";
import type { Shape3d, Bevel3d } from "@oxen-office/pptx/domain/three-d";

/**
 * Serialize a Bevel3d to a:bevelT or a:bevelB element
 */
function serializeBevel(name: "a:bevelT" | "a:bevelB", bevel: Bevel3d): XmlElement {
  const attrs: Record<string, string> = {
    w: ooxmlEmu(bevel.width),
    h: ooxmlEmu(bevel.height),
    prst: bevel.preset,
  };
  return createElement(name, attrs);
}

/**
 * Serialize Shape3d to a:sp3d element
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export function serializeShape3d(shape3d: Shape3d): XmlElement | null {
  const children: XmlElement[] = [];
  const attrs: Record<string, string> = {};

  // Add extrusion height if specified
  if (shape3d.extrusionHeight !== undefined && shape3d.extrusionHeight > 0) {
    attrs.extrusionH = ooxmlEmu(shape3d.extrusionHeight);
  }

  // Add z depth if specified
  if (shape3d.z !== undefined && shape3d.z > 0) {
    attrs.z = ooxmlEmu(shape3d.z);
  }

  // Add contour width if specified
  if (shape3d.contourWidth !== undefined && shape3d.contourWidth > 0) {
    attrs.contourW = ooxmlEmu(shape3d.contourWidth);
  }

  // Add material preset
  if (shape3d.preset) {
    attrs.prstMaterial = shape3d.preset;
  }

  // Add top bevel
  if (shape3d.bevelTop) {
    children.push(serializeBevel("a:bevelT", shape3d.bevelTop));
  }

  // Add bottom bevel
  if (shape3d.bevelBottom) {
    children.push(serializeBevel("a:bevelB", shape3d.bevelBottom));
  }

  // Only create element if there are attributes or children
  if (Object.keys(attrs).length === 0 && children.length === 0) {
    return null;
  }

  return createElement("a:sp3d", attrs, children);
}
