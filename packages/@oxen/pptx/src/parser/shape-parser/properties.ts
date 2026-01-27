/**
 * @file Shape properties parsing
 *
 * @see ECMA-376 Part 1, Section 19.3.1.44 (p:spPr)
 */

import { getChild, type XmlElement } from "@oxen/xml";
import type { GroupShapeProperties, ShapeProperties } from "../../domain";
import { parseFillFromParent } from "../graphics/fill-parser";
import { getLineFromProperties } from "../graphics/line-parser";
import {
  getGroupTransformFromProperties,
  getTransformFromProperties,
} from "../graphics/transform-parser";
import { parseEffects } from "../graphics/effects-parser";
import { parseGeometry } from "../graphics/geometry-parser";
import { parseScene3d, parseShape3d } from "./three-d";

/**
 * Get the first defined value from a cascade of sources.
 * Used for property inheritance: slide → layout → master.
 */
export function findFirstDefined<T>(
  getter: (node: XmlElement | undefined) => T | undefined,
  ...sources: (XmlElement | undefined)[]
): T | undefined {
  for (const source of sources) {
    const value = getter(source);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * Parse shape visual properties with inheritance (spPr)
 *
 * Properties are resolved in order: slide → layout → master
 * This matches ECMA-376 placeholder inheritance model.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.44
 */
export function parseShapePropertiesWithInheritance(
  spPr: XmlElement | undefined,
  layoutNode: XmlElement | undefined,
  masterNode: XmlElement | undefined,
): ShapeProperties {
  // Get spPr from layout and master placeholders
  const layoutSpPr = getSpPrChild(layoutNode);
  const masterSpPr = getSpPrChild(masterNode);

  // Resolve transform with inheritance (most important for positioning)
  const transform = findFirstDefined(
    getTransformFromProperties,
    spPr,
    layoutSpPr,
    masterSpPr,
  );

  // Resolve geometry with inheritance
  const geometry = findFirstDefined(parseGeometry, spPr, layoutSpPr, masterSpPr);

  // Resolve fill with inheritance
  const fill = findFirstDefined(parseFillFromParent, spPr, layoutSpPr, masterSpPr);

  // Resolve line with inheritance
  const line = findFirstDefined(getLineFromProperties, spPr, layoutSpPr, masterSpPr);

  // Resolve effects with inheritance
  const effects = findFirstDefined(parseEffects, spPr, layoutSpPr, masterSpPr);

  return {
    transform,
    geometry,
    fill,
    line,
    effects,
    scene3d: findFirstDefined(parseScene3d, spPr, layoutSpPr, masterSpPr),
    shape3d: findFirstDefined(parseShape3d, spPr, layoutSpPr, masterSpPr),
  };
}

/**
 * Parse shape visual properties (spPr) without inheritance
 * @see ECMA-376 Part 1, Section 19.3.1.44
 */
export function parseShapeProperties(spPr: XmlElement | undefined): ShapeProperties {
  if (!spPr) {
    return {};
  }

  return {
    transform: getTransformFromProperties(spPr),
    geometry: parseGeometry(spPr),
    fill: parseFillFromParent(spPr),
    line: getLineFromProperties(spPr),
    effects: parseEffects(spPr),
    scene3d: parseScene3d(spPr),
    shape3d: parseShape3d(spPr),
  };
}

/**
 * Parse group shape properties (grpSpPr)
 */
export function parseGroupShapeProperties(grpSpPr: XmlElement | undefined): GroupShapeProperties {
  if (!grpSpPr) {
    return {};
  }

  return {
    transform: getGroupTransformFromProperties(grpSpPr),
    fill: parseFillFromParent(grpSpPr),
    effects: parseEffects(grpSpPr),
  };
}

function getSpPrChild(node: XmlElement | undefined): XmlElement | undefined {
  if (!node) {
    return undefined;
  }
  return getChild(node, "p:spPr");
}
