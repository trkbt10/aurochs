/**
 * @file Slide operations for PPTX packages
 *
 * Handles add/remove/reorder/duplicate slide operations directly on ZipPackage.
 */

import type { ZipPackage } from "@aurochs/zip";
import {
  parseXml,
  serializeDocument,
  getByPath,
  getChildren,
  isXmlElement,
  createElement,
  type XmlDocument,
  type XmlElement,
  type XmlNode,
} from "@aurochs/xml";
import { PRESENTATIONML_CONTENT_TYPES, PRESENTATIONML_RELATIONSHIP_TYPES } from "@aurochs-office/opc";

const PRESENTATION_XML_PATH = "ppt/presentation.xml";
const PRESENTATION_RELS_PATH = "ppt/_rels/presentation.xml.rels";
const CONTENT_TYPES_PATH = "[Content_Types].xml";

const SLIDE_REL_TYPE = PRESENTATIONML_RELATIONSHIP_TYPES.slide;
const SLIDE_LAYOUT_REL_TYPE = PRESENTATIONML_RELATIONSHIP_TYPES.slideLayout;
const NOTES_REL_TYPE = PRESENTATIONML_RELATIONSHIP_TYPES.notesSlide;
const SLIDE_CONTENT_TYPE = PRESENTATIONML_CONTENT_TYPES.slide;
const NOTES_CONTENT_TYPE = PRESENTATIONML_CONTENT_TYPES.notesSlide;

const RELS_XMLNS = "http://schemas.openxmlformats.org/package/2006/relationships";

// =============================================================================
// Types
// =============================================================================

/**
 * Specification for adding a new slide
 */
export type SlideAddSpec = {
  /** Path to the slide layout XML (e.g., "ppt/slideLayouts/slideLayout1.xml") */
  readonly layoutPath: string;
  /** Optional position to insert the slide (0-based index). Appends to end if not specified. */
  readonly insertAt?: number;
};

/**
 * Specification for removing a slide
 */
export type SlideRemoveSpec = {
  /** Slide number to remove (1-based) */
  readonly slideNumber: number;
};

/**
 * Specification for reordering a slide
 */
export type SlideReorderSpec = {
  /** Current position (0-based index) */
  readonly from: number;
  /** Target position (0-based index) */
  readonly to: number;
};

/**
 * Specification for duplicating a slide
 */
export type SlideDuplicateSpec = {
  /** Source slide number to duplicate (1-based) */
  readonly sourceSlideNumber: number;
  /** Optional position to insert the duplicate (0-based index). Inserts after source if not specified. */
  readonly insertAt?: number;
};

/**
 * Result of slide operations
 */
export type SlideOperationsResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };

/**
 * Statistics for slide operations
 */
export type SlideOpsStats = {
  readonly added: number;
  readonly removed: number;
  readonly reordered: number;
  readonly duplicated: number;
};

type SlideEntry = {
  readonly slideId: number;
  readonly rId: string;
};

// =============================================================================
// XML Helpers
// =============================================================================

function readXmlOrThrow(pkg: ZipPackage, path: string): XmlDocument {
  const text = pkg.readText(path);
  if (!text) {
    throw new Error(`Missing required xml part: ${path}`);
  }
  return parseXml(text);
}

function writeXml(pkg: ZipPackage, path: string, doc: XmlDocument): void {
  const xml = serializeDocument(doc, { declaration: true, standalone: true });
  pkg.writeText(path, xml);
}

function setChildren(element: XmlElement, children: XmlNode[]): XmlElement {
  return { ...element, children };
}

function updateDocumentRoot(doc: XmlDocument, updater: (root: XmlElement) => XmlElement): XmlDocument {
  const root = doc.children.find(isXmlElement);
  if (!root) {
    throw new Error("No root element found");
  }
  const updated = updater(root);
  return { children: doc.children.map((c) => (isXmlElement(c) && c === root ? updated : c)) };
}

// =============================================================================
// Slide Entry Helpers
// =============================================================================

