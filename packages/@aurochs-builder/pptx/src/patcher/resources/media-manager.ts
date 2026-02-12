/** @file Media resource manager for adding and removing images/videos/audio */
import type { ZipPackage } from "@aurochs/zip";
import { parseXml, serializeDocument } from "@aurochs/xml";
import { parseContentTypes } from "@aurochs-office/pptx/domain/content-types";
import { getRelationshipPath, loadRelationships, resolvePartPath } from "@aurochs-office/pptx/parser/relationships";
import { addContentType, removeUnusedContentTypes } from "./content-types-manager";
import { listRelationships, OFFICE_RELATIONSHIP_TYPES } from "@aurochs-office/opc";
import {
  addRelationship,
  ensureRelationshipsDocument,
  removeRelationship,
  type RelationshipType,
} from "./relationship-manager";

export type AddMediaOptions = {
  readonly pkg: ZipPackage;
  readonly mediaData: ArrayBuffer;
  readonly mediaType: MediaType;
  readonly referringPart: string;
};

export type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/svg+xml"
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "audio/mpeg"
  | "audio/wav"
  | "audio/mp4"
  | "audio/ogg";

const IMAGE_REL: RelationshipType = OFFICE_RELATIONSHIP_TYPES.image;
const VIDEO_REL: RelationshipType = OFFICE_RELATIONSHIP_TYPES.video;
const AUDIO_REL: RelationshipType = OFFICE_RELATIONSHIP_TYPES.audio;

/** Add media to the package and return its path and relationship ID */
export function addMedia({ pkg, mediaData, mediaType, referringPart }: AddMediaOptions): {
  readonly path: string;
  readonly rId: string;
} {
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
  const rId = addMediaRelationship({ pkg, referringPart, mediaPath, relationshipType });

  return { path: mediaPath, rId };
}

/** Remove a media reference and clean up unused media files */
export function removeMediaReference(pkg: ZipPackage, mediaPath: string, referringPart: string): void {
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

  const updated = idsToRemove.reduce((acc, id) => removeRelationship(acc, id), relsXml);
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

/** Find media files that are no longer referenced */
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

type AddMediaRelationshipOptions = {
  readonly pkg: ZipPackage;
  readonly referringPart: string;
  readonly mediaPath: string;
  readonly relationshipType: RelationshipType;
};

/** Load or create a relationships document from the package */
function loadOrCreateRelsDocument(pkg: ZipPackage, relsPath: string): ReturnType<typeof parseXml> {
  const existing = pkg.readText(relsPath);
  if (existing === null) {
    return ensureRelationshipsDocument(null);
  }
  return ensureRelationshipsDocument(parseXml(existing));
}

function addMediaRelationship({
  pkg,
  referringPart,
  mediaPath,
  relationshipType,
}: AddMediaRelationshipOptions): string {
  const relsPath = getRelationshipPath(referringPart);
  const relsXml = loadOrCreateRelsDocument(pkg, relsPath);

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
    for (const target of rels.getAllTargetsByType(IMAGE_REL)) {
      used.add(target);
    }
    for (const target of rels.getAllTargetsByType(VIDEO_REL)) {
      used.add(target);
    }
    for (const target of rels.getAllTargetsByType(AUDIO_REL)) {
      used.add(target);
    }
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
    case "video/webm":
      return { extension: "webm", relationshipType: VIDEO_REL, prefix: "video" };
    case "video/quicktime":
      return { extension: "mov", relationshipType: VIDEO_REL, prefix: "video" };
    case "audio/mpeg":
      return { extension: "mp3", relationshipType: AUDIO_REL, prefix: "audio" };
    case "audio/wav":
      return { extension: "wav", relationshipType: AUDIO_REL, prefix: "audio" };
    case "audio/mp4":
      return { extension: "m4a", relationshipType: AUDIO_REL, prefix: "audio" };
    case "audio/ogg":
      return { extension: "ogg", relationshipType: AUDIO_REL, prefix: "audio" };
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
  return findUnusedNumberedPath(existing, `ppt/media/${prefix}`, extension);
}

/** Find the first unused numbered path in a set */
function findUnusedNumberedPath(existing: Set<string>, base: string, extension: string): string {
  const tryNumber = (n: number): string => {
    const candidate = `${base}${n}.${extension}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
    return tryNumber(n + 1);
  };
  return tryNumber(1);
}

/** Count the number of common prefix segments between two arrays */
function countCommonPrefix(a: readonly string[], b: readonly string[]): number {
  const check = (i: number): number => {
    if (i >= a.length || i >= b.length || a[i] !== b[i]) {
      return i;
    }
    return check(i + 1);
  };
  return check(0);
}

function buildRelationshipTarget(sourcePart: string, targetPart: string): string {
  const sourceDir = getDirectory(sourcePart);
  const sourceSegments = sourceDir.split("/").filter((s) => s.length > 0);
  const targetSegments = targetPart.split("/").filter((s) => s.length > 0);

  const common = countCommonPrefix(sourceSegments, targetSegments);

  const up = sourceSegments.length - common;
  const relSegments = [...Array.from({ length: up }, () => ".."), ...targetSegments.slice(common)];

  return relSegments.join("/");
}

function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) {
    return "";
  }
  return path.slice(0, lastSlash);
}

function serializeXml(doc: ReturnType<typeof parseXml>): string {
  return serializeDocument(doc, { declaration: true, standalone: true });
}
