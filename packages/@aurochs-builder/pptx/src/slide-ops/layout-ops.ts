/**
 * @file Layout file operations
 *
 * Supports adding/removing/duplicating slide layouts by updating:
 * - ppt/slideMasters/slideMasterN.xml (p:sldLayoutIdLst)
 * - ppt/slideMasters/_rels/slideMasterN.xml.rels (layout relationships)
 * - [Content_Types].xml (slideLayout overrides)
 * - layout parts (ppt/slideLayouts/slideLayoutN.xml + rels)
 */

import type { PresentationDocument } from "@aurochs-office/pptx/app/presentation-document";
import type { PackageFile } from "@aurochs-office/opc";
import {
  createElement,
  getByPath,
  getChildren,
  isXmlElement,
  parseXml,
  type XmlDocument,
  type XmlElement,
  setChildren,
  updateDocumentRoot,
} from "@aurochs/xml";
import { readXmlOrThrow, writeXml } from "./xml-io";
import { getRelationshipPartPath } from "@aurochs-office/opc";
import { CONTENT_TYPES, RELATIONSHIP_TYPES } from "@aurochs-office/pptx/domain";
import { createEmptyZipPackage, isBinaryFile, type ZipPackage } from "@aurochs/zip";
import { serializeSlideLayout } from "../patcher/layout/layout-serializer";

// =============================================================================
// Result Types
// =============================================================================

export type LayoutAddResult = {
  readonly doc: PresentationDocument;
  readonly layoutPath: string;
  readonly layoutId: number;
  readonly rId: string;
};

export type LayoutRemoveResult = {
  readonly doc: PresentationDocument;
  readonly layoutPath: string;
  readonly layoutId: number;
  readonly rId: string;
};

export type LayoutDuplicateResult = {
  readonly doc: PresentationDocument;
  readonly sourceLayoutPath: string;
  readonly layoutPath: string;
  readonly layoutId: number;
  readonly rId: string;
};

// =============================================================================
// Constants
// =============================================================================

const CONTENT_TYPES_PATH = "[Content_Types].xml";
const RELS_XMLNS = "http://schemas.openxmlformats.org/package/2006/relationships";

/**
 * Minimum sldLayoutId value per ECMA-376.
 * Layout IDs in p:sldLayoutIdLst must be >= 2^31.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.40 (sldLayoutId)
 */
const MIN_LAYOUT_ID = 2147483648;

// =============================================================================
// Presentation File Helpers
// =============================================================================

function requirePackageFile(doc: PresentationDocument): PackageFile {
  if (!doc.presentationFile) {
    throw new Error("LayoutOps: PresentationDocument must have a presentationFile");
  }
  if (!doc.presentationFile.listFiles) {
    throw new Error("LayoutOps: PackageFile must implement listFiles() (load via pptx-loader ZipPackage)");
  }
  return doc.presentationFile;
}

function copyPackageFileToPackage(file: PackageFile): ZipPackage {
  if (!file.listFiles) {
    throw new Error("PackageFile must implement listFiles() to copy into a ZipPackage");
  }

  const pkg = createEmptyZipPackage();
  for (const path of file.listFiles()) {
    if (isBinaryFile(path)) {
      const content = file.readBinary(path);
      if (content) {
        pkg.writeBinary(path, content);
      }
      continue;
    }
    const content = file.readText(path);
    if (content) {
      pkg.writeText(path, content);
    }
  }
  return pkg;
}

// =============================================================================
// Path Helpers
// =============================================================================

