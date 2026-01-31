/**
 * @file Diagram layout definition parser (PPTX wrapper)
 *
 * Delegates to the format-agnostic implementation in @oxen-office/diagram.
 */

import type { XmlDocument } from "@oxen/xml";
import {
  parseDiagramLayoutDefinition as parseDiagramLayoutDefinitionBase,
  parseDiagramLayoutDefinitionHeader as parseDiagramLayoutDefinitionHeaderBase,
  parseDiagramLayoutDefinitionHeaderList as parseDiagramLayoutDefinitionHeaderListBase,
} from "@oxen-office/diagram/parser/diagram/layout-parser";
import { parseShapeProperties } from "../shape-parser/properties";
import { parseTextBody } from "../text/text-parser";


























/** Parse diagram layout definition from XML document */
export function parseDiagramLayoutDefinition(doc: XmlDocument) {
  return parseDiagramLayoutDefinitionBase(doc, { parseShapeProperties, parseTextBody });
}


























/** Parse diagram layout definition header from XML */
export function parseDiagramLayoutDefinitionHeader(...args: Parameters<typeof parseDiagramLayoutDefinitionHeaderBase>) {
  return parseDiagramLayoutDefinitionHeaderBase(...args);
}


























/** Parse list of diagram layout definition headers from XML */
export function parseDiagramLayoutDefinitionHeaderList(...args: Parameters<typeof parseDiagramLayoutDefinitionHeaderListBase>) {
  return parseDiagramLayoutDefinitionHeaderListBase(...args);
}
