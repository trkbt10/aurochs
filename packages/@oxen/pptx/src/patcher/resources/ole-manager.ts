/**
 * @file OLE object embedding manager
 *
 * Handles embedding OLE objects (xlsx, docx, pptx) into PPTX packages.
 * Uses oleObject relationship type for embedded Office files.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */

import type { ZipPackage } from "@oxen/zip";
import { parseXml, serializeDocument } from "@oxen/xml";
import { getRelationshipPath } from "../../parser/relationships";
import { addContentType } from "./content-types-manager";
import { addRelationship, ensureRelationshipsDocument, type RelationshipType } from "./relationship-manager";

// =============================================================================
// Types
// =============================================================================

/**
 * Supported OLE object types
 */
export type OleType = "xlsx" | "docx" | "pptx";

/**
 * OLE type information
 */
export type OleTypeInfo = {
  readonly extension: string;
  readonly progId: string;
  readonly contentType: string;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * OLE object relationship type
 * @see ECMA-376 Part 2
 */
const OLE_OBJECT_REL: RelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject";

/**
 * OLE type mappings for supported Office file types
 */
export const OLE_TYPE_MAP: Record<OleType, OleTypeInfo> = {
  xlsx: {
    extension: "xlsx",
    progId: "Excel.Sheet.12",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  docx: {
    extension: "docx",
    progId: "Word.Document.12",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  pptx: {
    extension: "pptx",
    progId: "PowerPoint.Show.12",
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
};

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Add an OLE object to the PPTX package.
 *
 * @param pkg - The PPTX package
 * @param oleData - The OLE object binary data (xlsx/docx/pptx file content)
 * @param oleType - The type of OLE object
 * @param referringPart - The slide/layout/master path that references this object
 * @returns The path and relationship ID of the embedded object
 */
export function addOleObject(
  pkg: ZipPackage,
  oleData: ArrayBuffer,
  oleType: OleType,
  referringPart: string,
): { readonly path: string; readonly rId: string; readonly progId: string } {
  if (!oleData) {
    throw new Error("addOleObject: oleData is required");
  }
  if (!oleType) {
    throw new Error("addOleObject: oleType is required");
  }
  if (!referringPart) {
    throw new Error("addOleObject: referringPart is required");
  }

  const typeInfo = OLE_TYPE_MAP[oleType];
  const olePath = generateOlePath(pkg, typeInfo.extension);

  // Write the OLE object to the embeddings folder
  pkg.writeBinary(olePath, oleData);

  // Update content types
  updateContentTypesForOle(pkg, typeInfo.extension, typeInfo.contentType);

  // Add relationship
  const rId = addOleRelationship(pkg, referringPart, olePath);

  return { path: olePath, rId, progId: typeInfo.progId };
}

/**
 * Get OLE type from filename extension.
 *
 * @param filename - The filename (e.g., "spreadsheet.xlsx")
 * @returns The OLE type or null if not supported
 */
export function getOleTypeFromFile(filename: string): OleType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "xlsx":
      return "xlsx";
    case "docx":
      return "docx";
    case "pptx":
      return "pptx";
    default:
      return null;
  }
}

/**
 * Check if a MIME type is a supported OLE type.
 *
 * @param mimeType - The MIME type to check
 * @returns The OLE type or null if not supported
 */
export function getOleTypeFromMimeType(mimeType: string): OleType | null {
  switch (mimeType) {
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    default:
      return null;
  }
}

/**
 * Get OLE type info for a given type.
 *
 * @param oleType - The OLE type
 * @returns The OLE type information
 */
export function getOleTypeInfo(oleType: OleType): OleTypeInfo {
  return OLE_TYPE_MAP[oleType];
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Update [Content_Types].xml for OLE object.
 */
function updateContentTypesForOle(pkg: ZipPackage, extension: string, contentType: string): void {
  const contentTypesText = pkg.readText("[Content_Types].xml");
  if (contentTypesText === null) {
    throw new Error("addOleObject: missing [Content_Types].xml");
  }

  const contentTypesXml = parseXml(contentTypesText);
  const updated = addContentType(contentTypesXml, extension, contentType);
  pkg.writeText("[Content_Types].xml", serializeXml(updated));
}

/**
 * Add relationship for OLE object.
 */
function addOleRelationship(
  pkg: ZipPackage,
  referringPart: string,
  olePath: string,
): string {
  const relsPath = getRelationshipPath(referringPart);
  const relsXml = (() => {
    const existing = pkg.readText(relsPath);
    if (existing === null) {
      return ensureRelationshipsDocument(null);
    }
    return ensureRelationshipsDocument(parseXml(existing));
  })();

  const target = buildRelationshipTarget(referringPart, olePath);
  const { updatedXml, rId } = addRelationship(relsXml, target, OLE_OBJECT_REL);
  pkg.writeText(relsPath, serializeXml(updatedXml));

  return rId;
}

/**
 * Generate a unique path for the OLE object in the embeddings folder.
 */
function generateOlePath(pkg: ZipPackage, extension: string): string {
  const existing = new Set(pkg.listFiles().filter((p) => p.startsWith("ppt/embeddings/")));
  let next = 1;
  while (existing.has(`ppt/embeddings/oleObject${next}.${extension}`)) {
    next += 1;
  }
  return `ppt/embeddings/oleObject${next}.${extension}`;
}

/**
 * Build relative path from source part to target part.
 */
function buildRelationshipTarget(sourcePart: string, targetPart: string): string {
  const sourceDir = getDirectory(sourcePart);
  const sourceSegments = sourceDir.split("/").filter((s) => s.length > 0);
  const targetSegments = targetPart.split("/").filter((s) => s.length > 0);

  let common = 0;
  while (
    common < sourceSegments.length &&
    common < targetSegments.length &&
    sourceSegments[common] === targetSegments[common]
  ) {
    common += 1;
  }

  const up = sourceSegments.length - common;
  const relSegments: string[] = [];
  for (let i = 0; i < up; i += 1) {
    relSegments.push("..");
  }
  relSegments.push(...targetSegments.slice(common));

  return relSegments.join("/");
}

/**
 * Get directory portion of a path.
 */
function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return "";
  return path.slice(0, lastSlash);
}

/**
 * Serialize XML document to string.
 */
function serializeXml(doc: ReturnType<typeof parseXml>): string {
  return serializeDocument(doc, { declaration: true, standalone: true });
}
