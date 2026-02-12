/**
 * @file DOCX Document Parser (Main Entry Point)
 *
 * Loads and parses DOCX files from OPC packages.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

import { parseXml, isXmlElement, type XmlElement, type XmlDocument } from "@aurochs/xml";
import { loadZipPackage, type ZipPackage } from "@aurochs/zip";
import { listRelationships } from "@aurochs-office/opc";
import type {
  DocxDocument,
  DocxRelationships,
  DocxRelationship,
  DocxHeader,
  DocxFooter,
  DocxSettings,
} from "./domain/document";
import type { DocxStyles } from "./domain/styles";
import type { DocxNumbering } from "./domain/numbering";
import type { DocxRelId } from "./domain/types";
import { createParseContext } from "./parser/context";
import { parseDocument, parseHeader, parseFooter } from "./parser/document";
import { parseStyles } from "./parser/styles";
import { parseNumbering } from "./parser/numbering";
import { parseSettings } from "./parser/settings";
import { DEFAULT_PART_PATHS, RELATIONSHIP_TYPES } from "./constants";
import { docxRelId } from "./domain/types";

// =============================================================================
// Relationship Parsing
// =============================================================================

/**
 * Get root element from XmlDocument.
 */
function getRootElement(doc: XmlDocument): XmlElement | undefined {
  for (const child of doc.children) {
    if (isXmlElement(child)) {
      return child;
    }
  }
  return undefined;
}

/**
 * Parse relationships from .rels file using OPC's listRelationships.
 *
 * Converts OPC's RelationshipInfo[] to DOCX's DocxRelationships format.
 */
function parseRelationships(element: XmlElement): DocxRelationships {
  // Create a minimal XmlDocument wrapper to use OPC's listRelationships
  const fakeDoc: XmlDocument = { children: [element] };
  const infos = listRelationships(fakeDoc);

  const relationships: DocxRelationship[] = infos.map((rel) => ({
    id: docxRelId(rel.id),
    type: rel.type,
    target: rel.target,
    targetMode: rel.targetMode === "External" ? "External" : "Internal",
  }));

  return { relationship: relationships };
}

/**
 * Get relationship by type.
 */
function getRelationshipByType(relationships: DocxRelationships, type: string): DocxRelationship | undefined {
  return relationships.relationship.find((r) => r.type === type);
}

// =============================================================================
// Part Loading
// =============================================================================

/**
 * Load and parse XML from a ZIP path.
 */
function loadXmlPart(pkg: ZipPackage, path: string): XmlElement | undefined {
  const content = pkg.readText(path);
  if (!content) {
    return undefined;
  }

  const doc = parseXml(content);
  return getRootElement(doc);
}

/**
 * Resolve relative path from source to target.
 */
function resolvePath(sourcePath: string, targetPath: string): string {
  if (targetPath.startsWith("/")) {
    return targetPath.slice(1);
  }

  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
  const parts = [...sourceDir.split("/"), ...targetPath.split("/")];

  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }

  return resolved.join("/");
}

/**
 * Normalize document path by removing leading slash.
 */
function normalizeDocumentPath(target: string): string {
  return target.startsWith("/") ? target.slice(1) : target;
}

/**
 * Load styles from document relationships.
 */
function loadStyles(params: {
  readonly pkg: ZipPackage;
  readonly documentPath: string;
  readonly relationships: DocxRelationships;
  readonly shouldParse: boolean;
}): DocxStyles | undefined {
  const { pkg, documentPath, relationships, shouldParse } = params;
  if (!shouldParse) {
    return undefined;
  }
  const rel = getRelationshipByType(relationships, RELATIONSHIP_TYPES.styles);
  if (!rel) {
    return undefined;
  }
  const path = resolvePath(documentPath, rel.target);
  const element = loadXmlPart(pkg, path);
  if (!element) {
    return undefined;
  }
  return parseStyles(element);
}

/**
 * Load numbering from document relationships.
 */
function loadNumbering(params: {
  readonly pkg: ZipPackage;
  readonly documentPath: string;
  readonly relationships: DocxRelationships;
  readonly shouldParse: boolean;
}): DocxNumbering | undefined {
  const { pkg, documentPath, relationships, shouldParse } = params;
  if (!shouldParse) {
    return undefined;
  }
  const rel = getRelationshipByType(relationships, RELATIONSHIP_TYPES.numbering);
  if (!rel) {
    return undefined;
  }
  const path = resolvePath(documentPath, rel.target);
  const element = loadXmlPart(pkg, path);
  if (!element) {
    return undefined;
  }
  return parseNumbering(element);
}

/**
 * Load settings from document relationships.
 */
function loadSettingsPart(params: {
  readonly pkg: ZipPackage;
  readonly documentPath: string;
  readonly relationships: DocxRelationships;
  readonly shouldParse: boolean;
}): DocxSettings | undefined {
  const { pkg, documentPath, relationships, shouldParse } = params;
  if (!shouldParse) {
    return undefined;
  }
  const rel = getRelationshipByType(relationships, RELATIONSHIP_TYPES.settings);
  if (!rel) {
    return undefined;
  }
  const path = resolvePath(documentPath, rel.target);
  const element = loadXmlPart(pkg, path);
  if (!element) {
    return undefined;
  }
  return parseSettings(element);
}

/**
 * Load document relationships.
 */
function loadDocumentRelationships(pkg: ZipPackage, path: string): DocxRelationships {
  const element = loadXmlPart(pkg, path);
  return element ? parseRelationships(element) : { relationship: [] };
}

