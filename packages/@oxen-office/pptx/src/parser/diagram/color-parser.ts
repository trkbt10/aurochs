/**
 * @file Diagram color definition parser (PPTX wrapper)
 *
 * Delegates to the format-agnostic implementation in @oxen-office/diagram.
 */

import {
  parseDiagramColorsDefinition as parseDiagramColorsDefinitionBase,
  parseDiagramColorsDefinitionHeader as parseDiagramColorsDefinitionHeaderBase,
  parseDiagramColorsDefinitionHeaderList as parseDiagramColorsDefinitionHeaderListBase,
} from "@oxen-office/diagram/parser/diagram/color-parser";

export function parseDiagramColorsDefinition(...args: Parameters<typeof parseDiagramColorsDefinitionBase>) {
  return parseDiagramColorsDefinitionBase(...args);
}

export function parseDiagramColorsDefinitionHeader(...args: Parameters<typeof parseDiagramColorsDefinitionHeaderBase>) {
  return parseDiagramColorsDefinitionHeaderBase(...args);
}

export function parseDiagramColorsDefinitionHeaderList(
  ...args: Parameters<typeof parseDiagramColorsDefinitionHeaderListBase>
) {
  return parseDiagramColorsDefinitionHeaderListBase(...args);
}

