/**
 * @file DOCX Exporter
 *
 * Generates DOCX (Office Open XML WordprocessingML) packages from DocxDocument.
 * Creates OPC-compliant ZIP packages with proper content types and relationships.
 * Supports macro-enabled formats (docm) via pass-through preservation.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 * @see MS-OFFMACRO2 (Office Macro-Enabled File Format)
 */

import type { XmlElement } from "@aurochs/xml";
import { parseXml } from "@aurochs/xml";
import { createEmptyZipPackage, isBinaryFile, type ZipPackage } from "@aurochs/zip";
import {
  serializeWithDeclaration,
  serializeRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  createRelationshipIdGenerator,
  listRelationships,
  parseContentTypes,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  type OpcRelationship,
  type ContentTypeEntry,
  type ParsedContentTypes,
} from "@aurochs-office/opc";
import type { DocxDocument, DocxHeader, DocxFooter } from "./domain/document";
import type { DocxRelId } from "./domain/types";
import { serializeDocument } from "./serializer/document";
import { serializeStyles } from "./serializer/styles";
import { serializeNumbering } from "./serializer/numbering";
import { serializeHeader, serializeFooter } from "./serializer/header-footer";
import { CONTENT_TYPES, RELATIONSHIP_TYPES } from "./constants";

// =============================================================================
// Content Types Generation
// =============================================================================

/**
 * Generate [Content_Types].xml element.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see MS-OFFMACRO2 Section 2.2.1.4 (macroEnabled content types)
 */
/** Image content types by extension. */
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  webp: "image/webp",
};

/**
 * Options for content types generation.
 */
type GenerateContentTypesOptions = {
  /**
   * Parsed content types from source package.
   * Used to preserve macro-related content types.
   */
  readonly sourceContentTypes?: ParsedContentTypes;
};

function generateContentTypes(
  document: DocxDocument,
  headerFooterPaths: { headers: string[]; footers: string[] },
  media?: readonly MediaFile[],
  options: GenerateContentTypesOptions = {},
): XmlElement {
  const { sourceContentTypes } = options;

  // Determine main document content type
  // Preserve macroEnabled if source had it
  const sourceDocumentContentType = sourceContentTypes?.overrides.get("/word/document.xml");
  const isMacroEnabled = sourceDocumentContentType === CONTENT_TYPES.documentMacroEnabled;
  const documentContentType = isMacroEnabled
    ? CONTENT_TYPES.documentMacroEnabled
    : CONTENT_TYPES.document;

  const entries: ContentTypeEntry[] = [
    // Standard defaults (rels, xml)
    ...STANDARD_CONTENT_TYPE_DEFAULTS,
    // Main document (macroEnabled or standard)
    { kind: "override", partName: "/word/document.xml", contentType: documentContentType },
  ];

  // Override for styles if present
  if (document.styles) {
    entries.push({ kind: "override", partName: "/word/styles.xml", contentType: CONTENT_TYPES.styles });
  }

  // Override for numbering if present
  if (document.numbering) {
    entries.push({ kind: "override", partName: "/word/numbering.xml", contentType: CONTENT_TYPES.numbering });
  }

  // Override for headers
  for (const path of headerFooterPaths.headers) {
    entries.push({ kind: "override", partName: `/${path}`, contentType: CONTENT_TYPES.header });
  }

  // Override for footers
  for (const path of headerFooterPaths.footers) {
    entries.push({ kind: "override", partName: `/${path}`, contentType: CONTENT_TYPES.footer });
  }

  // Default content types for image extensions
  if (media && media.length > 0) {
    const addedExtensions = new Set<string>();
    for (const m of media) {
      const ext = m.filename.split(".").pop()?.toLowerCase();
      if (ext && IMAGE_CONTENT_TYPES[ext] && !addedExtensions.has(ext)) {
        entries.push({ kind: "default", extension: ext, contentType: IMAGE_CONTENT_TYPES[ext] });
        addedExtensions.add(ext);
      }
    }
  }

  // If we have source content types, preserve macro-related entries
  if (sourceContentTypes) {
    // Preserve defaults we don't generate (like .bin for vbaProject)
    const addedExtensions = new Set(
      entries.filter((e) => e.kind === "default").map((e) => (e as { extension: string }).extension),
    );
    for (const [extension, contentType] of sourceContentTypes.defaults) {
      if (!addedExtensions.has(extension)) {
        entries.push({ kind: "default", extension, contentType });
      }
    }

    // Preserve overrides we don't generate (vbaProject.bin, etc.)
    const generatedPartNames = new Set(
      entries.filter((e) => e.kind === "override").map((e) => (e as { partName: string }).partName),
    );
    for (const [partName, contentType] of sourceContentTypes.overrides) {
      if (!generatedPartNames.has(partName)) {
        entries.push({ kind: "override", partName, contentType });
      }
    }
  }

  return serializeContentTypes(entries);
}

