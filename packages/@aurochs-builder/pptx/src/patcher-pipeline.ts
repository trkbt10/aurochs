/**
 * @file PPTX Patcher Pipeline
 *
 * Patches existing PPTX files at the ZIP level.
 * Reuses existing builder functions for slide modifications,
 * slide operations, and theme edits.
 */

import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx/app";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { parseXml, serializeDocument, isXmlElement, isXmlText, type XmlNode } from "@aurochs/xml";
import { getByPath } from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";

import type {
  PptxPatch,
  PptxPatchSpec,
  PptxPatchData,
  TextReplacePatch,
  SlideModifyPatch,
  ThemeUpdatePatch,
  SlideAddPatch,
  SlideRemovePatch,
  SlideDuplicatePatch,
  SlideReorderPatch,
} from "./patch-types";
import type { SlideModSpec } from "./types";
import {
  applyBackground,
  applyImageBackground,
  isImageBackground,
  addChartsToSlide,
  applyChartUpdates,
  applyThemeEditsToPackage,
  type BuildContext,
  shapeBuilder,
  imageBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  addElementsSync,
  addElementsAsync,
  applySlideTransition,
  applyTableUpdates,
  applyAnimations,
  applyComments,
  applyNotes,
  applySmartArtUpdates,
} from "./builders";
import { applySlideOperations } from "./slide-ops";

// =============================================================================
// Patch Classifier
// =============================================================================

type PatchesByType = {
  readonly textReplacePatches: TextReplacePatch[];
  readonly slideModifyPatches: SlideModifyPatch[];
  readonly themeUpdatePatches: ThemeUpdatePatch[];
  readonly slideAddPatches: SlideAddPatch[];
  readonly slideRemovePatches: SlideRemovePatch[];
  readonly slideDuplicatePatches: SlideDuplicatePatch[];
  readonly slideReorderPatches: SlideReorderPatch[];
};

function classifyPatches(patches: readonly PptxPatch[]): PatchesByType {
  const textReplacePatches: TextReplacePatch[] = [];
  const slideModifyPatches: SlideModifyPatch[] = [];
  const themeUpdatePatches: ThemeUpdatePatch[] = [];
  const slideAddPatches: SlideAddPatch[] = [];
  const slideRemovePatches: SlideRemovePatch[] = [];
  const slideDuplicatePatches: SlideDuplicatePatch[] = [];
  const slideReorderPatches: SlideReorderPatch[] = [];

  for (const patch of patches) {
    switch (patch.type) {
      case "text.replace":
        textReplacePatches.push(patch);
        break;
      case "slide.modify":
        slideModifyPatches.push(patch);
        break;
      case "theme.update":
        themeUpdatePatches.push(patch);
        break;
      case "slide.add":
        slideAddPatches.push(patch);
        break;
      case "slide.remove":
        slideRemovePatches.push(patch);
        break;
      case "slide.duplicate":
        slideDuplicatePatches.push(patch);
        break;
      case "slide.reorder":
        slideReorderPatches.push(patch);
        break;
      default: {
        const _exhaustive: never = patch;
        throw new Error(`Unknown patch type: ${(_exhaustive as PptxPatch).type}`);
      }
    }
  }

  return {
    textReplacePatches,
    slideModifyPatches,
    themeUpdatePatches,
    slideAddPatches,
    slideRemovePatches,
    slideDuplicatePatches,
    slideReorderPatches,
  };
}

// =============================================================================
// Text Replace
// =============================================================================

type TextReplaceOptions = {
  readonly search: string;
  readonly replace: string;
  readonly replaceAll: boolean;
};

/**
 * Replace text content in a string value.
 * Returns the replaced string or undefined if no match.
 */
function replaceTextContent(opts: TextReplaceOptions, value: string): string | undefined {
  if (opts.replaceAll) {
    return value.includes(opts.search) ? value.split(opts.search).join(opts.replace) : undefined;
  }
  const idx = value.indexOf(opts.search);
  return idx !== -1 ? value.slice(0, idx) + opts.replace + value.slice(idx + opts.search.length) : undefined;
}

