/**
 * @file Slide structure export round-trip (Phase 8)
 *
 * Ensures the *reader* respects ECMA-376 slide order (presentation.xml p:sldIdLst),
 * so slide reorder/insert/remove/duplicate round-trips through export + reload.
 *
 * Also validates required OPC part updates:
 * - ppt/presentation.xml (p:sldIdLst)
 * - ppt/_rels/presentation.xml.rels (slide relationships)
 * - [Content_Types].xml (override entries)
 *
 * @see docs/plans/pptx-export/phase-8-slide-structure.md
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { convertToPresentationDocument } from "@oxen-office/pptx/app";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { exportPptxAsBuffer } from "@oxen-office/pptx/exporter";
import { getBasename, getByPath, getChildren, parseXml } from "@oxen/xml";
import { CONTENT_TYPES } from "@oxen-office/pptx/domain/content-types";
import { RELATIONSHIP_TYPES } from "@oxen-office/pptx/domain/relationships";
import { getRelationshipPath } from "@oxen-office/pptx/parser/relationships";
import { addSlide, duplicateSlide, removeSlide, reorderSlide } from "@oxen-office/pptx/patcher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures");

function getSlideEntriesFromPresentationXml(xmlText: string): { id: string; rId: string }[] {
  const doc = parseXml(xmlText);
  const sldIdLst = getByPath(doc, ["p:presentation", "p:sldIdLst"]);
  if (!sldIdLst) {
    throw new Error("missing p:sldIdLst");
  }
  return getChildren(sldIdLst, "p:sldId").map((el) => ({
    id: el.attrs.id ?? "",
    rId: el.attrs["r:id"] ?? "",
  }));
}

function getRelationshipTargetById(
  relsXmlText: string,
  rId: string,
): { type: string; target: string } {
  const doc = parseXml(relsXmlText);
  const root = getByPath(doc, ["Relationships"]);
  if (!root) {
    throw new Error("missing Relationships");
  }
  const rel = getChildren(root, "Relationship").find((el) => el.attrs.Id === rId);
  if (!rel) {
    throw new Error(`missing Relationship ${rId}`);
  }
  return { type: rel.attrs.Type ?? "", target: rel.attrs.Target ?? "" };
}

function getSlideFilenamesFromPresentationParts(
  presentationXmlText: string,
  presentationRelsText: string,
): string[] {
  const entries = getSlideEntriesFromPresentationXml(presentationXmlText);
  return entries.map((entry) => {
    const rel = getRelationshipTargetById(presentationRelsText, entry.rId);
    if (rel.type !== RELATIONSHIP_TYPES.SLIDE) {
      throw new Error(`Expected slide relationship for ${entry.rId}, got ${rel.type}`);
    }
    return getBasename(rel.target);
  });
}

function hasOverride(contentTypesText: string, partName: string, contentType: string): boolean {
  const doc = parseXml(contentTypesText);
  const root = getByPath(doc, ["Types"]);
  if (!root) {
    throw new Error("missing Types");
  }
  return getChildren(root, "Override").some(
    (el) => el.attrs.PartName === partName && el.attrs.ContentType === contentType,
  );
}

function findNotesTargetInSlideRels(slideRelsText: string): string | null {
  const doc = parseXml(slideRelsText);
  const root = getByPath(doc, ["Relationships"]);
  if (!root) {
    throw new Error("missing Relationships in slide rels");
  }
  const notes = getChildren(root, "Relationship").find((el) => el.attrs.Type === RELATIONSHIP_TYPES.NOTES);
  return notes?.attrs.Target ?? null;
}

describe("Slide structure export round-trip (Phase 8)", () => {
  it("add/reorder/remove/duplicate round-trip through openPresentation order", async () => {
    const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/2411-Performance_Up.pptx");
    const { presentationFile } = await loadPptxFile(fixturePath);

    const presentation = openPresentation(presentationFile);
    const doc = convertToPresentationDocument({ presentation, presentationFile });

    const first = doc.slides[0];
    if (!first?.apiSlide) {
      throw new Error("Expected apiSlide to be present for first slide");
    }

    const layoutPath = first.apiSlide.relationships.getTargetByType(RELATIONSHIP_TYPES.SLIDE_LAYOUT);
    if (!layoutPath) {
      throw new Error("Expected slide to have a slideLayout relationship");
    }

    // 1) Add a slide at position 2 (0-based index 1)
    const added = await addSlide(doc, layoutPath, 1);

    // 2) Reorder: move first slide to index 2
    const reordered = reorderSlide(added.doc, 0, 2);

    // 3) Duplicate slide at index 1
    const duplicated = await duplicateSlide(reordered.doc, 1);

    // 4) Remove slide at index 0
    const removed = removeSlide(duplicated.doc, 0);

    const exported = await exportPptxAsBuffer(removed.doc);
    const { zipPackage } = await loadPptxBundleFromBuffer(exported);
    const reloadedPresentation = openPresentation(zipPackage.asPresentationFile());

    const presentationXml = zipPackage.readText("ppt/presentation.xml");
    const presentationRels = zipPackage.readText("ppt/_rels/presentation.xml.rels");
    const contentTypes = zipPackage.readText("[Content_Types].xml");
    if (!presentationXml || !presentationRels || !contentTypes) {
      throw new Error("Expected core parts to exist after export");
    }

    const expectedOrder = getSlideFilenamesFromPresentationParts(presentationXml, presentationRels);
    expect(reloadedPresentation.list().map((s) => s.filename)).toEqual(expectedOrder);

    // Basic structural assertions (spot-check parts referenced by p:sldIdLst)
    const entries = getSlideEntriesFromPresentationXml(presentationXml);
    for (const entry of entries) {
      const rel = getRelationshipTargetById(presentationRels, entry.rId);
      expect(rel.type).toBe(RELATIONSHIP_TYPES.SLIDE);
      const slidePath = `ppt/${rel.target}`;
      expect(zipPackage.exists(slidePath)).toBe(true);
      expect(zipPackage.exists(getRelationshipPath(slidePath))).toBe(true);
      expect(hasOverride(contentTypes, `/${slidePath}`, CONTENT_TYPES.SLIDE)).toBe(true);
    }
  });

  it("remove cleans notesSlide parts and content types override (if present)", async () => {
    const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/2411-Performance_Up.pptx");
    const { presentationFile } = await loadPptxFile(fixturePath);

    const presentation = openPresentation(presentationFile);
    const doc = convertToPresentationDocument({ presentation, presentationFile });

    const originalPresentationXml = presentationFile.readText("ppt/presentation.xml");
    const originalPresentationRels = presentationFile.readText("ppt/_rels/presentation.xml.rels");
    if (!originalPresentationXml || !originalPresentationRels) {
      throw new Error("Expected fixture to include presentation.xml + presentation.xml.rels");
    }
    const originalEntries = getSlideEntriesFromPresentationXml(originalPresentationXml);
    const removedEntry = originalEntries[0];
    if (!removedEntry) {
      throw new Error("Expected at least one slide entry");
    }

    const removedRel = getRelationshipTargetById(originalPresentationRels, removedEntry.rId);
    const removedSlidePath = `ppt/${removedRel.target}`;
    const removedSlideRelsPath = getRelationshipPath(removedSlidePath);

    const slideRelsText = presentationFile.readText(removedSlideRelsPath);
    if (!slideRelsText) {
      throw new Error("Expected slide rels to exist for fixture slide");
    }
    const notesTarget = findNotesTargetInSlideRels(slideRelsText);
    if (!notesTarget) {
      throw new Error("Expected fixture slide to have notes relationship");
    }
    const removedNotesPath = `ppt/${notesTarget.replace("../", "")}`;

    const removed = removeSlide(doc, 0);
    const exported = await exportPptxAsBuffer(removed.doc);
    const { zipPackage } = await loadPptxBundleFromBuffer(exported);

    expect(zipPackage.exists(removedSlidePath)).toBe(false);
    expect(zipPackage.exists(removedSlideRelsPath)).toBe(false);
    expect(zipPackage.exists(removedNotesPath)).toBe(false);
    expect(zipPackage.exists(getRelationshipPath(removedNotesPath))).toBe(false);

    const contentTypes = zipPackage.readText("[Content_Types].xml");
    if (!contentTypes) {
      throw new Error("Expected [Content_Types].xml to exist after export");
    }
    expect(hasOverride(contentTypes, `/${removedSlidePath}`, CONTENT_TYPES.SLIDE)).toBe(false);
    expect(hasOverride(contentTypes, `/${removedNotesPath}`, CONTENT_TYPES.NOTES)).toBe(false);
  });
});
