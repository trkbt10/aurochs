/**
 * @file ZIP package utilities for builders
 *
 * Provides helper functions for working with OOXML packages (PPTX, DOCX, XLSX).
 */

import type { ZipPackage } from "@aurochs/zip";
import { parseXml, serializeDocument } from "@aurochs/xml";
import type { XmlDocument } from "@aurochs/xml";

/**
 * Read and parse an XML part from the package
 * Returns null if the part doesn't exist
 */
export function readXmlPart(pkg: ZipPackage, partPath: string): XmlDocument | null {
  const content = pkg.readText(partPath);
  if (!content) {
    return null;
  }
  return parseXml(content);
}

/**
 * Options for writing an XML part
 */
export type WriteXmlPartOptions = {
  readonly partPath: string;
  readonly doc: XmlDocument;
  readonly declaration?: boolean;
  readonly standalone?: boolean;
};

/**
 * Write an XML document to the package
 */
export function writeXmlPart(pkg: ZipPackage, options: WriteXmlPartOptions): void {
  const xml = serializeDocument(options.doc, {
    declaration: options.declaration ?? true,
    standalone: options.standalone,
  });
  pkg.writeText(options.partPath, xml);
}

/**
 * Get the relationships file path for a given part
 */
export function getRelationshipsPath(partPath: string): string {
  return partPath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");
}

/**
 * Normalize a path within the package (remove leading slash, etc.)
 */
export function normalizePath(path: string): string {
  return path.replace(/^\//, "");
}

/**
 * Get the directory containing a part
 */
export function getPartDirectory(partPath: string): string {
  const lastSlash = partPath.lastIndexOf("/");
  return lastSlash >= 0 ? partPath.slice(0, lastSlash) : "";
}

/**
 * Resolve a relative path against a base part path
 */
export function resolvePartPath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith("/")) {
    return normalizePath(relativePath);
  }

  const baseDir = getPartDirectory(basePath);
  const parts = baseDir ? baseDir.split("/") : [];

  for (const segment of relativePath.split("/")) {
    if (segment === "..") {
      parts.pop();
    } else if (segment !== ".") {
      parts.push(segment);
    }
  }

  return parts.join("/");
}

/**
 * Check if a part exists in the package
 */
export function partExists(pkg: ZipPackage, partPath: string): boolean {
  return pkg.readText(partPath) !== null;
}

/**
 * Copy a part from one path to another
 */
export function copyPart(pkg: ZipPackage, sourcePath: string, destPath: string): void {
  const content = pkg.readText(sourcePath);
  if (content !== null) {
    pkg.writeText(destPath, content);
  }
}

/**
 * Remove a part from the package
 */
export function removePart(pkg: ZipPackage, partPath: string): void {
  pkg.remove(partPath);
}