function replaceChildrenText(
  opts: TextReplaceOptions,
  children: readonly XmlNode[],
  isTextField: boolean,
): { newChildren: XmlNode[]; changed: boolean } {
  const newChildren: XmlNode[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutable flag tracking across children
  let changed = false;
  for (const child of children) {
    if (isTextField && isXmlText(child)) {
      const replaced = replaceTextContent(opts, child.value);
      if (replaced !== undefined) {
        newChildren.push({ type: "text", value: replaced });
        changed = true;
      } else {
        newChildren.push(child);
      }
    } else {
      const childChanged = replaceTextInXmlNode(opts, child);
      changed = changed || childChanged;
      newChildren.push(child);
    }
  }
  return { newChildren, changed };
}

/**
 * Recursively walk an XML tree and replace text within `<a:t>` elements.
 * Returns true if any replacement was made.
 */
function replaceTextInXmlNode(opts: TextReplaceOptions, node: XmlNode): boolean {
  if (isXmlText(node)) {
    return false;
  }

  if (!isXmlElement(node)) {
    return false;
  }

  // a:t is the text element in DrawingML
  const isTextField = node.name === "a:t";

  const { newChildren, changed } = replaceChildrenText(opts, node.children, isTextField);

  if (changed) {
    (node as { children: XmlNode[] }).children = newChildren;
  }

  return changed;
}

/**
 * Get all slide XML paths from a ZIP package.
 */
function getSlideXmlPaths(zipPackage: ZipPackage): string[] {
  return zipPackage
    .listFiles()
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)![1]!, 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)![1]!, 10);
      return numA - numB;
    });
}

/**
 * Apply text replace patches to slide XML files.
 * Returns the total number of replacements made.
 */
function getTargetSlidePaths(
  patch: TextReplacePatch,
  allSlidePaths: readonly string[],
): readonly string[] {
  if (!patch.slides || patch.slides.length === 0) {
    return allSlidePaths;
  }
  return patch.slides
    .map((n) => allSlidePaths[n - 1])
    .filter((p): p is string => p !== undefined);
}

function applyTextReplaceToSlide(
  zipPackage: ZipPackage,
  slidePath: string,
  opts: TextReplaceOptions,
): boolean {
  const xml = zipPackage.readText(slidePath);
  if (!xml) {
    return false;
  }

  const doc = parseXml(xml);
  // Must process all children (not short-circuit) since multiple text nodes may need replacing
  const changed = doc.children.map((child) => replaceTextInXmlNode(opts, child)).some(Boolean);

  if (changed) {
    const updatedXml = serializeDocument(doc, { declaration: true, standalone: true });
    zipPackage.writeText(slidePath, updatedXml);
  }
  return changed;
}

function applyTextReplacePatches(
  zipPackage: ZipPackage,
  patches: readonly TextReplacePatch[],
): number {
  if (patches.length === 0) {
    return 0;
  }

  const allSlidePaths = getSlideXmlPaths(zipPackage);

  return patches.reduce((total, patch) => {
    const opts: TextReplaceOptions = {
      search: patch.search,
      replace: patch.replace,
      replaceAll: patch.replaceAll !== false,
    };

    const targetPaths = getTargetSlidePaths(patch, allSlidePaths);
    const replacements = targetPaths.filter((slidePath) =>
      applyTextReplaceToSlide(zipPackage, slidePath, opts),
    ).length;

    return total + replacements;
  }, 0);
}

// =============================================================================
// Slide Modification (reused from build.ts pattern)
// =============================================================================

function getShapeId(shape: { type: string; nonVisual?: { id: string } }): string {
  return shape.type === "contentPart" ? "0" : (shape.nonVisual?.id ?? "0");
}