function extractExistingPartNumbers(pkg: ZipPackage, prefixPath: string, basename: string): number[] {
  const escapedPrefix = prefixPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escapedPrefix}/${basename}(\\d+)\\.xml$`);
  const numbers: number[] = [];
  for (const path of pkg.listFiles()) {
    const match = re.exec(path);
    if (!match) {
      continue;
    }
    const n = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(n)) {
      numbers.push(n);
    }
  }
  return numbers;
}

function nextPartNumber(existing: readonly number[]): number {
  const validNums = existing.filter(Number.isFinite);
  const max = validNums.length > 0 ? Math.max(...validNums) : 0;
  return max + 1;
}

// =============================================================================
// Relationship Helpers
// =============================================================================

type RelationshipEntry = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
};

function getRelationshipEntries(relsXml: XmlDocument): RelationshipEntry[] {
  const relsRoot = getByPath(relsXml, ["Relationships"]);
  if (!relsRoot) {
    throw new Error("LayoutOps: invalid .rels xml (missing Relationships root)");
  }

  return getChildren(relsRoot, "Relationship").map((rel) => {
    const id = rel.attrs.Id;
    const type = rel.attrs.Type;
    const target = rel.attrs.Target;
    if (!id || !type || !target) {
      throw new Error("LayoutOps: invalid Relationship (missing Id/Type/Target)");
    }
    return { id, type, target };
  });
}

function addRelationship(relsXml: XmlDocument, entry: RelationshipEntry): XmlDocument {
  return updateDocumentRoot(relsXml, (root) => {
    if (root.name !== "Relationships") {
      throw new Error(`LayoutOps: expected Relationships root, got ${root.name}`);
    }

    const nextChildren = [
      ...root.children.filter(isXmlElement),
      createElement("Relationship", {
        Id: entry.id,
        Type: entry.type,
        Target: entry.target,
      }),
    ];
    return setChildren(root, nextChildren);
  });
}

function removeRelationshipById(relsXml: XmlDocument, rId: string): XmlDocument {
  return updateDocumentRoot(relsXml, (root) => {
    if (root.name !== "Relationships") {
      throw new Error(`LayoutOps: expected Relationships root, got ${root.name}`);
    }
    const relationships = getChildren(root, "Relationship");
    const next = relationships.filter((r) => r.attrs.Id !== rId);
    if (next.length === relationships.length) {
      throw new Error(`LayoutOps: relationship not found: ${rId}`);
    }
    return setChildren(root, next);
  });
}

/**
 * Generate a new unique relationship ID for a .rels file.
 *
 * Picks max numeric suffix + 1 from existing relationship IDs.
 */
function generateRId(existingRIds: readonly string[]): string {
  const numbers = existingRIds.map((rId) => {
    const match = /^rId(\d+)$/i.exec(rId);
    if (!match) {
      return 0;
    }
    const n = Number.parseInt(match[1] ?? "", 10);
    return Number.isFinite(n) ? n : 0;
  });
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `rId${max + 1}`;
}

// =============================================================================
// Content Types Helpers
// =============================================================================

function addOverride(contentTypesXml: XmlDocument, partName: string, contentType: string): XmlDocument {
  if (!partName.startsWith("/")) {
    throw new Error(`LayoutOps: addOverride expects leading "/" partName, got: ${partName}`);
  }

  return updateDocumentRoot(contentTypesXml, (root) => {
    if (root.name !== "Types") {
      throw new Error(`LayoutOps: expected Types root, got ${root.name}`);
    }

    const overrides = getChildren(root, "Override");
    const exists = overrides.some((o) => o.attrs.PartName === partName && o.attrs.ContentType === contentType);
    if (exists) {
      return root;
    }

    const next = [
      ...root.children.filter(isXmlElement),
      createElement("Override", { PartName: partName, ContentType: contentType }),
    ];
    return setChildren(root, next);
  });
}

function removeOverride(contentTypesXml: XmlDocument, partName: string): XmlDocument {
  if (!partName.startsWith("/")) {
    throw new Error(`LayoutOps: removeOverride expects leading "/" partName, got: ${partName}`);
  }

  return updateDocumentRoot(contentTypesXml, (root) => {
    if (root.name !== "Types") {
      throw new Error(`LayoutOps: expected Types root, got ${root.name}`);
    }

    const overrides = getChildren(root, "Override");
    const nextOverrides = overrides.filter((o) => o.attrs.PartName !== partName);
    if (nextOverrides.length === overrides.length) {
      return root;
    }

    const nonOverrides = root.children.filter((c): c is XmlElement => isXmlElement(c) && c.name !== "Override");
    return setChildren(root, [...nonOverrides, ...nextOverrides]);
  });
}

// =============================================================================
// Slide Master Helpers
// =============================================================================

/**
 * Find the first slide master path from the package.
 *
 * Scans for ppt/slideMasters/slideMasterN.xml files.
 */
function findDefaultMasterPath(pkg: ZipPackage): string {
  const numbers = extractExistingPartNumbers(pkg, "ppt/slideMasters", "slideMaster");
  if (numbers.length === 0) {
    throw new Error("LayoutOps: no slide masters found in package");
  }
  numbers.sort((a, b) => a - b);
  return `ppt/slideMasters/slideMaster${numbers[0]}.xml`;
}

/**
 * Get existing sldLayoutId entries from a slide master XML.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.41 (sldLayoutIdLst)
 */
function getLayoutIdEntries(masterXml: XmlDocument): { id: number; rId: string }[] {
  const sldMaster = getByPath(masterXml, ["p:sldMaster"]);
  if (!sldMaster) {
    throw new Error("LayoutOps: slide master missing p:sldMaster element");
  }

  const sldLayoutIdLst = getChildren(sldMaster, "p:sldLayoutIdLst")[0];
  if (!sldLayoutIdLst) {
    return [];
  }

  return getChildren(sldLayoutIdLst, "p:sldLayoutId").map((el) => {
    const id = el.attrs.id;
    const rId = el.attrs["r:id"];
    if (!id || !rId) {
      throw new Error("LayoutOps: invalid p:sldLayoutId (missing id or r:id)");
    }
    const layoutId = Number.parseInt(id, 10);
    if (!Number.isFinite(layoutId)) {
      throw new Error(`LayoutOps: invalid sldLayoutId: ${id}`);
    }
    return { id: layoutId, rId };
  });
}

/**
 * Generate a new unique sldLayoutId value.
 *
 * Values must be >= 2^31 (2147483648) per ECMA-376.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.40 (sldLayoutId)
 */
function generateLayoutId(existingIds: readonly number[]): number {
  const validIds = existingIds.filter((id) => Number.isFinite(id) && id >= MIN_LAYOUT_ID);
  const maxId = validIds.length > 0 ? Math.max(...validIds) : MIN_LAYOUT_ID - 1;
  return maxId + 1;
}

/**
 * Add a sldLayoutId entry to the master's sldLayoutIdLst.
 *
 * If sldLayoutIdLst does not exist, it is created and inserted
 * after p:clrMap (the standard element ordering for p:sldMaster).
 *
 * @see ECMA-376 Part 1, Section 19.3.1.41 (sldLayoutIdLst)
 */
function addLayoutIdToMaster(masterXml: XmlDocument, layoutId: number, rId: string): XmlDocument {
  return updateDocumentRoot(masterXml, (root) => {
    if (root.name !== "p:sldMaster") {
      throw new Error(`LayoutOps: expected p:sldMaster root, got ${root.name}`);
    }

    const newEntry = createElement("p:sldLayoutId", { id: String(layoutId), "r:id": rId });

    const existingList = root.children.find(
      (c): c is XmlElement => isXmlElement(c) && c.name === "p:sldLayoutIdLst",
    );

    if (existingList) {
      const updatedList = setChildren(existingList, [
        ...existingList.children.filter(isXmlElement),
        newEntry,
      ]);
      return {
        ...root,
        children: root.children.map((child) =>
          isXmlElement(child) && child.name === "p:sldLayoutIdLst" ? updatedList : child,
        ),
      };
    }

    // Create new sldLayoutIdLst and insert after p:clrMap
    const newList = createElement("p:sldLayoutIdLst", {}, [newEntry]);
    const clrMapIndex = root.children.findIndex(
      (c): c is XmlElement => isXmlElement(c) && c.name === "p:clrMap",
    );
    const insertIndex = clrMapIndex !== -1 ? clrMapIndex + 1 : root.children.length;
    const nextChildren = [...root.children];
    nextChildren.splice(insertIndex, 0, newList);
    return setChildren(root, nextChildren);
  });
}

/**
 * Remove a sldLayoutId entry from the master's sldLayoutIdLst by r:id.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.41 (sldLayoutIdLst)
 */
function removeLayoutIdFromMaster(masterXml: XmlDocument, rId: string): XmlDocument {
  return updateDocumentRoot(masterXml, (root) => {
    if (root.name !== "p:sldMaster") {
      throw new Error(`LayoutOps: expected p:sldMaster root, got ${root.name}`);
    }

    const existingList = root.children.find(
      (c): c is XmlElement => isXmlElement(c) && c.name === "p:sldLayoutIdLst",
    );

    if (!existingList) {
      throw new Error("LayoutOps: slide master missing p:sldLayoutIdLst");
    }

    const entries = getChildren(existingList, "p:sldLayoutId");
    const nextEntries = entries.filter((e) => e.attrs["r:id"] !== rId);
    if (nextEntries.length === entries.length) {
      throw new Error(`LayoutOps: sldLayoutId with r:id=${rId} not found in master`);
    }

    const updatedList = setChildren(existingList, nextEntries);
    return {
      ...root,
      children: root.children.map((child) =>
        isXmlElement(child) && child.name === "p:sldLayoutIdLst" ? updatedList : child,
      ),
    };
  });
}

/**
 * Find the relationship entry in the master rels that points to the given layout path.
 *
 * Master rels use relative targets like "../slideLayouts/slideLayoutN.xml".
 */
function findLayoutRelInMaster(
  masterRelsXml: XmlDocument,
  layoutPath: string,
  masterPath: string,
): RelationshipEntry | undefined {
  const entries = getRelationshipEntries(masterRelsXml);
  const masterDir = masterPath.slice(0, masterPath.lastIndexOf("/"));

  return entries.find((e) => {
    if (e.type !== RELATIONSHIP_TYPES.SLIDE_LAYOUT) {
      return false;
    }
    // Resolve relative target to absolute path
    const resolvedTarget = resolveRelativeTarget(masterDir, e.target);
    return resolvedTarget === layoutPath;
  });
}

/**
 * Resolve a relative target path against a base directory.
 *
 * e.g., ("ppt/slideMasters", "../slideLayouts/slideLayout1.xml")
 *   -> "ppt/slideLayouts/slideLayout1.xml"
 */
function resolveRelativeTarget(baseDir: string, target: string): string {
  if (!target.startsWith("../")) {
    if (target.startsWith("/")) {
      return target.slice(1);
    }
    return `${baseDir}/${target}`;
  }

  const parts = baseDir.split("/");
  const targetParts = target.split("/");

  // eslint-disable-next-line no-restricted-syntax -- mutable index for iterating target parts
  let i = 0;
  while (i < targetParts.length && targetParts[i] === "..") {
    parts.pop();
    i++;
  }

  return [...parts, ...targetParts.slice(i)].join("/");
}

/**
 * Find the master path that owns a given layout path by checking master rels.
 */
function findMasterForLayout(pkg: ZipPackage, layoutPath: string): string {
  const masterNumbers = extractExistingPartNumbers(pkg, "ppt/slideMasters", "slideMaster");
  for (const num of masterNumbers) {
    const masterPath = `ppt/slideMasters/slideMaster${num}.xml`;
    const masterRelsPath = getRelationshipPartPath(masterPath);
    const masterRelsText = pkg.readText(masterRelsPath);
    if (!masterRelsText) {
      continue;
    }
    const masterRelsXml = parseXml(masterRelsText);
    const rel = findLayoutRelInMaster(masterRelsXml, layoutPath, masterPath);
    if (rel) {
      return masterPath;
    }
  }
  throw new Error(`LayoutOps: no slide master found that owns layout: ${layoutPath}`);
}

// =============================================================================
// Layout Rels Builder
// =============================================================================

/**
 * Build a layout .rels XML pointing to the slide master.
 *
 * Layout rels reference their parent master via a relative path
 * like "../slideMasters/slideMaster1.xml".
 */
function buildLayoutRelsXml(masterPath: string): XmlDocument {
  if (!masterPath.startsWith("ppt/")) {
    throw new Error(`LayoutOps: masterPath must be a ppt/ path, got: ${masterPath}`);
  }
  // From ppt/slideLayouts/ to ppt/slideMasters/slideMasterN.xml
  const targetFromLayouts = `../${masterPath.slice("ppt/".length)}`;
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", {
          Id: "rId1",
          Type: RELATIONSHIP_TYPES.SLIDE_MASTER,
          Target: targetFromLayouts,
        }),
      ]),
    ],
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Add a new blank slide layout to the presentation.
 *
 * Creates a minimal layout XML, adds it to the specified slide master
 * (or the first master by default), and updates all required parts.
 *
 * @param doc - Presentation document
 * @param masterPath - Path to the slide master (defaults to first master)
 * @returns Result with updated document and layout metadata
 */
export function addSlideLayout(doc: PresentationDocument, masterPath?: string): LayoutAddResult {
  const file = requirePackageFile(doc);
  const pkg = copyPackageFileToPackage(file);

  const resolvedMasterPath = masterPath ?? findDefaultMasterPath(pkg);
  if (!pkg.exists(resolvedMasterPath)) {
    throw new Error(`LayoutOps: slide master does not exist: ${resolvedMasterPath}`);
  }

  const masterRelsPath = getRelationshipPartPath(resolvedMasterPath);
  const masterXml = readXmlOrThrow(pkg, resolvedMasterPath);
  const masterRelsXml = readXmlOrThrow(pkg, masterRelsPath);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  // Generate next layout number
  const layoutNumber = nextPartNumber(extractExistingPartNumbers(pkg, "ppt/slideLayouts", "slideLayout"));
  const layoutFilename = `slideLayout${layoutNumber}`;
  const layoutPath = `ppt/slideLayouts/${layoutFilename}.xml`;
  if (pkg.exists(layoutPath)) {
    throw new Error(`LayoutOps: generated layout path already exists: ${layoutPath}`);
  }

  // Generate IDs
  const existingLayoutIds = getLayoutIdEntries(masterXml).map((e) => e.id);
  const layoutId = generateLayoutId(existingLayoutIds);
  const existingRIds = getRelationshipEntries(masterRelsXml).map((r) => r.id);
  const rId = generateRId(existingRIds);

  // Create layout XML and rels
  writeXml(pkg,layoutPath, serializeSlideLayout({ type: "blank", preserve: true }));
  writeXml(pkg,getRelationshipPartPath(layoutPath), buildLayoutRelsXml(resolvedMasterPath));

  // Add relationship in master rels pointing to the new layout
  // Target is relative from ppt/slideMasters/ to ppt/slideLayouts/
  const updatedMasterRelsXml = addRelationship(masterRelsXml, {
    id: rId,
    type: RELATIONSHIP_TYPES.SLIDE_LAYOUT,
    target: `../slideLayouts/${layoutFilename}.xml`,
  });

  // Add to master's sldLayoutIdLst
  const updatedMasterXml = addLayoutIdToMaster(masterXml, layoutId, rId);

  // Add override in [Content_Types].xml
  const updatedContentTypesXml = addOverride(
    contentTypesXml,
    `/ppt/slideLayouts/${layoutFilename}.xml`,
    CONTENT_TYPES.SLIDE_LAYOUT,
  );

  // Write updated parts
  writeXml(pkg,resolvedMasterPath, updatedMasterXml);
  writeXml(pkg,masterRelsPath, updatedMasterRelsXml);
  writeXml(pkg,CONTENT_TYPES_PATH, updatedContentTypesXml);

  const updatedDoc: PresentationDocument = {
    ...doc,
    presentationFile: pkg.asPresentationFile(),
  };

  return { doc: updatedDoc, layoutPath, layoutId, rId };
}

/**
 * Delete a slide layout from the presentation.
 *
 * Removes the layout XML, its rels, the relationship in the owning master,
 * the entry in the master's sldLayoutIdLst, and the content type override.
 *
 * @param doc - Presentation document
 * @param layoutPath - Path to the layout to delete (e.g., "ppt/slideLayouts/slideLayout2.xml")
 * @returns Result with updated document and removed layout metadata
 */
export function deleteSlideLayout(doc: PresentationDocument, layoutPath: string): LayoutRemoveResult {
  const file = requirePackageFile(doc);
  if (!layoutPath || !layoutPath.startsWith("ppt/")) {
    throw new Error(`LayoutOps: invalid layoutPath: ${layoutPath}`);
  }

  const pkg = copyPackageFileToPackage(file);
  if (!pkg.exists(layoutPath)) {
    throw new Error(`LayoutOps: layout does not exist: ${layoutPath}`);
  }

  // Find the master that owns this layout
  const masterPath = findMasterForLayout(pkg, layoutPath);
  const masterRelsPath = getRelationshipPartPath(masterPath);
  const masterXml = readXmlOrThrow(pkg, masterPath);
  const masterRelsXml = readXmlOrThrow(pkg, masterRelsPath);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  // Find the relationship entry for this layout in the master rels
  const layoutRel = findLayoutRelInMaster(masterRelsXml, layoutPath, masterPath);
  if (!layoutRel) {
    throw new Error(`LayoutOps: layout relationship not found in master rels for: ${layoutPath}`);
  }

  // Find the layout ID from the master's sldLayoutIdLst
  const layoutIdEntries = getLayoutIdEntries(masterXml);
  const layoutIdEntry = layoutIdEntries.find((e) => e.rId === layoutRel.id);
  if (!layoutIdEntry) {
    throw new Error(`LayoutOps: sldLayoutId entry not found for rId=${layoutRel.id}`);
  }

  // Remove from master's sldLayoutIdLst
  const updatedMasterXml = removeLayoutIdFromMaster(masterXml, layoutRel.id);

  // Remove relationship from master rels
  const updatedMasterRelsXml = removeRelationshipById(masterRelsXml, layoutRel.id);

  // Remove from [Content_Types].xml
  const updatedContentTypesXml = removeOverride(contentTypesXml, `/${layoutPath}`);

  // Delete layout XML and rels files
  pkg.remove(layoutPath);
  const layoutRelsPath = getRelationshipPartPath(layoutPath);
  if (pkg.exists(layoutRelsPath)) {
    pkg.remove(layoutRelsPath);
  }

  // Write updated parts
  writeXml(pkg,masterPath, updatedMasterXml);
  writeXml(pkg,masterRelsPath, updatedMasterRelsXml);
  writeXml(pkg,CONTENT_TYPES_PATH, updatedContentTypesXml);

  const updatedDoc: PresentationDocument = {
    ...doc,
    presentationFile: pkg.asPresentationFile(),
  };

  return { doc: updatedDoc, layoutPath, layoutId: layoutIdEntry.id, rId: layoutRel.id };
}

/**
 * Duplicate a slide layout within the presentation.
 *
 * Copies the source layout XML and rels, creates a new file,
 * and adds the necessary entries in the owning master and content types.
 *
 * @param doc - Presentation document
 * @param layoutPath - Path to the layout to duplicate (e.g., "ppt/slideLayouts/slideLayout1.xml")
 * @returns Result with updated document and new layout metadata
 */
export function duplicateSlideLayout(doc: PresentationDocument, layoutPath: string): LayoutDuplicateResult {
  const file = requirePackageFile(doc);
  if (!layoutPath || !layoutPath.startsWith("ppt/")) {
    throw new Error(`LayoutOps: invalid layoutPath: ${layoutPath}`);
  }

  const pkg = copyPackageFileToPackage(file);
  if (!pkg.exists(layoutPath)) {
    throw new Error(`LayoutOps: layout does not exist: ${layoutPath}`);
  }

  // Find the master that owns this layout
  const masterPath = findMasterForLayout(pkg, layoutPath);
  const masterRelsPath = getRelationshipPartPath(masterPath);
  const masterXml = readXmlOrThrow(pkg, masterPath);
  const masterRelsXml = readXmlOrThrow(pkg, masterRelsPath);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  // Read source layout XML and rels
  const sourceLayoutXml = pkg.readText(layoutPath);
  if (!sourceLayoutXml) {
    throw new Error(`LayoutOps: missing source layout xml: ${layoutPath}`);
  }
  const sourceLayoutRelsPath = getRelationshipPartPath(layoutPath);
  const sourceLayoutRelsText = pkg.readText(sourceLayoutRelsPath);

  // Generate new file path
  const layoutNumber = nextPartNumber(extractExistingPartNumbers(pkg, "ppt/slideLayouts", "slideLayout"));
  const layoutFilename = `slideLayout${layoutNumber}`;
  const newLayoutPath = `ppt/slideLayouts/${layoutFilename}.xml`;
  if (pkg.exists(newLayoutPath)) {
    throw new Error(`LayoutOps: generated layout path already exists: ${newLayoutPath}`);
  }

  // Generate IDs
  const existingLayoutIds = getLayoutIdEntries(masterXml).map((e) => e.id);
  const layoutId = generateLayoutId(existingLayoutIds);
  const existingRIds = getRelationshipEntries(masterRelsXml).map((r) => r.id);
  const rId = generateRId(existingRIds);

  // Copy layout XML content
  pkg.writeText(newLayoutPath, sourceLayoutXml);

  // Copy layout rels if they exist
  if (sourceLayoutRelsText) {
    pkg.writeText(getRelationshipPartPath(newLayoutPath), sourceLayoutRelsText);
  }

  // Add new relationship in master rels
  const updatedMasterRelsXml = addRelationship(masterRelsXml, {
    id: rId,
    type: RELATIONSHIP_TYPES.SLIDE_LAYOUT,
    target: `../slideLayouts/${layoutFilename}.xml`,
  });

  // Add new entry to sldLayoutIdLst
  const updatedMasterXml = addLayoutIdToMaster(masterXml, layoutId, rId);

  // Add override in [Content_Types].xml
  const updatedContentTypesXml = addOverride(
    contentTypesXml,
    `/ppt/slideLayouts/${layoutFilename}.xml`,
    CONTENT_TYPES.SLIDE_LAYOUT,
  );

  // Write updated parts
  writeXml(pkg,masterPath, updatedMasterXml);
  writeXml(pkg,masterRelsPath, updatedMasterRelsXml);
  writeXml(pkg,CONTENT_TYPES_PATH, updatedContentTypesXml);

  const updatedDoc: PresentationDocument = {
    ...doc,
    presentationFile: pkg.asPresentationFile(),
  };

  return { doc: updatedDoc, sourceLayoutPath: layoutPath, layoutPath: newLayoutPath, layoutId, rId };
}
