/**
 * @file DOCX Patcher
 *
 * Patches existing DOCX files at the ZIP level.
 * Only modified XML parts are re-serialized; unmodified parts are preserved.
 */

import { parseXml, isXmlElement, type XmlElement } from "@aurochs/xml";
import { loadZipPackage, type ZipPackage } from "@aurochs/zip";
import { serializeWithDeclaration } from "@aurochs-office/opc";
import { parseDocument } from "@aurochs-office/docx/parser/document";
import { parseStyles } from "@aurochs-office/docx/parser/styles";
import { parseNumbering } from "@aurochs-office/docx/parser/numbering";
import { serializeDocument } from "@aurochs-office/docx/serializer/document";
import { serializeStyles } from "@aurochs-office/docx/serializer/styles";
import { serializeNumbering } from "@aurochs-office/docx/serializer/numbering";
import type { DocxBlockContent, DocxBody, DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocxStyles, DocxStyle } from "@aurochs-office/docx/domain/styles";
import type { DocxNumbering } from "@aurochs-office/docx/domain/numbering";
import type { DocxSectionProperties } from "@aurochs-office/docx/domain/section";
import type { DocxParagraph, DocxParagraphContent } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRun } from "@aurochs-office/docx/domain/run";
import { DEFAULT_PART_PATHS, RELATIONSHIP_TYPES, CONTENT_TYPES } from "@aurochs-office/docx/constants";
import {
  serializeRelationships,
  serializeContentTypes,
  type OpcRelationship,
  type ContentTypeEntry,
} from "@aurochs-office/opc";
import type { DocxPatch, DocxPatchSpec, DocxPatchData } from "./patch-types";
import { convertBlockContent, convertStylesSpec, convertNumberingSpec, convertSectionSpec, countBlockContentSpecs } from "./spec-converter";

// =============================================================================
// Text Replace Options
// =============================================================================

type TextReplaceOptions = {
  readonly search: string;
  readonly replace: string;
  readonly replaceAll: boolean;
};

// =============================================================================
// XML Helpers
// =============================================================================

function getRootElement(content: string): XmlElement {
  const doc = parseXml(content);
  for (const child of doc.children) {
    if (isXmlElement(child)) {
      return child;
    }
  }
  throw new Error("No root element found in XML");
}

function resolveDocumentPath(pkg: ZipPackage): string {
  const relsContent = pkg.readText(DEFAULT_PART_PATHS.rootRels);
  if (!relsContent) {
    throw new Error("Cannot find root relationships file");
  }

  const relsRoot = getRootElement(relsContent);
  for (const node of relsRoot.children) {
    if (!isXmlElement(node)) {
      continue;
    }
    if (node.attrs.Type === RELATIONSHIP_TYPES.officeDocument) {
      const target = node.attrs.Target;
      if (target) {
        return target.startsWith("/") ? target.slice(1) : target;
      }
    }
  }

  throw new Error("Cannot find main document relationship");
}

function getDocumentRelsPath(documentPath: string): string {
  const dir = documentPath.substring(0, documentPath.lastIndexOf("/"));
  const fileName = documentPath.split("/").pop()!;
  return `${dir}/_rels/${fileName}.rels`;
}

function resolvePartPath(documentPath: string, relTarget: string): string {
  if (relTarget.startsWith("/")) {
    return relTarget.slice(1);
  }
  const dir = documentPath.substring(0, documentPath.lastIndexOf("/"));
  return `${dir}/${relTarget}`;
}

function findRelTarget(pkg: ZipPackage, relsPath: string, relType: string): string | undefined {
  const content = pkg.readText(relsPath);
  if (!content) {
    return undefined;
  }

  const root = getRootElement(content);
  for (const node of root.children) {
    if (!isXmlElement(node)) {
      continue;
    }
    if (node.attrs.Type === relType) {
      return node.attrs.Target;
    }
  }
  return undefined;
}

