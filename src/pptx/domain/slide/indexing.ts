/**
 * @file Slide content indexing types
 *
 * Types for indexing slide XML nodes by id, placeholder idx, and placeholder type.
 */

import type { XmlElement } from "../../../xml";

/**
 * Index tables for slide content.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 * - idx: xsd:unsignedInt - Placeholder index for matching
 * - type: ST_PlaceholderType - Placeholder type (title, body, etc.)
 */
export type IndexTables = {
  /** Shapes indexed by p:cNvPr/@id (string in XML) */
  idTable: Record<string, XmlElement>;
  /**
   * Shapes indexed by p:ph/@idx (numeric per ECMA-376 xsd:unsignedInt).
   * @see ECMA-376 Part 1, Section 19.3.1.36
   */
  idxTable: Map<number, XmlElement>;
  /** Shapes indexed by p:ph/@type (string enum ST_PlaceholderType) */
  typeTable: Record<string, XmlElement>;
};

/**
 * Node type in slide
 * @see ECMA-376 Part 1, Section 19.3.1.43 (spTree)
 */
export type SlideNodeType =
  | "p:sp"
  | "p:pic"
  | "p:graphicFrame"
  | "p:cxnSp"
  | "p:grpSp"
  | "mc:AlternateContent";
