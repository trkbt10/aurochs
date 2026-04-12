/**
 * @file Main SVG renderer for Figma nodes
 */

import type { FigNode, FigNodeType } from "@aurochs/fig/types";
import type { FigBlob, FigImage } from "@aurochs/fig/parser";
import { guidToString, getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { FigSvgRenderContext, FigSvgRenderResult } from "../types";
import { createFigSvgRenderContext } from "./context";
import { svg, defs, g, rect, mask, type SvgString, EMPTY_SVG } from "./primitives";
import {
  renderFrameNode,
  renderGroupNode,
  renderRectangleNode,
  renderEllipseNode,
  renderVectorNode,
  renderTextNode,
} from "./nodes";
import { renderTextNodeAsPath, type PathRenderContext } from "./nodes/text/path-render";
import {
  renderTextNodeFromDerivedData,
  hasDerivedPathData,
  type DerivedPathRenderContext,
} from "./nodes/text/derived-path-render";
import { createFigResolver, type ResolvedInstanceNode } from "../symbols/fig-resolver";
import type { FontLoader } from "../font";

// =============================================================================
// Transform Normalization
// =============================================================================

/** Apply GUID translation to overrides if translation map is non-empty */
/**
 * Get the root frame's transform offset (translation component)
 */
function getRootFrameOffset(nodes: readonly FigNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  // Find the minimum x and y from all root node transforms
  const { minX, minY } = nodes.reduce(
    (acc, node) => {
      const transform = node.transform;
      if (transform) {
        return {
          minX: Math.min(acc.minX, transform.m02 ?? 0),
          minY: Math.min(acc.minY, transform.m12 ?? 0),
        };
      }
      return acc;
    },
    { minX: Infinity, minY: Infinity },
  );

  return {
    x: isFinite(minX) ? minX : 0,
    y: isFinite(minY) ? minY : 0,
  };
}

/**
 * Normalize node transform by removing the root offset
 */
function normalizeNodeTransform(node: FigNode, offset: { x: number; y: number }): FigNode {
  if (offset.x === 0 && offset.y === 0) {
    return node;
  }

  const transform = node.transform;

  if (!transform) {
    return node;
  }

  // Create a new node with normalized transform
  return {
    ...node,
    transform: {
      ...transform,
      m02: (transform.m02 ?? 0) - offset.x,
      m12: (transform.m12 ?? 0) - offset.y,
    },
  } as FigNode;
}

/**
 * Get nodes to render, optionally normalizing root transforms
 */
function getNodesToRender(nodes: readonly FigNode[], normalizeRootTransform?: boolean): readonly FigNode[] {
  if (!normalizeRootTransform) {
    return nodes;
  }
  const offset = getRootFrameOffset(nodes);
  return nodes.map((node) => normalizeNodeTransform(node, offset));
}

// =============================================================================
// Render Options
// =============================================================================

/**
 * Options for rendering Figma nodes to SVG
 */
export type FigSvgRenderOptions = {
  /** Width of the output SVG */
  readonly width?: number;
  /** Height of the output SVG */
  readonly height?: number;
  /** Background color (CSS color string) */
  readonly backgroundColor?: string;
  /** Blobs from parsed .fig file for path decoding */
  readonly blobs?: readonly FigBlob[];
  /** Images from parsed .fig file for image fills */
  readonly images?: ReadonlyMap<string, FigImage>;
  /** Normalize root transform to (0, 0) - useful when rendering a single frame */
  readonly normalizeRootTransform?: boolean;
  /** Show hidden nodes (visible: false) - useful for viewing style definitions */
  readonly showHiddenNodes?: boolean;
  /** Symbol map for INSTANCE node resolution (from buildNodeTree) */
  readonly symbolMap?: ReadonlyMap<string, FigNode>;
  /** Font loader for path-based text rendering (enables high-precision text) */
  readonly fontLoader?: FontLoader;
};

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Render Figma nodes to SVG
 *
 * Supports path-based text rendering when fontLoader is provided.
 *
 * @param nodes - Array of Figma nodes to render
 * @param options - Render options
 * @returns SVG render result with warnings
 */
export async function renderFigToSvg(
  nodes: readonly FigNode[],
  options?: FigSvgRenderOptions,
): Promise<FigSvgRenderResult> {
  const width = options?.width ?? 800;
  const height = options?.height ?? 600;

  const warnings: string[] = [];

  // Create resolver if symbolMap is provided
  const resolver = options?.symbolMap ? createFigResolver(options.symbolMap) : undefined;
  if (resolver) {
    warnings.push(...resolver.warnings);
  }

  const ctx = createFigSvgRenderContext({
    canvasSize: { width, height },
    blobs: options?.blobs ?? [],
    images: options?.images ?? new Map(),
    showHiddenNodes: options?.showHiddenNodes,
    resolver,
    fontLoader: options?.fontLoader,
  });
  const nodesToRender = getNodesToRender(nodes, options?.normalizeRootTransform);

  const renderedNodes: SvgString[] = [];
  for (const node of nodesToRender) {
    try {
      const rendered = await renderNode(node, ctx, warnings);
      renderedNodes.push(rendered);
    } catch (error) {
      warnings.push(`Failed to render node "${node.name ?? "unknown"}": ${error}`);
      renderedNodes.push(EMPTY_SVG);
    }
  }

  const content: SvgString[] = [];

  if (ctx.defs.hasAny()) {
    content.push(defs(...(ctx.defs.getAll() as SvgString[])));
  }

  if (options?.backgroundColor) {
    content.push(
      rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: options.backgroundColor,
      }),
    );
  }

  content.push(...renderedNodes);

  const svgOutput = svg(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    ...content,
  );

  return {
    svg: svgOutput,
    warnings,
  };
}

