/**
 * @file Slide content indexing types
 *
 * Pure domain types for slide node classification.
 *
 * NOTE: IndexTables (containing XmlElement references) has been moved to
 * parser/slide/shape-tree-indexer.ts. Import from there if needed.
 */

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
