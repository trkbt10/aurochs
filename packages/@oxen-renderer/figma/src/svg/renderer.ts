/**
 * @file Main SVG renderer for Figma nodes
 */

import type { FigNode, FigNodeType, FigMatrix } from "@oxen/fig/types";
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
      const nodeData = node as Record<string, unknown>;
      const transform = nodeData.transform as FigMatrix | undefined;
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

  const nodeData = node as Record<string, unknown>;
  const transform = nodeData.transform as FigMatrix | undefined;

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
 * @param nodes - Array of Figma nodes to render
 * @param options - Render options
 * @returns SVG render result with warnings
 */
export function renderFigToSvg(
  nodes: readonly FigNode[],
  options?: FigSvgRenderOptions
): FigSvgRenderResult {
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

  // Normalize root transforms if requested
  const nodesToRender = getNodesToRender(nodes, options?.normalizeRootTransform);

  // Render all nodes
  const renderedNodes = nodesToRender.map((node) => {
    try {
      return renderNode(node, ctx, warnings);
    } catch (error) {
      warnings.push(`Failed to render node "${node.name ?? "unknown"}": ${error}`);
      return EMPTY_SVG;
    }
  });

  // Build final SVG
  const content: SvgString[] = [];

  // Add defs if any
  if (ctx.defs.hasAny()) {
    content.push(defs(...(ctx.defs.getAll() as SvgString[])));
  }

  // Add background if specified
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

  // Add rendered nodes
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

/**
 * Check if a node is a mask layer
 */
function isMaskNode(node: FigNode): boolean {
  const nodeData = node as Record<string, unknown>;
  return nodeData.mask === true;
}

/**
 * State for mask processing
 */
type MaskState = {
  readonly result: SvgString[];
  readonly currentMaskId: string | null;
  readonly maskedContent: SvgString[];
};

/**
 * Flush masked content to result
 */
function flushMaskedContent(state: MaskState): MaskState {
  if (state.currentMaskId && state.maskedContent.length > 0) {
    return {
      result: [...state.result, g({ mask: `url(#${state.currentMaskId})` }, ...state.maskedContent)],
      currentMaskId: state.currentMaskId,
      maskedContent: [],
    };
  }
  return state;
}

type ProcessNodeParams = {
  readonly child: FigNode;
  readonly state: MaskState;
  readonly ctx: FigSvgRenderContext;
  readonly warnings: string[];
};

/**
 * Process a mask node
 */
function processMaskNode(params: ProcessNodeParams): MaskState {
  const { child, state, ctx, warnings } = params;
  const flushed = flushMaskedContent(state);
  const maskContent = renderNode(child, ctx, warnings);

  if (maskContent !== EMPTY_SVG) {
    const maskId = ctx.defs.generateId("mask");
    const maskDef = mask(
      { id: maskId, style: "mask-type:luminance" },
      g({ fill: "white" }, maskContent)
    );
    ctx.defs.add(maskDef);
    return { ...flushed, currentMaskId: maskId, maskedContent: [] };
  }
  return flushed;
}

/**
 * Process a regular (non-mask) node
 */
function processRegularNode(params: ProcessNodeParams): MaskState {
  const { child, state, ctx, warnings } = params;
  const rendered = renderNode(child, ctx, warnings);
  if (rendered === EMPTY_SVG) {
    return state;
  }
  if (state.currentMaskId) {
    return { ...state, maskedContent: [...state.maskedContent, rendered] };
  }
  return { ...state, result: [...state.result, rendered] };
}

/**
 * Process children with mask support
 *
 * When a child has mask: true, it becomes a mask for subsequent siblings.
 * The mask node itself is not rendered as visible content.
 */
function renderChildrenWithMasks(
  children: readonly FigNode[],
  ctx: FigSvgRenderContext,
  warnings: string[]
): readonly SvgString[] {
  const initialState: MaskState = { result: [], currentMaskId: null, maskedContent: [] };

  const finalState = children.reduce((state, child) => {
    const nodeData = child as Record<string, unknown>;
    if (nodeData.visible === false && !ctx.showHiddenNodes) {
      return state;
    }
    const params: ProcessNodeParams = { child, state, ctx, warnings };
    if (isMaskNode(child)) {
      return processMaskNode(params);
    }
    return processRegularNode(params);
  }, initialState);

  const flushed = flushMaskedContent(finalState);
  return flushed.result;
}

/**
 * Resolve children for INSTANCE nodes that reference a SYMBOL
 *
 * @param node - The node being rendered
 * @param nodeType - The node's type string
 * @param nodeData - The node data as a record
 * @param ctx - Render context with symbolMap and resolvedSymbolCache
 * @param warnings - Array to collect warnings
 * @returns Resolved children (from SYMBOL if INSTANCE, otherwise original)
 */
function resolveInstanceChildren(
  node: FigNode,
  nodeType: string,
  nodeData: Record<string, unknown>,
  ctx: FigSvgRenderContext,
  warnings: string[]
): readonly FigNode[] {
  if (nodeType !== "INSTANCE") {
    return node.children ?? [];
  }

  // Extract symbolID — handles both nested (symbolData.symbolID) and top-level (symbolID) formats
  const symbolID = getInstanceSymbolID(nodeData);
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
  const symbolOverrides = getInstanceSymbolOverrides(nodeData);
  const derivedSymbolData = nodeData.derivedSymbolData as FigDerivedSymbolData | undefined;

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
function renderNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  warnings: string[]
): SvgString {
  const nodeType = getNodeType(node);

  // Check visibility (skip if showHiddenNodes is enabled)
  const nodeData = node as Record<string, unknown>;
  if (nodeData.visible === false && !ctx.showHiddenNodes) {
    return EMPTY_SVG;
  }

  // Get children, resolving SYMBOL for INSTANCE nodes without direct children
  const resolvedChildren = resolveInstanceChildren(node, nodeType, nodeData, ctx, warnings);

  // Render children with mask support for container nodes
  const renderedChildren = renderChildrenWithMasks(resolvedChildren, ctx, warnings);

  switch (nodeType) {
    case "DOCUMENT":
      // Document is just a container
      return g({}, ...renderedChildren);

    case "CANVAS":
      // Canvas (page) is just a container
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
      return renderTextNode(node, ctx);

    default:
      // Unknown node type - render children if any
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
  // Type can be a string or an enum object with value/name
  const nodeData = node as Record<string, unknown>;
  const type = nodeData.type;

  if (typeof type === "string") {
    return type;
  }

  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }

  return "UNKNOWN";
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
      const childData = child as Record<string, unknown>;
      const transform = childData.transform as { m02?: number; m12?: number } | undefined;
      const size = childData.size as { x?: number; y?: number } | undefined;

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
export function renderCanvas(
  canvasNode: FigNode,
  options?: FigSvgRenderOptions
): FigSvgRenderResult {
  const children = canvasNode.children ?? [];

  // Try to determine canvas bounds from children
  const defaultWidth = options?.width ?? 800;
  const defaultHeight = options?.height ?? 600;
  const bounds = calculateCanvasBounds(children, defaultWidth, defaultHeight);

  return renderFigToSvg(children, {
    ...options,
    width: options?.width ?? bounds.width,
    height: options?.height ?? bounds.height,
    // Normalize root transforms by default when rendering a canvas
    normalizeRootTransform: options?.normalizeRootTransform ?? true,
  });
}

// =============================================================================
// Async Rendering (with path-based text support)
// =============================================================================

/**
 * Render a single Figma node to SVG (async version for path-based text)
 */
async function renderNodeAsync(
  node: FigNode,
  ctx: FigSvgRenderContext,
  warnings: string[]
): Promise<SvgString> {
  const nodeType = getNodeType(node);

  const nodeData = node as Record<string, unknown>;
  if (nodeData.visible === false && !ctx.showHiddenNodes) {
    return EMPTY_SVG;
  }

  const resolvedChildren = resolveInstanceChildren(node, nodeType, nodeData, ctx, warnings);
  const renderedChildren = await renderChildrenWithMasksAsync(resolvedChildren, ctx, warnings);

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
 * Process children with mask support (async version)
 */
async function renderChildrenWithMasksAsync(
  children: readonly FigNode[],
  ctx: FigSvgRenderContext,
  warnings: string[]
): Promise<readonly SvgString[]> {
  const result: SvgString[] = [];
  let currentMaskId: string | null = null;
  let maskedContent: SvgString[] = [];

  for (const child of children) {
    const nodeData = child as Record<string, unknown>;
    if (nodeData.visible === false && !ctx.showHiddenNodes) {
      continue;
    }

    if (isMaskNode(child)) {
      // Flush existing masked content
      if (currentMaskId && maskedContent.length > 0) {
        result.push(g({ mask: `url(#${currentMaskId})` }, ...maskedContent));
        maskedContent = [];
      }

      const maskContent = await renderNodeAsync(child, ctx, warnings);
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
      const rendered = await renderNodeAsync(child, ctx, warnings);
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

/**
 * Render Figma nodes to SVG (async version with path-based text support)
 *
 * Use this version when fontLoader is provided for high-precision text rendering.
 */
export async function renderFigToSvgAsync(
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
      const rendered = await renderNodeAsync(node, ctx, warnings);
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

/**
 * Render a single canvas (page) from Figma nodes (async version)
 */
export async function renderCanvasAsync(
  canvasNode: FigNode,
  options?: FigSvgRenderOptions
): Promise<FigSvgRenderResult> {
  const children = canvasNode.children ?? [];

  const defaultWidth = options?.width ?? 800;
  const defaultHeight = options?.height ?? 600;
  const bounds = calculateCanvasBounds(children, defaultWidth, defaultHeight);

  return renderFigToSvgAsync(children, {
    ...options,
    width: options?.width ?? bounds.width,
    height: options?.height ?? bounds.height,
    normalizeRootTransform: options?.normalizeRootTransform ?? true,
  });
}
