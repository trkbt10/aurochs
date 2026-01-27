import type { ZipPackage } from "@oxen/zip";
import { parseXml, serializeDocument } from "@oxen/xml";
import { parseContentTypes } from "../../opc/content-types";
import { getRelationshipPath, loadRelationships, resolvePartPath } from "../../parser/relationships";
import { addContentType, removeUnusedContentTypes } from "./content-types-manager";
import { addRelationship, ensureRelationshipsDocument, listRelationships, removeRelationship, type RelationshipType } from "./relationship-manager";

export type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/svg+xml"
  | "video/mp4"
  | "audio/mpeg";

const IMAGE_REL: RelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const VIDEO_REL: RelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video";
const AUDIO_REL: RelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio";

export function addMedia(
  pkg: ZipPackage,
  mediaData: ArrayBuffer,
  mediaType: MediaType,
  referringPart: string,
): { readonly path: string; readonly rId: string } {
  if (!mediaData) {
    throw new Error("addMedia: mediaData is required");
  }
  if (!mediaType) {
    throw new Error("addMedia: mediaType is required");
  }
  if (!referringPart) {
    throw new Error("addMedia: referringPart is required");
  }

  const { extension, relationshipType, prefix } = inferMediaInfo(mediaType);

  const existingPath = findExistingMediaByBytes(pkg, extension, mediaData);
  const mediaPath = existingPath ?? generateMediaPath(pkg, prefix, extension);

  if (!existingPath) {
    pkg.writeBinary(mediaPath, mediaData);
  }

  updateContentTypesForMedia(pkg, extension, mediaType);
  const rId = addMediaRelationship(pkg, referringPart, mediaPath, relationshipType);

  return { path: mediaPath, rId };
}

export function removeMediaReference(
  pkg: ZipPackage,
  mediaPath: string,
  referringPart: string,
): void {
  if (!mediaPath) {
    throw new Error("removeMediaReference: mediaPath is required");
  }
  if (!referringPart) {
    throw new Error("removeMediaReference: referringPart is required");
  }

  const relsPath = getRelationshipPath(referringPart);
  if (!pkg.exists(relsPath)) {
    return;
  }

  const relsText = pkg.readText(relsPath);
  if (relsText === null) {
    return;
  }

  const relsXml = ensureRelationshipsDocument(parseXml(relsText));
  const idsToRemove = listRelationships(relsXml)
    .filter((rel) => resolvePartPath(referringPart, rel.target) === mediaPath)
    .map((rel) => rel.id);

  let updated = relsXml;
  for (const id of idsToRemove) {
    updated = removeRelationship(updated, id);
  }
  pkg.writeText(relsPath, serializeXml(updated));

  const used = collectUsedMediaTargets(pkg);
  if (used.has(mediaPath)) {
    return;
  }

  if (pkg.exists(mediaPath)) {
    pkg.remove(mediaPath);
  }

  updateContentTypesCleanup(pkg);
}

export function findUnusedMedia(pkg: ZipPackage): string[] {
  const allMedia = pkg
    .listFiles()
    .filter((p) => p.startsWith("ppt/media/") && !p.endsWith("/"))
    .sort();

  const used = collectUsedMediaTargets(pkg);
  return allMedia.filter((p) => !used.has(p));
}

function updateContentTypesForMedia(pkg: ZipPackage, extension: string, mediaType: MediaType): void {
  const contentTypesText = pkg.readText("[Content_Types].xml");
  if (contentTypesText === null) {
    throw new Error("addMedia: missing [Content_Types].xml");
  }

  const contentTypesXml = parseXml(contentTypesText);
  const updated = addContentType(contentTypesXml, extension, mediaType);
  pkg.writeText("[Content_Types].xml", serializeXml(updated));
}