// =============================================================================
// Root Relationships Generation
// =============================================================================

/**
 * Generate _rels/.rels element (root relationships).
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
function generateRootRels(): XmlElement {
  const relationships: OpcRelationship[] = [
    {
      id: "rId1",
      type: RELATIONSHIP_TYPES.officeDocument,
      target: "word/document.xml",
    },
  ];

  return serializeRelationships(relationships);
}

// =============================================================================
// Document Relationships Generation
// =============================================================================

/**
 * Options for document relationships generation.
 */
type GenerateDocumentRelsOptions = {
  /**
   * Source package to read existing relationships from.
   * Used to preserve macro-related relationships (vbaProject).
   */
  readonly sourcePackage?: ZipPackage;
};

/**
 * Relationship types that should be preserved from source (macro-related).
 */
const PRESERVE_RELATIONSHIP_TYPES = new Set([
  VBA_PROJECT_RELATIONSHIP_TYPE,
]);

/**
 * Generate word/_rels/document.xml.rels element.
 *
 * When sourcePackage is provided, preserves macro-related relationships
 * (vbaProject) from the source.
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 * @see MS-OFFMACRO2 Section 2.2.1.4 (vbaProject relationship)
 */
function generateDocumentRels(
  document: DocxDocument,
  headerFooterRels: { headers: Map<DocxRelId, string>; footers: Map<DocxRelId, string> },
  media?: readonly MediaFile[],
  options: GenerateDocumentRelsOptions = {},
): XmlElement {
  const { sourcePackage } = options;

  const relationships: OpcRelationship[] = [];
  const usedIds = new Set<string>();
  const nextId = createRelationshipIdGenerator();

  // Helper to get next available ID
  const getNextId = (): string => {
    // eslint-disable-next-line no-constant-condition -- generator loop
    while (true) {
      const id = nextId();
      if (!usedIds.has(id)) {
        usedIds.add(id);
        return id;
      }
    }
  };

  // First, preserve macro-related relationships from source
  if (sourcePackage) {
    const relsXml = sourcePackage.readText("word/_rels/document.xml.rels");
    if (relsXml) {
      const relsDoc = parseXml(relsXml);
      const sourceRels = listRelationships(relsDoc);
      for (const rel of sourceRels) {
        if (PRESERVE_RELATIONSHIP_TYPES.has(rel.type)) {
          relationships.push({
            id: rel.id,
            type: rel.type,
            target: rel.target,
            targetMode: rel.targetMode,
          });
          usedIds.add(rel.id);
        }
      }
    }
  }

  // Relationship for styles
  if (document.styles) {
    relationships.push({
      id: getNextId(),
      type: RELATIONSHIP_TYPES.styles,
      target: "styles.xml",
    });
  }

  // Relationship for numbering
  if (document.numbering) {
    relationships.push({
      id: getNextId(),
      type: RELATIONSHIP_TYPES.numbering,
      target: "numbering.xml",
    });
  }

  // Relationships for headers
  for (const [rId, filename] of headerFooterRels.headers) {
    relationships.push({
      id: rId,
      type: RELATIONSHIP_TYPES.header,
      target: filename,
    });
    usedIds.add(rId);
  }

  // Relationships for footers
  for (const [rId, filename] of headerFooterRels.footers) {
    relationships.push({
      id: rId,
      type: RELATIONSHIP_TYPES.footer,
      target: filename,
    });
    usedIds.add(rId);
  }

  // Relationships for media (images)
  if (media) {
    for (const m of media) {
      relationships.push({
        id: m.rId,
        type: RELATIONSHIP_TYPES.image,
        target: `media/${m.filename}`,
      });
      usedIds.add(m.rId);
    }
  }

  // Add any existing relationships from the document
  if (document.relationships?.relationship) {
    for (const rel of document.relationships.relationship) {
      // Skip internal relationships we're handling ourselves
      if (rel.type === RELATIONSHIP_TYPES.styles || rel.type === RELATIONSHIP_TYPES.numbering ||
          rel.type === RELATIONSHIP_TYPES.header || rel.type === RELATIONSHIP_TYPES.footer ||
          rel.type === RELATIONSHIP_TYPES.image) {
        continue;
      }
      // Skip if already added (e.g., vbaProject from source)
      if (usedIds.has(rel.id)) {
        continue;
      }
      relationships.push({
        id: rel.id,
        type: rel.type,
        target: rel.target,
        targetMode: rel.targetMode === "External" ? "External" : undefined,
      });
      usedIds.add(rel.id);
    }
  }

  return serializeRelationships(relationships);
}

