/**
 * @file Slide manager (Phase 8)
 *
 * Supports adding/removing/reordering/duplicating slides by updating:
 * - ppt/presentation.xml (p:sldIdLst)
 * - ppt/_rels/presentation.xml.rels (slide relationships)
 * - [Content_Types].xml (slide/notes overrides)
 * - slide parts (ppt/slides/slideN.xml + rels)
 */

import type { PresentationDocument, SlideWithId } from "../../app/presentation-document";
import type { Slide } from "../../domain/slide/types";
import type { PresentationFile } from "../../domain/opc";
import { createElement, getByPath, getChildren, isXmlElement, parseXml, serializeDocument, type XmlDocument, type XmlElement } from "@oxen/xml";
import { CONTENT_TYPES } from "../../opc/content-types";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { getRelationshipPath } from "../../parser/relationships";
import { createEmptyZipPackage, isBinaryFile, type ZipPackage } from "@oxen/zip";
import { setChildren, updateDocumentRoot } from "../core/xml-mutator";
import { addSlideToList, removeSlideFromList, reorderSlideInList } from "../parts/presentation";
import { generateSlideId, generateSlideRId } from "./slide-id-manager";

export type SlideAddResult = {
  readonly doc: PresentationDocument;
  readonly slideIndex: number;
  readonly slidePath: string;
  readonly slideId: number;
  readonly rId: string;
};

export type SlideRemoveResult = {
  readonly doc: PresentationDocument;
  readonly slideIndex: number;
  readonly slidePath: string;
  readonly slideId: number;
  readonly rId: string;
};

export type SlideReorderResult = {
  readonly doc: PresentationDocument;
  readonly fromIndex: number;
  readonly toIndex: number;
};

export type SlideDuplicateResult = {
  readonly doc: PresentationDocument;
  readonly sourceSlideIndex: number;
  readonly slideIndex: number;
  readonly slidePath: string;
  readonly slideId: number;
  readonly rId: string;
  readonly notesSlidePath?: string;
};

type SlideEntry = {
  readonly slideId: number;
  readonly rId: string;
};

type RelationshipEntry = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
};

const PRESENTATION_XML_PATH = "ppt/presentation.xml";
const PRESENTATION_RELS_PATH = "ppt/_rels/presentation.xml.rels";
const CONTENT_TYPES_PATH = "[Content_Types].xml";

const RELS_XMLNS = "http://schemas.openxmlformats.org/package/2006/relationships";

function requirePresentationFile(doc: PresentationDocument): PresentationFile {
  if (!doc.presentationFile) {
    throw new Error("SlideManager: PresentationDocument must have a presentationFile");
  }
  if (!doc.presentationFile.listFiles) {
    throw new Error(
      "SlideManager: PresentationFile must implement listFiles() (load via pptx-loader ZipPackage)",
    );
  }
  return doc.presentationFile;
}

