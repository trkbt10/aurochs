/**
 * @file Diagram data model parser (PPTX wrapper)
 *
 * Delegates to the format-agnostic implementation in @oxen-office/diagram.
 * PPTX-specific parsing of shape/text payloads is injected explicitly.
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import {
  parseDiagramDataModel as parseDiagramDataModelBase,
  parseDiagramDataModelElement as parseDiagramDataModelElementBase,
} from "@oxen-office/diagram/parser/diagram/data-parser";
import { parseShapeProperties } from "../shape-parser/properties";
import { parseTextBody } from "../text/text-parser";


























/** Parse diagram data model from XML document */
export function parseDiagramDataModel(doc: XmlDocument) {
  return parseDiagramDataModelBase(doc, { parseShapeProperties, parseTextBody });
}


























/** Parse diagram data model from XML element */
export function parseDiagramDataModelElement(element: XmlElement | undefined) {
  return parseDiagramDataModelElementBase(element, { parseShapeProperties, parseTextBody });
}

