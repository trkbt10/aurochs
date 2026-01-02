/**
 * @file Diagram color definition parser
 *
 * Parses DiagramML color definitions (dgm:colorsDef).
 */
/* eslint-disable curly, jsdoc/require-jsdoc -- diagram parser uses guard clauses and small helpers */

import type {
  DiagramCategory,
  DiagramClrAppMethod,
  DiagramColorList,
  DiagramColorStyleLabel,
  DiagramColorsDefinition,
  DiagramColorsDefinitionHeader,
  DiagramColorsDefinitionHeaderList,
  DiagramHueDir,
} from "../../domain/diagram";
import type { XmlDocument, XmlElement } from "../../../xml/index";
import { getAttr, getByPath, getChild, getChildren, isXmlElement } from "../../../xml/index";
import { getIntAttr } from "../primitive";
import { parseColor } from "../graphics/color-parser";
import type { Color } from "../../domain/index";

/**
 * Parse diagram colors definition from XML document.
 */
export function parseDiagramColorsDefinition(
  doc: XmlDocument
): DiagramColorsDefinition | undefined {
  const colorsDef = getByPath(doc, ["dgm:colorsDef"]);
  if (!colorsDef || !isXmlElement(colorsDef)) return undefined;

  const title = getAttrFromChild(colorsDef, "dgm:title", "val");
  const description = getAttrFromChild(colorsDef, "dgm:desc", "val");
  const categories = parseCategoryList(getChild(colorsDef, "dgm:catLst"));
  const styleLabels = parseStyleLabels(getChildren(colorsDef, "dgm:styleLbl"));

  return {
    uniqueId: getAttr(colorsDef, "uniqueId"),
    title,
    description,
    categories,
    styleLabels,
  };
}

export function parseDiagramColorsDefinitionHeader(
  doc: XmlDocument
): DiagramColorsDefinitionHeader | undefined {
  const header = getByPath(doc, ["dgm:colorsDefHdr"]);
  if (!header || !isXmlElement(header)) return undefined;
  return parseColorsDefinitionHeader(header);
}

export function parseDiagramColorsDefinitionHeaderList(
  doc: XmlDocument
): DiagramColorsDefinitionHeaderList | undefined {
  const headerList = getByPath(doc, ["dgm:colorsDefHdrLst"]);
  if (!headerList || !isXmlElement(headerList)) return undefined;

  const headers = getChildren(headerList, "dgm:colorsDefHdr")
    .map(parseColorsDefinitionHeader)
    .filter((header): header is DiagramColorsDefinitionHeader => header !== undefined);

  if (headers.length === 0) return undefined;

  return { headers };
}

function parseCategoryList(element: XmlElement | undefined): readonly DiagramCategory[] | undefined {
  if (!element) return undefined;
  const categories = getChildren(element, "dgm:cat").map((cat) => ({
    type: getAttr(cat, "type"),
    priority: getIntAttr(cat, "pri"),
  }));
  if (categories.length === 0) return undefined;
  return categories;
}

function parseColorsDefinitionHeader(
  element: XmlElement
): DiagramColorsDefinitionHeader | undefined {
  const title = getAttrFromChild(element, "dgm:title", "val");
  const description = getAttrFromChild(element, "dgm:desc", "val");
  const categories = parseCategoryList(getChild(element, "dgm:catLst"));

  if (!title && !description && !categories && Object.keys(element.attrs).length === 0) {
    return undefined;
  }

  return {
    uniqueId: getAttr(element, "uniqueId"),
    title,
    description,
    categories,
    minimumVersion: getAttr(element, "minVer"),
    resourceId: getIntAttr(element, "resId"),
  };
}

function parseStyleLabels(elements: readonly XmlElement[]): readonly DiagramColorStyleLabel[] | undefined {
  if (elements.length === 0) return undefined;
  const labels = elements.map(parseStyleLabel).filter((label) => label !== undefined);
  if (labels.length === 0) return undefined;
  return labels;
}

function parseStyleLabel(element: XmlElement): DiagramColorStyleLabel | undefined {
  const name = getAttr(element, "name");
  const fillColors = parseColorList(getChild(element, "dgm:fillClrLst"));
  const lineColors = parseColorList(getChild(element, "dgm:linClrLst"));
  const effectColors = parseColorList(getChild(element, "dgm:effectClrLst"));
  const textLineColors = parseColorList(getChild(element, "dgm:txLinClrLst"));
  const textFillColors = parseColorList(getChild(element, "dgm:txFillClrLst"));
  const textEffectColors = parseColorList(getChild(element, "dgm:txEffectClrLst"));

  if (!name && !fillColors && !lineColors && !effectColors && !textLineColors && !textFillColors && !textEffectColors) {
    return undefined;
  }

  return {
    name,
    fillColors,
    lineColors,
    effectColors,
    textLineColors,
    textFillColors,
    textEffectColors,
  };
}

function parseColorList(element: XmlElement | undefined): DiagramColorList | undefined {
  if (!element) return undefined;

  const colors: Color[] = [];
  for (const child of element.children) {
    if (!isXmlElement(child)) continue;
    const color = parseColor(child);
    if (color) colors.push(color);
  }

  if (colors.length === 0) return undefined;

  return {
    method: parseClrAppMethod(getAttr(element, "meth")),
    hueDirection: parseHueDir(getAttr(element, "hueDir")),
    colors,
  };
}

function parseClrAppMethod(value: string | undefined): DiagramClrAppMethod | undefined {
  return isClrAppMethod(value) ? value : undefined;
}

function isClrAppMethod(value: string | undefined): value is DiagramClrAppMethod {
  switch (value) {
    case "cycle":
    case "repeat":
    case "span":
      return true;
    default:
      return false;
  }
}

function parseHueDir(value: string | undefined): DiagramHueDir | undefined {
  return isHueDir(value) ? value : undefined;
}

function isHueDir(value: string | undefined): value is DiagramHueDir {
  switch (value) {
    case "cw":
    case "ccw":
      return true;
    default:
      return false;
  }
}

function getAttrFromChild(
  parent: XmlElement,
  childName: string,
  attrName: string
): string | undefined {
  const child = getChild(parent, childName);
  return child ? getAttr(child, attrName) : undefined;
}
