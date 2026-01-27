/**
 * @file Shared test fixtures for reducer tests
 *
 * Common setup utilities and mock data for presentation editor reducer tests.
 */

import type { Slide } from "@oxen/pptx/domain";
import type { PresentationDocument } from "@oxen/pptx/app";
import { px } from "@oxen/ooxml/domain/units";

/**
 * Create an empty slide for testing
 */
export function createEmptySlide(): Slide {
  return { shapes: [] };
}

/**
 * Create a minimal test document
 */
export function createTestDocument(): PresentationDocument {
  return {
    presentation: {
      slideSize: { width: px(960), height: px(540) },
    },
    slides: [{ id: "slide-1", slide: createEmptySlide() }],
    slideWidth: px(960),
    slideHeight: px(540),
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: {
      getTarget: () => undefined,
      getType: () => undefined,
      resolve: () => undefined,
      getMimeType: () => undefined,
      getFilePath: () => undefined,
      readFile: () => null,
      getResourceByType: () => undefined,
    },
  };
}