function getSlideEntries(presentationXml: XmlDocument): SlideEntry[] {
  const sldIdLst = getByPath(presentationXml, ["p:presentation", "p:sldIdLst"]);
  if (!sldIdLst) {
    return [];
  }

  return getChildren(sldIdLst, "p:sldId").map((el) => {
    const id = el.attrs.id;
    const rId = el.attrs["r:id"];
    if (!id || !rId) {
      throw new Error("Invalid p:sldId (missing id or r:id)");
    }
    const slideId = Number.parseInt(id, 10);
    if (!Number.isFinite(slideId)) {
      throw new Error(`Invalid slideId: ${id}`);
    }
    return { slideId, rId };
  });
}

function getRelationshipEntries(relsXml: XmlDocument): { id: string; type: string; target: string }[] {
  const relsRoot = getByPath(relsXml, ["Relationships"]);
  if (!relsRoot) {
    return [];
  }

  return getChildren(relsRoot, "Relationship").map((rel) => {
    const id = rel.attrs.Id ?? "";
    const type = rel.attrs.Type ?? "";
    const target = rel.attrs.Target ?? "";
    return { id, type, target };
  });
}

function generateSlideId(existing: readonly number[]): number {
  const used = new Set(existing);
  // Slide IDs typically start at 256
  for (let id = 256; ; id++) {
    if (!used.has(id)) {
      return id;
    }
  }
}

function generateRId(existing: readonly string[]): string {
  const used = new Set(existing);
  for (let i = 1; ; i++) {
    const rId = `rId${i}`;
    if (!used.has(rId)) {
      return rId;
    }
  }
}

function getSlideNumbersFromPackage(pkg: ZipPackage): number[] {
  const numbers: number[] = [];
  for (const path of pkg.listFiles()) {
    const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(path);
    if (match?.[1]) {
      numbers.push(Number.parseInt(match[1], 10));
    }
  }
  return numbers;
}

function getNextSlideNumber(pkg: ZipPackage): number {
  const existing = getSlideNumbersFromPackage(pkg);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return max + 1;
}

function getNotesNumbersFromPackage(pkg: ZipPackage): number[] {
  const numbers: number[] = [];
  for (const path of pkg.listFiles()) {
    const match = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/.exec(path);
    if (match?.[1]) {
      numbers.push(Number.parseInt(match[1], 10));
    }
  }
  return numbers;
}

function getNextNotesNumber(pkg: ZipPackage): number {
  const existing = getNotesNumbersFromPackage(pkg);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return max + 1;
}

function normalizeNotesTarget(target: string): string {
  return target.startsWith("../") ? `ppt/${target.slice(3)}` : `ppt/${target}`;
}

function findNotesPath(pkg: ZipPackage, slideRelsPath: string): string | null {
  const slideRelsText = pkg.readText(slideRelsPath);
  if (!slideRelsText) {
    return null;
  }
  const slideRelsXml = parseXml(slideRelsText);
  const slideRelEntries = getRelationshipEntries(slideRelsXml);
  const notesRel = slideRelEntries.find((r) => r.type === NOTES_REL_TYPE);
  return notesRel ? normalizeNotesTarget(notesRel.target) : null;
}

function removeNotesSlideIfPresent(
  pkg: ZipPackage,
  notesPath: string | null,
  contentTypesXml: XmlDocument,
): XmlDocument {
  if (!notesPath || !pkg.exists(notesPath)) {
    return contentTypesXml;
  }
  pkg.remove(notesPath);
  const notesRelsPath = notesPath.replace(/\.xml$/, ".xml.rels").replace("/notesSlides/", "/notesSlides/_rels/");
  if (pkg.exists(notesRelsPath)) {
    pkg.remove(notesRelsPath);
  }
  return removeOverride(contentTypesXml, `/${notesPath}`);
}

// =============================================================================
// Slide List Operations
// =============================================================================

type AddSlideToListOptions = {
  readonly presentationXml: XmlDocument;
  readonly slideId: number;
  readonly rId: string;
  readonly position?: number;
};

