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

import type { XmlElement, XmlNode } from "@oxen/xml";
import { serializeElement, createElement } from "@oxen/xml";
import { createEmptyZipPackage } from "@oxen/zip";
import type { DocxDocument } from "./domain/document";
import { serializeDocument } from "./serializer/document";
import { serializeStyles } from "./serializer/styles";
import { serializeNumbering } from "./serializer/numbering";
import { CONTENT_TYPES, RELATIONSHIP_TYPES } from "./constants";

// =============================================================================
// Constants
// =============================================================================

/**
 * XML declaration for all XML files
 */
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * OPC content types namespace
 */
const CT_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/content-types";

/**
 * OPC relationships namespace
 */
const RELS_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Serialize an XmlElement to string with XML declaration.
 */
function serializeWithDeclaration(element: XmlElement): string {
  return XML_DECLARATION + serializeElement(element);
}

// =============================================================================
// Relationships Serialization
// =============================================================================

/**
 * Relationship structure for serialization.
 */
type RelationshipEntry = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: "External";
};

/**
 * Serialize relationships to XML element.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
function serializeRelationships(relationships: readonly RelationshipEntry[]): XmlElement {
  const children = relationships.map((rel) => {
    const attrs: Record<string, string> = {
      Id: rel.id,
      Type: rel.type,
      Target: rel.target,
    };
    if (rel.targetMode) {
      attrs.TargetMode = rel.targetMode;
    }
    return createElement("Relationship", attrs);
  });

  return createElement("Relationships", { xmlns: RELS_NAMESPACE }, children);
}

// =============================================================================
// Content Types Generation
// =============================================================================

/**
 * Generate [Content_Types].xml element.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
function generateContentTypes(document: DocxDocument): XmlElement {
  const children: XmlNode[] = [];

  // Default extensions
  children.push(
    createElement("Default", {
      Extension: "rels",
      ContentType: "application/vnd.openxmlformats-package.relationships+xml",
    }),
  );
  children.push(
    createElement("Default", {
      Extension: "xml",
      ContentType: "application/xml",
    }),
  );

  // Override for main document
  children.push(
    createElement("Override", {
      PartName: "/word/document.xml",
      ContentType: CONTENT_TYPES.document,
    }),
  );

  // Override for styles if present
  if (document.styles) {
    children.push(
      createElement("Override", {
        PartName: "/word/styles.xml",
        ContentType: CONTENT_TYPES.styles,
      }),
    );
  }

  // Override for numbering if present
  if (document.numbering) {
    children.push(
      createElement("Override", {
        PartName: "/word/numbering.xml",
        ContentType: CONTENT_TYPES.numbering,
      }),
    );
  }

  return createElement("Types", { xmlns: CT_NAMESPACE }, children);
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
  const relationships: RelationshipEntry[] = [
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
  const relationships: RelationshipEntry[] = [];
  const rIdCounter = { value: 1 };

  // Relationship for styles
  if (document.styles) {
    relationships.push({
      id: `rId${rIdCounter.value}`,
      type: RELATIONSHIP_TYPES.styles,
      target: "styles.xml",
    });
    rIdCounter.value++;
  }

  // Relationship for numbering
  if (document.numbering) {
    relationships.push({
      id: `rId${rIdCounter.value}`,
      type: RELATIONSHIP_TYPES.numbering,
      target: "numbering.xml",
    });
    rIdCounter.value++;
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
export async function exportDocx(
  document: DocxDocument,
  options: ExportDocxOptions = {},
): Promise<Uint8Array> {
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
  pkg.writeText(
    "word/_rels/document.xml.rels",
    serializeWithDeclaration(documentRelsXml),
  );

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
export async function exportDocxToBlob(
  document: DocxDocument,
  options: ExportDocxOptions = {},
): Promise<Blob> {
  const data = await exportDocx(document, options);
  return new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
