/**
 * @file Document initialization
 *
 * Functions to create PresentationDocument instances.
 */

import type { Slide, Presentation } from "../../../../pptx/domain";
import type { Pixels } from "../../../../pptx/domain/types";
import type { ColorContext } from "../../../../pptx/domain/color/context";
import type { ResourceResolver } from "../../../../pptx/domain/resource-resolver";
import type { PresentationDocument, SlideWithId } from "../../../../pptx/app";

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






export function createDocumentFromPresentation(
  presentation: Presentation,
  slides: readonly Slide[],
  slideWidth: Pixels,
  slideHeight: Pixels,
  colorContext: ColorContext = EMPTY_COLOR_CONTEXT,
  resources: ResourceResolver = EMPTY_RESOURCE_RESOLVER
): PresentationDocument {
  return {
    presentation,
    slides: assignSlideIds(slides),
    slideWidth,
    slideHeight,
    colorContext,
    resources,
  };
}






export function createEmptyDocument(
  slideWidth: Pixels,
  slideHeight: Pixels
): PresentationDocument {
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