function addSlideToList({ presentationXml, slideId, rId, position }: AddSlideToListOptions): XmlDocument {
  return updateDocumentRoot(presentationXml, (root) => {
    const sldIdLst = getChildren(root, "p:sldIdLst")[0];
    if (!sldIdLst) {
      throw new Error("Missing p:sldIdLst in presentation.xml");
    }

    const sldIds = getChildren(sldIdLst, "p:sldId");
    const newSldId = createElement("p:sldId", { id: `${slideId}`, "r:id": rId });

    const insertAt = position ?? sldIds.length;
    const nextSldIds = [...sldIds.slice(0, insertAt), newSldId, ...sldIds.slice(insertAt)];
    const updatedSldIdLst = setChildren(sldIdLst, nextSldIds);

    return {
      ...root,
      children: root.children.map((c) => (isXmlElement(c) && c.name === "p:sldIdLst" ? updatedSldIdLst : c)),
    };
  });
}

function removeSlideFromList(presentationXml: XmlDocument, slideId: number): XmlDocument {
  return updateDocumentRoot(presentationXml, (root) => {
    const sldIdLst = getChildren(root, "p:sldIdLst")[0];
    if (!sldIdLst) {
      throw new Error("Missing p:sldIdLst in presentation.xml");
    }

    const sldIds = getChildren(sldIdLst, "p:sldId");
    const nextSldIds = sldIds.filter((el) => el.attrs.id !== `${slideId}`);
    const updatedSldIdLst = setChildren(sldIdLst, nextSldIds);

    return {
      ...root,
      children: root.children.map((c) => (isXmlElement(c) && c.name === "p:sldIdLst" ? updatedSldIdLst : c)),
    };
  });
}

function reorderSlideInList(presentationXml: XmlDocument, slideId: number, toIndex: number): XmlDocument {
  return updateDocumentRoot(presentationXml, (root) => {
    const sldIdLst = getChildren(root, "p:sldIdLst")[0];
    if (!sldIdLst) {
      throw new Error("Missing p:sldIdLst in presentation.xml");
    }

    const sldIds = [...getChildren(sldIdLst, "p:sldId")];
    const fromIndex = sldIds.findIndex((el) => el.attrs.id === `${slideId}`);
    if (fromIndex === -1) {
      throw new Error(`Slide ${slideId} not found in sldIdLst`);
    }

    const [moved] = sldIds.splice(fromIndex, 1);
    sldIds.splice(toIndex, 0, moved);
    const updatedSldIdLst = setChildren(sldIdLst, sldIds);

    return {
      ...root,
      children: root.children.map((c) => (isXmlElement(c) && c.name === "p:sldIdLst" ? updatedSldIdLst : c)),
    };
  });
}

// =============================================================================
// Relationship Operations
// =============================================================================

type AddRelationshipOptions = {
  readonly relsXml: XmlDocument;
  readonly id: string;
  readonly type: string;
  readonly target: string;
};

function addRelationship({ relsXml, id, type, target }: AddRelationshipOptions): XmlDocument {
  return updateDocumentRoot(relsXml, (root) => {
    const newRel = createElement("Relationship", { Id: id, Type: type, Target: target });
    const nextChildren = [...root.children.filter(isXmlElement), newRel];
    return setChildren(root, nextChildren);
  });
}

function removeRelationship(relsXml: XmlDocument, rId: string): XmlDocument {
  return updateDocumentRoot(relsXml, (root) => {
    const rels = getChildren(root, "Relationship");
    const nextRels = rels.filter((r) => r.attrs.Id !== rId);
    return setChildren(root, nextRels);
  });
}

function updateRelationshipTarget(relsXml: XmlDocument, rId: string, newTarget: string): XmlDocument {
  return updateDocumentRoot(relsXml, (root) => {
    const rels = getChildren(root, "Relationship");
    const nextRels = rels.map((r) =>
      r.attrs.Id !== rId ? r : createElement("Relationship", { ...r.attrs, Target: newTarget }),
    );
    return setChildren(root, nextRels);
  });
}