// =============================================================================
// Node Rendering
// =============================================================================

/**
 * Check if a node is a mask layer
 */
function isMaskNode(node: FigNode): boolean {
  return node.mask === true;
}

/**
 * Result of resolving an INSTANCE node against its SYMBOL
 */
/**
 * Resolve an INSTANCE node to renderable content.
 * Delegates to resolveInstanceNode() in symbol-resolver (the SoT for resolution).
 */
function resolveInstance(
  { node, nodeType, ctx, warnings }: { node: FigNode; nodeType: string; ctx: FigSvgRenderContext; warnings: string[]; }
): ResolvedInstanceNode {
  if (nodeType !== "INSTANCE") {
    return { node, children: safeChildren(node) };
  }

  if (!ctx.resolver) {
    const warning = "Resolver missing: INSTANCE nodes will not be resolved (pass symbolMap to renderFigToSvg).";
    if (!warnings.includes(warning)) {
      warnings.push(warning);
    }
    return { node, children: safeChildren(node) };
  }

  return ctx.resolver.resolveInstance(node);
}

const FIGMA_BLEND_MODE_TO_CSS: Record<string, string> = {
  DARKEN: "darken",
  MULTIPLY: "multiply",
  LINEAR_BURN: "plus-darker",
  COLOR_BURN: "color-burn",
  LIGHTEN: "lighten",
  SCREEN: "screen",
  LINEAR_DODGE: "plus-lighter",
  COLOR_DODGE: "color-dodge",
  OVERLAY: "overlay",
  SOFT_LIGHT: "soft-light",
  HARD_LIGHT: "hard-light",
  DIFFERENCE: "difference",
  EXCLUSION: "exclusion",
  HUE: "hue",
  SATURATION: "saturation",
  COLOR: "color",
  LUMINOSITY: "luminosity",
};

function getBlendModeCss(node: FigNode): string | undefined {
  const bm = (node as Record<string, unknown>).blendMode as { value: number; name: string } | string | undefined;
  const name = typeof bm === "string" ? bm : bm?.name;
  if (!name) {return undefined;}
  return FIGMA_BLEND_MODE_TO_CSS[name];
}

/**
 * Render a single Figma node to SVG
 *
 * @param node - The Figma node to render
 * @param ctx - Render context
 * @param warnings - Array to collect warnings
 * @returns SVG string for the node
 */