function resolvePartPathWithDefault(documentPath: string, relTarget: string | undefined, defaultName: string): string {
  if (relTarget) {
    return resolvePartPath(documentPath, relTarget);
  }
  return `${documentPath.substring(0, documentPath.lastIndexOf("/"))}/${defaultName}`;
}

// =============================================================================
// Patch Classifier
// =============================================================================

type ContentPatch = Extract<DocxPatch, { type: `content.${string}` }>;
type TextReplacePatch = Extract<DocxPatch, { type: "text.replace" }>;
type StylesPatch = Extract<DocxPatch, { type: "styles.append" }>;
type NumberingPatch = Extract<DocxPatch, { type: "numbering.append" }>;
type SectionPatch = Extract<DocxPatch, { type: "section.update" }>;

type PatchesByType = {
  readonly contentPatches: ContentPatch[];
  readonly textReplacePatches: TextReplacePatch[];
  readonly stylesPatches: StylesPatch[];
  readonly numberingPatches: NumberingPatch[];
  readonly sectionPatches: SectionPatch[];
};

function classifyPatches(patches: readonly DocxPatch[]): PatchesByType {
  const contentPatches: ContentPatch[] = [];
  const textReplacePatches: TextReplacePatch[] = [];
  const stylesPatches: StylesPatch[] = [];
  const numberingPatches: NumberingPatch[] = [];
  const sectionPatches: SectionPatch[] = [];

  for (const patch of patches) {
    switch (patch.type) {
      case "content.append":
      case "content.insert":
      case "content.delete":
      case "content.replace":
        contentPatches.push(patch);
        break;
      case "text.replace":
        textReplacePatches.push(patch);
        break;
      case "styles.append":
        stylesPatches.push(patch);
        break;
      case "numbering.append":
        numberingPatches.push(patch);
        break;
      case "section.update":
        sectionPatches.push(patch);
        break;
      default: {
        const _exhaustive: never = patch;
        throw new Error(`Unknown patch type: ${(_exhaustive as DocxPatch).type}`);
      }
    }
  }

  return { contentPatches, textReplacePatches, stylesPatches, numberingPatches, sectionPatches };
}

// =============================================================================
// Content Patching
// =============================================================================

function applyContentPatches(content: readonly DocxBlockContent[], patches: readonly ContentPatch[]): DocxBlockContent[] {
  const result = [...content];

  for (const patch of patches) {
    switch (patch.type) {
      case "content.append": {
        const newContent = patch.content.map(convertBlockContent);
        result.push(...newContent);
        break;
      }
      case "content.insert": {
        if (patch.index < 0 || patch.index > result.length) {
          throw new Error(`content.insert: index ${patch.index} is out of range [0, ${result.length}]`);
        }
        const newContent = patch.content.map(convertBlockContent);
        result.splice(patch.index, 0, ...newContent);
        break;
      }
      case "content.delete": {
        const count = patch.count ?? 1;
        if (patch.index < 0 || patch.index >= result.length) {
          throw new Error(`content.delete: index ${patch.index} is out of range [0, ${result.length - 1}]`);
        }
        if (patch.index + count > result.length) {
          throw new Error(`content.delete: index ${patch.index} + count ${count} exceeds content length ${result.length}`);
        }
        result.splice(patch.index, count);
        break;
      }
      case "content.replace": {
        const count = patch.count ?? 1;
        if (patch.index < 0 || patch.index >= result.length) {
          throw new Error(`content.replace: index ${patch.index} is out of range [0, ${result.length - 1}]`);
        }
        if (patch.index + count > result.length) {
          throw new Error(`content.replace: index ${patch.index} + count ${count} exceeds content length ${result.length}`);
        }
        const newContent = patch.content.map(convertBlockContent);
        result.splice(patch.index, count, ...newContent);
        break;
      }
      default: {
        const _exhaustive: never = patch;
        throw new Error(`Unknown content patch type: ${(_exhaustive as { type: string }).type}`);
      }
    }
  }

  return result;
}