/**
 * Load all headers from document relationships.
 */
function loadHeaders(params: {
  readonly pkg: ZipPackage;
  readonly documentPath: string;
  readonly relationships: DocxRelationships;
  readonly context?: ReturnType<typeof createParseContext>;
}): ReadonlyMap<DocxRelId, DocxHeader> {
  const { pkg, documentPath, relationships, context } = params;
  const headers = new Map<DocxRelId, DocxHeader>();

  const headerRels = relationships.relationship.filter((r) => r.type === RELATIONSHIP_TYPES.header);

  for (const rel of headerRels) {
    const path = resolvePath(documentPath, rel.target);
    const element = loadXmlPart(pkg, path);
    if (element) {
      headers.set(rel.id, parseHeader(element, context));
    }
  }

  return headers;
}

/**
 * Load all footers from document relationships.
 */
function loadFooters(params: {
  readonly pkg: ZipPackage;
  readonly documentPath: string;
  readonly relationships: DocxRelationships;
  readonly context?: ReturnType<typeof createParseContext>;
}): ReadonlyMap<DocxRelId, DocxFooter> {
  const { pkg, documentPath, relationships, context } = params;
  const footers = new Map<DocxRelId, DocxFooter>();

  const footerRels = relationships.relationship.filter((r) => r.type === RELATIONSHIP_TYPES.footer);

  for (const rel of footerRels) {
    const path = resolvePath(documentPath, rel.target);
    const element = loadXmlPart(pkg, path);
    if (element) {
      footers.set(rel.id, parseFooter(element, context));
    }
  }

  return footers;
}

// =============================================================================
// Document Loading
// =============================================================================

/**
 * Load options for the document parser.
 */
export type LoadDocxOptions = {
  /** Whether to parse styles.xml */
  readonly parseStyles?: boolean;
  /** Whether to parse numbering.xml */
  readonly parseNumbering?: boolean;
  /** Whether to parse headers and footers */
  readonly parseHeadersFooters?: boolean;
  /** Whether to parse settings.xml */
  readonly parseSettings?: boolean;
};

/**
 * Default load options.
 */
const DEFAULT_OPTIONS: Required<LoadDocxOptions> = {
  parseStyles: true,
  parseNumbering: true,
  parseHeadersFooters: true,
  parseSettings: true,
};

/**
 * Load and parse a DOCX file from a buffer or Uint8Array.
 *
 * @param data - The DOCX file data
 * @param options - Loading options
 * @returns Parsed DOCX document
 *
 * @example
 * ```typescript
 * const buffer = await fs.readFile("document.docx");
 * const doc = await loadDocx(buffer);
 * console.log(doc.body.content.length);
 * ```
 */
export async function loadDocx(data: ArrayBuffer | Uint8Array, options: LoadDocxOptions = {}): Promise<DocxDocument> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pkg = await loadZipPackage(data);

  // 1. Parse root relationships to find the main document
  const rootRels = loadXmlPart(pkg, DEFAULT_PART_PATHS.rootRels);
  if (!rootRels) {
    throw new Error("Cannot find root relationships file");
  }

  const rootRelationships = parseRelationships(rootRels);
  const documentRel = getRelationshipByType(rootRelationships, RELATIONSHIP_TYPES.officeDocument);

  if (!documentRel) {
    throw new Error("Cannot find main document relationship");
  }

  const documentPath = normalizeDocumentPath(documentRel.target);

  // 2. Parse document relationships
  const documentRelsPath = resolvePath(documentPath, "_rels/" + documentPath.split("/").pop() + ".rels");
  const documentRelationships = loadDocumentRelationships(pkg, documentRelsPath);

  // 3. Parse styles, numbering, and settings
  const styles = loadStyles({ pkg, documentPath, relationships: documentRelationships, shouldParse: opts.parseStyles });
  const numbering = loadNumbering({
    pkg,
    documentPath,
    relationships: documentRelationships,
    shouldParse: opts.parseNumbering,
  });
  const settings = loadSettingsPart({
    pkg,
    documentPath,
    relationships: documentRelationships,
    shouldParse: opts.parseSettings,
  });

  // 4. Create parse context
  const context = createParseContext({
    styles,
    numbering,
    relationships: documentRelationships,
  });

  // 5. Parse main document
  const documentElement = loadXmlPart(pkg, documentPath);
  if (!documentElement) {
    throw new Error(`Cannot find main document at ${documentPath}`);
  }

  const document = parseDocument(documentElement, context);

  // 6. Load headers and footers
  const loaderArgs = { pkg, documentPath, relationships: documentRelationships, context };
  const headers = opts.parseHeadersFooters ? loadHeaders(loaderArgs) : undefined;
  const footers = opts.parseHeadersFooters ? loadFooters(loaderArgs) : undefined;

  // 7. Combine all parts
  return {
    ...document,
    styles,
    numbering,
    settings,
    relationships: documentRelationships,
    headers: headers?.size ? headers : undefined,
    footers: footers?.size ? footers : undefined,
  };
}

/**
 * Load and parse a DOCX file from a File object (browser).
 *
 * @param file - The File object
 * @param options - Loading options
 * @returns Parsed DOCX document
 *
 * @example
 * ```typescript
 * const input = document.querySelector('input[type="file"]');
 * const file = input.files[0];
 * const doc = await loadDocxFromFile(file);
 * ```
 */
export async function loadDocxFromFile(file: File, options: LoadDocxOptions = {}): Promise<DocxDocument> {
  const buffer = await file.arrayBuffer();
  return loadDocx(buffer, options);
}
