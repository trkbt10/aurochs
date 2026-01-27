/**
 * @file Slide data loader
 * Loads layout, master, theme, and diagram data for slides
 */

import type { PresentationFile } from "../../domain";
import type { ResourceMap } from "../../domain/opc";
import type { LayoutData, MasterData, ThemeData, DiagramData } from "./data-types";
import {
  loadRelationships,
  findLayoutPath,
  findMasterPath,
  findThemePath,
  findDiagramDrawingPath,
} from "../relationships";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { createEmptyResourceMap } from "../../domain/relationships";
import { getByPath } from "@oxen/xml";
import { indexShapeTreeNodes } from "./shape-tree-indexer";
import { transformDiagramNamespace } from "../diagram/transform";
import { readXml, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "./xml-reader";

/**
 * Load layout data for a slide
 * @param file - The presentation file
 * @param relationships - Slide relationships to find layout reference
 * @returns Layout data with parsed XML, index tables, and relationships
 */
export function loadLayoutData(file: PresentationFile, relationships: ResourceMap): LayoutData {
  const layoutPath = findLayoutPath(relationships);
  if (layoutPath === undefined) {
    return {
      layout: null,
      layoutTables: indexShapeTreeNodes(null),
      layoutRelationships: createEmptyResourceMap(),
    };
  }
  const layout = readXml(file, layoutPath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  return {
    layout,
    layoutTables: indexShapeTreeNodes(layout),
    layoutRelationships: loadRelationships(file, layoutPath),
  };
}

/**
 * Load master data for a slide
 * @param file - The presentation file
 * @param layoutRelationships - Layout relationships to find master reference
 * @returns Master data with parsed XML, index tables, text styles, and relationships
 */
export function loadMasterData(file: PresentationFile, layoutRelationships: ResourceMap): MasterData {
  const masterPath = findMasterPath(layoutRelationships);
  if (masterPath === undefined) {
    return {
      master: null,
      masterTables: indexShapeTreeNodes(null),
      masterTextStyles: undefined,
      masterRelationships: createEmptyResourceMap(),
    };
  }
  const master = readXml(file, masterPath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  return {
    master,
    masterTables: indexShapeTreeNodes(master),
    masterTextStyles: getByPath(master, ["p:sldMaster", "p:txStyles"]),
    masterRelationships: loadRelationships(file, masterPath),
  };
}

/**
 * Load theme data for a slide
 * @param file - The presentation file
 * @param masterRelationships - Master relationships to find theme reference
 * @returns Theme data with parsed XML and relationships
 */
export function loadThemeData(file: PresentationFile, masterRelationships: ResourceMap): ThemeData {
  const themePath = findThemePath(masterRelationships);
  if (themePath === undefined) {
    return {
      theme: null,
      themeRelationships: createEmptyResourceMap(),
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
    themeRelationships: loadRelationships(file, themePath),
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
  const diagramPath = findDiagramDrawingPath(relationships);
  if (diagramPath === undefined) {
    return { diagram: null, diagramRelationships: createEmptyResourceMap() };
  }

  const rawDiagram = readXml(file, diagramPath, 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  if (rawDiagram === null) {
    return { diagram: null, diagramRelationships: createEmptyResourceMap() };
  }

  const diagram = transformDiagramNamespace(rawDiagram);
  if (diagram === null) {
    return { diagram: null, diagramRelationships: createEmptyResourceMap() };
  }

  return {
    diagram,
    diagramRelationships: loadRelationships(file, diagramPath),
  };
}