async function renderNode(node: FigNode, ctx: FigSvgRenderContext, warnings: string[]): Promise<SvgString> {
  const nodeType = getNodeType(node);

  if (node.visible === false && !ctx.showHiddenNodes) {
    return EMPTY_SVG;
  }

  // For INSTANCE nodes, resolve children from SYMBOL and inherit properties
  const resolution = resolveInstance({ node, nodeType, ctx, warnings });
  const resolvedNode = resolution.node;
  const resolvedChildren = resolution.children;
  const renderedChildren = await renderChildrenWithMasks(resolvedChildren, ctx, warnings);

  const contentRef = { value: undefined as SvgString | undefined };
  switch (nodeType) {
    case "DOCUMENT":
      contentRef.value = g({}, ...renderedChildren);
      break;

    case "CANVAS":
      contentRef.value = g({}, ...renderedChildren);
      break;

    case "FRAME":
    case "SECTION":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
    case "SYMBOL":
      contentRef.value = renderFrameNode(resolvedNode, ctx, renderedChildren);
      break;

    case "GROUP":
    case "BOOLEAN_OPERATION":
      contentRef.value = renderGroupNode(node, ctx, renderedChildren);
      break;

    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      contentRef.value = renderRectangleNode(node, ctx);
      break;

    case "ELLIPSE":
      contentRef.value = renderEllipseNode(node, ctx);
      break;

    case "VECTOR":
    case "LINE":
    case "STAR":
    case "REGULAR_POLYGON":
      contentRef.value = renderVectorNode(node, ctx);
      break;

    case "TEXT":
      // Prefer derived path rendering (exact match with Figma export)
      if (hasDerivedPathData(node)) {
        const derivedCtx: DerivedPathRenderContext = {
          ...ctx,
          blobs: ctx.blobs,
        };
        contentRef.value = renderTextNodeFromDerivedData(node, derivedCtx);
        break;
      }
      // Fallback to opentype.js path rendering if fontLoader is available
      if (ctx.fontLoader) {
        const pathCtx: PathRenderContext = {
          ...ctx,
          fontLoader: ctx.fontLoader,
        };
        contentRef.value = await renderTextNodeAsPath(node, pathCtx);
        break;
      }
      contentRef.value = renderTextNode(node, ctx);
      break;

    default:
      if (renderedChildren.length > 0) {
        contentRef.value = g({}, ...renderedChildren);
        break;
      }
      warnings.push(`Unknown node type: ${nodeType}`);
      contentRef.value = EMPTY_SVG;
      break;
  }

  // Apply node-level blend mode as CSS mix-blend-mode
  const blendModeCss = getBlendModeCss(node);
  if (blendModeCss) {
    return g({ style: `mix-blend-mode:${blendModeCss}` }, contentRef.value);
  }
  return contentRef.value;
}

// =============================================================================
// Mask Processing
// =============================================================================

/**
 * Process children with mask support
 *
 * When a child has mask: true, it becomes a mask for subsequent siblings.
 * The mask node itself is not rendered as visible content.
 */
async function renderChildrenWithMasks(
  children: readonly FigNode[],
  ctx: FigSvgRenderContext,
  warnings: string[],
): Promise<readonly SvgString[]> {
  const result: SvgString[] = [];
  const currentMaskIdRef = { value: null as string | null };
  const maskedContentRef = { value: [] as SvgString[] };

  for (const child of children) {
    if (child.visible === false && !ctx.showHiddenNodes) {
      continue;
    }

    if (isMaskNode(child)) {
      // Flush existing masked content
      if (currentMaskIdRef.value && maskedContentRef.value.length > 0) {
        result.push(g({ mask: `url(#${currentMaskIdRef.value})` }, ...maskedContentRef.value));
        maskedContentRef.value = [];
      }

      const maskContent = await renderNode(child, ctx, warnings);
      if (maskContent !== EMPTY_SVG) {
        const maskId = ctx.defs.generateId("mask");
        const maskDef = mask({ id: maskId, style: "mask-type:luminance" }, g({ fill: "white" }, maskContent));
        ctx.defs.add(maskDef);
        currentMaskIdRef.value = maskId;
      }
    } else {
      const rendered = await renderNode(child, ctx, warnings);
      if (rendered !== EMPTY_SVG) {
        if (currentMaskIdRef.value) {
          maskedContentRef.value.push(rendered);
        } else {
          result.push(rendered);
        }
      }
    }
  }

  // Final flush
  if (currentMaskIdRef.value && maskedContentRef.value.length > 0) {
    result.push(g({ mask: `url(#${currentMaskIdRef.value})` }, ...maskedContentRef.value));
  }

  return result;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Calculate canvas bounds from children
 */
function calculateCanvasBounds(
  children: readonly FigNode[],
  defaultWidth: number,
  defaultHeight: number,
): { width: number; height: number } {
  const bounds = children.reduce(
    (acc, child) => {
      const transform = child.transform;
      const size = child.size;

      if (transform && size) {
        const right = (transform.m02 ?? 0) + (size.x ?? 0);
        const bottom = (transform.m12 ?? 0) + (size.y ?? 0);
        return {
          width: Math.max(acc.width, right),
          height: Math.max(acc.height, bottom),
        };
      }
      return acc;
    },
    { width: defaultWidth, height: defaultHeight },
  );

  return bounds;
}

/**
 * Render a single canvas (page) from Figma nodes
 */
export async function renderCanvas(
  canvasNode: Pick<FigNode, "children">,
  options?: FigSvgRenderOptions,
): Promise<FigSvgRenderResult> {
  const children = safeChildren(canvasNode);

  const defaultWidth = options?.width ?? 800;
  const defaultHeight = options?.height ?? 600;
  const bounds = calculateCanvasBounds(children, defaultWidth, defaultHeight);

  return renderFigToSvg(children, {
    ...options,
    width: options?.width ?? bounds.width,
    height: options?.height ?? bounds.height,
    normalizeRootTransform: options?.normalizeRootTransform ?? true,
  });
}
