/**
 * @file DOCX Exporter
 *
 * Generates DOCX (Office Open XML WordprocessingML) packages from DocxDocument.
 * Creates OPC-compliant ZIP packages with proper content types and relationships.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

import type { XmlElement } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import {
  serializeWithDeclaration,
  serializeRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  createRelationshipIdGenerator,
  type OpcRelationship,
  type ContentTypeEntry,
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

function generateContentTypes(
  document: DocxDocument,
  headerFooterPaths: { headers: string[]; footers: string[] },
  media?: readonly MediaFile[]
): XmlElement {
  const entries: ContentTypeEntry[] = [
    // Standard defaults (rels, xml)
    ...STANDARD_CONTENT_TYPE_DEFAULTS,
    // Main document
    { kind: "override", partName: "/word/document.xml", contentType: CONTENT_TYPES.document },
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
 * Generate word/_rels/document.xml.rels element.
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 */
function generateDocumentRels(
  document: DocxDocument,
  headerFooterRels: { headers: Map<DocxRelId, string>; footers: Map<DocxRelId, string> },
  media?: readonly MediaFile[]
): XmlElement {
  const relationships: OpcRelationship[] = [];
  const nextId = createRelationshipIdGenerator();

  // Relationship for styles
  if (document.styles) {
    relationships.push({
      id: nextId(),
      type: RELATIONSHIP_TYPES.styles,
      target: "styles.xml",
    });
  }

  // Relationship for numbering
  if (document.numbering) {
    relationships.push({
      id: nextId(),
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
  }

  // Relationships for footers
  for (const [rId, filename] of headerFooterRels.footers) {
    relationships.push({
      id: rId,
      type: RELATIONSHIP_TYPES.footer,
      target: filename,
    });
  }

  // Relationships for media (images)
  if (media) {
    for (const m of media) {
      relationships.push({
        id: m.rId,
        type: RELATIONSHIP_TYPES.image,
        target: `media/${m.filename}`,
      });
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
      relationships.push({
        id: rel.id,
        type: rel.type,
        target: rel.target,
        targetMode: rel.targetMode === "External" ? "External" : undefined,
      });
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
};

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a DocxDocument to a DOCX package (ZIP archive).
 *
 * This is the main entry point for DOCX export.
 *
 * Export order:
 * 1. Generate word/document.xml
 * 2. Generate word/styles.xml (if present)
 * 3. Generate word/numbering.xml (if present)
 * 4. Generate word/_rels/document.xml.rels
 * 5. Generate _rels/.rels
 * 6. Generate [Content_Types].xml
 * 7. Write all files to ZIP package
 *
 * @param document - The document to export
 * @param options - Export options
 * @returns Uint8Array containing the DOCX file data
 *
 * @see ECMA-376 Part 2 (OPC)
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 *
 * @example
 * ```typescript
 * const document: DocxDocument = { ... };
 * const docxData = await exportDocx(document);
 * // docxData is Uint8Array of the DOCX file
 * ```
 */
export async function exportDocx(document: DocxDocument, options: ExportDocxOptions = {}): Promise<Uint8Array> {
  const pkg = createEmptyZipPackage();

  const includeStyles = options.includeStyles ?? !!document.styles;
  const includeNumbering = options.includeNumbering ?? !!document.numbering;

  // Track header/footer paths for content types and relationships
  const headerFooterPaths = { headers: [] as string[], footers: [] as string[] };
  const headerFooterRels = { headers: new Map<DocxRelId, string>(), footers: new Map<DocxRelId, string>() };

  // 1. Generate word/document.xml
  const documentXml = serializeDocument(document);
  pkg.writeText("word/document.xml", serializeWithDeclaration(documentXml));

  // 2. Generate word/styles.xml (if present)
  if (includeStyles && document.styles) {
    const stylesXml = serializeStyles(document.styles);
    pkg.writeText("word/styles.xml", serializeWithDeclaration(stylesXml));
  }

  // 3. Generate word/numbering.xml (if present)
  if (includeNumbering && document.numbering) {
    const numberingXml = serializeNumbering(document.numbering);
    pkg.writeText("word/numbering.xml", serializeWithDeclaration(numberingXml));
  }

  // 4. Generate headers (if present)
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

  // 5. Generate footers (if present)
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

  // 6. Write media files (if present)
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

  // 7. Generate word/_rels/document.xml.rels
  const documentRelsXml = generateDocumentRels(document, headerFooterRels, media);
  pkg.writeText("word/_rels/document.xml.rels", serializeWithDeclaration(documentRelsXml));

  // 8. Generate _rels/.rels
  const rootRelsXml = generateRootRels();
  pkg.writeText("_rels/.rels", serializeWithDeclaration(rootRelsXml));

  // 9. Generate [Content_Types].xml
  const contentTypesXml = generateContentTypes(document, headerFooterPaths, media);
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));

  // 9. Write ZIP package
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
