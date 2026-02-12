/**
 * @file OPC Content Types utilities
 *
 * Parsing and detection utilities for [Content_Types].xml in OPC packages.
 * Includes macro-enabled format detection per MS-OFFMACRO2 specification.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see MS-OFFMACRO2 (Office Macro-Enabled File Format)
 */

import { isXmlElement, type XmlDocument } from "@aurochs/xml";
import type { MacroEnabledFormat, MacroFormatDetectionResult } from "./types";
import type { ContentTypeDefault, ContentTypeOverride, ContentTypeEntry } from "./export";

// =============================================================================
// Macro-Enabled Content Types (MS-OFFMACRO2)
// =============================================================================

/**
 * Main content type values for macro-enabled formats.
 *
 * @see MS-OFFMACRO2 Section 2.2.1.3 (Workbook)
 * @see MS-OFFMACRO2 Section 2.2.1.4 (VBA Project)
 */
export const MACRO_ENABLED_CONTENT_TYPES = {
  /** xlsm - Excel macro-enabled workbook */
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.main+xml",
  /** docm - Word macro-enabled document */
  docm: "application/vnd.ms-word.document.macroEnabled.main+xml",
  /** pptm - PowerPoint macro-enabled presentation */
  pptm: "application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml",
  /** ppsm - PowerPoint macro-enabled slideshow */
  ppsm: "application/vnd.ms-powerpoint.slideshow.macroEnabled.main+xml",
} as const;

/**
 * VBA Project content type (shared across all formats).
 *
 * @see MS-OFFMACRO2 Section 2.2.1.4
 */
export const VBA_PROJECT_CONTENT_TYPE = "application/vnd.ms-office.vbaProject";

/**
 * Excel macro sheet content type.
 *
 * @see MS-OFFMACRO2 Section 2.2.1.5
 */
export const XL_MACROSHEET_CONTENT_TYPE = "application/vnd.ms-excel.macrosheet+xml";

// =============================================================================
// Macro-Enabled Relationship Types (MS-OFFMACRO2)
// =============================================================================

/**
 * VBA Project relationship type (shared across all formats).
 *
 * @see MS-OFFMACRO2 Section 2.2.1.4
 */
export const VBA_PROJECT_RELATIONSHIP_TYPE =
  "http://schemas.microsoft.com/office/2006/relationships/vbaProject";

/**
 * Excel macro sheet relationship type.
 *
 * @see MS-OFFMACRO2 Section 2.2.1.5
 */
export const XL_MACROSHEET_RELATIONSHIP_TYPE =
  "http://schemas.microsoft.com/office/2006/relationships/xlMacrosheet";

// =============================================================================
// Content Types Parsing
// =============================================================================

/**
 * Parsed content types from [Content_Types].xml.
 */
export type ParsedContentTypes = {
  /** Default content types by file extension (without dot) */
  readonly defaults: ReadonlyMap<string, string>;
  /** Override content types by part name (with leading slash) */
  readonly overrides: ReadonlyMap<string, string>;
};

/**
 * Parse [Content_Types].xml document.
 *
 * @param contentTypesXml - Parsed XML document of [Content_Types].xml
 * @returns Parsed content types with defaults and overrides maps
 *
 * @example
 * ```typescript
 * const doc = parseXml(contentTypesXmlText);
 * const contentTypes = parseContentTypes(doc);
 * const mainType = contentTypes.overrides.get("/xl/workbook.xml");
 * ```
 */
export function parseContentTypes(contentTypesXml: XmlDocument): ParsedContentTypes {
  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();

  const root = contentTypesXml.children.find(isXmlElement);
  if (!root || root.name !== "Types") {
    return { defaults, overrides };
  }

  for (const child of root.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    if (child.name === "Default") {
      const extension = child.attrs.Extension;
      const contentType = child.attrs.ContentType;
      if (extension && contentType) {
        defaults.set(extension.toLowerCase(), contentType);
      }
    } else if (child.name === "Override") {
      const partName = child.attrs.PartName;
      const contentType = child.attrs.ContentType;
      if (partName && contentType) {
        overrides.set(partName, contentType);
      }
    }
  }

  return { defaults, overrides };
}

/**
 * Convert parsed content types back to ContentTypeEntry array.
 *
 * @param parsed - Parsed content types
 * @returns Array of content type entries suitable for serialization
 */
export function contentTypesToEntries(parsed: ParsedContentTypes): ContentTypeEntry[] {
  const entries: ContentTypeEntry[] = [];

  for (const [extension, contentType] of parsed.defaults) {
    entries.push({ kind: "default", extension, contentType } satisfies ContentTypeDefault);
  }

  for (const [partName, contentType] of parsed.overrides) {
    entries.push({ kind: "override", partName, contentType } satisfies ContentTypeOverride);
  }

  return entries;
}

// =============================================================================
// Macro Format Detection
// =============================================================================

/**
 * Reverse mapping from content type to macro format.
 * Used for efficient lookup during detection.
 */
const CONTENT_TYPE_TO_FORMAT: ReadonlyMap<string, MacroEnabledFormat> = new Map([
  [MACRO_ENABLED_CONTENT_TYPES.xlsm, "xlsm"],
  [MACRO_ENABLED_CONTENT_TYPES.docm, "docm"],
  [MACRO_ENABLED_CONTENT_TYPES.pptm, "pptm"],
  [MACRO_ENABLED_CONTENT_TYPES.ppsm, "ppsm"],
]);

/**
 * Main part paths for each document type.
 * Used to locate the main content type override.
 */
const MAIN_PART_PATHS: readonly string[] = [
  "/xl/workbook.xml", // xlsx, xlsm
  "/word/document.xml", // docx, docm
  "/ppt/presentation.xml", // pptx, pptm, ppsm
];

/**
 * Detect macro-enabled format from parsed content types.
 *
 * Examines the main part content type to determine if the package
 * is a macro-enabled format (xlsm, docm, pptm, ppsm).
 *
 * @param contentTypes - Parsed content types from [Content_Types].xml
 * @returns Detected macro format or null if not macro-enabled
 *
 * @example
 * ```typescript
 * const doc = parseXml(contentTypesXmlText);
 * const contentTypes = parseContentTypes(doc);
 * const format = detectMacroFormat(contentTypes);
 * if (format) {
 *   console.log(`Macro-enabled format: ${format}`);
 * }
 * ```
 */
export function detectMacroFormat(contentTypes: ParsedContentTypes): MacroFormatDetectionResult {
  for (const mainPartPath of MAIN_PART_PATHS) {
    const contentType = contentTypes.overrides.get(mainPartPath);
    if (contentType) {
      const format = CONTENT_TYPE_TO_FORMAT.get(contentType);
      if (format) {
        return format;
      }
    }
  }
  return null;
}

/**
 * Detect macro-enabled format from [Content_Types].xml document.
 *
 * Convenience function that combines parsing and detection.
 *
 * @param contentTypesXml - Parsed XML document of [Content_Types].xml
 * @returns Detected macro format or null if not macro-enabled
 *
 * @example
 * ```typescript
 * const doc = parseXml(contentTypesXmlText);
 * const format = detectMacroFormatFromXml(doc);
 * ```
 */
export function detectMacroFormatFromXml(contentTypesXml: XmlDocument): MacroFormatDetectionResult {
  return detectMacroFormat(parseContentTypes(contentTypesXml));
}
