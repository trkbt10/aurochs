/**
 * @file OOXML relationship parsing and path resolution
 *
 * Provides RFC 3986 compliant path resolution for OPC relationship targets and
 * helpers for reading and parsing `.rels` files.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 */

import type { ResourceMap, ResourceEntry } from "@oxen-office/opc";
import { createEmptyResourceMap, createResourceMap, resolveRelationshipTargetPath } from "@oxen-office/opc";
import type { XmlDocument } from "@oxen/xml";
import { getByPath, getChildren, parseXml } from "@oxen/xml";

export type OoxmlTextReader = {
  readText(path: string): string | null | undefined;
};

function isAbsoluteIri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

/**
 * Resolve a relationship Target against the base part path.
 *
 * For External targets, callers should preserve the original value.
 */
export function resolvePartPath(basePath: string, reference: string): string {
  if (isAbsoluteIri(reference)) {
    return reference;
  }
  return resolveRelationshipTargetPath(basePath, reference);
}

/**
 * Get the `.rels` file path for a given part.
 *
 * Per ECMA-376, relationships are stored in `_rels/[partname].rels`.
 */
export function getRelationshipPath(partPath: string): string {
  const lastSlash = partPath.lastIndexOf("/");
  if (lastSlash === -1) {
    return `_rels/${partPath}.rels`;
  }
  const dir = partPath.substring(0, lastSlash);
  const filename = partPath.substring(lastSlash + 1);
  return `${dir}/_rels/${filename}.rels`;
}

/**
 * Parse relationships from a `.rels` XML document.
 *
 * Resolves all non-external Targets using RFC 3986 against the source part path.
 */
export function parseRelationships(relsXml: XmlDocument | null, sourcePath: string): ResourceMap {
  if (relsXml === null) {
    return createEmptyResourceMap();
  }

  const relationshipsElement = getByPath(relsXml, ["Relationships"]);
  if (!relationshipsElement) {
    return createEmptyResourceMap();
  }

  const relationships = getChildren(relationshipsElement, "Relationship");
  const entries: Record<string, ResourceEntry> = {};

  for (const rel of relationships) {
    const id = rel.attrs["Id"];
    const type = rel.attrs["Type"];
    const target = rel.attrs["Target"];
    const targetMode = rel.attrs["TargetMode"];

    if (id !== undefined && target !== undefined) {
      const resolvedTarget = targetMode === "External" ? target : resolvePartPath(sourcePath, target);
      entries[id] = { type: type ?? "", target: resolvedTarget };
    }
  }

  return createResourceMap(entries);
}


























/** Parse relationships from raw XML text. */
export function parseRelationshipsFromText(relsText: string | null | undefined, sourcePath: string): ResourceMap {
  if (relsText === null || relsText === undefined) {
    return createEmptyResourceMap();
  }
  return parseRelationships(parseXml(relsText), sourcePath);
}

/**
 * Load and parse relationships for a part using a reader.
 */
export function loadRelationships(reader: OoxmlTextReader, partPath: string): ResourceMap {
  const relsPath = getRelationshipPath(partPath);
  const relsText = reader.readText(relsPath);
  return parseRelationshipsFromText(relsText, partPath);
}