function copyPresentationFileToPackage(file: PresentationFile): ZipPackage {
  if (!file.listFiles) {
    throw new Error("PresentationFile must implement listFiles() to copy into a ZipPackage");
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

function readXmlOrThrow(pkg: ZipPackage, path: string): XmlDocument {
  const text = pkg.readText(path);
  if (!text) {
    throw new Error(`SlideManager: missing required xml part: ${path}`);
  }
  return parseXml(text);
}

function writeXml(pkg: ZipPackage, path: string, doc: XmlDocument): void {
  const xml = serializeDocument(doc, { declaration: true, standalone: true });
  pkg.writeText(path, xml);
}

function getSlideEntries(presentationXml: XmlDocument): SlideEntry[] {
  const sldIdLst = getByPath(presentationXml, ["p:presentation", "p:sldIdLst"]);
  if (!sldIdLst) {
    throw new Error("SlideManager: ppt/presentation.xml is missing p:sldIdLst");
  }

  return getChildren(sldIdLst, "p:sldId").map((el) => {
    const id = el.attrs.id;
    const rId = el.attrs["r:id"];
    if (!id || !rId) {
      throw new Error("SlideManager: invalid p:sldId (missing id or r:id)");
    }
    const slideId = Number.parseInt(id, 10);
    if (!Number.isFinite(slideId)) {
      throw new Error(`SlideManager: invalid slideId: ${id}`);
    }
    return { slideId, rId };
  });
}

function getRelationshipEntries(relsXml: XmlDocument): RelationshipEntry[] {
  const relsRoot = getByPath(relsXml, ["Relationships"]);
  if (!relsRoot) {
    throw new Error("SlideManager: invalid .rels xml (missing Relationships root)");
  }

  return getChildren(relsRoot, "Relationship").map((rel) => {
    const id = rel.attrs.Id;
    const type = rel.attrs.Type;
    const target = rel.attrs.Target;
    if (!id || !type || !target) {
      throw new Error("SlideManager: invalid Relationship (missing Id/Type/Target)");
    }
    return { id, type, target };
  });
}

function addRelationship(relsXml: XmlDocument, entry: RelationshipEntry): XmlDocument {
  return updateDocumentRoot(relsXml, (root) => {
    if (root.name !== "Relationships") {
      throw new Error(`SlideManager: expected Relationships root, got ${root.name}`);
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
      throw new Error(`SlideManager: expected Relationships root, got ${root.name}`);
    }
    const relationships = getChildren(root, "Relationship");
    const next = relationships.filter((r) => r.attrs.Id !== rId);
    if (next.length === relationships.length) {
      throw new Error(`SlideManager: relationship not found: ${rId}`);
    }
    return setChildren(root, next);
  });
}

function updateRelationshipTarget(relsXml: XmlDocument, rId: string, target: string): XmlDocument {
  if (!rId) {
    throw new Error("SlideManager: updateRelationshipTarget requires rId");
  }
  if (!target) {
    throw new Error("SlideManager: updateRelationshipTarget requires target");
  }

  return updateDocumentRoot(relsXml, (root) => {
    if (root.name !== "Relationships") {
      throw new Error(`SlideManager: expected Relationships root, got ${root.name}`);
    }
    const relationships = getChildren(root, "Relationship");
    let found = false;
    const next = relationships.map((rel) => {
      if (rel.attrs.Id !== rId) {
        return rel;
      }
      found = true;
      return createElement("Relationship", {
        ...rel.attrs,
        Target: target,
      });
    });
    if (!found) {
      throw new Error(`SlideManager: relationship not found: ${rId}`);
    }
    return setChildren(root, next);
  });
}

function addOverride(contentTypesXml: XmlDocument, partName: string, contentType: string): XmlDocument {
  if (!partName.startsWith("/")) {
    throw new Error(`SlideManager: addOverride expects leading "/" partName, got: ${partName}`);
  }

  return updateDocumentRoot(contentTypesXml, (root) => {
    if (root.name !== "Types") {
      throw new Error(`SlideManager: expected Types root, got ${root.name}`);
    }

    const overrides = getChildren(root, "Override");
    const exists = overrides.some(
      (o) => o.attrs.PartName === partName && o.attrs.ContentType === contentType,
    );
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
    throw new Error(`SlideManager: removeOverride expects leading "/" partName, got: ${partName}`);
  }

  return updateDocumentRoot(contentTypesXml, (root) => {
    if (root.name !== "Types") {
      throw new Error(`SlideManager: expected Types root, got ${root.name}`);
    }

    const overrides = getChildren(root, "Override");
    const nextOverrides = overrides.filter((o) => o.attrs.PartName !== partName);
    if (nextOverrides.length === overrides.length) {
      return root;
    }

    const nonOverrides = root.children.filter(
      (c): c is XmlElement => isXmlElement(c) && c.name !== "Override",
    );
    return setChildren(root, [...nonOverrides, ...nextOverrides]);
  });
}

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
  let max = 0;
  for (const n of existing) {
    if (!Number.isFinite(n)) {
      continue;
    }
    max = Math.max(max, n);
  }
  return max + 1;
}

function requireSlideLayoutPath(pkg: ZipPackage, layoutPath: string): void {
  if (!layoutPath) {
    throw new Error("SlideManager: layoutPath is required");
  }
  if (!layoutPath.startsWith("ppt/")) {
    throw new Error(`SlideManager: layoutPath must be a ppt/ path, got: ${layoutPath}`);
  }
  if (!pkg.exists(layoutPath)) {
    throw new Error(`SlideManager: layoutPath does not exist in package: ${layoutPath}`);
  }
}

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

function buildSlideRelsXml(layoutPath: string): XmlDocument {
  if (!layoutPath.startsWith("ppt/")) {
    throw new Error(`SlideManager: layoutPath must be a ppt/ path, got: ${layoutPath}`);
  }
  const targetFromSlides = `../${layoutPath.slice("ppt/".length)}`;
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", {
          Id: "rId1",
          Type: RELATIONSHIP_TYPES.SLIDE_LAYOUT,
          Target: targetFromSlides,
        }),
      ]),
    ],
  };
}