// =============================================================================
// Content Types Operations
// =============================================================================

function addOverride(contentTypesXml: XmlDocument, partName: string, contentType: string): XmlDocument {
  return updateDocumentRoot(contentTypesXml, (root) => {
    const overrides = getChildren(root, "Override");
    const exists = overrides.some((o) => o.attrs.PartName === partName && o.attrs.ContentType === contentType);
    if (exists) {
      return root;
    }

    const nonOverrides = root.children.filter((c): c is XmlElement => isXmlElement(c) && c.name !== "Override");
    const newOverride = createElement("Override", { PartName: partName, ContentType: contentType });
    return setChildren(root, [...nonOverrides, ...overrides, newOverride]);
  });
}

function removeOverride(contentTypesXml: XmlDocument, partName: string): XmlDocument {
  return updateDocumentRoot(contentTypesXml, (root) => {
    const filtered = root.children.filter(
      (c) => !(isXmlElement(c) && c.name === "Override" && c.attrs.PartName === partName),
    );
    return setChildren(root, filtered);
  });
}

// =============================================================================
// Blank Slide Builder
// =============================================================================

function buildBlankSlideXml(): XmlDocument {
  return {
    children: [
      createElement(
        "p:sld",
        {
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
        },
        [
          createElement("p:cSld", {}, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "1", name: "" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"),
              ]),
              createElement("p:grpSpPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "0", cy: "0" }),
                  createElement("a:chOff", { x: "0", y: "0" }),
                  createElement("a:chExt", { cx: "0", cy: "0" }),
                ]),
              ]),
            ]),
          ]),
          createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]),
        ],
      ),
    ],
  };
}

function normalizeLayoutPath(layoutPath: string): string {
  return layoutPath.startsWith("ppt/") ? `../${layoutPath.slice(4)}` : layoutPath;
}

function buildSlideRelsXml(layoutPath: string): XmlDocument {
  const targetFromSlides = normalizeLayoutPath(layoutPath);

  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", {
          Id: "rId1",
          Type: SLIDE_LAYOUT_REL_TYPE,
          Target: targetFromSlides,
        }),
      ]),
    ],
  };
}

// =============================================================================
// Slide Operations
// =============================================================================

function addSlideToPackage(pkg: ZipPackage, spec: SlideAddSpec): { slideNumber: number } {
  // Verify layout exists
  if (!pkg.exists(spec.layoutPath)) {
    throw new Error(`Layout not found: ${spec.layoutPath}`);
  }

  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const presentationRelsXml = readXmlOrThrow(pkg, PRESENTATION_RELS_PATH);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  const slideEntries = getSlideEntries(presentationXml);
  const relsEntries = getRelationshipEntries(presentationRelsXml);

  const slideId = generateSlideId(slideEntries.map((s) => s.slideId));
  const rId = generateRId(relsEntries.map((r) => r.id));
  const slideNumber = getNextSlideNumber(pkg);
  const slideFilename = `slide${slideNumber}`;
  const slidePath = `ppt/slides/${slideFilename}.xml`;
  const slideRelsPath = `ppt/slides/_rels/${slideFilename}.xml.rels`;

  // Write slide XML
  writeXml(pkg, slidePath, buildBlankSlideXml());
  writeXml(pkg, slideRelsPath, buildSlideRelsXml(spec.layoutPath));

  // Update presentation.xml
  const updatedPresentationXml = addSlideToList({
    presentationXml,
    slideId,
    rId,
    position: spec.insertAt,
  });

  // Update presentation.xml.rels
  const updatedPresentationRelsXml = addRelationship({
    relsXml: presentationRelsXml,
    id: rId,
    type: SLIDE_REL_TYPE,
    target: `slides/${slideFilename}.xml`,
  });

  // Update [Content_Types].xml
  const updatedContentTypesXml = addOverride(contentTypesXml, `/ppt/slides/${slideFilename}.xml`, SLIDE_CONTENT_TYPE);

  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
  writeXml(pkg, PRESENTATION_RELS_PATH, updatedPresentationRelsXml);
  writeXml(pkg, CONTENT_TYPES_PATH, updatedContentTypesXml);

  return { slideNumber };
}

