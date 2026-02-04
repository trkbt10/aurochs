/**
 * @file Main SVG renderer for Figma nodes
 */

import type { FigNode, FigNodeType } from "@oxen/fig/types";
import type { FigBlob, FigImage } from "@oxen/fig/parser";
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
import { renderTextNodeFromDerivedData, hasDerivedPathData, type DerivedPathRenderContext } from "./nodes/text/derived-path-render";
import { cloneSymbolChildren, getInstanceSymbolID, getInstanceSymbolOverrides, resolveSymbolGuidStr, type FigDerivedSymbolData } from "../symbols/symbol-resolver";
import { preResolveSymbols } from "../symbols/symbol-pre-resolver";
import type { FontLoader } from "../font";

// =============================================================================
// Transform Normalization
// =============================================================================

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
    { minX: Infinity, minY: Infinity }
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
  /** Pre-resolved SYMBOL cache (GUID string -> resolved FigNode with expanded children) */
  readonly resolvedSymbolCache?: ReadonlyMap<string, FigNode>;
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
  options?: FigSvgRenderOptions
): Promise<FigSvgRenderResult> {
  const width = options?.width ?? 800;
  const height = options?.height ?? 600;

  const warnings: string[] = [];

  // Pre-resolve SYMBOLs if symbolMap is provided
  const resolvedSymbolCache =
    options?.resolvedSymbolCache ??
    (options?.symbolMap ? preResolveSymbols(options.symbolMap, { warnings }) : undefined);

  const ctx = createFigSvgRenderContext({
    canvasSize: { width, height },
    blobs: options?.blobs ?? [],
    images: options?.images ?? new Map(),
    showHiddenNodes: options?.showHiddenNodes,
    symbolMap: options?.symbolMap,
    resolvedSymbolCache,
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
      })
    );
  }

  content.push(...renderedNodes);

  const svgOutput = svg(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    ...content
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
 * Resolve children for INSTANCE nodes that reference a SYMBOL
 */
function resolveInstanceChildren(
  node: FigNode,
  nodeType: string,
  ctx: FigSvgRenderContext,
  warnings: string[]
): readonly FigNode[] {
  if (nodeType !== "INSTANCE") {
    return node.children ?? [];
  }

  // Symbol-resolver functions accept Record<string, unknown> (symbols/ is a separate concern)
  const nodeRecord = node as Record<string, unknown>;

  // Extract symbolID — handles both nested (symbolData.symbolID) and top-level (symbolID) formats
  const symbolID = getInstanceSymbolID(nodeRecord);
  if (!symbolID) {
    return node.children ?? [];
  }

  if (!ctx.symbolMap) {
    const warning =
      "Symbol map missing: INSTANCE nodes will not be resolved (pass symbolMap from buildNodeTree).";
    if (!warnings.includes(warning)) {
      warnings.push(warning);
    }
    return node.children ?? [];
  }

  // Resolve SYMBOL with localID fallback (handles sessionID mismatch in builder files)
  const resolved = resolveSymbolGuidStr(symbolID, ctx.symbolMap);
  if (!resolved) {
    const symbolIdStr = `${symbolID.sessionID}:${symbolID.localID}`;
    warnings.push(
      `Could not resolve SYMBOL for INSTANCE "${node.name ?? "unnamed"}" (symbolID: ${symbolIdStr})`
    );
    return node.children ?? [];
  }

  // Try pre-resolved cache first, then use the resolved node directly
  const symbolNode = ctx.resolvedSymbolCache?.get(resolved.guidStr) ?? resolved.node;

  // Get overrides and derivedSymbolData for transform overrides
  const symbolOverrides = getInstanceSymbolOverrides(nodeRecord);
  const derivedSymbolData = nodeRecord.derivedSymbolData as FigDerivedSymbolData | undefined;

  // Clone SYMBOL children with overrides applied
  return cloneSymbolChildren(symbolNode, {
    symbolOverrides,
    derivedSymbolData,
  });
}

/**
 * Render a single Figma node to SVG
 *
 * @param node - The Figma node to render
 * @param ctx - Render context
 * @param warnings - Array to collect warnings
 * @returns SVG string for the node
 */
async function renderNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  warnings: string[]
): Promise<SvgString> {
  const nodeType = getNodeType(node);

  if (node.visible === false && !ctx.showHiddenNodes) {
    return EMPTY_SVG;
  }

  const resolvedChildren = resolveInstanceChildren(node, nodeType, ctx, warnings);
  const renderedChildren = await renderChildrenWithMasks(resolvedChildren, ctx, warnings);

  switch (nodeType) {
    case "DOCUMENT":
      return g({}, ...renderedChildren);

    case "CANVAS":
      return g({}, ...renderedChildren);

    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
    case "SYMBOL":
      return renderFrameNode(node, ctx, renderedChildren);

    case "GROUP":
    case "BOOLEAN_OPERATION":
      return renderGroupNode(node, ctx, renderedChildren);

    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return renderRectangleNode(node, ctx);

    case "ELLIPSE":
      return renderEllipseNode(node, ctx);

    case "VECTOR":
    case "LINE":
    case "STAR":
    case "REGULAR_POLYGON":
      return renderVectorNode(node, ctx);

    case "TEXT":
      // Prefer derived path rendering (exact match with Figma export)
      if (hasDerivedPathData(node)) {
        const derivedCtx: DerivedPathRenderContext = {
          ...ctx,
          blobs: ctx.blobs,
        };
        return renderTextNodeFromDerivedData(node, derivedCtx);
      }
      // Fallback to opentype.js path rendering if fontLoader is available
      if (ctx.fontLoader) {
        const pathCtx: PathRenderContext = {
          ...ctx,
          fontLoader: ctx.fontLoader,
        };
        return renderTextNodeAsPath(node, pathCtx);
      }
      return renderTextNode(node, ctx);

    default:
      if (renderedChildren.length > 0) {
        return g({}, ...renderedChildren);
      }
      warnings.push(`Unknown node type: ${nodeType}`);
      return EMPTY_SVG;
  }
}

