/**
 * @file Main SVG renderer for Figma nodes
 */

import type { FigNode, FigNodeType } from "@aurochs/fig/types";
import type { FigBlob, FigImage } from "@aurochs/fig/parser";
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
import { getEffectiveSymbolID } from "@aurochs/fig/symbols";
import {
  cloneSymbolChildren,
  collectComponentPropAssignments,
  getInstanceSymbolOverrides,
  resolveSymbolGuidStr,
  type FigDerivedSymbolData,
} from "../symbols/symbol-resolver";
import { preResolveSymbols } from "../symbols/symbol-pre-resolver";
import { resolveInstanceLayout } from "../symbols/constraints";
import { buildGuidTranslationMap, translateOverrides } from "../symbols/guid-translation";
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
  options?: FigSvgRenderOptions,
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
type InstanceResolution = {
  /** The node to render (may have SYMBOL properties merged in) */
  readonly node: FigNode;
  /** Resolved children (cloned from SYMBOL) */
  readonly children: readonly FigNode[];
};

/**
 * Merge SYMBOL style properties into INSTANCE node.
 *
 * SYMBOL properties always take precedence for visual/style attributes.
 * In Figma's .fig format, INSTANCE nodes inherit all visual properties
 * from their referenced SYMBOL — direct property overrides on the
 * INSTANCE node itself (e.g. fillPaints, size) are ignored.
 * Instance-specific overrides go through symbolOverrides/derivedSymbolData,
 * which are applied separately via cloneSymbolChildren.
 */
function mergeSymbolProperties(instanceNode: FigNode, symbolNode: FigNode): FigNode {
  const merged: Record<string, unknown> = { ...instanceNode };

  // SYMBOL's visual properties always override INSTANCE-level values.
  // fillPaints (background)
  if (symbolNode.fillPaints) {
    merged.fillPaints = symbolNode.fillPaints;
  }
  // strokePaints
  if (symbolNode.strokePaints) {
    merged.strokePaints = symbolNode.strokePaints;
  }
  // strokeWeight
  if (symbolNode.strokeWeight !== undefined) {
    merged.strokeWeight = symbolNode.strokeWeight;
  }
  // cornerRadius
  if (symbolNode.cornerRadius !== undefined) {
    merged.cornerRadius = symbolNode.cornerRadius;
  }
  // rectangleCornerRadii
  if (symbolNode.rectangleCornerRadii) {
    merged.rectangleCornerRadii = symbolNode.rectangleCornerRadii;
  }
  // fillGeometry / strokeGeometry: only copy from SYMBOL if sizes match.
  // These contain pre-baked paths for the SYMBOL's specific dimensions.
  // When the INSTANCE is resized, using SYMBOL geometry produces wrong-sized shapes.
  // The frame renderer falls back to generating rect from size + cornerRadius.
  const instSize = instanceNode.size;
  const symSize = symbolNode.size;
  const sameSize = instSize && symSize && instSize.x === symSize.x && instSize.y === symSize.y;
  if (symbolNode.fillGeometry && sameSize) {
    merged.fillGeometry = symbolNode.fillGeometry;
  }
  if (symbolNode.strokeGeometry && sameSize) {
    merged.strokeGeometry = symbolNode.strokeGeometry;
  }
  // clipsContent / frameMaskDisabled
  // Respect INSTANCE-level overrides: if the INSTANCE has its own explicit
  // frameMaskDisabled (different from SYMBOL's), it's an intentional per-instance
  // clip override and should be preserved.
  const instanceHasOwnClip = instanceNode.frameMaskDisabled !== undefined || instanceNode.clipsContent !== undefined;
  if (!instanceHasOwnClip) {
    if (symbolNode.frameMaskDisabled !== undefined) {
      merged.frameMaskDisabled = symbolNode.frameMaskDisabled;
    } else if (symbolNode.clipsContent !== undefined) {
      merged.clipsContent = symbolNode.clipsContent;
    } else {
      // SYMBOL/COMPONENT/FRAME clip content by default in Figma.
      // Set explicitly so the INSTANCE node doesn't fall through to
      // resolveClipsContent()'s INSTANCE default (false).
      merged.frameMaskDisabled = false;
    }
  }
  // effects
  if (symbolNode.effects) {
    merged.effects = symbolNode.effects;
  }
  // size — INSTANCE renders at SYMBOL's frame size
  if (symbolNode.size) {
    merged.size = symbolNode.size;
  }
  // opacity — INSTANCE-level opacity is not applied in .fig import
  merged.opacity = symbolNode.opacity;

  return merged as FigNode;
}

/**
 * Resolve children and inherited properties for INSTANCE nodes
 */