function getExistingShapeIds(apiSlide: { content: unknown }): string[] {
  const domainSlide = parseSlide(apiSlide.content as Parameters<typeof parseSlide>[0]);
  if (!domainSlide) {
    return [];
  }
  return domainSlide.shapes.map(getShapeId);
}

type BackgroundSpec = SlideModSpec["background"];

async function applyBackgroundSpec(
  slideDoc: ReturnType<typeof parseXml>,
  spec: BackgroundSpec,
  ctx: BuildContext,
): Promise<ReturnType<typeof parseXml>> {
  if (!spec) {
    return slideDoc;
  }
  if (isImageBackground(spec)) {
    return applyImageBackground(slideDoc, spec, ctx);
  }
  return applyBackground(slideDoc, spec);
}

type SlideContext = {
  readonly zipPackage: ZipPackage;
  readonly presentation: { count: number; getSlide(n: number): { filename: string; content: unknown } };
  readonly specDir: string;
};

async function processSlide(ctx: SlideContext, slideMod: SlideModSpec): Promise<number> {
  const slideNum = slideMod.slideNumber;
  if (slideNum < 1 || slideNum > ctx.presentation.count) {
    throw new Error(`Slide ${slideNum} not found. Valid range: 1-${ctx.presentation.count}`);
  }

  const apiSlide = ctx.presentation.getSlide(slideNum);
  const slidePath = `ppt/slides/${apiSlide.filename}.xml`;
  const slideXml = ctx.zipPackage.readText(slidePath);

  if (!slideXml) {
    throw new Error(`Could not read slide XML: ${slidePath}`);
  }

  const slideDoc = parseXml(slideXml);
  const spTree = getByPath(slideDoc, ["p:sld", "p:cSld", "p:spTree"]);

  if (!spTree) {
    throw new Error(`Invalid slide structure: ${slidePath}`);
  }

  const existingIds = getExistingShapeIds(apiSlide);
  const buildCtx: BuildContext = {
    existingIds,
    specDir: ctx.specDir,
    zipPackage: ctx.zipPackage,
    slidePath,
  };

  const docWithBackground = await applyBackgroundSpec(slideDoc, slideMod.background, buildCtx);

  const { doc: afterShapes, added: shapesAdded } = addElementsSync({
    slideDoc: docWithBackground,
    specs: slideMod.addShapes ?? [],
    existingIds,
    ctx: buildCtx,
    builder: shapeBuilder,
  });

  const { doc: afterImages, added: imagesAdded } = await addElementsAsync({
    slideDoc: afterShapes,
    specs: slideMod.addImages ?? [],
    existingIds,
    ctx: buildCtx,
    builder: imageBuilder,
  });

  const { doc: afterConnectors, added: connectorsAdded } = addElementsSync({
    slideDoc: afterImages,
    specs: slideMod.addConnectors ?? [],
    existingIds,
    ctx: buildCtx,
    builder: connectorBuilder,
  });

  const { doc: afterGroups, added: groupsAdded } = addElementsSync({
    slideDoc: afterConnectors,
    specs: slideMod.addGroups ?? [],
    existingIds,
    ctx: buildCtx,
    builder: groupBuilder,
  });

  const { doc: afterTables, added: tablesAdded } = addElementsSync({
    slideDoc: afterGroups,
    specs: slideMod.addTables ?? [],
    existingIds,
    ctx: buildCtx,
    builder: tableBuilder,
  });

  const { doc: afterChartAdds } = addChartsToSlide({
    slideDoc: afterTables,
    specs: slideMod.addCharts ?? [],
    ctx: { zipPackage: ctx.zipPackage, slidePath, existingIds },
  });

  const { doc: afterCharts } = applyChartUpdates(
    afterChartAdds,
    { zipPackage: ctx.zipPackage, slidePath },
    slideMod.updateCharts ?? [],
  );

  const { doc: afterTableUpdates } = applyTableUpdates(afterCharts, slideMod.updateTables ?? []);
  const { doc: afterAnimations } = applyAnimations(afterTableUpdates, slideMod.addAnimations ?? []);

  if (slideMod.addComments && slideMod.addComments.length > 0) {
    applyComments(ctx.zipPackage, slidePath, slideMod.addComments);
  }

  if (slideMod.speakerNotes) {
    applyNotes(ctx.zipPackage, slidePath, slideMod.speakerNotes);
  }

  if (slideMod.updateSmartArt && slideMod.updateSmartArt.length > 0) {
    applySmartArtUpdates(ctx.zipPackage, slidePath, slideMod.updateSmartArt);
  }

  const finalDoc = slideMod.transition ? applySlideTransition(afterAnimations, slideMod.transition) : afterAnimations;

  const updatedXml = serializeDocument(finalDoc, { declaration: true, standalone: true });
  ctx.zipPackage.writeText(slidePath, updatedXml);

  return shapesAdded + imagesAdded + connectorsAdded + groupsAdded + tablesAdded;
}

