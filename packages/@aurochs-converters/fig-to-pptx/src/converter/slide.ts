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
import { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } from "@aurochs-office/ooxml/domain/ooxml-units";

// Slide size defaults are derived from the OOXML SoT (ooxml-units).

export type FigToPptxSlideOptions = {
  /**
   * Fixed slide size in Pixels (branded).
   * If not provided, uses the ECMA-376 default 16:9 widescreen
   * (1280×720 px at 96 DPI).
   */
  readonly slideSize?: {
    readonly width: Pixels;
    readonly height: Pixels;
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
  const slideWidth = options?.slideSize?.width ?? px(DEFAULT_SLIDE_WIDTH_PX) as Pixels;
  const slideHeight = options?.slideSize?.height ?? px(DEFAULT_SLIDE_HEIGHT_PX) as Pixels;

  const resourceStore = createResourceStore();

  // Register fig images in the resource store
  for (const [imageId, figImage] of doc.images) {
    const key = `fig-image:${imageId}`;
    resourceStore.set(key, {
      kind: "image",
      source: "created",
      data: figImage.data.buffer as ArrayBuffer,
      mimeType: figImage.mimeType,
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

  // Check if content fits within the slide without scaling.
  // If the bounding box fits within (0,0)-(slideWidth,slideHeight),
  // no transformation is needed — nodes are already in slide coordinates
  // (typical for PPTX→Fig→PPTX roundtrip).
  const fitsWithinSlide =
    bounds.minX >= 0 && bounds.minY >= 0
    && bounds.maxX <= slideWidth && bounds.maxY <= slideHeight;

  if (fitsWithinSlide) {
    return nodes; // Already in slide coordinate space, no transform needed
  }

  // Uniform scale to fit (contain mode) — only shrink, never enlarge.
  // Enlarging would distort content that was intentionally smaller than the slide.
  const rawScale = Math.min(slideWidth / contentWidth, slideHeight / contentHeight);
  const scale = Math.min(rawScale, 1);

  // Center offset after scaling
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;
  const offsetX = (slideWidth - scaledWidth) / 2;
  const offsetY = (slideHeight - scaledHeight) / 2;

  return nodes.map((node) => translateAndScaleNode(node, bounds.minX, bounds.minY, scale, offsetX, offsetY));
}

/**
 * Translate and scale a single top-level node.
 *
 * We scale by adjusting the node's `size` (not the matrix's scale components),
 * and recursively scale children's positions and sizes. This keeps the matrix's
 * rotation/flip components intact and avoids the mismatch between PPTX's
 * extent (display size = size × matrixScale) and childExtent (local size = size)
 * that would occur if we scaled the matrix instead.
 *
 * For nodes with children (FRAME, GROUP, etc.), child coordinates are in the
 * parent's local space. Scaling the parent's size without scaling children
 * would leave children at their original positions, which would be wrong.
 * So we recursively scale children's positions and sizes as well.
 */
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
      // Keep m00/m01/m10/m11 unchanged — scale is applied via size, not matrix
    },
    size: {
      x: node.size.x * scale,
      y: node.size.y * scale,
    },
    // Recursively scale children's positions and sizes
    children: node.children
      ? node.children.map((child) => scaleChildNode(child, scale))
      : undefined,
  };
}

/**
 * Recursively scale a child node's position and size.
 *
 * Children's coordinates are relative to the parent's local space.
 * When the parent's local space is uniformly scaled, children must be
 * scaled accordingly. We scale their position (m02, m12) and size,
 * and recurse into their children.
 */
function scaleChildNode(
  node: FigDesignNode,
  scale: number,
): FigDesignNode {
  return {
    ...node,
    transform: {
      ...node.transform,
      m02: node.transform.m02 * scale,
      m12: node.transform.m12 * scale,
    },
    size: {
      x: node.size.x * scale,
      y: node.size.y * scale,
    },
    children: node.children
      ? node.children.map((child) => scaleChildNode(child, scale))
      : undefined,
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
