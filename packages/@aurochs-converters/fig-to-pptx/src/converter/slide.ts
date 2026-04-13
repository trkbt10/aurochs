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
import type { FigNode } from "@aurochs/fig/types";
import { buildNodeTree, getNodeType, safeChildren } from "@aurochs/fig/parser";
import { preResolveSymbols, resolveInstanceNode } from "@aurochs/fig/symbols";
import { convertFigNode } from "@aurochs-builder/fig/context";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Shape, GrpShape } from "@aurochs-office/pptx/domain/shape";
import type { Presentation } from "@aurochs-office/pptx/domain/presentation/types";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";
import type { GroupTransform } from "@aurochs-office/drawing-ml/domain/geometry";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { figColorToColor } from "@aurochs-converters/interop-drawing-ml/fig-to-dml";
import { convertNodes, type ShapeIdCounter } from "./shape";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_COLOR_MAPPING } from "@aurochs-office/pptx/domain/color/types";
import { DEFAULT_COLOR_SCHEME } from "@aurochs-office/pptx/domain";
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
  const slideWidth = options?.slideSize?.width ?? px(DEFAULT_SLIDE_WIDTH_PX);
  const slideHeight = options?.slideSize?.height ?? px(DEFAULT_SLIDE_HEIGHT_PX);

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

  // Resolve INSTANCE nodes using the SoT (resolveInstanceNode from @aurochs/fig/symbols).
  // This requires the parser-level FigNode tree and symbolMap, which are reconstructed
  // from FigDesignDocument._loaded (the original LoadedFigFile).
  const resolvedPages = resolveAllInstances(doc);

  const slides: SlideWithId[] = resolvedPages.map((page, index) =>
    convertPage({ page, slideWidth, slideHeight, index }),
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

type ConvertPageOptions = {
  readonly page: FigPage;
  readonly slideWidth: Pixels;
  readonly slideHeight: Pixels;
  readonly index: number;
};

/**
 * Convert a single Fig page to a SlideWithId.
 */
function convertPage(
  { page, slideWidth, slideHeight, index }: ConvertPageOptions,
): SlideWithId {
  // Start at 1 because the slide's spTree root uses id="1".
  // Shape IDs within a slide must be unique per ECMA-376.
  const idCounter: ShapeIdCounter = { value: 1 };

  // INSTANCE nodes are already resolved by resolveAllInstances() in convertDocument.
  // Compute content bounds for translation.
  const bounds = computeContentBounds(page.children);
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  // Translate so the bounding box origin is at (0, 0).
  // Do NOT scale node properties (fontSize, strokeWeight, etc.) — scaling
  // is handled by wrapping all shapes in a grpSp whose childExtent/extent
  // ratio defines the visual scale, analogous to SVG viewBox.
  const translatedNodes = translateNodes(page.children, bounds.minX, bounds.minY);

  const childShapes = convertNodes(translatedNodes, idCounter);
  const background = convertPageBackground(page.backgroundColor);

  // Determine if scaling is needed.
  const needsScaling = contentWidth > 0 && contentHeight > 0 && !fitsWithinSlide(bounds, slideWidth, slideHeight);

  const shapes: readonly Shape[] = needsScaling
    ? [wrapInScalingGroup(childShapes, contentWidth, contentHeight, slideWidth, slideHeight, idCounter)]
    : childShapes;

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
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulators for bounding box computation across nodes
  let minX = Infinity;
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for bounding box computation
  let minY = Infinity;
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for bounding box computation
  let maxX = -Infinity;
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for bounding box computation
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

// =============================================================================
// Layout — translate + viewBox-style scaling via grpSp
//
// Instead of rewriting every node property (fontSize, strokeWeight, cornerRadius,
// letterSpacing, …) when shrinking content to fit the slide — which is fragile
// and inevitably misses properties — we use the same approach as SVG's viewBox:
//
//   1. Translate nodes so their bounding box starts at (0, 0).
//   2. Convert nodes to PPTX shapes at their **original** coordinates.
//   3. Wrap all shapes in a root grpSp whose `childExtent` is the original
//      content size and `extent` is the slide size (or a contain-fit rect).
//
// PPTX's grpSp automatically scales its children to map childExtent → extent,
// so fontSize, strokeWeight, and every other property are visually scaled
// without any property rewriting.
// =============================================================================

/**
 * Check whether the content bounding box already fits within the slide.
 */
function fitsWithinSlide(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  slideWidth: number,
  slideHeight: number,
): boolean {
  return bounds.minX >= 0 && bounds.minY >= 0
    && bounds.maxX <= slideWidth && bounds.maxY <= slideHeight;
}

/**
 * Translate all top-level nodes so the bounding box starts at (0, 0).
 * Does NOT scale — coordinates, sizes, and all properties remain unchanged.
 */
function translateNodes(
  nodes: readonly FigDesignNode[],
  originX: number,
  originY: number,
): readonly FigDesignNode[] {
  if (originX === 0 && originY === 0) {return nodes;}
  return nodes.map((node) => ({
    ...node,
    transform: {
      ...node.transform,
      m02: node.transform.m02 - originX,
      m12: node.transform.m12 - originY,
    },
  }));
}

/**
 * Wrap converted shapes in a root grpSp that maps the content's coordinate
 * space to the slide size via the childExtent / extent ratio.
 *
 * This is the PPTX equivalent of SVG's viewBox: the group's child coordinate
 * space is `contentWidth × contentHeight`, displayed at `displayWidth × displayHeight`
 * (contain-fit, centered on the slide).
 */
function wrapInScalingGroup(
  children: readonly Shape[],
  contentWidth: number,
  contentHeight: number,
  slideWidth: number,
  slideHeight: number,
  idCounter: ShapeIdCounter,
): GrpShape {
  // Contain-fit: uniform scale, never enlarge.
  const rawScale = Math.min(slideWidth / contentWidth, slideHeight / contentHeight);
  const scale = Math.min(rawScale, 1);
  const displayWidth = contentWidth * scale;
  const displayHeight = contentHeight * scale;

  // Center on the slide.
  const offsetX = (slideWidth - displayWidth) / 2;
  const offsetY = (slideHeight - displayHeight) / 2;

  const groupTransform: GroupTransform = {
    x: px(offsetX),
    y: px(offsetY),
    width: px(displayWidth),
    height: px(displayHeight),
    rotation: deg(0),
    flipH: false,
    flipV: false,
    childOffsetX: px(0),
    childOffsetY: px(0),
    childExtentWidth: px(contentWidth),
    childExtentHeight: px(contentHeight),
  };

  const id = String(++idCounter.value);

  return {
    type: "grpSp",
    nonVisual: { id, name: "Content" },
    properties: { transform: groupTransform },
    children: children as Shape[],
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
    colorScheme: { ...DEFAULT_COLOR_SCHEME },
    colorMap: { ...DEFAULT_COLOR_MAPPING } as Record<string, string>,
  };
}

// =============================================================================
// INSTANCE resolution via SoT (@aurochs/fig/symbols)
//
// Resolves all INSTANCE nodes in the document by reconstructing the
// parser-level FigNode tree from _loaded, running the canonical
// resolveInstanceNode pipeline, and converting the resolved FigNode
// tree back to FigDesignNode for the conversion pipeline.
// =============================================================================

/**
 * Resolve all INSTANCE nodes in a FigDesignDocument.
 *
 * Returns a new array of FigPage with INSTANCE children expanded using
 * the SoT (resolveInstanceNode from @aurochs/fig/symbols).
 *
 * When _loaded is not available (e.g., document was built programmatically),
 * pages are returned unchanged — no INSTANCE resolution is performed.
 */
function resolveAllInstances(doc: FigDesignDocument): readonly FigPage[] {
  const loaded = doc._loaded;
  if (!loaded) {
    // No parser-level data available — return pages as-is.
    return doc.pages;
  }

  // Reconstruct parser-level FigNode tree and symbolMap.
  const tree = buildNodeTree(loaded.nodeChanges);

  // Pre-resolve SYMBOL dependencies (topological sort + nested INSTANCE expansion).
  const resolvedSymbolCache = preResolveSymbols(tree.nodeMap);

  const resolveCtx = {
    symbolMap: tree.nodeMap,
    resolvedSymbolCache,
  };

  // Walk the DOCUMENT → CANVAS → children hierarchy (same as treeToDocument)
  // and resolve INSTANCE nodes in each page.
  const resolvedPages: FigPage[] = [];

  for (const root of tree.roots) {
    const rootType = getNodeType(root);

    const canvases = rootType === "DOCUMENT"
      ? safeChildren(root).filter((c) => getNodeType(c) === "CANVAS")
      : rootType === "CANVAS" ? [root] : [];

    for (const canvas of canvases) {
      // Find the corresponding FigPage by matching the canvas GUID.
      const pageIndex = resolvedPages.length;
      const originalPage = doc.pages[pageIndex];
      if (!originalPage) { continue; }

      // Resolve INSTANCE nodes in the canvas's children.
      const resolvedChildren = safeChildren(canvas).map((child) =>
        resolveNodeRecursive(child, resolveCtx),
      );

      // Convert resolved FigNode children back to FigDesignNode.
      const components = new Map<string, FigDesignNode>();
      const designChildren = resolvedChildren.map((child) =>
        convertFigNode(child, components),
      );

      resolvedPages.push({
        ...originalPage,
        children: designChildren,
      });
    }
  }

  return resolvedPages;
}

/**
 * Recursively resolve INSTANCE nodes in a FigNode tree using the SoT.
 */
function resolveNodeRecursive(
  node: FigNode,
  ctx: { symbolMap: ReadonlyMap<string, FigNode>; resolvedSymbolCache: ReadonlyMap<string, FigNode> },
): FigNode {
  const nodeType = getNodeType(node);

  if (nodeType === "INSTANCE") {
    const resolved = resolveInstanceNode(node, ctx);
    // resolved.children are already the expanded SYMBOL children with overrides.
    // Recurse into them to resolve nested INSTANCEs.
    const children = resolved.children.map((child) => resolveNodeRecursive(child, ctx));
    return { ...resolved.node, children } as FigNode;
  }

  // Not an INSTANCE — recurse into children.
  const children = safeChildren(node);
  if (children.length === 0) {
    return node;
  }

  const resolvedChildren = children.map((child) => resolveNodeRecursive(child, ctx));
  return { ...node, children: resolvedChildren } as FigNode;
}