function updateContentTypesCleanup(pkg: ZipPackage): void {
  const contentTypesText = pkg.readText("[Content_Types].xml");
  if (contentTypesText === null) {
    throw new Error("removeMediaReference: missing [Content_Types].xml");
  }

  const contentTypesXml = parseXml(contentTypesText);
  const updated = removeUnusedContentTypes(contentTypesXml, pkg.listFiles());
  pkg.writeText("[Content_Types].xml", serializeXml(updated));
}

function addMediaRelationship(
  pkg: ZipPackage,
  referringPart: string,
  mediaPath: string,
  relationshipType: RelationshipType,
): string {
  const relsPath = getRelationshipPath(referringPart);
  const relsXml = (() => {
    const existing = pkg.readText(relsPath);
    if (existing === null) {
      return ensureRelationshipsDocument(null);
    }
    return ensureRelationshipsDocument(parseXml(existing));
  })();

  const target = buildRelationshipTarget(referringPart, mediaPath);
  const { updatedXml, rId } = addRelationship(relsXml, target, relationshipType);
  pkg.writeText(relsPath, serializeXml(updatedXml));

  return rId;
}

function collectUsedMediaTargets(pkg: ZipPackage): Set<string> {
  const contentTypesText = pkg.readText("[Content_Types].xml");
  if (contentTypesText === null) {
    throw new Error("collectUsedMediaTargets: missing [Content_Types].xml");
  }

  const contentTypes = parseContentTypes(parseXml(contentTypesText));
  const parts = [...contentTypes.slides, ...contentTypes.slideLayouts, ...contentTypes.slideMasters];
  const file = pkg.asPresentationFile();

  const used = new Set<string>();
  for (const partPath of parts) {
    const rels = loadRelationships(file, partPath);
    for (const target of rels.getAllTargetsByType(IMAGE_REL)) used.add(target);
    for (const target of rels.getAllTargetsByType(VIDEO_REL)) used.add(target);
    for (const target of rels.getAllTargetsByType(AUDIO_REL)) used.add(target);
  }

  return used;
}

function inferMediaInfo(mediaType: MediaType): {
  readonly extension: string;
  readonly relationshipType: RelationshipType;
  readonly prefix: string;
} {
  switch (mediaType) {
    case "image/png":
      return { extension: "png", relationshipType: IMAGE_REL, prefix: "image" };
    case "image/jpeg":
      return { extension: "jpeg", relationshipType: IMAGE_REL, prefix: "image" };
    case "image/gif":
      return { extension: "gif", relationshipType: IMAGE_REL, prefix: "image" };
    case "image/svg+xml":
      return { extension: "svg", relationshipType: IMAGE_REL, prefix: "image" };
    case "video/mp4":
      return { extension: "mp4", relationshipType: VIDEO_REL, prefix: "video" };
    case "audio/mpeg":
      return { extension: "mp3", relationshipType: AUDIO_REL, prefix: "audio" };
  }
}

function findExistingMediaByBytes(pkg: ZipPackage, extension: string, mediaData: ArrayBuffer): string | null {
  const candidates = pkg
    .listFiles()
    .filter((path) => path.startsWith("ppt/media/") && path.toLowerCase().endsWith(`.${extension}`))
    .sort();

  for (const path of candidates) {
    const existing = pkg.readBinary(path);
    if (existing && buffersEqual(existing, mediaData)) {
      return path;
    }
  }

  return null;
}

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  for (let i = 0; i < ua.length; i += 1) {
    if (ua[i] !== ub[i]) {
      return false;
    }
  }
  return true;
}

function generateMediaPath(pkg: ZipPackage, prefix: string, extension: string): string {
  const existing = new Set(pkg.listFiles().filter((p) => p.startsWith("ppt/media/")));
  let next = 1;
  while (existing.has(`ppt/media/${prefix}${next}.${extension}`)) {
    next += 1;
  }
  return `ppt/media/${prefix}${next}.${extension}`;
}

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

function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return "";
  return path.slice(0, lastSlash);
}

function serializeXml(doc: ReturnType<typeof parseXml>): string {
  return serializeDocument(doc, { declaration: true, standalone: true });
}