// =============================================================================
// Text Replace Patching
// =============================================================================

function replaceTextContent(opts: TextReplaceOptions, value: string): string | undefined {
  if (opts.replaceAll) {
    return value.includes(opts.search) ? value.split(opts.search).join(opts.replace) : undefined;
  }
  const idx = value.indexOf(opts.search);
  return idx !== -1 ? value.slice(0, idx) + opts.replace + value.slice(idx + opts.search.length) : undefined;
}

function replaceTextInRun(opts: TextReplaceOptions, run: DocxRun): DocxRun {
  const newContent = run.content.map((c) => {
    if (c.type !== "text") {
      return c;
    }
    const replaced = replaceTextContent(opts, c.value);
    return replaced !== undefined ? { ...c, value: replaced } : c;
  });
  const changed = newContent.some((c, i) => c !== run.content[i]);
  return changed ? { ...run, content: newContent } : run;
}

function replaceTextInRunContainer<T extends { readonly content: readonly DocxRun[] }>(opts: TextReplaceOptions, container: T): T {
  const newContent = container.content.map((run) => replaceTextInRun(opts, run));
  const changed = newContent.some((r, i) => r !== container.content[i]);
  return changed ? ({ ...container, content: newContent } as T) : container;
}

function replaceTextInParagraphContent(opts: TextReplaceOptions, c: DocxParagraphContent): DocxParagraphContent {
  switch (c.type) {
    case "run":
      return replaceTextInRun(opts, c);
    case "hyperlink":
    case "simpleField":
    case "sdt":
    case "ins":
    case "del":
    case "moveFrom":
    case "moveTo":
      return replaceTextInRunContainer(opts, c);
    case "bookmarkStart":
    case "bookmarkEnd":
    case "commentRangeStart":
    case "commentRangeEnd":
    case "moveFromRangeStart":
    case "moveFromRangeEnd":
    case "moveToRangeStart":
    case "moveToRangeEnd":
    case "oMath":
    case "oMathPara":
      return c;
    default: {
      const _exhaustive: never = c;
      throw new Error(`Unknown paragraph content type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}

function replaceTextInParagraph(opts: TextReplaceOptions, para: DocxParagraph): DocxParagraph {
  const newContent = para.content.map((c) => replaceTextInParagraphContent(opts, c));
  const changed = newContent.some((c, i) => c !== para.content[i]);
  return changed ? { ...para, content: newContent } : para;
}

function replaceTextInCellContent(opts: TextReplaceOptions, block: DocxParagraph | DocxTable): DocxParagraph | DocxTable {
  switch (block.type) {
    case "paragraph":
      return replaceTextInParagraph(opts, block);
    case "table":
      return replaceTextInTable(opts, block);
    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown cell content type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}

function replaceTextInTable(opts: TextReplaceOptions, block: DocxTable): DocxTable {
  const newRows = block.rows.map((row) => {
    const newCells = row.cells.map((cell) => {
      const newCellContent = cell.content.map((cellBlock) => replaceTextInCellContent(opts, cellBlock));
      const cellChanged = newCellContent.some((c, i) => c !== cell.content[i]);
      return cellChanged ? { ...cell, content: newCellContent } : cell;
    });
    const rowChanged = newCells.some((c, i) => c !== row.cells[i]);
    return rowChanged ? { ...row, cells: newCells } : row;
  });
  const tableChanged = newRows.some((r, i) => r !== block.rows[i]);
  return tableChanged ? { ...block, rows: newRows } : block;
}

function replaceTextInBlock(opts: TextReplaceOptions, block: DocxBlockContent): DocxBlockContent {
  switch (block.type) {
    case "paragraph":
      return replaceTextInParagraph(opts, block);
    case "table":
      return replaceTextInTable(opts, block);
    case "sectionBreak":
      return block;
    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown block content type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}

function applyTextReplacePatches(content: readonly DocxBlockContent[], patches: readonly TextReplacePatch[]): DocxBlockContent[] {
  return patches.reduce<DocxBlockContent[]>(
    (acc, patch) => {
      const opts: TextReplaceOptions = {
        search: patch.search,
        replace: patch.replace,
        replaceAll: patch.replaceAll !== false,
      };
      return acc.map((block) => replaceTextInBlock(opts, block));
    },
    [...content],
  );
}

// =============================================================================
// Styles Patching
// =============================================================================

function applyStylesPatches(existing: DocxStyles | undefined, patches: readonly StylesPatch[]): DocxStyles | undefined {
  const allNewStyles: DocxStyle[] = [];

  for (const patch of patches) {
    const converted = convertStylesSpec(patch.styles);
    allNewStyles.push(...converted.style);
  }

  if (allNewStyles.length === 0) {
    return existing;
  }

  if (!existing) {
    return { style: allNewStyles };
  }

  return {
    ...existing,
    style: [...existing.style, ...allNewStyles],
  };
}

// =============================================================================
// Numbering Patching
// =============================================================================

function applyNumberingPatches(existing: DocxNumbering | undefined, patches: readonly NumberingPatch[]): DocxNumbering | undefined {
  const allNewAbstractNum: DocxNumbering["abstractNum"][number][] = [];
  const allNewNum: DocxNumbering["num"][number][] = [];

  for (const patch of patches) {
    const converted = convertNumberingSpec(patch.numbering);
    allNewAbstractNum.push(...converted.abstractNum);
    allNewNum.push(...converted.num);
  }

  if (allNewAbstractNum.length === 0 && allNewNum.length === 0) {
    return existing;
  }

  if (!existing) {
    return { abstractNum: allNewAbstractNum, num: allNewNum };
  }

  return {
    ...existing,
    abstractNum: [...existing.abstractNum, ...allNewAbstractNum],
    num: [...existing.num, ...allNewNum],
  };
}

// =============================================================================
// Section Patching
// =============================================================================

function applySectionPatches(existing: DocxSectionProperties | undefined, patches: readonly SectionPatch[]): DocxSectionProperties | undefined {
  return patches.reduce<DocxSectionProperties | undefined>(
    (acc, patch) => {
      const converted = convertSectionSpec(patch.section);
      return acc ? { ...acc, ...converted } : converted;
    },
    existing,
  );
}

// =============================================================================
// Content Type & Relationships Management
// =============================================================================

function ensureContentTypeOverride(pkg: ZipPackage, partName: string, contentType: string): void {
  const ctContent = pkg.readText(DEFAULT_PART_PATHS.contentTypes);
  if (!ctContent) {
    return;
  }

  if (ctContent.includes(`PartName="${partName}"`)) {
    return;
  }

  const root = getRootElement(ctContent);
  const existingEntries: ContentTypeEntry[] = [];

  for (const node of root.children) {
    if (!isXmlElement(node)) {
      continue;
    }
    if (node.name === "Default" || node.name.endsWith(":Default")) {
      existingEntries.push({
        kind: "default",
        extension: node.attrs.Extension ?? "",
        contentType: node.attrs.ContentType ?? "",
      });
    } else if (node.name === "Override" || node.name.endsWith(":Override")) {
      existingEntries.push({
        kind: "override",
        partName: node.attrs.PartName ?? "",
        contentType: node.attrs.ContentType ?? "",
      });
    }
  }

  existingEntries.push({ kind: "override", partName, contentType });
  const newXml = serializeContentTypes(existingEntries);
  pkg.writeText(DEFAULT_PART_PATHS.contentTypes, serializeWithDeclaration(newXml));
}

function parseExistingRelationships(content: string): OpcRelationship[] {
  const root = getRootElement(content);
  const rels: OpcRelationship[] = [];
  for (const node of root.children) {
    if (!isXmlElement(node)) {
      continue;
    }
    const id = node.attrs.Id ?? "";
    const type = node.attrs.Type ?? "";
    const t = node.attrs.Target ?? "";
    const targetMode = node.attrs.TargetMode === "External" ? "External" as const : undefined;
    rels.push({ id, type, target: t, targetMode });
  }
  return rels;
}

function computeNextRelId(rels: readonly OpcRelationship[]): string {
  const maxId = rels.reduce((max, rel) => {
    const match = rel.id.match(/^rId(\d+)$/);
    return match ? Math.max(max, parseInt(match[1]!, 10)) : max;
  }, 0);
  return `rId${maxId + 1}`;
}

type EnsureRelOpts = {
  readonly pkg: ZipPackage;
  readonly relsPath: string;
  readonly relType: string;
  readonly target: string;
};

function ensureDocumentRelationship(opts: EnsureRelOpts): void {
  const content = opts.pkg.readText(opts.relsPath);
  if (content && content.includes(`Type="${opts.relType}"`)) {
    return;
  }

  const existingRels = content ? parseExistingRelationships(content) : [];
  const newId = computeNextRelId(existingRels);

  existingRels.push({ id: newId, type: opts.relType, target: opts.target });

  const newXml = serializeRelationships(existingRels);
  opts.pkg.writeText(opts.relsPath, serializeWithDeclaration(newXml));
}

// =============================================================================
// Part Parsing Helpers
// =============================================================================

function parseExistingStyles(content: string | null): DocxStyles | undefined {
  if (!content) {
    return undefined;
  }
  return parseStyles(getRootElement(content));
}

function parseExistingNumbering(content: string | null): DocxNumbering | undefined {
  if (!content) {
    return undefined;
  }
  return parseNumbering(getRootElement(content));
}

// =============================================================================
// Document Patching Pipeline
// =============================================================================

function applyContentPatchesIfNeeded(classified: PatchesByType, bodyContent: readonly DocxBlockContent[]): DocxBlockContent[] {
  if (classified.contentPatches.length > 0) {
    return applyContentPatches(bodyContent, classified.contentPatches);
  }
  return [...bodyContent];
}

function patchDocumentContent(classified: PatchesByType, bodyContent: readonly DocxBlockContent[]): DocxBlockContent[] {
  const afterContent = applyContentPatchesIfNeeded(classified, bodyContent);

  if (classified.textReplacePatches.length > 0) {
    return applyTextReplacePatches(afterContent, classified.textReplacePatches);
  }
  return afterContent;
}

function patchDocumentSection(classified: PatchesByType, sectPr: DocxSectionProperties | undefined): DocxSectionProperties | undefined {
  if (classified.sectionPatches.length > 0) {
    return applySectionPatches(sectPr, classified.sectionPatches);
  }
  return sectPr;
}

// =============================================================================
// Main Patcher
// =============================================================================

/**
 * Patch an existing DOCX file with the given patch operations.
 *
 * @param spec - The patch specification
 * @param sourceData - The source DOCX file data
 * @returns The patched DOCX file as Uint8Array
 */
export async function patchDocx(spec: DocxPatchSpec, sourceData: Uint8Array): Promise<Uint8Array> {
  const pkg = await loadZipPackage(sourceData);
  const documentPath = resolveDocumentPath(pkg);
  const relsPath = getDocumentRelsPath(documentPath);

  const classified = classifyPatches(spec.patches);
  const needsDocumentPatch =
    classified.contentPatches.length > 0 ||
    classified.textReplacePatches.length > 0 ||
    classified.sectionPatches.length > 0;
  const needsStylesPatch = classified.stylesPatches.length > 0;
  const needsNumberingPatch = classified.numberingPatches.length > 0;

  // --- Patch document.xml ---
  if (needsDocumentPatch) {
    const docContent = pkg.readText(documentPath);
    if (!docContent) {
      throw new Error(`Cannot read document at ${documentPath}`);
    }

    const docRoot = getRootElement(docContent);
    const parsed = parseDocument(docRoot);
    const bodyContent = patchDocumentContent(classified, parsed.body.content);
    const sectPr = patchDocumentSection(classified, parsed.body.sectPr);

    const newBody: DocxBody = { content: bodyContent, sectPr };
    const newDoc: DocxDocument = { body: newBody };
    const serialized = serializeDocument(newDoc);
    pkg.writeText(documentPath, serializeWithDeclaration(serialized));
  }

  // --- Patch styles.xml ---
  if (needsStylesPatch) {
    const stylesTarget = findRelTarget(pkg, relsPath, RELATIONSHIP_TYPES.styles);
    const stylesPath = resolvePartPathWithDefault(documentPath, stylesTarget, "styles.xml");

    const stylesContent = pkg.readText(stylesPath);
    const existingStyles = parseExistingStyles(stylesContent);

    const patched = applyStylesPatches(existingStyles, classified.stylesPatches);
    if (patched) {
      const serialized = serializeStyles(patched);
      pkg.writeText(stylesPath, serializeWithDeclaration(serialized));

      if (!stylesContent) {
        ensureDocumentRelationship({ pkg, relsPath, relType: RELATIONSHIP_TYPES.styles, target: "styles.xml" });
        ensureContentTypeOverride(pkg, `/${stylesPath}`, CONTENT_TYPES.styles);
      }
    }
  }

  // --- Patch numbering.xml ---
  if (needsNumberingPatch) {
    const numTarget = findRelTarget(pkg, relsPath, RELATIONSHIP_TYPES.numbering);
    const numPath = resolvePartPathWithDefault(documentPath, numTarget, "numbering.xml");

    const numContent = pkg.readText(numPath);
    const existingNumbering = parseExistingNumbering(numContent);

    const patched = applyNumberingPatches(existingNumbering, classified.numberingPatches);
    if (patched) {
      const serialized = serializeNumbering(patched);
      pkg.writeText(numPath, serializeWithDeclaration(serialized));

      if (!numContent) {
        ensureDocumentRelationship({ pkg, relsPath, relType: RELATIONSHIP_TYPES.numbering, target: "numbering.xml" });
        ensureContentTypeOverride(pkg, `/${numPath}`, CONTENT_TYPES.numbering);
      }
    }
  }

  const buffer = await pkg.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}

function countBlockContent(patches: readonly ContentPatch[]): { paragraphCount: number; tableCount: number } {
  return patches.reduce(
    (acc, patch) => {
      switch (patch.type) {
        case "content.append":
        case "content.insert":
        case "content.replace":
          return addCounts(acc, countBlockContentSpecs(patch.content));
        case "content.delete":
          return acc;
        default: {
          const _exhaustive: never = patch;
          throw new Error(`Unknown content patch type: ${(_exhaustive as { type: string }).type}`);
        }
      }
    },
    { paragraphCount: 0, tableCount: 0 },
  );
}

function addCounts(
  a: { paragraphCount: number; tableCount: number },
  b: { paragraphCount: number; tableCount: number },
): { paragraphCount: number; tableCount: number } {
  return { paragraphCount: a.paragraphCount + b.paragraphCount, tableCount: a.tableCount + b.tableCount };
}

/**
 * Get patch metadata from a specification (for CLI output).
 */
export function getPatchData(spec: DocxPatchSpec): DocxPatchData {
  const classified = classifyPatches(spec.patches);
  const { paragraphCount, tableCount } = countBlockContent(classified.contentPatches);

  return {
    sourcePath: spec.source,
    outputPath: spec.output,
    patchCount: spec.patches.length,
    paragraphCount,
    tableCount,
  };
}
