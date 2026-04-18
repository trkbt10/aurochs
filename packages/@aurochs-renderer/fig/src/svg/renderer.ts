/**
 * @file Main SVG renderer for Figma nodes
 *
 * This is the SSoT entry point for rendering `FigNode` trees to SVG.
 * It routes through the unified pipeline used by all backends:
 *
 *   FigNode[] → convertFigNode → FigDesignNode[]
 *             → buildSceneGraph → SceneGraph
 *             → resolveRenderTree → RenderTree
 *             → formatRenderTreeToSvg → SVG string
 *
 * The RenderTree is the format-agnostic intermediate representation shared
 * with the React and WebGL backends. Having one pipeline means any change
 * to rendering semantics (effects, masks, strokes, gradients, etc.) is made
 * in a single place (`scene-graph/render-tree/resolve.ts`) and all backends
 * inherit it.
 *
 * ## Input contract
 *
 * `renderFigToSvg` requires the caller to supply canvas dimensions and a
 * full set of source assets (blobs, images, and — when INSTANCE nodes are
 * present — the raw `symbolMap`). There are no implicit defaults: a missing
 * `blobs` array is not the same as "empty blobs", and a missing canvas size
 * is not `800x600`. If you don't have these, use `renderCanvas` (which
 * derives the size from the canvas children) or compute them explicitly.
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigBlob, FigImage } from "@aurochs/fig/parser";
import type { FigSvgRenderResult } from "../types";
import type { SvgString } from "./primitives";
import type { FontLoader } from "../font";
import type { FigDesignNode, FigStyleRegistry } from "@aurochs/fig/domain";
import { EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import { buildFigStyleRegistry } from "@aurochs/fig/symbols";
import { convertFigNode } from "@aurochs-builder/fig/context";
import { buildSceneGraph } from "../scene-graph/builder";
import { resolveRenderTree } from "../scene-graph/render-tree";
import { formatRenderTreeToSvg } from "./scene-renderer";

// =============================================================================
// Transform Normalization
// =============================================================================

/**
 * Get the minimum (x, y) of all root node translations.
 *
 * `?? 0` on m02/m12 reflects the Kiwi binary schema: an omitted translation
 * field encodes the value 0 (the identity translation). This is a schema
 * invariant, not a runtime fallback.
 */
