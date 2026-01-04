/**
 * @file Slide data loader
 * Loads layout, master, theme, and diagram data for slides
 */

import type { PresentationFile } from "../../types/file";
import type { ResourceMap } from "../../opc";
import type { LayoutData, MasterData, ThemeData, DiagramData } from "../types";
import {
  findLayoutFilename,
  findMasterFilename,
  findThemeFilename,
  findDiagramDrawingFilename,
  parseRelationships,
  RELATIONSHIP_TYPES,
} from "../../opc";
import { getByPath } from "../../../xml";
import { indexNodes } from "../../core/node-indexer";
import { transformDiagramNamespace } from "../../parser/diagram/transform";
import { readXml, getRelationships, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../xml-reader";

/**
 * Load layout data for a slide
 * @param file - The presentation file
 * @param relationships - Slide relationships to find layout reference
 * @returns Layout data with parsed XML, index tables, and relationships
 */
export function loadLayoutData(file: PresentationFile, relationships: ResourceMap): LayoutData {
  const layoutPath = findLayoutFilename(relationships);
  if (layoutPath === undefined) {
    return {
      layout: null,
      layoutTables: indexNodes(null),
      layoutRelationships: parseRelationships(null),
    };
  }
  const layout = readXml(file, layoutPath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  return {
    layout,
    layoutTables: indexNodes(layout),
    layoutRelationships: getRelationships(file, layoutPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS),
  };
}

/**
 * Load master data for a slide
 * @param file - The presentation file
 * @param layoutRelationships - Layout relationships to find master reference
 * @returns Master data with parsed XML, index tables, text styles, and relationships
 */
export function loadMasterData(file: PresentationFile, layoutRelationships: ResourceMap): MasterData {
  const masterPath = findMasterFilename(layoutRelationships);
  if (masterPath === undefined) {
    return {
      master: null,
      masterTables: indexNodes(null),
      masterTextStyles: undefined,
      masterRelationships: parseRelationships(null),
    };
  }
  const master = readXml(file, masterPath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  return {
    master,
    masterTables: indexNodes(master),
    masterTextStyles: getByPath(master, ["p:sldMaster", "p:txStyles"]),
    masterRelationships: getRelationships(file, masterPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS),
  };
}

/**
 * Load theme data for a slide
 * @param file - The presentation file
 * @param masterRelationships - Master relationships to find theme reference
 * @returns Theme data with parsed XML and relationships
 */
export function loadThemeData(file: PresentationFile, masterRelationships: ResourceMap): ThemeData {
  const themePath = findThemeFilename(masterRelationships);
  if (themePath === undefined) {
    return {
      theme: null,
      themeRelationships: parseRelationships(null),
      themeOverrides: [],
    };
  }
  const theme = readXml(file, themePath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  const themeOverridePaths = masterRelationships.getAllTargetsByType(RELATIONSHIP_TYPES.THEME_OVERRIDE);
  const themeOverrides = themeOverridePaths
    .map((path) => readXml(file, path, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS))
    .filter((doc): doc is NonNullable<ThemeData["theme"]> => doc !== null);
  return {
    theme,
    themeRelationships: getRelationships(file, themePath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS),
    themeOverrides,
  };
}

/**
 * Load diagram data for a slide
 * @param file - The presentation file
 * @param relationships - Slide relationships to find diagram reference
 * @returns Diagram data with parsed XML and relationships
 */
export function loadDiagramData(file: PresentationFile, relationships: ResourceMap): DiagramData {
  const diagramPath = findDiagramDrawingFilename(relationships);
  if (diagramPath === undefined) {
    return { diagram: null, diagramRelationships: parseRelationships(null) };
  }

  const rawDiagram = readXml(file, diagramPath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  if (rawDiagram === null) {
    return { diagram: null, diagramRelationships: parseRelationships(null) };
  }

  const diagram = transformDiagramNamespace(rawDiagram);
  if (diagram === null) {
    return { diagram: null, diagramRelationships: parseRelationships(null) };
  }

  return {
    diagram,
    diagramRelationships: getRelationships(file, diagramPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS),
  };
}