function removeSlideFromPackage(pkg: ZipPackage, slideIndex: number): void {
  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const presentationRelsXml = readXmlOrThrow(pkg, PRESENTATION_RELS_PATH);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  const slideEntries = getSlideEntries(presentationXml);
  if (slideIndex < 0 || slideIndex >= slideEntries.length) {
    throw new Error(`Slide index out of range: ${slideIndex}`);
  }

  const entry = slideEntries[slideIndex]!;
  const relsEntries = getRelationshipEntries(presentationRelsXml);
  const slideRel = relsEntries.find((r) => r.id === entry.rId);

  if (!slideRel) {
    throw new Error(`Relationship not found: ${entry.rId}`);
  }

  const slidePath = `ppt/${slideRel.target}`;
  const slideRelsPath = slidePath.replace(/\.xml$/, ".xml.rels").replace("/slides/", "/slides/_rels/");

  // Check for notes slide
  const notesPath = findNotesPath(pkg, slideRelsPath);

  // Remove files
  pkg.remove(slidePath);
  if (pkg.exists(slideRelsPath)) {
    pkg.remove(slideRelsPath);
  }

  // Update presentation.xml
  const updatedPresentationXml = removeSlideFromList(presentationXml, entry.slideId);
  const updatedPresentationRelsXml = removeRelationship(presentationRelsXml, entry.rId);
  const baseContentTypes = removeOverride(contentTypesXml, `/${slidePath}`);

  // Remove notes slide if present
  const updatedContentTypesXml = removeNotesSlideIfPresent(pkg, notesPath, baseContentTypes);

  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
  writeXml(pkg, PRESENTATION_RELS_PATH, updatedPresentationRelsXml);
  writeXml(pkg, CONTENT_TYPES_PATH, updatedContentTypesXml);
}

function reorderSlideInPackage(pkg: ZipPackage, fromIndex: number, toIndex: number): void {
  if (fromIndex === toIndex) {
    return;
  }

  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const slideEntries = getSlideEntries(presentationXml);

  if (fromIndex < 0 || fromIndex >= slideEntries.length) {
    throw new Error(`From index out of range: ${fromIndex}`);
  }
  if (toIndex < 0 || toIndex >= slideEntries.length) {
    throw new Error(`To index out of range: ${toIndex}`);
  }

  const entry = slideEntries[fromIndex]!;
  const updatedPresentationXml = reorderSlideInList(presentationXml, entry.slideId, toIndex);
  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
}

type DuplicateNotesResult = {
  readonly updatedSlideRelsXml: XmlDocument;
  readonly updatedContentTypesXml: XmlDocument;
};

type UpdateNotesRelsOptions = {
  readonly pkg: ZipPackage;
  readonly sourceNotesPath: string;
  readonly slideFilename: string;
  readonly newNotesRelsPath: string;
};

function updateSlideRelInNotesRels(notesRelsXml: XmlDocument, slideFilename: string): XmlDocument {
  const notesRelEntries = getRelationshipEntries(notesRelsXml);
  const slideRel = notesRelEntries.find((rel) => rel.type === SLIDE_REL_TYPE);
  if (!slideRel) {
    return notesRelsXml;
  }
  return updateRelationshipTarget(notesRelsXml, slideRel.id, `../slides/${slideFilename}.xml`);
}

function updateNotesRelsForDuplicate({
  pkg,
  sourceNotesPath,
  slideFilename,
  newNotesRelsPath,
}: UpdateNotesRelsOptions): void {
  const sourceNotesRelsPath = sourceNotesPath
    .replace(/\.xml$/, ".xml.rels")
    .replace("/notesSlides/", "/notesSlides/_rels/");
  const sourceNotesRelsText = pkg.readText(sourceNotesRelsPath);
  if (!sourceNotesRelsText) {
    return;
  }
  const notesRelsXml = parseXml(sourceNotesRelsText);
  const updatedNotesRelsXml = updateSlideRelInNotesRels(notesRelsXml, slideFilename);
  writeXml(pkg, newNotesRelsPath, updatedNotesRelsXml);
}

