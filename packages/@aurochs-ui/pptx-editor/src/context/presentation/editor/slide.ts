/**
 * @file Slide operations
 *
 * Query and mutation functions for slides within a presentation document.
 *
 * NOTE: This module wraps the slide operations from @aurochs-builder/pptx/slide-ops
 * to provide a consistent API for the editor. The underlying implementation
 * ensures both domain and file-level changes are synchronized.
 */

import type { Slide } from "@aurochs-office/pptx/domain";
import type { PresentationDocument, SlideWithId, SlideId } from "@aurochs-office/pptx/app";
import {
  addSlide as addSlideToDocument,
  removeSlide as removeSlideFromDocument,
  reorderSlide as reorderSlideInDocument,
  duplicateSlide as duplicateSlideInDocument,
} from "@aurochs-builder/pptx/slide-ops";

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
export function findSlideById(document: PresentationDocument, slideId: SlideId): SlideWithId | undefined {
  return document.slides.find((s) => s.id === slideId);
}

/** Get the index of a slide by its ID in the document */
export function getSlideIndex(document: PresentationDocument, slideId: SlideId): number {
  return document.slides.findIndex((s) => s.id === slideId);
}

// =============================================================================
// Mutation - Using @aurochs-builder/pptx/slide-ops for file-level sync
// =============================================================================

/**
 * Add a new slide to the document at the specified position.
 *
 * This function uses the slide-ops module which updates both the domain model
 * and the underlying PPTX file structure (presentation.xml, rels, content types).
 *
 * @param document - The presentation document
 * @param layoutPath - Path to the slide layout (e.g., "ppt/slideLayouts/slideLayout1.xml")
 * @param position - Optional position to insert the slide (0-based index)
 * @returns Promise with the updated document and new slide ID
 */
export async function addSlide({
  document,
  layoutPath,
  position,
}: {
  document: PresentationDocument;
  layoutPath: string;
  position?: number;
}): Promise<{ document: PresentationDocument; newSlideId: SlideId }> {
  const result = await addSlideToDocument(document, layoutPath, position);
  return {
    document: result.doc,
    newSlideId: result.doc.slides[result.slideIndex]!.id,
  };
}

/**
 * Delete a slide from the document by its ID.
 *
 * This function uses the slide-ops module which updates both the domain model
 * and the underlying PPTX file structure.
 */
export function deleteSlide(document: PresentationDocument, slideId: SlideId): PresentationDocument {
  const slideIndex = getSlideIndex(document, slideId);
  if (slideIndex === -1) {
    return document;
  }
  return removeSlideFromDocument(document, slideIndex).doc;
}

/**
 * Move a slide to a new position in the document.
 *
 * This function uses the slide-ops module which updates both the domain model
 * and the underlying PPTX file structure.
 */
export function moveSlide(document: PresentationDocument, slideId: SlideId, toIndex: number): PresentationDocument {
  const fromIndex = getSlideIndex(document, slideId);
  if (fromIndex === -1 || fromIndex === toIndex) {
    return document;
  }
  return reorderSlideInDocument(document, fromIndex, toIndex).doc;
}

/**
 * Duplicate an existing slide in the document.
 *
 * This function uses the slide-ops module which updates both the domain model
 * and the underlying PPTX file structure (including notes slide if present).
 */
export async function duplicateSlide(
  document: PresentationDocument,
  slideId: SlideId,
): Promise<{ document: PresentationDocument; newSlideId: SlideId } | undefined> {
  const slideIndex = getSlideIndex(document, slideId);
  if (slideIndex === -1) {
    return undefined;
  }
  const result = await duplicateSlideInDocument(document, slideIndex);
  return {
    document: result.doc,
    newSlideId: result.doc.slides[result.slideIndex]!.id,
  };
}

// =============================================================================
// Mutation - Domain-only operations (no file-level changes)
// =============================================================================

/** Update a slide in the document using an updater function */
export function updateSlide(
  document: PresentationDocument,
  slideId: SlideId,
  updater: (slide: Slide) => Slide,
): PresentationDocument {
  const newSlides = document.slides.map((s) => (s.id === slideId ? { ...s, slide: updater(s.slide) } : s));
  return { ...document, slides: newSlides };
}

/** Update a slide entry in the document using an updater function */
export function updateSlideEntry(
  document: PresentationDocument,
  slideId: SlideId,
  updater: (slide: SlideWithId) => SlideWithId,
): PresentationDocument {
  const newSlides = document.slides.map((s) => (s.id === slideId ? updater(s) : s));
  return { ...document, slides: newSlides };
}
