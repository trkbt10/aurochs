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
import type { DocxDocument } from "./domain/document";
import { serializeDocument } from "./serializer/document";
import { serializeStyles } from "./serializer/styles";
import { serializeNumbering } from "./serializer/numbering";
import { CONTENT_TYPES, RELATIONSHIP_TYPES } from "./constants";

// =============================================================================
// Content Types Generation
// =============================================================================

/**
 * Generate [Content_Types].xml element.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
function generateContentTypes(document: DocxDocument): XmlElement {
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
function generateDocumentRels(document: DocxDocument): XmlElement {
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

  // Add any existing relationships from the document
  if (document.relationships?.relationship) {
    for (const rel of document.relationships.relationship) {
      // Skip internal relationships we're handling ourselves
      if (rel.type === RELATIONSHIP_TYPES.styles || rel.type === RELATIONSHIP_TYPES.numbering) {
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
 * Options for DOCX export.
 */
export type ExportDocxOptions = {
  /** Whether to include styles.xml (default: true if styles present) */
  readonly includeStyles?: boolean;
  /** Whether to include numbering.xml (default: true if numbering present) */
  readonly includeNumbering?: boolean;
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

  // 4. Generate word/_rels/document.xml.rels
  const documentRelsXml = generateDocumentRels(document);
  pkg.writeText("word/_rels/document.xml.rels", serializeWithDeclaration(documentRelsXml));

  // 5. Generate _rels/.rels
  const rootRelsXml = generateRootRels();
  pkg.writeText("_rels/.rels", serializeWithDeclaration(rootRelsXml));

  // 6. Generate [Content_Types].xml
  const contentTypesXml = generateContentTypes(document);
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));

  // 7. Write ZIP package
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
