/**
 * @file Slide loading pipeline
 *
 * Loads the OPC part chain for a slide:
 *   slide → layout → master → theme (+ diagram)
 *
 * Each load function follows the OPC relationship chain to read
 * and return parsed XML documents with their associated relationships.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlDocument } from "@aurochs/xml";
import type { PresentationFile } from "../../domain";
import type { ResourceMap } from "@aurochs-office/opc";
import type { IndexTables } from "./shape-tree-indexer";
import {
  loadRelationships,
  findLayoutPath,
  findMasterPath,
  findThemePath,
  findDiagramDrawingPath,
} from "../relationships";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { createEmptyResourceMap } from "../../domain/relationships";
import { indexShapeTreeNodes } from "./shape-tree-indexer";
import { transformDiagramNamespace } from "./diagram-transform";
import { readPart } from "../part-reader";

// =============================================================================
// Types — return types for each stage of the loading pipeline
// =============================================================================

/**
 * Complete slide data assembled from the OPC part chain.
 * Used by slide-builder to construct the API Slide object.
 */
export type SlideData = {
  /** Slide number (1-based) */
  number: number;
  /** Filename without extension */
  filename: string;
  /** Parsed slide content (p:sld) */
  content: XmlDocument;
  /** Parsed slide layout (p:sldLayout) */
  layout: XmlDocument | null;
  /** Layout index tables for shape lookup */
  layoutTables: IndexTables;
  /** Parsed slide master (p:sldMaster) */
  master: XmlDocument | null;
  /** Master index tables for shape lookup */
  masterTables: IndexTables;
  /** Parsed theme (a:theme) */
  theme: XmlDocument | null;
  /** Slide relationships */
  relationships: ResourceMap;
  /** Layout relationships */
  layoutRelationships: ResourceMap;
  /** Master relationships */
  masterRelationships: ResourceMap;
  /** Theme relationships */
  themeRelationships: ResourceMap;
  /** Theme override documents */
  themeOverrides: XmlDocument[];
  /** Diagram content if present */
  diagram: XmlDocument | null;
  /** Diagram relationships */
  diagramRelationships: ResourceMap;
};

/** Layout data loaded via slide → layout relationship */
export type LayoutData = {
  layout: XmlDocument | null;
  layoutTables: IndexTables;
  layoutRelationships: ResourceMap;
};

/** Master data loaded via layout → master relationship */
export type MasterData = {
  master: XmlDocument | null;
  masterTables: IndexTables;
  masterRelationships: ResourceMap;
};

/** Theme data loaded via master → theme relationship */
export type ThemeData = {
  theme: XmlDocument | null;
  themeRelationships: ResourceMap;
  themeOverrides: XmlDocument[];
};

/** Diagram data loaded via slide → diagram relationship */
export type DiagramData = {
  diagram: XmlDocument | null;
  diagramRelationships: ResourceMap;
};

// =============================================================================
// Loading functions
// =============================================================================

/**
 * Load layout data for a slide.
 * @param file - The presentation file
 * @param relationships - Slide relationships to find layout reference
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
  const layout = readPart(file, layoutPath);
  return {
    layout,
    layoutTables: indexShapeTreeNodes(layout),
    layoutRelationships: loadRelationships(file, layoutPath),
  };
}

/**
 * Load master data for a slide.
 * @param file - The presentation file
 * @param layoutRelationships - Layout relationships to find master reference
 */
export function loadMasterData(file: PresentationFile, layoutRelationships: ResourceMap): MasterData {
  const masterPath = findMasterPath(layoutRelationships);
  if (masterPath === undefined) {
    return {
      master: null,
      masterTables: indexShapeTreeNodes(null),
      masterRelationships: createEmptyResourceMap(),
    };
  }
  const master = readPart(file, masterPath);
  return {
    master,
    masterTables: indexShapeTreeNodes(master),
    masterRelationships: loadRelationships(file, masterPath),
  };
}

/**
 * Load theme data for a slide.
 * @param file - The presentation file
 * @param masterRelationships - Master relationships to find theme reference
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
  const theme = readPart(file, themePath);
  const themeOverridePaths = masterRelationships.getAllTargetsByType(RELATIONSHIP_TYPES.THEME_OVERRIDE);
  const themeOverrides = themeOverridePaths
    .map((path) => readPart(file, path))
    .filter((doc): doc is NonNullable<ThemeData["theme"]> => doc !== null);
  return {
    theme,
    themeRelationships: loadRelationships(file, themePath),
    themeOverrides,
  };
}

/**
 * Load diagram data for a slide.
 * @param file - The presentation file
 * @param relationships - Slide relationships to find diagram reference
 */
export function loadDiagramData(file: PresentationFile, relationships: ResourceMap): DiagramData {
  const diagramPath = findDiagramDrawingPath(relationships);
  if (diagramPath === undefined) {
    return { diagram: null, diagramRelationships: createEmptyResourceMap() };
  }

  const rawDiagram = readPart(file, diagramPath);
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