function findSlidePartTarget(presentationRelsXml: XmlDocument, rId: string): string {
  const entries = getRelationshipEntries(presentationRelsXml);
  const rel = entries.find((e) => e.id === rId);
  if (!rel) {
    throw new Error(`SlideManager: missing relationship for ${rId} in presentation.xml.rels`);
  }
  if (rel.type !== RELATIONSHIP_TYPES.SLIDE) {
    throw new Error(
      `SlideManager: relationship ${rId} is not a slide relationship (Type=${rel.type})`,
    );
  }
  return rel.target;
}

function slideTargetToPartPath(target: string): string {
  if (target.startsWith("../")) {
    throw new Error(`SlideManager: unexpected slide target: ${target}`);
  }
  return `ppt/${target}`;
}

function generateDocumentSlideId(existing: readonly SlideWithId[]): string {
  const used = new Set(existing.map((s) => s.id));
  let i = existing.length + 1;
  while (used.has(`slide-${i}`)) {
    i++;
  }
  return `slide-${i}`;
}

function createEmptyDomainSlide(): Slide {
  return {
    shapes: [],
  };
}

function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function insertItem<T>(items: readonly T[], index: number, item: T): T[] {
  const next = [...items];
  next.splice(index, 0, item);
  return next;
}

function removeItem<T>(items: readonly T[], index: number): T[] {
  const next = [...items];
  next.splice(index, 1);
  return next;
}

function findNotesRelationship(slideRelsXml: XmlDocument): { target: string } | null {
  const root = getByPath(slideRelsXml, ["Relationships"]);
  if (!root) {
    throw new Error("SlideManager: invalid slide rels xml (missing Relationships)");
  }
  const relationships = getChildren(root, "Relationship");
  for (const rel of relationships) {
    if (rel.attrs.Type === RELATIONSHIP_TYPES.NOTES && rel.attrs.Target) {
      return { target: rel.attrs.Target };
    }
  }
  return null;
}

function relTargetToPptPartPath(target: string): string {
  if (target.startsWith("../")) {
    return `ppt/${target.slice(3)}`;
  }
  if (target.startsWith("/")) {
    throw new Error(`SlideManager: unsupported absolute Target: ${target}`);
  }
  if (target.startsWith("ppt/")) {
    return target;
  }
  return `ppt/${target}`;
}

function updateSlideRelsNotesTarget(slideRelsXml: XmlDocument, notesTarget: string): XmlDocument {
  return updateDocumentRoot(slideRelsXml, (root) => {
    if (root.name !== "Relationships") {
      throw new Error(`SlideManager: expected Relationships root, got ${root.name}`);
    }
    const relationships = getChildren(root, "Relationship");
    let updated = false;
    const next = relationships.map((rel) => {
      if (rel.attrs.Type !== RELATIONSHIP_TYPES.NOTES) {
        return rel;
      }
      updated = true;
      return createElement("Relationship", { ...rel.attrs, Target: notesTarget });
    });
    if (!updated) {
      throw new Error("SlideManager: notes relationship not found to update");
    }
    return setChildren(root, next);
  });
}

function findNotesSlideToSlideRelationshipId(notesRelsXml: XmlDocument): string {
  const root = getByPath(notesRelsXml, ["Relationships"]);
  if (!root) {
    throw new Error("SlideManager: invalid notes rels xml (missing Relationships)");
  }
  const relationships = getChildren(root, "Relationship");
  for (const rel of relationships) {
    if (
      rel.attrs.Type === RELATIONSHIP_TYPES.SLIDE &&
      rel.attrs.Id &&
      typeof rel.attrs.Target === "string" &&
      rel.attrs.Target.startsWith("../slides/")
    ) {
      return rel.attrs.Id;
    }
  }
  throw new Error("SlideManager: notesSlide .rels is missing the slide relationship");
}