// =============================================================================
// Export Options
// =============================================================================

/**
 * Media file to include in the DOCX.
 */
export type MediaFile = {
  /** Relationship ID for this media file */
  readonly rId: string;
  /** File path within word/media/ */
  readonly filename: string;
  /** File content */
  readonly data: Uint8Array | string;
};

/**
 * Options for DOCX export.
 */
export type ExportDocxOptions = {
  /** Whether to include styles.xml (default: true if styles present) */
  readonly includeStyles?: boolean;
  /** Whether to include numbering.xml (default: true if numbering present) */
  readonly includeNumbering?: boolean;
  /** Media files (images) to include */
  readonly media?: readonly MediaFile[];
  /**
   * Source package to preserve macro-related parts from.
   * When provided, all files from the source are copied first,
   * then the edited files are overwritten.
   *
   * This enables macro preservation for docm files.
   */
  readonly sourcePackage?: ZipPackage;
};

// =============================================================================
// Pass-through Helpers
// =============================================================================

/**
 * Files that are always regenerated (not copied from source).
 * These are the core document structure files.
 */
const REGENERATED_FILE_PATTERNS = [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/document.xml",
  "word/_rels/document.xml.rels",
  "word/styles.xml",
  "word/numbering.xml",
  /^word\/header\d+\.xml$/,
  /^word\/footer\d+\.xml$/,
  /^word\/media\//,
];

/**
 * Check if a file should be regenerated (not copied from source).
 */
function isRegeneratedFile(path: string): boolean {
  for (const pattern of REGENERATED_FILE_PATTERNS) {
    if (typeof pattern === "string") {
      if (path === pattern || path.startsWith(pattern)) return true;
    } else if (pattern.test(path)) {
      return true;
    }
  }
  return false;
}

/**
 * Copy all files from source package to destination, except regenerated files.
 *
 * This enables pass-through preservation of macro-related parts
 * (vbaProject.bin, etc.) and other unknown parts.
 */
