/**
 * @file Convert PPTX slides/presentation to Fig pages/document
 *
 * Each slide becomes a Fig page. The slide's shapes become the
 * page's children. Slide background becomes page background color.
 *
 * Since Fig uses an infinite canvas and PPTX has fixed slide size,
 * we place the content at the canvas origin (0, 0). The node positions
 * from the slide are preserved as-is (they're already in the slide's
 * coordinate space).
 */

import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigDesignDocument, FigPage, FigPageId } from "@aurochs/fig/domain";
import type { FigColor } from "@aurochs/fig/types";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_PAGE_BACKGROUND } from "@aurochs-builder/fig";
import { dmlColorToFig } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import { convertShapes, type NodeIdCounter, type ConvertContext } from "./shape";

/**
 * Convert a PresentationDocument to a FigDesignDocument.
 */
export function convertDocument(doc: PresentationDocument): FigDesignDocument {
  const idCounter: NodeIdCounter = { value: 0 };

  const pages: FigPage[] = doc.slides.map((slideWithId, index) =>
    convertSlide(slideWithId, index, idCounter, doc.colorContext, doc.fontScheme),
  );

  return {
    pages,
    components: new Map(),
    images: new Map(),
    metadata: null,
  };
}

function convertSlide(
  slideWithId: SlideWithId,
  index: number,
  idCounter: NodeIdCounter,
  docColorContext: ColorContext,
  docFontScheme: FontScheme,
): FigPage {
  const slide = slideWithId.slide;
  const slideColorContext = slideWithId.colorContext ?? docColorContext;
  const slideFontScheme = slideWithId.fontScheme ?? docFontScheme;

  const ctx: ConvertContext = {
    colorContext: slideColorContext,
    fontScheme: slideFontScheme,
  };

  const children = convertShapes(slide.shapes, idCounter, ctx);
  const backgroundColor = convertBackground(slide.background?.fill, slideColorContext);

  return {
    id: `page-${index + 1}` as FigPageId,
    name: `Slide ${index + 1}`,
    backgroundColor: backgroundColor ?? DEFAULT_PAGE_BACKGROUND,
    children,
  };
}

/**
 * Convert a PPTX slide background fill to a Fig background color.
 *
 * Only solid fills are directly convertible. Gradient/image backgrounds
 * cannot be represented as a Figma page background (single color).
 * Return white for non-solid backgrounds — standard presentation default.
 */
function convertBackground(fill: BaseFill | undefined, colorContext: ColorContext): FigColor | undefined {
  if (!fill) return undefined;

  if (fill.type === "solidFill") {
    return dmlColorToFig(fill.color, colorContext);
  }

  return { r: 1, g: 1, b: 1, a: 1 };
}
