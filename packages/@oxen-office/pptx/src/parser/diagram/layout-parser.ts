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

export function parseDiagramLayoutDefinition(doc: XmlDocument) {
  return parseDiagramLayoutDefinitionBase(doc, { parseShapeProperties, parseTextBody });
}

export function parseDiagramLayoutDefinitionHeader(...args: Parameters<typeof parseDiagramLayoutDefinitionHeaderBase>) {
  return parseDiagramLayoutDefinitionHeaderBase(...args);
}

export function parseDiagramLayoutDefinitionHeaderList(...args: Parameters<typeof parseDiagramLayoutDefinitionHeaderListBase>) {
  return parseDiagramLayoutDefinitionHeaderListBase(...args);
}