type DuplicateNotesSlideOptions = {
  readonly pkg: ZipPackage;
  readonly notesRel: { id: string; target: string };
  readonly slideFilename: string;
  readonly slideRelsXml: XmlDocument;
  readonly contentTypesXml: XmlDocument;
};

function duplicateNotesSlide(options: DuplicateNotesSlideOptions): DuplicateNotesResult {
  const { pkg, notesRel, slideFilename, slideRelsXml, contentTypesXml } = options;
  const sourceNotesPath = normalizeNotesTarget(notesRel.target);
  const sourceNotesXml = pkg.readText(sourceNotesPath);

  if (!sourceNotesXml) {
    return { updatedSlideRelsXml: slideRelsXml, updatedContentTypesXml: contentTypesXml };
  }

  const notesNumber = getNextNotesNumber(pkg);
  const notesFilename = `notesSlide${notesNumber}`;
  const newNotesPath = `ppt/notesSlides/${notesFilename}.xml`;
  const newNotesRelsPath = `ppt/notesSlides/_rels/${notesFilename}.xml.rels`;

  pkg.writeText(newNotesPath, sourceNotesXml);
  const updatedContentTypesXml = addOverride(contentTypesXml, `/${newNotesPath}`, NOTES_CONTENT_TYPE);

  updateNotesRelsForDuplicate({ pkg, sourceNotesPath, slideFilename, newNotesRelsPath });

  const updatedSlideRelsXml = updateRelationshipTarget(
    slideRelsXml,
    notesRel.id,
    `../notesSlides/${notesFilename}.xml`,
  );

  return { updatedSlideRelsXml, updatedContentTypesXml };
}

type DuplicateSlideRelsOptions = {
  readonly pkg: ZipPackage;
  readonly sourceSlideRelsText: string | null;
  readonly slideFilename: string;
  readonly newSlideRelsPath: string;
  readonly contentTypesXml: XmlDocument;
};

function duplicateSlideRelsAndNotes(options: DuplicateSlideRelsOptions): XmlDocument {
  const { pkg, sourceSlideRelsText, slideFilename, newSlideRelsPath, contentTypesXml } = options;
  if (!sourceSlideRelsText) {
    return contentTypesXml;
  }

  const slideRelsXml = parseXml(sourceSlideRelsText);
  const slideRelEntries = getRelationshipEntries(slideRelsXml);
  const notesRel = slideRelEntries.find((r) => r.type === NOTES_REL_TYPE);

  if (!notesRel) {
    writeXml(pkg, newSlideRelsPath, slideRelsXml);
    return contentTypesXml;
  }

  const { updatedSlideRelsXml, updatedContentTypesXml } = duplicateNotesSlide({
    pkg,
    notesRel,
    slideFilename,
    slideRelsXml,
    contentTypesXml,
  });

  writeXml(pkg, newSlideRelsPath, updatedSlideRelsXml);
  return updatedContentTypesXml;
}

