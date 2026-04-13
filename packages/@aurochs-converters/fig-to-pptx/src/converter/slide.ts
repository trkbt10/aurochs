/**
 * @file Convert Fig pages to PPTX slides
 *
 * Each FigPage maps to a SlideWithId. The page's children become
 * the slide's shapes. The page background color becomes the
 * slide background fill.
 *
 * Figma pages have an infinite canvas — nodes can be placed anywhere.
 * PPTX slides have a fixed size. We compute the bounding box of all
 * nodes on the page to determine the slide size, or use a provided size.
 *
 * For the position mapping, we translate all nodes so the bounding box
 * origin maps to slide origin (0, 0).
 */

import type { FigPage, FigDesignNode, FigDesignDocument } from "@aurochs/fig/domain";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Presentation } from "@aurochs-office/pptx/domain/presentation/types";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { figColorToColor } from "@aurochs-converters/interop-drawing-ml/fig-to-dml";
import { convertNodes, type ShapeIdCounter } from "./shape";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_COLOR_MAPPING } from "@aurochs-office/pptx/domain/color/types";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigColor } from "@aurochs/fig/types";

/** Default slide size: 16:9 widescreen (same as PowerPoint default) */
const DEFAULT_SLIDE_WIDTH = 960;
const DEFAULT_SLIDE_HEIGHT = 540;

export type FigToPptxSlideOptions = {
  /** Fixed slide size. If not provided, computed from content bounds. */
  readonly slideSize?: {
    readonly width: number;
    readonly height: number;
  };
};

/**
 * Convert a FigDesignDocument to a PresentationDocument.
 *
 * Each page becomes a slide. Images referenced by fig-image: keys
 * are registered in the ResourceStore from the document's image map.
 */
export function convertDocument(
  doc: FigDesignDocument,
  options?: FigToPptxSlideOptions,
): PresentationDocument {
  const slideWidth = px(options?.slideSize?.width ?? DEFAULT_SLIDE_WIDTH) as Pixels;
  const slideHeight = px(options?.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT) as Pixels;

  const resourceStore = createResourceStore();

  // Register fig images in the resource store
  for (const [imageId, figImage] of doc.images) {
    const key = `fig-image:${imageId}`;
    resourceStore.set(key, {
      kind: "image",
      source: "created",
      data: figImage.data.buffer as ArrayBuffer,
      mimeType: figImage.mimeType ?? "image/png",
    });
  }

  const slides: SlideWithId[] = doc.pages.map((page, index) =>
    convertPage(page, slideWidth, slideHeight, index),
  );

  const presentation: Presentation = {
    slideSize: { width: slideWidth, height: slideHeight },
  };

  return {
    presentation,
    slides,
    slideWidth,
    slideHeight,
    colorContext: createDefaultColorContext(),
    fontScheme: EMPTY_FONT_SCHEME,
    resourceStore,
  };
}

/**
 * Convert a single Fig page to a SlideWithId.
 */
function convertPage(
  page: FigPage,
  slideWidth: Pixels,
  slideHeight: Pixels,
  index: number,
): SlideWithId {
  const idCounter: ShapeIdCounter = { value: 0 };

  // Compute content bounds for translation
  const bounds = computeContentBounds(page.children);

  // Translate nodes so their bounding box starts at (0, 0)
  // and scale to fit within the slide dimensions.
  const translatedNodes = translateAndScaleNodes(
    page.children,
    bounds,
    slideWidth as number,
    slideHeight as number,
  );

  const shapes = convertNodes(translatedNodes, idCounter);

  const background = convertPageBackground(page.backgroundColor);

  const slide: Slide = {
    shapes,
    background: background ? { fill: background } : undefined,
  };

  return {
    id: `slide-${index + 1}`,
    slide,
  };
}

/**
 * Compute the axis-aligned bounding box of all nodes.
 * Uses the transform translation (m02, m12) and size.
 */
function computeContentBounds(nodes: readonly FigDesignNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const x = node.transform.m02;
    const y = node.transform.m12;
    const w = node.size.x;
    const h = node.size.y;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Translate and uniformly scale nodes to fit within the slide.
 *
 * 1. Translate so the bounding box origin is at (0, 0).
 * 2. Uniformly scale (contain) so all content fits within the slide.
 *
 * This produces new FigDesignNode instances with adjusted transforms/sizes.
 */
function translateAndScaleNodes(
  nodes: readonly FigDesignNode[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  slideWidth: number,
  slideHeight: number,
): readonly FigDesignNode[] {
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  if (contentWidth <= 0 || contentHeight <= 0) return nodes;

  // Uniform scale to fit (contain mode)
  const scale = Math.min(slideWidth / contentWidth, slideHeight / contentHeight);

  // Center offset after scaling
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;
  const offsetX = (slideWidth - scaledWidth) / 2;
  const offsetY = (slideHeight - scaledHeight) / 2;

  return nodes.map((node) => translateAndScaleNode(node, bounds.minX, bounds.minY, scale, offsetX, offsetY));
}

function translateAndScaleNode(
  node: FigDesignNode,
  originX: number,
  originY: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): FigDesignNode {
  const newM02 = (node.transform.m02 - originX) * scale + offsetX;
  const newM12 = (node.transform.m12 - originY) * scale + offsetY;

  return {
    ...node,
    transform: {
      ...node.transform,
      m02: newM02,
      m12: newM12,
      // Scale the matrix scale components
      m00: node.transform.m00 * scale,
      m01: node.transform.m01 * scale,
      m10: node.transform.m10 * scale,
      m11: node.transform.m11 * scale,
    },
    children: node.children?.map((child) =>
      translateAndScaleNode(child, originX, originY, scale, offsetX, offsetY),
    ),
  };
}

/**
 * Convert a Fig page background color to a DrawingML BaseFill.
 *
 * If the background is the default Figma canvas gray (~245/245/245),
 * we convert it to white for PPTX (which is the standard presentation
 * background).
 */
function convertPageBackground(color: FigColor): BaseFill | undefined {
  // Figma's default canvas background is approximately (0.96, 0.96, 0.96)
  // For PPTX, use white as the default background
  const isDefaultGray = color.r > 0.95 && color.g > 0.95 && color.b > 0.95 && color.a >= 0.99;
  if (isDefaultGray) {
    return {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FFFFFF" } },
    };
  }

  return {
    type: "solidFill",
    color: figColorToColor(color),
  };
}

function createDefaultColorContext(): ColorContext {
  return {
    colorScheme: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "1F497D",
      lt2: "EEECE1",
      accent1: "4F81BD",
      accent2: "C0504D",
      accent3: "9BBB59",
      accent4: "8064A2",
      accent5: "4BACC6",
      accent6: "F79646",
      hlink: "0000FF",
      folHlink: "800080",
    },
    colorMap: { ...DEFAULT_COLOR_MAPPING } as Record<string, string>,
  };
}
