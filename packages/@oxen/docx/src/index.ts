/**
 * @file DOCX Module Index
 *
 * Main entry point for DOCX parsing and serialization.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

// Constants
export {
  NS_WORDPROCESSINGML,
  NS_DRAWINGML,
  NS_DRAWINGML_PICTURE,
  NS_DRAWINGML_WORDPROCESSING,
  NS_RELATIONSHIPS,
  NS_CONTENT_TYPES,
  NS_PACKAGE_RELATIONSHIPS,
  NS_VML,
  NS_VML_OFFICE,
  NS_VML_WORD,
  NS_MATH,
  NAMESPACE_PREFIXES,
  RELATIONSHIP_TYPES,
  CONTENT_TYPES,
  DEFAULT_PART_PATHS,
} from "./constants";

// Domain types
export * from "./domain";

// Parser
export * from "./parser";

// Serializer
export * from "./serializer";

// Document loader
export { loadDocx, loadDocxFromFile, type LoadDocxOptions } from "./document-parser";

// Document exporter
export { exportDocx, exportDocxToBlob, type ExportDocxOptions } from "./exporter";