function duplicateSlideInPackage(pkg: ZipPackage, slideIndex: number, insertAt?: number): void {
  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const presentationRelsXml = readXmlOrThrow(pkg, PRESENTATION_RELS_PATH);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  const slideEntries = getSlideEntries(presentationXml);
  if (slideIndex < 0 || slideIndex >= slideEntries.length) {
    throw new Error(`Slide index out of range: ${slideIndex}`);
  }

  const sourceEntry = slideEntries[slideIndex]!;
  const relsEntries = getRelationshipEntries(presentationRelsXml);
  const sourceRel = relsEntries.find((r) => r.id === sourceEntry.rId);

  if (!sourceRel) {
    throw new Error(`Source slide relationship not found: ${sourceEntry.rId}`);
  }

  const sourceSlidePath = `ppt/${sourceRel.target}`;
  const sourceSlideXml = pkg.readText(sourceSlidePath);
  if (!sourceSlideXml) {
    throw new Error(`Source slide not found: ${sourceSlidePath}`);
  }

  const sourceSlideRelsPath = sourceSlidePath.replace(/\.xml$/, ".xml.rels").replace("/slides/", "/slides/_rels/");
  const sourceSlideRelsText = pkg.readText(sourceSlideRelsPath);

  // Generate new IDs
  const slideId = generateSlideId(slideEntries.map((s) => s.slideId));
  const rId = generateRId(relsEntries.map((r) => r.id));
  const slideNumber = getNextSlideNumber(pkg);
  const slideFilename = `slide${slideNumber}`;
  const newSlidePath = `ppt/slides/${slideFilename}.xml`;
  const newSlideRelsPath = `ppt/slides/_rels/${slideFilename}.xml.rels`;

  // Copy slide XML
  pkg.writeText(newSlidePath, sourceSlideXml);

  // Add slide to content types and handle rels/notes duplication
  const baseContentTypes = addOverride(contentTypesXml, `/ppt/slides/${slideFilename}.xml`, SLIDE_CONTENT_TYPE);
  const updatedContentTypesXml = duplicateSlideRelsAndNotes({
    pkg,
    sourceSlideRelsText,
    slideFilename,
    newSlideRelsPath,
    contentTypesXml: baseContentTypes,
  });

  // Update presentation.xml - insert after source slide by default
  const effectiveInsertAt = insertAt ?? slideIndex + 1;
  const updatedPresentationXml = addSlideToList({ presentationXml, slideId, rId, position: effectiveInsertAt });

  // Update presentation.xml.rels
  const updatedPresentationRelsXml = addRelationship({
    relsXml: presentationRelsXml,
    id: rId,
    type: SLIDE_REL_TYPE,
    target: `slides/${slideFilename}.xml`,
  });

  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
  writeXml(pkg, PRESENTATION_RELS_PATH, updatedPresentationRelsXml);
  writeXml(pkg, CONTENT_TYPES_PATH, updatedContentTypesXml);
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Options for slide operations
 */
export type SlideOperationsOptions = {
  readonly addSlides?: readonly SlideAddSpec[];
  readonly duplicateSlides?: readonly SlideDuplicateSpec[];
  readonly reorderSlides?: readonly SlideReorderSpec[];
  readonly removeSlides?: readonly SlideRemoveSpec[];
};

/**
 * Apply all slide operations to a ZipPackage in the correct order:
 * 1. Add slides (so they exist for subsequent operations)
 * 2. Duplicate slides
 * 3. Reorder slides
 * 4. Remove slides (last, so indices refer to the final state)
 */
export async function applySlideOperations(
  pkg: ZipPackage,
  options: SlideOperationsOptions,
): Promise<SlideOperationsResult<SlideOpsStats>> {
  try {
    // 1. Add slides
    const addSlides = options.addSlides ?? [];
    addSlides.forEach((spec) => addSlideToPackage(pkg, spec));

    // 2. Duplicate slides
    const duplicateSlides = options.duplicateSlides ?? [];
    duplicateSlides.forEach((spec) => duplicateSlideInPackage(pkg, spec.sourceSlideNumber - 1, spec.insertAt));

    // 3. Reorder slides
    const reorderSlides = options.reorderSlides ?? [];
    reorderSlides.forEach((spec) => reorderSlideInPackage(pkg, spec.from, spec.to));

    // 4. Remove slides (process in reverse order to preserve indices)
    const removeSlides = [...(options.removeSlides ?? [])].sort((a, b) => b.slideNumber - a.slideNumber);
    removeSlides.forEach((spec) => removeSlideFromPackage(pkg, spec.slideNumber - 1));

    return {
      success: true,
      data: {
        added: addSlides.length,
        removed: removeSlides.length,
        reordered: reorderSlides.length,
        duplicated: duplicateSlides.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Slide operation failed: ${(err as Error).message}`,
    };
  }
}
