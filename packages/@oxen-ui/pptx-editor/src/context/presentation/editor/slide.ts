/**
 * @file Slide operations
 *
 * Query and mutation functions for slides within a presentation document.
 */

import type { Slide } from "@oxen/pptx/domain";
import type { PresentationDocument, SlideWithId, SlideId } from "@oxen/pptx/app";

// =============================================================================
// ID Generation
// =============================================================================

function findMaxNumericId(slides: readonly SlideWithId[]): number {
  return slides.reduce((max, slide) => {
    const numId = parseInt(slide.id, 10);
    return !isNaN(numId) && numId > max ? numId : max;
  }, 0);
}






export function generateSlideId(document: PresentationDocument): SlideId {
  return String(findMaxNumericId(document.slides) + 1);
}

// =============================================================================
// Query
// =============================================================================






export function findSlideById(
  document: PresentationDocument,
  slideId: SlideId
): SlideWithId | undefined {
  return document.slides.find((s) => s.id === slideId);
}






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






export function addSlide(
  document: PresentationDocument,
  slide: Slide,
  afterSlideId?: SlideId,
  atIndex?: number
): { document: PresentationDocument; newSlideId: SlideId } {
  const newSlideId = generateSlideId(document);
  const newSlideWithId: SlideWithId = { id: newSlideId, slide };
  // atIndex takes precedence over afterSlideId
  const insertIndex = atIndex !== undefined
    ? Math.max(0, Math.min(atIndex, document.slides.length))
    : getInsertIndex(document, afterSlideId);
  const newSlides = insertSlideAt(document.slides, newSlideWithId, insertIndex);

  return {
    document: { ...document, slides: newSlides },
    newSlideId,
  };
}






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
