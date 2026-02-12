/**
 * @file OPC (Open Packaging Conventions) utilities
 *
 * Common OPC utilities and types shared across all OOXML formats.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

export type {
  PackageFile,
  ZipEntry,
  ZipFile,
  ResourceMap,
  MacroEnabledFormat,
  MacroFormatDetectionResult,
} from "./types";

// Content types parsing and macro detection
export {
  MACRO_ENABLED_CONTENT_TYPES,
  VBA_PROJECT_CONTENT_TYPE,
  XL_MACROSHEET_CONTENT_TYPE,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  XL_MACROSHEET_RELATIONSHIP_TYPE,
  parseContentTypes,
  contentTypesToEntries,
  detectMacroFormat,
  detectMacroFormatFromXml,
} from "./content-types";
export type { ParsedContentTypes } from "./content-types";

export {
  arePartNamesEquivalent,
  isValidPartName,
  assertValidPartName,
} from "./part-name";

export {
  parsePackIri,
  composePackIri,
  createPartBaseIri,
  arePackIrisEquivalent,
  getPackScheme,
} from "./pack-uri";
export type { PackResource } from "./pack-uri";

export { createEmptyResourceMap, createResourceMap, listRelationships } from "./relationships";
export type { ResourceEntry, RelationshipInfo, RelationshipTargetMode } from "./relationships";

export {
  basenamePosixPath,
  dirnamePosixPath,
  joinPosixPath,
  normalizePosixPath,
} from "./path";

export { createGetZipTextFileContentFromBytes } from "./zip";
export type { GetZipTextFileContent } from "./zip";

export { resolveRelationshipTargetPath } from "./relationship-target";

// Zip adapter utilities
export { createZipFileAdapter } from "./zip-adapter";

// Export utilities
export {
  XML_DECLARATION,
  CONTENT_TYPES_NAMESPACE,
  RELATIONSHIPS_NAMESPACE,
  OPC_CONTENT_TYPES,
  OPC_RELATIONSHIP_TYPES,
  serializeWithDeclaration,
  serializeRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  createRelationshipIdGenerator,
} from "./export";
export type {
  OpcRelationship,
  ContentTypeDefault,
  ContentTypeOverride,
  ContentTypeEntry,
} from "./export";

// Office format MIME types and detection utilities
export {
  SPREADSHEET_MIME_TYPES,
  SPREADSHEET_FORMAT_DESCRIPTIONS,
  detectSpreadsheetFormat,
  getSpreadsheetMimeType,
  getSpreadsheetMimeTypeByFileName,
  getSpreadsheetFilePickerType,
  PRESENTATION_MIME_TYPES,
  PRESENTATION_FORMAT_DESCRIPTIONS,
  detectPresentationFormat,
  getPresentationMimeType,
  getPresentationMimeTypeByFileName,
  getPresentationFilePickerType,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_FORMAT_DESCRIPTIONS,
  detectDocumentFormat,
  getDocumentMimeType,
  getDocumentMimeTypeByFileName,
  getDocumentFilePickerType,
} from "./office-formats";
export type {
  SpreadsheetFormat,
  PresentationFormat,
  DocumentFormat,
} from "./office-formats";

// Office file download utilities
export {
  downloadBlob,
  downloadSpreadsheet,
  downloadPresentation,
  downloadDocument,
} from "./download";
export type { DownloadOptions } from "./download";

// OOXML internal content types
export {
  SPREADSHEETML_CONTENT_TYPES,
  PRESENTATIONML_CONTENT_TYPES,
  WORDPROCESSINGML_CONTENT_TYPES,
  DRAWINGML_CONTENT_TYPES,
  OLE_CONTENT_TYPES,
} from "./ooxml-content-types";

// OOXML relationship types
export {
  OFFICE_RELATIONSHIP_TYPES,
  PRESENTATIONML_RELATIONSHIP_TYPES,
  WORDPROCESSINGML_RELATIONSHIP_TYPES,
  SPREADSHEETML_RELATIONSHIP_TYPES,
} from "./ooxml-relationship-types";

// OOXML namespace URIs
export {
  OPC_NAMESPACES,
  OFFICE_NAMESPACES,
  DRAWINGML_NAMESPACES,
  PRESENTATIONML_NAMESPACES,
  WORDPROCESSINGML_NAMESPACES,
  SPREADSHEETML_NAMESPACES,
  MS_OFFICE_NAMESPACES,
  VML_NAMESPACES,
} from "./ooxml-namespaces";