export async function addSlide(
  doc: PresentationDocument,
  layoutPath: string,
  position?: number,
): Promise<SlideAddResult> {
  const file = requirePresentationFile(doc);
  const pkg = copyPresentationFileToPackage(file);

  requireSlideLayoutPath(pkg, layoutPath);

  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const presentationRelsXml = readXmlOrThrow(pkg, PRESENTATION_RELS_PATH);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  const slideEntries = getSlideEntries(presentationXml);
  if (slideEntries.length !== doc.slides.length) {
    throw new Error(
      `SlideManager: slide count mismatch (presentation.xml=${slideEntries.length}, doc=${doc.slides.length})`,
    );
  }

  const existingSlideIds = slideEntries.map((s) => s.slideId);
  const existingRIds = getRelationshipEntries(presentationRelsXml).map((r) => r.id);
  const slideId = generateSlideId(existingSlideIds);
  const rId = generateSlideRId(existingRIds);

  const slideNumber = nextPartNumber(extractExistingPartNumbers(pkg, "ppt/slides", "slide"));
  const slideFilename = `slide${slideNumber}`;
  const slidePath = `ppt/slides/${slideFilename}.xml`;
  if (pkg.exists(slidePath)) {
    throw new Error(`SlideManager: generated slide path already exists: ${slidePath}`);
  }

  writeXml(pkg, slidePath, buildBlankSlideXml());
  writeXml(pkg, getRelationshipPath(slidePath), buildSlideRelsXml(layoutPath));

  const updatedPresentationXml = addSlideToList(presentationXml, slideId, rId, position);
  const updatedPresentationRelsXml = addRelationship(presentationRelsXml, {
    id: rId,
    type: RELATIONSHIP_TYPES.SLIDE,
    target: `slides/${slideFilename}.xml`,
  });

  const updatedContentTypesXml = addOverride(
    contentTypesXml,
    `/ppt/slides/${slideFilename}.xml`,
    CONTENT_TYPES.SLIDE,
  );

  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
  writeXml(pkg, PRESENTATION_RELS_PATH, updatedPresentationRelsXml);
  writeXml(pkg, CONTENT_TYPES_PATH, updatedContentTypesXml);

  const insertedIndex = position ?? doc.slides.length;
  const newSlideWithId: SlideWithId = {
    id: generateDocumentSlideId(doc.slides),
    slide: createEmptyDomainSlide(),
    layoutPathOverride: layoutPath,
  };

  const updatedDoc: PresentationDocument = {
    ...doc,
    slides: insertItem(doc.slides, insertedIndex, newSlideWithId),
    presentationFile: pkg.asPresentationFile(),
  };

  return { doc: updatedDoc, slideIndex: insertedIndex, slidePath, slideId, rId };
}

/**
 * Remove a slide (by current slide order index).
 */
export function removeSlide(doc: PresentationDocument, slideIndex: number): SlideRemoveResult {
  const file = requirePresentationFile(doc);
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= doc.slides.length) {
    throw new Error(`SlideManager: invalid slideIndex: ${slideIndex}`);
  }

  const pkg = copyPresentationFileToPackage(file);

  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const presentationRelsXml = readXmlOrThrow(pkg, PRESENTATION_RELS_PATH);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  const slideEntries = getSlideEntries(presentationXml);
  if (slideEntries.length !== doc.slides.length) {
    throw new Error(
      `SlideManager: slide count mismatch (presentation.xml=${slideEntries.length}, doc=${doc.slides.length})`,
    );
  }

  const entry = slideEntries[slideIndex];
  if (!entry) {
    throw new Error(`SlideManager: slide entry not found at index: ${slideIndex}`);
  }

  const slideTarget = findSlidePartTarget(presentationRelsXml, entry.rId);
  const slidePath = slideTargetToPartPath(slideTarget);

  const slideRelsPath = getRelationshipPath(slidePath);
  const slideRelsText = pkg.readText(slideRelsPath);
  const slideRelsXml = slideRelsText ? parseXml(slideRelsText) : null;
  const notesRel = slideRelsXml ? findNotesRelationship(slideRelsXml) : null;
  const notesSlidePath = notesRel ? relTargetToPptPartPath(notesRel.target) : null;

  const updatedPresentationXml = removeSlideFromList(presentationXml, entry.slideId);
  const updatedPresentationRelsXml = removeRelationshipById(presentationRelsXml, entry.rId);

  let updatedContentTypesXml = removeOverride(contentTypesXml, `/${slidePath}`);

  pkg.remove(slidePath);
  if (pkg.exists(slideRelsPath)) {
    pkg.remove(slideRelsPath);
  }

  if (notesSlidePath) {
    const notesRelsPath = getRelationshipPath(notesSlidePath);
    pkg.remove(notesSlidePath);
    if (pkg.exists(notesRelsPath)) {
      pkg.remove(notesRelsPath);
    }
    updatedContentTypesXml = removeOverride(updatedContentTypesXml, `/${notesSlidePath}`);
  }

  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
  writeXml(pkg, PRESENTATION_RELS_PATH, updatedPresentationRelsXml);
  writeXml(pkg, CONTENT_TYPES_PATH, updatedContentTypesXml);

  const updatedDoc: PresentationDocument = {
    ...doc,
    slides: removeItem(doc.slides, slideIndex),
    presentationFile: pkg.asPresentationFile(),
  };

  return {
    doc: updatedDoc,
    slideIndex,
    slidePath,
    slideId: entry.slideId,
    rId: entry.rId,
  };
}