function copySourcePackageFiles(source: ZipPackage, dest: ZipPackage): void {
  const files = source.listFiles();
  for (const path of files) {
    if (isRegeneratedFile(path)) {
      continue;
    }
    if (isBinaryFile(path)) {
      const content = source.readBinary(path);
      if (content) {
        dest.writeBinary(path, content);
      }
    } else {
      const content = source.readText(path);
      if (content) {
        dest.writeText(path, content);
      }
    }
  }
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a DocxDocument to a DOCX package (ZIP archive).
 *
 * This is the main entry point for DOCX export.
 *
 * When options.sourcePackage is provided (pass-through mode):
 * - All files from source are copied first (preserving macros, etc.)
 * - Only the core document files are regenerated
 * - Macro-related content types and relationships are preserved
 *
 * Export order:
 * 1. Copy source files (if pass-through mode)
 * 2. Generate word/document.xml
 * 3. Generate word/styles.xml (if present)
 * 4. Generate word/numbering.xml (if present)
 * 5. Generate headers/footers (if present)
 * 6. Write media files (if present)
 * 7. Generate word/_rels/document.xml.rels
 * 8. Generate _rels/.rels
 * 9. Generate [Content_Types].xml
 * 10. Write all files to ZIP package
 *
 * @param document - The document to export
 * @param options - Export options
 * @returns Uint8Array containing the DOCX file data
 *
 * @see ECMA-376 Part 2 (OPC)
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 * @see MS-OFFMACRO2 (macro-enabled format preservation)
 *
 * @example
 * ```typescript
 * // Standard export (new file)
 * const docxData = await exportDocx(document);
 *
 * // Pass-through export (preserve macros from source)
 * const docmData = await exportDocx(document, { sourcePackage });
 * ```
 */
export async function exportDocx(document: DocxDocument, options: ExportDocxOptions = {}): Promise<Uint8Array> {
  const { sourcePackage } = options;
  const pkg = createEmptyZipPackage();

  // 0. Parse source content types for preservation (if pass-through mode)
  let sourceContentTypes: ParsedContentTypes | undefined;
  if (sourcePackage) {
    const contentTypesXml = sourcePackage.readText("[Content_Types].xml");
    if (contentTypesXml) {
      const contentTypesDoc = parseXml(contentTypesXml);
      sourceContentTypes = parseContentTypes(contentTypesDoc);
    }
  }

  // 1. Copy source files (if pass-through mode)
  if (sourcePackage) {
    copySourcePackageFiles(sourcePackage, pkg);
  }

  const includeStyles = options.includeStyles ?? !!document.styles;
  const includeNumbering = options.includeNumbering ?? !!document.numbering;

  // Track header/footer paths for content types and relationships
  const headerFooterPaths = { headers: [] as string[], footers: [] as string[] };
  const headerFooterRels = { headers: new Map<DocxRelId, string>(), footers: new Map<DocxRelId, string>() };

  // 2. Generate word/document.xml
  const documentXml = serializeDocument(document);
  pkg.writeText("word/document.xml", serializeWithDeclaration(documentXml));

  // 3. Generate word/styles.xml (if present)
  if (includeStyles && document.styles) {
    const stylesXml = serializeStyles(document.styles);
    pkg.writeText("word/styles.xml", serializeWithDeclaration(stylesXml));
  }

  // 4. Generate word/numbering.xml (if present)
  if (includeNumbering && document.numbering) {
    const numberingXml = serializeNumbering(document.numbering);
    pkg.writeText("word/numbering.xml", serializeWithDeclaration(numberingXml));
  }

  // 5. Generate headers (if present)
  if (document.headers) {
    let headerIndex = 1;
    for (const [rId, header] of document.headers) {
      const filename = `header${headerIndex}.xml`;
      const path = `word/${filename}`;
      const headerXml = serializeHeader(header);
      pkg.writeText(path, serializeWithDeclaration(headerXml));
      headerFooterPaths.headers.push(path);
      headerFooterRels.headers.set(rId, filename);
      headerIndex++;
    }
  }

  // 6. Generate footers (if present)
  if (document.footers) {
    let footerIndex = 1;
    for (const [rId, footer] of document.footers) {
      const filename = `footer${footerIndex}.xml`;
      const path = `word/${filename}`;
      const footerXml = serializeFooter(footer);
      pkg.writeText(path, serializeWithDeclaration(footerXml));
      headerFooterPaths.footers.push(path);
      headerFooterRels.footers.set(rId, filename);
      footerIndex++;
    }
  }

  // 7. Write media files (if present)
  const media = options.media;
  if (media) {
    for (const m of media) {
      const path = `word/media/${m.filename}`;
      if (typeof m.data === "string") {
        // Base64 encoded data
        const binaryString = atob(m.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        pkg.writeBinary(path, bytes);
      } else {
        pkg.writeBinary(path, m.data);
      }
    }
  }

  // 8. Generate word/_rels/document.xml.rels (preserve macro relationships)
  const documentRelsXml = generateDocumentRels(document, headerFooterRels, media, { sourcePackage });
  pkg.writeText("word/_rels/document.xml.rels", serializeWithDeclaration(documentRelsXml));

  // 9. Generate _rels/.rels
  const rootRelsXml = generateRootRels();
  pkg.writeText("_rels/.rels", serializeWithDeclaration(rootRelsXml));

  // 10. Generate [Content_Types].xml (preserve macro content types)
  const contentTypesXml = generateContentTypes(document, headerFooterPaths, media, { sourceContentTypes });
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));

  // 11. Write ZIP package
  const buffer = await pkg.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}

/**
 * Export a DocxDocument to a Blob (browser).
 *
 * @param document - The document to export
 * @param options - Export options
 * @returns Blob containing the DOCX file data
 *
 * @example
 * ```typescript
 * const document: DocxDocument = { ... };
 * const blob = await exportDocxToBlob(document);
 * const url = URL.createObjectURL(blob);
 * ```
 */
export async function exportDocxToBlob(document: DocxDocument, options: ExportDocxOptions = {}): Promise<Blob> {
  const data = await exportDocx(document, options);
  return new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
