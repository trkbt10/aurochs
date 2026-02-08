/**
 * @file Document initialization
 *
 * Functions to create PresentationDocument instances.
 */

import type { Slide, Presentation } from "@aurochs-office/pptx/domain";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app";

// =============================================================================
// Default Values
// =============================================================================

const EMPTY_COLOR_CONTEXT: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

const EMPTY_RESOURCE_RESOLVER: ResourceResolver = {
  getTarget: () => undefined,
  getType: () => undefined,
  resolve: () => undefined,
  getMimeType: () => undefined,
  getFilePath: () => undefined,
  readFile: () => null,
  getResourceByType: () => undefined,
};

// =============================================================================
// Document Creation
// =============================================================================

function assignSlideIds(slides: readonly Slide[]): SlideWithId[] {
  return slides.map((slide, index) => ({
    id: String(index + 1),
    slide,
  }));
}

/** Create a PresentationDocument from a parsed presentation and slides */
export function createDocumentFromPresentation({
  presentation,
  slides,
  slideWidth,
  slideHeight,
  colorContext = EMPTY_COLOR_CONTEXT,
  resources = EMPTY_RESOURCE_RESOLVER,
}: {
  presentation: Presentation;
  slides: readonly Slide[];
  slideWidth: Pixels;
  slideHeight: Pixels;
  colorContext?: ColorContext;
  resources?: ResourceResolver;
}): PresentationDocument {
  return {
    presentation,
    slides: assignSlideIds(slides),
    slideWidth,
    slideHeight,
    colorContext,
    resources,
  };
}

/** Create an empty document with a single blank slide */
export function createEmptyDocument(slideWidth: Pixels, slideHeight: Pixels): PresentationDocument {
  const emptySlide: Slide = { shapes: [] };

  return {
    presentation: {
      slideSize: { width: slideWidth, height: slideHeight },
    },
    slides: [{ id: "1", slide: emptySlide }],
    slideWidth,
    slideHeight,
    colorContext: EMPTY_COLOR_CONTEXT,
    resources: EMPTY_RESOURCE_RESOLVER,
  };
}