/**
 * Reorder slides by moving one slide from `fromIndex` to `toIndex`.
 */
export function reorderSlide(
  doc: PresentationDocument,
  fromIndex: number,
  toIndex: number,
): SlideReorderResult {
  const file = requirePresentationFile(doc);
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
    throw new Error(`SlideManager: indices must be integers (from=${fromIndex}, to=${toIndex})`);
  }
  if (fromIndex < 0 || fromIndex >= doc.slides.length) {
    throw new Error(`SlideManager: fromIndex out of range: ${fromIndex}`);
  }
  if (toIndex < 0 || toIndex >= doc.slides.length) {
    throw new Error(`SlideManager: toIndex out of range: ${toIndex}`);
  }
  if (fromIndex === toIndex) {
    return { doc, fromIndex, toIndex };
  }

  const pkg = copyPresentationFileToPackage(file);

  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const slideEntries = getSlideEntries(presentationXml);
  if (slideEntries.length !== doc.slides.length) {
    throw new Error(
      `SlideManager: slide count mismatch (presentation.xml=${slideEntries.length}, doc=${doc.slides.length})`,
    );
  }

  const moved = slideEntries[fromIndex];
  if (!moved) {
    throw new Error(`SlideManager: slide entry not found at fromIndex: ${fromIndex}`);
  }

  const updatedPresentationXml = reorderSlideInList(presentationXml, moved.slideId, toIndex);
  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);

  const updatedDoc: PresentationDocument = {
    ...doc,
    slides: moveItem(doc.slides, fromIndex, toIndex),
    presentationFile: pkg.asPresentationFile(),
  };

  return { doc: updatedDoc, fromIndex, toIndex };
}

/**
 * Duplicate a slide (including slide.xml + slide.xml.rels).
 * If the source slide has notes, also duplicates the notes slide and updates targets.
 */
