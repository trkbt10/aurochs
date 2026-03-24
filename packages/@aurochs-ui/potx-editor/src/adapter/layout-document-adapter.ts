/**
 * @file Layout-to-PresentationDocument adapter
 *
 * Converts slide layouts into a virtual PresentationDocument
 * so that pptx-editor's PresentationEditorProvider can manage
 * canvas interaction state (selection, drag, text editing, undo/redo).
 *
 * Each layout becomes a SlideWithId where the layout path serves as the slide ID.
 * Background inheritance is resolved by loadLayoutWithContext (SoT).
 */

import type { SlideSize } from "@aurochs-office/pptx/domain";
import type { Presentation } from "@aurochs-office/pptx/domain";
import type {
  PresentationDocument,
  SlideWithId,
  SlideId,
} from "@aurochs-office/pptx/app";
import type { PackageFile } from "@aurochs-office/opc";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { Theme } from "@aurochs-office/pptx/domain/theme/types";
import type { LoadedLayoutData } from "@aurochs-ui/ooxml-components";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

// =============================================================================
// Types
// =============================================================================

export type VirtualDocumentInput = {
  readonly layouts: readonly { readonly id: string; readonly data: LoadedLayoutData }[];
  readonly slideSize: SlideSize;
  readonly colorContext: ColorContext;
  readonly fontScheme: FontScheme;
  readonly theme?: Theme;
  readonly resourceStore?: ResourceStore;
  readonly presentationFile?: PackageFile;
};


// =============================================================================
// Conversion
// =============================================================================

/**
 * Convert a layout to a SlideWithId.
 *
 * The layout path becomes the slide ID, and pseudoSlide (from loadLayoutWithContext)
 * provides shapes + resolved background.
 */
export function layoutToSlideWithId(
  layoutId: string,
  layoutData: LoadedLayoutData,
): SlideWithId {
  return {
    id: layoutId as SlideId,
    slide: layoutData.pseudoSlide,
  };
}

/**
 * Create a minimal Presentation stub for the virtual document.
 *
 * Only slideSize is semantically required — other fields are left at defaults.
 * The reducer only spreads this object in SET_SLIDE_SIZE.
 */
function createPresentationStub(slideSize: SlideSize): Presentation {
  return {
    slideSize,
  };
}

/**
 * Create a virtual PresentationDocument from loaded layouts.
 *
 * This is the adapter entry point: it produces a document that
 * PresentationEditorProvider can consume, where each layout
 * is represented as a slide.
 */
export function createVirtualDocument(input: VirtualDocumentInput): PresentationDocument {
  const slides: readonly SlideWithId[] = input.layouts.map(({ id, data }) =>
    layoutToSlideWithId(id, data),
  );

  return {
    presentation: createPresentationStub(input.slideSize),
    slides,
    slideWidth: input.slideSize.width,
    slideHeight: input.slideSize.height,
    theme: input.theme,
    colorContext: input.colorContext,
    fontScheme: input.fontScheme,
    resourceStore: input.resourceStore ?? createResourceStore(),
    presentationFile: input.presentationFile,
  };
}
