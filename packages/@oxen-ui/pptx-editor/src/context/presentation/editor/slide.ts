/**
 * @file Slide operations
 *
 * Query and mutation functions for slides within a presentation document.
 */

import type { Slide } from "@oxen-office/pptx/domain";
import type { PresentationDocument, SlideWithId, SlideId } from "@oxen-office/pptx/app";

// =============================================================================
// ID Generation
// =============================================================================

function findMaxNumericId(slides: readonly SlideWithId[]): number {
  return slides.reduce((max, slide) => {
    const numId = parseInt(slide.id, 10);
    return !isNaN(numId) && numId > max ? numId : max;
  }, 0);
}




































/** Generate a unique slide ID for the document */
export function generateSlideId(document: PresentationDocument): SlideId {
  return String(findMaxNumericId(document.slides) + 1);
}

// =============================================================================
// Query
// =============================================================================




































/** Find a slide by its ID in the document */
export function findSlideById(
  document: PresentationDocument,
  slideId: SlideId
): SlideWithId | undefined {
  return document.slides.find((s) => s.id === slideId);
}




































/** Get the index of a slide by its ID in the document */
export function getSlideIndex(
  document: PresentationDocument,
  slideId: SlideId
): number {
  return document.slides.findIndex((s) => s.id === slideId);
}

// =============================================================================
// Mutation
// =============================================================================

function getInsertIndex(
  document: PresentationDocument,
  afterSlideId: SlideId | undefined
): number {
  if (afterSlideId === undefined) {
    return document.slides.length;
  }
  const afterIndex = getSlideIndex(document, afterSlideId);
  return afterIndex === -1 ? document.slides.length : afterIndex + 1;
}

function insertSlideAt(
  slides: readonly SlideWithId[],
  slide: SlideWithId,
  index: number
): SlideWithId[] {
  return [...slides.slice(0, index), slide, ...slides.slice(index)];
}











function getInsertIndexForAddSlide(
  document: PresentationDocument,
  afterSlideId: SlideId | undefined,
  atIndex: number | undefined,
): number {
  if (atIndex !== undefined) {
    return Math.max(0, Math.min(atIndex, document.slides.length));
  }
  return getInsertIndex(document, afterSlideId);
}


























/** Add a new slide to the document at the specified position */
export function addSlide({
  document,
  slide,
  afterSlideId,
  atIndex,
}: {
  document: PresentationDocument;
  slide: Slide;
  afterSlideId?: SlideId;
  atIndex?: number;
}): { document: PresentationDocument; newSlideId: SlideId } {
  const newSlideId = generateSlideId(document);
  const newSlideWithId: SlideWithId = { id: newSlideId, slide };
  // atIndex takes precedence over afterSlideId
  const insertIndex = getInsertIndexForAddSlide(document, afterSlideId, atIndex);
  const newSlides = insertSlideAt(document.slides, newSlideWithId, insertIndex);

  return {
    document: { ...document, slides: newSlides },
    newSlideId,
  };
}




































/** Delete a slide from the document by its ID */
export function deleteSlide(
  document: PresentationDocument,
  slideId: SlideId
): PresentationDocument {
  const newSlides = document.slides.filter((s) => s.id !== slideId);
  return { ...document, slides: newSlides };
}

function createDuplicatedSlide(
  sourceSlide: SlideWithId,
  newSlideId: SlideId
): SlideWithId {
  const clonedSlide: Slide = JSON.parse(JSON.stringify(sourceSlide.slide));
  return {
    id: newSlideId,
    slide: clonedSlide,
    apiSlide: sourceSlide.apiSlide,
    resolvedBackground: sourceSlide.resolvedBackground,
    layoutPathOverride: sourceSlide.layoutPathOverride,
  };
}




































/** Duplicate an existing slide in the document */
export function duplicateSlide(
  document: PresentationDocument,
  slideId: SlideId
): { document: PresentationDocument; newSlideId: SlideId } | undefined {
  const sourceSlide = findSlideById(document, slideId);
  if (!sourceSlide) {
    return undefined;
  }

  const newSlideId = generateSlideId(document);
  const insertIndex = getSlideIndex(document, slideId) + 1;
  const newSlideWithId = createDuplicatedSlide(sourceSlide, newSlideId);
  const newSlides = insertSlideAt(document.slides, newSlideWithId, insertIndex);

  return {
    document: { ...document, slides: newSlides },
    newSlideId,
  };
}

function moveElementInArray<T>(
  array: readonly T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const element = array[fromIndex];
  const withoutElement = [
    ...array.slice(0, fromIndex),
    ...array.slice(fromIndex + 1),
  ];
  return [
    ...withoutElement.slice(0, toIndex),
    element,
    ...withoutElement.slice(toIndex),
  ];
}




































/** Move a slide to a new position in the document */
export function moveSlide(
  document: PresentationDocument,
  slideId: SlideId,
  toIndex: number
): PresentationDocument {
  const currentIndex = getSlideIndex(document, slideId);
  if (currentIndex === -1 || currentIndex === toIndex) {
    return document;
  }

  const slides = moveElementInArray(document.slides, currentIndex, toIndex);
  return { ...document, slides };
}




































/** Update a slide in the document using an updater function */
export function updateSlide(
  document: PresentationDocument,
  slideId: SlideId,
  updater: (slide: Slide) => Slide
): PresentationDocument {
  const newSlides = document.slides.map((s) =>
    s.id === slideId ? { ...s, slide: updater(s.slide) } : s
  );
  return { ...document, slides: newSlides };
}




































/** Update a slide entry in the document using an updater function */
export function updateSlideEntry(
  document: PresentationDocument,
  slideId: SlideId,
  updater: (slide: SlideWithId) => SlideWithId
): PresentationDocument {
  const newSlides = document.slides.map((s) =>
    s.id === slideId ? updater(s) : s
  );
  return { ...document, slides: newSlides };
}