export async function duplicateSlide(
  doc: PresentationDocument,
  slideIndex: number,
): Promise<SlideDuplicateResult> {
  const file = requirePresentationFile(doc);
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= doc.slides.length) {
    throw new Error(`SlideManager: invalid slideIndex: ${slideIndex}`);
  }

  const pkg = copyPresentationFileToPackage(file);

  const presentationXml = readXmlOrThrow(pkg, PRESENTATION_XML_PATH);
  const presentationRelsXml = readXmlOrThrow(pkg, PRESENTATION_RELS_PATH);
  const contentTypesXml = readXmlOrThrow(pkg, CONTENT_TYPES_PATH);

  const slideEntries = getSlideEntries(presentationXml);
  if (slideEntries.length !== doc.slides.length) {
    throw new Error(
      `SlideManager: slide count mismatch (presentation.xml=${slideEntries.length}, doc=${doc.slides.length})`,
    );
  }

  const sourceEntry = slideEntries[slideIndex];
  if (!sourceEntry) {
    throw new Error(`SlideManager: slide entry not found at index: ${slideIndex}`);
  }

  const sourceSlideTarget = findSlidePartTarget(presentationRelsXml, sourceEntry.rId);
  const sourceSlidePath = slideTargetToPartPath(sourceSlideTarget);
  const sourceSlideXml = pkg.readText(sourceSlidePath);
  if (!sourceSlideXml) {
    throw new Error(`SlideManager: missing source slide xml: ${sourceSlidePath}`);
  }
  const sourceSlideRelsPath = getRelationshipPath(sourceSlidePath);
  const sourceSlideRelsText = pkg.readText(sourceSlideRelsPath);
  if (!sourceSlideRelsText) {
    throw new Error(`SlideManager: missing source slide rels: ${sourceSlideRelsPath}`);
  }

  const existingSlideIds = slideEntries.map((s) => s.slideId);
  const existingRIds = getRelationshipEntries(presentationRelsXml).map((r) => r.id);
  const slideId = generateSlideId(existingSlideIds);
  const rId = generateSlideRId(existingRIds);

  const slideNumber = nextPartNumber(extractExistingPartNumbers(pkg, "ppt/slides", "slide"));
  const slideFilename = `slide${slideNumber}`;
  const slidePath = `ppt/slides/${slideFilename}.xml`;
  if (pkg.exists(slidePath)) {
    throw new Error(`SlideManager: generated slide path already exists: ${slidePath}`);
  }

  pkg.writeText(slidePath, sourceSlideXml);
  pkg.writeText(getRelationshipPath(slidePath), sourceSlideRelsText);

  let notesSlidePath: string | undefined;
  const slideRelsXml = parseXml(sourceSlideRelsText);
  const notesRel = findNotesRelationship(slideRelsXml);
  if (notesRel) {
    const sourceNotesPath = relTargetToPptPartPath(notesRel.target);
    const sourceNotesXml = pkg.readText(sourceNotesPath);
    if (!sourceNotesXml) {
      throw new Error(`SlideManager: missing source notes slide xml: ${sourceNotesPath}`);
    }
    const sourceNotesRelsPath = getRelationshipPath(sourceNotesPath);
    const sourceNotesRelsText = pkg.readText(sourceNotesRelsPath);
    if (!sourceNotesRelsText) {
      throw new Error(`SlideManager: missing source notes slide rels: ${sourceNotesRelsPath}`);
    }

    const notesNumber = nextPartNumber(extractExistingPartNumbers(pkg, "ppt/notesSlides", "notesSlide"));
    const notesFilename = `notesSlide${notesNumber}`;
    notesSlidePath = `ppt/notesSlides/${notesFilename}.xml`;

    pkg.writeText(notesSlidePath, sourceNotesXml);

    const notesRelsXml = parseXml(sourceNotesRelsText);
    const slideRelId = findNotesSlideToSlideRelationshipId(notesRelsXml);
    const updatedNotesRelsXml = updateRelationshipTarget(
      notesRelsXml,
      slideRelId,
      `../slides/${slideFilename}.xml`,
    );
    writeXml(pkg, getRelationshipPath(notesSlidePath), updatedNotesRelsXml);

    const updatedSlideRelsXml = updateSlideRelsNotesTarget(
      slideRelsXml,
      `../notesSlides/${notesFilename}.xml`,
    );
    writeXml(pkg, getRelationshipPath(slidePath), updatedSlideRelsXml);
  }

  const updatedPresentationXml = addSlideToList(presentationXml, slideId, rId, slideIndex + 1);
  const updatedPresentationRelsXml = addRelationship(presentationRelsXml, {
    id: rId,
    type: RELATIONSHIP_TYPES.SLIDE,
    target: `slides/${slideFilename}.xml`,
  });

  let updatedContentTypesXml = addOverride(
    contentTypesXml,
    `/ppt/slides/${slideFilename}.xml`,
    CONTENT_TYPES.SLIDE,
  );
  if (notesSlidePath) {
    updatedContentTypesXml = addOverride(
      updatedContentTypesXml,
      `/${notesSlidePath}`,
      CONTENT_TYPES.NOTES,
    );
  }

  writeXml(pkg, PRESENTATION_XML_PATH, updatedPresentationXml);
  writeXml(pkg, PRESENTATION_RELS_PATH, updatedPresentationRelsXml);
  writeXml(pkg, CONTENT_TYPES_PATH, updatedContentTypesXml);

  const sourceSlide = doc.slides[slideIndex];
  if (!sourceSlide) {
    throw new Error(`SlideManager: missing source slide in doc: ${slideIndex}`);
  }

  const duplicated: SlideWithId = {
    id: generateDocumentSlideId(doc.slides),
    slide: sourceSlide.slide,
    layoutPathOverride: sourceSlide.layoutPathOverride,
  };

  const insertAt = slideIndex + 1;
  const updatedDoc: PresentationDocument = {
    ...doc,
    slides: insertItem(doc.slides, insertAt, duplicated),
    presentationFile: pkg.asPresentationFile(),
  };

  return {
    doc: updatedDoc,
    sourceSlideIndex: slideIndex,
    slideIndex: insertAt,
    slidePath,
    slideId,
    rId,
    notesSlidePath,
  };
}