// =============================================================================
// Main Patcher
// =============================================================================

/**
 * Patch an existing PPTX file with the given patch operations.
 *
 * @param spec - The patch specification
 * @param sourceData - The source PPTX file data
 * @param specDir - Directory of the spec file (for resolving relative paths)
 * @returns The patched PPTX file as Uint8Array
 */
export async function patchPptx(
  spec: PptxPatchSpec,
  sourceData: Uint8Array,
  specDir: string,
): Promise<Uint8Array> {
  const { zipPackage, presentationFile } = await loadPptxBundleFromBuffer(sourceData);
  const classified = classifyPatches(spec.patches);

  // 1. Apply theme patches
  for (const patch of classified.themeUpdatePatches) {
    applyThemeEditsToPackage(zipPackage as ZipPackage, {
      colorScheme: patch.colorScheme,
      fontScheme: patch.fontScheme,
    });
  }

  // 2. Apply slide structure operations
  const hasSlideOps =
    classified.slideAddPatches.length > 0 ||
    classified.slideDuplicatePatches.length > 0 ||
    classified.slideReorderPatches.length > 0 ||
    classified.slideRemovePatches.length > 0;

  if (hasSlideOps) {
    const slideOpsResult = await applySlideOperations(zipPackage as ZipPackage, {
      addSlides: classified.slideAddPatches.map(({ type: _type, ...rest }) => rest),
      duplicateSlides: classified.slideDuplicatePatches.map(({ type: _type, ...rest }) => rest),
      reorderSlides: classified.slideReorderPatches.map(({ type: _type, ...rest }) => rest),
      removeSlides: classified.slideRemovePatches.map(({ type: _type, ...rest }) => rest),
    });

    if (!slideOpsResult.success) {
      throw new Error(`Slide operations failed: ${slideOpsResult.error}`);
    }
  }

  // 3. Apply slide content modifications
  if (classified.slideModifyPatches.length > 0) {
    const presentation = openPresentation(presentationFile);
    const ctx: SlideContext = {
      zipPackage: zipPackage as ZipPackage,
      presentation,
      specDir,
    };

    for (const patch of classified.slideModifyPatches) {
      const { type: _type, ...slideMod } = patch;
      await processSlide(ctx, slideMod);
    }
  }

  // 4. Apply text replacements (last, so they can affect newly added content too)
  applyTextReplacePatches(zipPackage as ZipPackage, classified.textReplacePatches);

  const buffer = await zipPackage.toArrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Get patch metadata from a specification (for CLI output).
 */
export function getPatchData(spec: PptxPatchSpec): PptxPatchData {
  const classified = classifyPatches(spec.patches);

  return {
    sourcePath: spec.source,
    outputPath: spec.output,
    patchCount: spec.patches.length,
    slidesModified: classified.slideModifyPatches.length,
    textReplacements: classified.textReplacePatches.length,
  };
}