function resolveInstance(
  node: FigNode,
  nodeType: string,
  ctx: FigSvgRenderContext,
  warnings: string[],
): InstanceResolution {
  if (nodeType !== "INSTANCE") {
    return { node, children: node.children ?? [] };
  }

  const nodeRecord = node as Record<string, unknown>;

  // Unified effective symbol ID (handles overriddenSymbolID for variant switching)
  const effectiveID = getEffectiveSymbolID(nodeRecord);
  if (!effectiveID) {
    return { node, children: node.children ?? [] };
  }

  if (!ctx.symbolMap) {
    const warning = "Symbol map missing: INSTANCE nodes will not be resolved (pass symbolMap from buildNodeTree).";
    if (!warnings.includes(warning)) {
      warnings.push(warning);
    }
    return { node, children: node.children ?? [] };
  }

  // Resolve SYMBOL/COMPONENT with localID fallback (handles sessionID mismatch in builder files)
  const resolved = resolveSymbolGuidStr(effectiveID, ctx.symbolMap);
  if (!resolved) {
    const idStr = `${effectiveID.sessionID}:${effectiveID.localID}`;
    warnings.push(`Could not resolve SYMBOL for INSTANCE "${node.name ?? "unnamed"}" (symbolID: ${idStr})`);
    return { node, children: node.children ?? [] };
  }

  // Try pre-resolved cache first, then use the resolved node directly
  const symNode = ctx.resolvedSymbolCache?.get(resolved.guidStr) ?? resolved.node;
  // Use original SYMBOL (not pre-resolved) for GUID translation to avoid offset
  // distortion from expanded INSTANCE children in the descendant set
  const originalSymNode = resolved.node;

  // Merge SYMBOL properties into INSTANCE (inherit fill, stroke, etc.)
  const mergedNode = mergeSymbolProperties(node, symNode);

  // Get overrides and derivedSymbolData for transform overrides
  const rawSymbolOverrides = getInstanceSymbolOverrides(nodeRecord);
  const rawDerivedSymbolData = nodeRecord.derivedSymbolData as FigDerivedSymbolData | undefined;

  // Translate override GUIDs to match SYMBOL descendant GUIDs
  const translationMap = buildGuidTranslationMap(
    originalSymNode.children ?? [],
    rawDerivedSymbolData,
    rawSymbolOverrides,
  );
  const symbolOverrides =
    translationMap.size > 0 && rawSymbolOverrides
      ? translateOverrides(rawSymbolOverrides, translationMap)
      : rawSymbolOverrides;
  const derivedSymbolData =
    translationMap.size > 0 && rawDerivedSymbolData
      ? (translateOverrides(rawDerivedSymbolData, translationMap) as FigDerivedSymbolData)
      : rawDerivedSymbolData;

  // Collect component property assignments for text overrides etc.
  const componentPropAssignments = collectComponentPropAssignments(nodeRecord);

  // Clone SYMBOL children with overrides applied
  const children = cloneSymbolChildren(symNode, {
    symbolOverrides,
    derivedSymbolData,
    componentPropAssignments: componentPropAssignments.length > 0 ? componentPropAssignments : undefined,
  });

  // Layout resolution: adjust child positions/sizes when instance is resized
  const instanceSize = node.size;
  const symbolSize = symNode.size;
  const isResized = instanceSize && symbolSize && (instanceSize.x !== symbolSize.x || instanceSize.y !== symbolSize.y);

  let resolvedChildren = children;
  if (isResized) {
    const layout = resolveInstanceLayout(children, symbolSize!, instanceSize!, derivedSymbolData);
    resolvedChildren = layout.children;
    if (layout.sizeApplied) {
      (mergedNode as Record<string, unknown>).size = instanceSize;
    }
  }

  return { node: mergedNode, children: resolvedChildren };
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
  if (!name) return undefined;
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
  const resolution = resolveInstance(node, nodeType, ctx, warnings);
  const resolvedNode = resolution.node;
  const resolvedChildren = resolution.children;
  const renderedChildren = await renderChildrenWithMasks(resolvedChildren, ctx, warnings);

  let content: SvgString;
  switch (nodeType) {
    case "DOCUMENT":
      content = g({}, ...renderedChildren);
      break;

    case "CANVAS":
      content = g({}, ...renderedChildren);
      break;

    case "FRAME":
    case "SECTION":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
    case "SYMBOL":
      content = renderFrameNode(resolvedNode, ctx, renderedChildren);
      break;

    case "GROUP":
    case "BOOLEAN_OPERATION":
      content = renderGroupNode(node, ctx, renderedChildren);
      break;

    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      content = renderRectangleNode(node, ctx);
      break;

    case "ELLIPSE":
      content = renderEllipseNode(node, ctx);
      break;

    case "VECTOR":
    case "LINE":
    case "STAR":
    case "REGULAR_POLYGON":
      content = renderVectorNode(node, ctx);
      break;

    case "TEXT":
      // Prefer derived path rendering (exact match with Figma export)
      if (hasDerivedPathData(node)) {
        const derivedCtx: DerivedPathRenderContext = {
          ...ctx,
          blobs: ctx.blobs,
        };
        content = renderTextNodeFromDerivedData(node, derivedCtx);
        break;
      }
      // Fallback to opentype.js path rendering if fontLoader is available
      if (ctx.fontLoader) {
        const pathCtx: PathRenderContext = {
          ...ctx,
          fontLoader: ctx.fontLoader,
        };
        content = renderTextNodeAsPath(node, pathCtx);
        break;
      }
      content = renderTextNode(node, ctx);
      break;

    default:
      if (renderedChildren.length > 0) {
        content = g({}, ...renderedChildren);
        break;
      }
      warnings.push(`Unknown node type: ${nodeType}`);
      content = EMPTY_SVG;
      break;
  }

  // Apply node-level blend mode as CSS mix-blend-mode
  const blendModeCss = getBlendModeCss(node);
  if (blendModeCss) {
    return g({ style: `mix-blend-mode:${blendModeCss}` }, content);
  }
  return content;
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
  warnings: string[],
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
        const maskDef = mask({ id: maskId, style: "mask-type:luminance" }, g({ fill: "white" }, maskContent));
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
