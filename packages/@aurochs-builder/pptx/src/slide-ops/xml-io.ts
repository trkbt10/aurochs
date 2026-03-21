/**
 * @file XML I/O helpers for slide operations
 *
 * Provides read/write wrappers for ZipPackage XML parts.
 * SoT for readXmlOrThrow/writeXml within slide-ops.
 */

import type { ZipPackage } from "@aurochs/zip";
import { parseXml, serializeDocument, type XmlDocument } from "@aurochs/xml";

/**
 * Read and parse an XML part, throwing if it doesn't exist.
 */
export function readXmlOrThrow(pkg: ZipPackage, path: string): XmlDocument {
  const text = pkg.readText(path);
  if (!text) {
    throw new Error(`Missing required XML part: ${path}`);
  }
  return parseXml(text);
}

/**
 * Write an XML document to a package part.
 */
export function writeXml(pkg: ZipPackage, path: string, doc: XmlDocument): void {
  const xml = serializeDocument(doc, { declaration: true, standalone: true });
  pkg.writeText(path, xml);
}