function getRootFrameOffset(nodes: readonly FigNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

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
 * Normalize a FigDesignNode's transform by removing the root offset.
 */
function normalizeDesignNodeTransform(node: FigDesignNode, offset: { x: number; y: number }): FigDesignNode {
  if (offset.x === 0 && offset.y === 0) {
    return node;
  }
  return {
    ...node,
    transform: {
      ...node.transform,
      m02: node.transform.m02 - offset.x,
      m12: node.transform.m12 - offset.y,
    },
  };
}

// =============================================================================
// Render Options
// =============================================================================

/**
 * Required inputs for rendering Figma nodes to SVG.
 *
 * Every field here represents information that cannot be invented by the
 * renderer — the caller must supply it or the render is undefined.
 */
export type FigSvgRenderOptions = {
  /** Canvas width in SVG user units. */
  readonly width: number;
  /** Canvas height in SVG user units. */
  readonly height: number;
  /** Binary blobs from the parsed .fig file (required for path geometry). */
  readonly blobs: readonly FigBlob[];
  /** Image map from the parsed .fig file (required for IMAGE paints). */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Optional background color (CSS color string). */
  readonly backgroundColor?: string;
  /** Translate roots so the top-left is at (0, 0). */
  readonly normalizeRootTransform?: boolean;
  /** Include nodes with `visible: false` (for style inspection views). */
  readonly showHiddenNodes?: boolean;
  /** Raw symbolMap from `buildNodeTree` (required for INSTANCE resolution). */
  readonly symbolMap?: ReadonlyMap<string, FigNode>;
  /**
   * Font loader for path-based text rendering. Not yet threaded through the
   * RenderTree pipeline — see Task #5 of the SSoT migration.
   */
  readonly fontLoader?: FontLoader;
};

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Convert every entry of a FigNode symbolMap to a FigDesignNode, using the
 * same styleRegistry so symbols and instance roots resolve their fills/
 * strokes through the identical registry path. All entries must be converted
 * (not only the directly referenced ones) because nested INSTANCE resolution
 * in `buildSceneGraph` walks the converted map; any entry missed here would
 * surface as an "INSTANCE symbol not found" warning.
 */
function convertSymbolMap(
  symbolMap: ReadonlyMap<string, FigNode>,
  components: Map<string, FigDesignNode>,
  styleRegistry: FigStyleRegistry,
  blobs: readonly FigBlob[] | undefined,
): ReadonlyMap<string, FigDesignNode> {
  const out = new Map<string, FigDesignNode>();
  for (const [key, node] of symbolMap) {
    // Pass the raw symbolMap so per-node INSTANCE override GUIDs are
    // translated into the SYMBOL-descendant namespace during conversion.
    // Without this, nested INSTANCE overrides inside SYMBOL definitions
    // (rare but present) silently drop their overrides.
    // `blobs` enables fillGeometry-based size disambiguation during
    // GUID translation (multi-avatar sibling case).
    out.set(key, convertFigNode(node, components, styleRegistry, symbolMap, blobs));
  }
  return out;
}

/**
 * Render Figma nodes to SVG.
 */
export async function renderFigToSvg(
  nodes: readonly FigNode[],
  options: FigSvgRenderOptions,
): Promise<FigSvgRenderResult> {
  const { width, height, blobs, images } = options;
  const warnings: string[] = [];

  // Build style registry from the raw FigNode symbolMap BEFORE domain
  // conversion. The registry resolves styleIdForFill/styleIdForStrokeFill
  // references to authoritative paints during convertFigNode, and is also
  // passed to buildSceneGraph for per-path vector style overrides.
  const rawSymbolMap = options.symbolMap;
  const styleRegistry: FigStyleRegistry = rawSymbolMap
    ? buildFigStyleRegistry(rawSymbolMap)
    : EMPTY_FIG_STYLE_REGISTRY;

  // Convert all parser nodes (including symbol definitions) into domain
  // objects. `components` is populated as a side-effect by convertFigNode
  // whenever it encounters a COMPONENT/COMPONENT_SET/SYMBOL.
  const components = new Map<string, FigDesignNode>();
  const designSymbolMap = rawSymbolMap
    ? convertSymbolMap(rawSymbolMap, components, styleRegistry, blobs)
    : new Map<string, FigDesignNode>();

  const designNodes: FigDesignNode[] = nodes.map((n) => convertFigNode(n, components, styleRegistry, rawSymbolMap, blobs));

  // Merge symbol definitions discovered while converting root nodes with
  // those that came via the symbolMap option. Later entries (from the
  // explicit symbolMap) win — they are the authoritative ones.
  const mergedSymbolMap = new Map<string, FigDesignNode>(components);
  for (const [key, node] of designSymbolMap) {
    mergedSymbolMap.set(key, node);
  }

  // Optional root transform normalization. Offsets are computed from the
  // raw FigNode transforms (pre-conversion); apply the same offset to each
  // corresponding converted FigDesignNode. Both arrays are in the same
  // order because `designNodes` is produced by `nodes.map(convertFigNode)`.
  const normalizedNodes = options.normalizeRootTransform
    ? (() => {
      const offset = getRootFrameOffset(nodes);
      return designNodes.map((n) => normalizeDesignNodeTransform(n, offset));
    })()
    : designNodes;

  const sceneGraph = buildSceneGraph(normalizedNodes, {
    blobs,
    images,
    canvasSize: { width, height },
    symbolMap: mergedSymbolMap,
    // The raw (Kiwi) symbolMap is needed so the scene-graph builder
    // can recompute buildGuidTranslationMap for nested INSTANCE
    // children. Without it, multi-level override paths silently fail
    // (see Close Button xmark regression analysis in
    // scene-graph/builder.ts::applyDerivedSymbolData).
    rawSymbolMap: rawSymbolMap ?? new Map(),
    showHiddenNodes: options.showHiddenNodes === true,
    styleRegistry,
    warnings,
  });

  const renderTree = resolveRenderTree(sceneGraph);
  const svgOutput: SvgString = formatRenderTreeToSvg(renderTree, {
    backgroundColor: options.backgroundColor,
  });

  return {
    svg: svgOutput,
    warnings,
  };
}

// =============================================================================
// Canvas Convenience Wrapper
// =============================================================================

/**
 * Options for `renderCanvas`. Width/height are derived from the canvas
 * children unless overridden, and root transforms are always normalized to
 * (0, 0) — that behaviour is the defining characteristic of a "canvas"
 * render and is not optional. Callers that need absolute-coordinate output
 * must use `renderFigToSvg` directly.
 */
export type FigCanvasRenderOptions = Omit<FigSvgRenderOptions, "width" | "height" | "normalizeRootTransform"> & {
  /** Override the derived canvas width. */
  readonly width?: number;
  /** Override the derived canvas height. */
  readonly height?: number;
};

/**
 * Compute canvas bounds from the extent of its children. Throws when no
 * child has a transform + size — an unmeasurable canvas has no default we
 * can safely invent.
 */
function calculateCanvasBounds(children: readonly FigNode[]): { width: number; height: number } {
  const bounds = children.reduce(
    (acc, child) => {
      const { transform, size } = child;
      if (transform && size) {
        // m02/m12/x/y can be omitted in the Kiwi binary schema, which the
        // schema defines as 0 — treat them as such when computing extent.
        const right = (transform.m02 ?? 0) + (size.x ?? 0);
        const bottom = (transform.m12 ?? 0) + (size.y ?? 0);
        return {
          width: Math.max(acc.width, right),
          height: Math.max(acc.height, bottom),
          measured: true,
        };
      }
      return acc;
    },
    { width: 0, height: 0, measured: false },
  );

  if (!bounds.measured) {
    throw new Error(
      "renderCanvas: cannot derive canvas size — no child has both `transform` and `size`. Pass explicit `width`/`height`.",
    );
  }
  return { width: bounds.width, height: bounds.height };
}

/**
 * Render a single canvas (page) from Figma nodes. Width/height are derived
 * from the extent of the canvas children unless overridden. The root
 * transforms are normalized to (0, 0) by default since canvas rendering
 * typically targets a self-contained viewport.
 */
export async function renderCanvas(
  canvasNode: Pick<FigNode, "children">,
  options: FigCanvasRenderOptions,
): Promise<FigSvgRenderResult> {
  // `.children` is optional in the parser type (kiwi-level "no value"); an
  // absent array is semantically an empty canvas, not an error.
  const children = canvasNode.children?.filter((c): c is FigNode => c != null) ?? [];

  const explicitW = options.width;
  const explicitH = options.height;

  let width: number;
  let height: number;
  if (explicitW !== undefined && explicitH !== undefined) {
    width = explicitW;
    height = explicitH;
  } else {
    const bounds = calculateCanvasBounds(children);
    width = explicitW ?? bounds.width;
    height = explicitH ?? bounds.height;
  }

  return renderFigToSvg(children, {
    ...options,
    width,
    height,
    // Canvas rendering always normalizes root transforms to (0, 0). This
    // is the defining characteristic of the `renderCanvas` entry point —
    // see the FigCanvasRenderOptions docstring. Callers that need absolute
    // coordinates must use `renderFigToSvg` directly.
    normalizeRootTransform: true,
  });
}
