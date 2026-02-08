/**
 * @file Slide processor for applying element modifications
 *
 * High-level function to process slide modifications following the build.ts pattern.
 * Supports all operations defined in SlideModSpec.
 */

import { parseXml, serializeDocument, getByPath, type XmlDocument } from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";
import type {
  ShapeSpec,
  ImageSpec,
  TableSpec,
  ConnectorSpec,
  GroupSpec,
  BackgroundFillSpec,
  TableUpdateSpec,
  ChartAddSpec,
  ChartUpdateSpec,
  AnimationSpec,
  CommentSpec,
  NotesSpec,
  SmartArtUpdateSpec,
  SlideTransitionSpec,
} from "../types/spec-types";
import {
  shapeBuilder,
  imageBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  addElementsSync,
  addElementsAsync,
  type BuildContext,
} from "./registry";
import { applyBackgroundSpec, getExistingShapeIds } from "./slide-utils";
import { applyTableUpdates } from "./table-update-builder";
import { addChartsToSlide } from "./chart-add-builder";
import { applyChartUpdates } from "./chart-builder";
import { applyAnimations } from "./animation-builder";
import { applyComments } from "./comment-builder";
import { applyNotes } from "./notes-builder";
import { applySmartArtUpdates } from "./smartart-builder";
import { applySlideTransition } from "./transition-builder";

/**
 * Slide modification input specification.
 */
export type SlideModInput = {
  readonly slideNumber: number;
  readonly background?: BackgroundFillSpec;
  readonly addShapes?: readonly ShapeSpec[];
  readonly addImages?: readonly ImageSpec[];
  readonly addTables?: readonly TableSpec[];
  readonly addConnectors?: readonly ConnectorSpec[];
  readonly addGroups?: readonly GroupSpec[];
  readonly updateTables?: readonly TableUpdateSpec[];
  readonly addCharts?: readonly ChartAddSpec[];
  readonly updateCharts?: readonly ChartUpdateSpec[];
  readonly addAnimations?: readonly AnimationSpec[];
  readonly addComments?: readonly CommentSpec[];
  readonly speakerNotes?: NotesSpec;
  readonly updateSmartArt?: readonly SmartArtUpdateSpec[];
  readonly transition?: SlideTransitionSpec;
};

/**
 * Context for slide processing.
 */
export type SlideProcessContext = {
  readonly zipPackage: ZipPackage;
  readonly presentation: {
    readonly count: number;
    readonly getSlide: (n: number) => { filename: string; content: unknown };
  };
  readonly specDir: string;
};

/**
 * Result of processing a slide.
 */
export type SlideProcessResult = {
  readonly elementsAdded: number;
};

function applyTableUpdatesIfNeeded(doc: XmlDocument, updates: readonly TableUpdateSpec[] | undefined): XmlDocument {
  if (!updates || updates.length === 0) {
    return doc;
  }
  return applyTableUpdates(doc, updates).doc;
}

function applyTransitionIfNeeded(doc: XmlDocument, transition: SlideTransitionSpec | undefined): XmlDocument {
  if (!transition) {
    return doc;
  }
  return applySlideTransition(doc, transition);
}

/**
 * Process slide modifications using the standard builder pipeline.
 * Handles all operations defined in SlideModSpec: background, shapes, images,
 * connectors, groups, tables, charts, animations, comments, notes, SmartArt,
 * and transitions.
 */
export async function processSlideElements(
  ctx: SlideProcessContext,
  input: SlideModInput,
): Promise<SlideProcessResult> {
  const { slideNumber } = input;

  if (slideNumber < 1 || slideNumber > ctx.presentation.count) {
    throw new Error(`Invalid slide: ${slideNumber}. Valid range: 1-${ctx.presentation.count}`);
  }

  const apiSlide = ctx.presentation.getSlide(slideNumber);
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

  // Apply background
  const docWithBackground = await applyBackgroundSpec(slideDoc, input.background, buildCtx);

  // Process shapes
  const { doc: afterShapes, added: shapesAdded } = addElementsSync({
    slideDoc: docWithBackground,
    specs: input.addShapes ?? [],
    existingIds,
    ctx: buildCtx,
    builder: shapeBuilder,
  });

  // Process images (async)
  const { doc: afterImages, added: imagesAdded } = await addElementsAsync({
    slideDoc: afterShapes,
    specs: input.addImages ?? [],
    existingIds,
    ctx: buildCtx,
    builder: imageBuilder,
  });

  // Process connectors
  const { doc: afterConnectors, added: connectorsAdded } = addElementsSync({
    slideDoc: afterImages,
    specs: input.addConnectors ?? [],
    existingIds,
    ctx: buildCtx,
    builder: connectorBuilder,
  });

  // Process groups
  const { doc: afterGroups, added: groupsAdded } = addElementsSync({
    slideDoc: afterConnectors,
    specs: input.addGroups ?? [],
    existingIds,
    ctx: buildCtx,
    builder: groupBuilder,
  });

  // Process tables
  const { doc: afterTables, added: tablesAdded } = addElementsSync({
    slideDoc: afterGroups,
    specs: input.addTables ?? [],
    existingIds,
    ctx: buildCtx,
    builder: tableBuilder,
  });

  // Add charts
  const { doc: afterChartAdds, added: chartsAdded } = addChartsToSlide({
    slideDoc: afterTables,
    specs: input.addCharts ?? [],
    ctx: { zipPackage: ctx.zipPackage, slidePath, existingIds },
  });

  // Update charts
  const { doc: afterCharts } = applyChartUpdates(
    afterChartAdds,
    { zipPackage: ctx.zipPackage, slidePath },
    input.updateCharts ?? [],
  );

  // Apply table updates
  const afterTableUpdates = applyTableUpdatesIfNeeded(afterCharts, input.updateTables);

  // Apply animations
  const { doc: afterAnimations } = applyAnimations(afterTableUpdates, input.addAnimations ?? []);

  // Apply comments (operates on zipPackage directly)
  if (input.addComments && input.addComments.length > 0) {
    applyComments(ctx.zipPackage, slidePath, input.addComments);
  }

  // Apply speaker notes (operates on zipPackage directly)
  if (input.speakerNotes) {
    applyNotes(ctx.zipPackage, slidePath, input.speakerNotes);
  }

  // Apply SmartArt updates (operates on zipPackage directly)
  if (input.updateSmartArt && input.updateSmartArt.length > 0) {
    applySmartArtUpdates(ctx.zipPackage, slidePath, input.updateSmartArt);
  }

  // Apply transition
  const finalDoc = applyTransitionIfNeeded(afterAnimations, input.transition);

  const totalAdded = shapesAdded + imagesAdded + connectorsAdded + groupsAdded + tablesAdded + chartsAdded;

  const updatedXml = serializeDocument(finalDoc, { declaration: true, standalone: true });
  ctx.zipPackage.writeText(slidePath, updatedXml);

  return { elementsAdded: totalAdded };
}
