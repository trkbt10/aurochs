/**
 * @file Font embedding manager for PPTX export
 *
 * Embeds TrueType fonts into PPTX files for portable font display.
 *
 * OOXML font embedding (ECMA-376 Part 1):
 * - Font files: ppt/fonts/font1.fntdata, font2.fntdata, etc.
 * - Content type: application/x-fontdata
 * - Relationship type: http://schemas.openxmlformats.org/officeDocument/2006/relationships/font
 * - Embedded font list in ppt/presentation.xml
 */

import type { ZipPackage } from "@oxen/zip";
import type { EmbeddedFontData } from "../../app/presentation-document";
import { parseXml, serializeDocument, createElement, type XmlDocument } from "@oxen/xml";
import { getDocumentRoot, updateDocumentRoot } from "../core/xml-mutator";
import { addContentType } from "./content-types-manager";
import { addRelationship, ensureRelationshipsDocument, type RelationshipType } from "./relationship-manager";
import { getRelationshipPath } from "../../parser/relationships";

const FONT_CONTENT_TYPE = "application/x-fontdata";
const FONT_REL_TYPE: RelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
const PRESENTATION_PATH = "ppt/presentation.xml";

/**
 * Result of embedding fonts
 */
export type FontEmbedResult = {
  /** Number of fonts embedded */
  readonly count: number;
  /** Paths of embedded font files */
  readonly paths: readonly string[];
};

const CONTENT_TYPES_PATH = "[Content_Types].xml";

/**
 * Embed fonts into a PPTX package.
 *
 * @param pkg - ZipPackage to embed fonts into
 * @param fonts - Array of embedded font data
 * @returns Result with count and paths
 */
export function embedFonts(
  pkg: ZipPackage,
  fonts: readonly EmbeddedFontData[]
): FontEmbedResult {
  if (!fonts || fonts.length === 0) {
    return { count: 0, paths: [] };
  }

  const paths: string[] = [];
  const fontRefs: Array<{ fontFamily: string; rId: string }> = [];

  // Embed each font
  for (const font of fonts) {
    // Only embed TrueType fonts (PPTX supports TrueType/OpenType)
    if (font.format !== "truetype" && font.format !== "opentype") {
      continue;
    }

    // Generate font path
    const fontPath = generateFontPath(pkg);
    paths.push(fontPath);

    // Write font data
    pkg.writeBinary(fontPath, font.data);

    // Add relationship from presentation.xml
    const rId = addFontRelationship(pkg, fontPath);

    fontRefs.push({ fontFamily: font.fontFamily, rId });
  }

  // Add content type for .fntdata extension (once for all fonts)
  if (paths.length > 0) {
    addFontContentType(pkg);
  }

  // Update presentation.xml with embedded font list
  if (fontRefs.length > 0) {
    updatePresentationWithFonts(pkg, fontRefs);
  }

  return { count: fontRefs.length, paths };
}

/**
 * Add content type for font files.
 */
function addFontContentType(pkg: ZipPackage): void {
  const contentTypesXml = pkg.readText(CONTENT_TYPES_PATH);
  if (!contentTypesXml) {
    return;
  }

  const doc = parseXml(contentTypesXml);
  const updated = addContentType(doc, ".fntdata", FONT_CONTENT_TYPE);
  pkg.writeText(CONTENT_TYPES_PATH, serializeDocument(updated, { declaration: true }));
}

/**
 * Generate unique font path.
 */
function generateFontPath(pkg: ZipPackage): string {
  let index = 1;
  while (pkg.exists(`ppt/fonts/font${index}.fntdata`)) {
    index++;
  }
  return `ppt/fonts/font${index}.fntdata`;
}

/**
 * Add font relationship to presentation.xml.rels
 */
function addFontRelationship(pkg: ZipPackage, fontPath: string): string {
  const relsPath = getRelationshipPath(PRESENTATION_PATH);

  // Read or create relationships document
  let relsXml: XmlDocument;
  const existingRels = pkg.readText(relsPath);
  if (existingRels) {
    relsXml = ensureRelationshipsDocument(parseXml(existingRels));
  } else {
    relsXml = ensureRelationshipsDocument(null);
  }

  // Relative target from ppt/ directory
  const relTarget = fontPath.replace("ppt/", "");

  // Add relationship
  const result = addRelationship(relsXml, relTarget, FONT_REL_TYPE);

  // Write back
  pkg.writeText(relsPath, serializeDocument(result.updatedXml, { declaration: true }));

  return result.rId;
}

/**
 * Update presentation.xml with embedded font list.
 */
function updatePresentationWithFonts(
  pkg: ZipPackage,
  fontRefs: Array<{ fontFamily: string; rId: string }>
): void {
  const presentationXml = pkg.readText(PRESENTATION_PATH);
  if (!presentationXml) {
    return;
  }

  const doc = parseXml(presentationXml);
  const root = getDocumentRoot(doc);
  if (!root) {
    return;
  }

  // Create embeddedFontLst element
  const embeddedFontLst = createEmbeddedFontListElement(fontRefs);

  // Find insertion point (after sldMasterIdLst, sldIdLst, etc.)
  const insertAfter = findInsertionIndex(root.children);

  // Insert embeddedFontLst
  const updated = updateDocumentRoot(doc, (rootEl) => {
    const newChildren = [...rootEl.children];
    if (insertAfter !== -1) {
      newChildren.splice(insertAfter + 1, 0, embeddedFontLst);
    } else {
      newChildren.push(embeddedFontLst);
    }
    return {
      ...rootEl,
      children: newChildren,
    };
  });

  pkg.writeText(PRESENTATION_PATH, serializeDocument(updated, {
    declaration: true,
    standalone: true,
  }));
}

/**
 * Create p:embeddedFontLst element.
 */
function createEmbeddedFontListElement(
  fontRefs: Array<{ fontFamily: string; rId: string }>
) {
  const embeddedFonts = fontRefs.map(({ fontFamily, rId }) => {
    const fontEl = createElement("p:font", { typeface: fontFamily });
    const regularEl = createElement("p:regular", { "r:embed": rId });
    return createElement("p:embeddedFont", {}, [fontEl, regularEl]);
  });

  return createElement("p:embeddedFontLst", {}, embeddedFonts);
}

/**
 * Find insertion point for embeddedFontLst in presentation element.
 * Returns index after which to insert, or -1 if should add at end.
 */
function findInsertionIndex(children: readonly unknown[]): number {
  // Elements that should come before embeddedFontLst
  const beforeElements = [
    "p:sldMasterIdLst",
    "p:notesMasterIdLst",
    "p:handoutMasterIdLst",
    "p:sldIdLst",
    "p:sldSz",
    "p:notesSz",
  ];

  let lastFoundIndex = -1;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (
      typeof child === "object" &&
      child !== null &&
      "name" in child &&
      typeof (child as { name: unknown }).name === "string" &&
      beforeElements.includes((child as { name: string }).name)
    ) {
      lastFoundIndex = i;
    }
  }

  return lastFoundIndex;
}