/**
 * Get the node type from a Figma node
 */
function getNodeType(node: FigNode): FigNodeType | string {
  const type = node.type;

  if (!type) {
    return "UNKNOWN";
  }

  // KiwiEnumValue: { value: number; name: string }
  if (typeof type === "object" && "name" in type) {
    return type.name;
  }

  return "UNKNOWN";
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
  warnings: string[]
): Promise<readonly SvgString[]> {
  const result: SvgString[] = [];
  let currentMaskId: string | null = null;
  let maskedContent: SvgString[] = [];

  for (const child of children) {
    if (child.visible === false && !ctx.showHiddenNodes) {
      continue;
    }

    if (isMaskNode(child)) {
      // Flush existing masked content
      if (currentMaskId && maskedContent.length > 0) {
        result.push(g({ mask: `url(#${currentMaskId})` }, ...maskedContent));
        maskedContent = [];
      }

      const maskContent = await renderNode(child, ctx, warnings);
      if (maskContent !== EMPTY_SVG) {
        const maskId = ctx.defs.generateId("mask");
        const maskDef = mask(
          { id: maskId, style: "mask-type:luminance" },
          g({ fill: "white" }, maskContent)
        );
        ctx.defs.add(maskDef);
        currentMaskId = maskId;
      }
    } else {
      const rendered = await renderNode(child, ctx, warnings);
      if (rendered !== EMPTY_SVG) {
        if (currentMaskId) {
          maskedContent.push(rendered);
        } else {
          result.push(rendered);
        }
      }
    }
  }

  // Final flush
  if (currentMaskId && maskedContent.length > 0) {
    result.push(g({ mask: `url(#${currentMaskId})` }, ...maskedContent));
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
  defaultHeight: number
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
    { width: defaultWidth, height: defaultHeight }
  );

  return bounds;
}

/**
 * Render a single canvas (page) from Figma nodes
 */
export async function renderCanvas(
  canvasNode: Pick<FigNode, "children">,
  options?: FigSvgRenderOptions
): Promise<FigSvgRenderResult> {
  const children = canvasNode.children ?? [];

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
