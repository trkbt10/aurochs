/**
 * @file Connector shape (p:cxnSp) parser
 *
 * @see ECMA-376 Part 1, Section 19.3.1.13 (p:cxnSp)
 */

import { getAttr, getChild, type XmlElement } from "@oxen/xml";
import type { ConnectionTarget, CxnShape } from "../../domain";
import { resolveFillFromStyleReference } from "../graphics/fill-parser";
import type { FormatScheme } from "../context";
import { getIntAttr } from "../primitive";
import { parseNonVisualProperties } from "./non-visual";
import { parseShapeProperties } from "./properties";
import { parseShapeStyle } from "./style";
import { resolveEffectsFromStyleReference } from "../graphics/effects-parser";

/**
 * Parse connection target
 */
function parseConnectionTarget(element: XmlElement | undefined): ConnectionTarget | undefined {
  if (!element) {
    return undefined;
  }

  const id = getAttr(element, "id");
  const idx = getIntAttr(element, "idx");

  if (!id || idx === undefined) {
    return undefined;
  }

  return { shapeId: id, siteIndex: idx };
}

function parseConnectionTargetFromParent(
  parent: XmlElement | undefined,
  childName: "a:stCxn" | "a:endCxn",
): ConnectionTarget | undefined {
  if (!parent) {
    return undefined;
  }
  return parseConnectionTarget(getChild(parent, childName));
}

function resolvePropertiesWithFill(
  properties: ReturnType<typeof parseShapeProperties>,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
  formatScheme: FormatScheme | undefined,
): ReturnType<typeof parseShapeProperties> {
  if (!properties.fill) {
    if (shapeStyle?.fillReference && formatScheme) {
      const resolvedFill = resolveFillFromStyleReference(
        shapeStyle.fillReference,
        formatScheme.fillStyles,
      );
      if (resolvedFill) {
        return { ...properties, fill: resolvedFill };
      }
    }
  }

  return properties;
}

function resolvePropertiesWithEffects(
  properties: ReturnType<typeof parseShapeProperties>,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
  formatScheme: FormatScheme | undefined,
): ReturnType<typeof parseShapeProperties> {
  if (!properties.effects) {
    if (shapeStyle?.effectReference && formatScheme) {
      const resolvedEffects = resolveEffectsFromStyleReference(
        shapeStyle.effectReference,
        formatScheme.effectStyles,
      );
      if (resolvedEffects) {
        return { ...properties, effects: resolvedEffects };
      }
    }
  }

  return properties;
}

/**
 * Parse connector shape (p:cxnSp)
 * @see ECMA-376 Part 1, Section 19.3.1.13
 */
export function parseCxnShape(
  element: XmlElement,
  formatScheme?: FormatScheme,
): CxnShape | undefined {
  const nvCxnSpPr = getChild(element, "p:nvCxnSpPr");
  const cNvPr = nvCxnSpPr ? getChild(nvCxnSpPr, "p:cNvPr") : undefined;
  const cNvCxnSpPr = nvCxnSpPr ? getChild(nvCxnSpPr, "p:cNvCxnSpPr") : undefined;

  const spPr = getChild(element, "p:spPr");
  const style = getChild(element, "p:style");

  const nonVisual = parseNonVisualProperties(cNvPr);
  const startConnection = parseConnectionTargetFromParent(cNvCxnSpPr, "a:stCxn");
  const endConnection = parseConnectionTargetFromParent(cNvCxnSpPr, "a:endCxn");

  const baseProperties = parseShapeProperties(spPr);
  const shapeStyle = parseShapeStyle(style);

  // Resolve style references if not directly specified
  const propertiesWithFill = resolvePropertiesWithFill(baseProperties, shapeStyle, formatScheme);
  const properties = resolvePropertiesWithEffects(propertiesWithFill, shapeStyle, formatScheme);

  return {
    type: "cxnSp",
    nonVisual: { ...nonVisual, startConnection, endConnection },
    properties,
    style: shapeStyle,
  };
}
