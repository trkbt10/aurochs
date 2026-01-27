/**
 * @file Internal types for slide data processing
 *
 * Types used for slide loading and processing in the parser layer.
 * These types contain XML document references and are not part of the
 * pure domain model.
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import type { IndexTables } from "./shape-tree-indexer";
import type { ResourceMap } from "../../domain/opc";

/**
 * Complete slide data for creating Slide objects
 * Contains all parsed XML and relationships needed for rendering
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
  /** Master text styles (p:txStyles) */
  masterTextStyles: XmlElement | undefined;
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

/**
 * Layout data loaded from slide relationships
 */
export type LayoutData = {
  layout: XmlDocument | null;
  layoutTables: IndexTables;
  layoutRelationships: ResourceMap;
};

/**
 * Master data loaded from layout relationships
 */
export type MasterData = {
  master: XmlDocument | null;
  masterTables: IndexTables;
  masterTextStyles: XmlElement | undefined;
  masterRelationships: ResourceMap;
};

/**
 * Theme data loaded from master relationships
 */
export type ThemeData = {
  theme: XmlDocument | null;
  themeRelationships: ResourceMap;
  themeOverrides: XmlDocument[];
};

/**
 * Diagram data loaded from slide relationships
 */
export type DiagramData = {
  diagram: XmlDocument | null;
  diagramRelationships: ResourceMap;
};
