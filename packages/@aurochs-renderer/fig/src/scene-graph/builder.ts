/**
 * @file Scene graph builder
 *
 * Converts a FigDesignNode tree (domain objects) to a format-agnostic scene graph.
 * The resulting scene graph can be consumed by both SVG and WebGL backends.
 *
 * This builder accepts FigDesignNode directly — no intermediate conversion
 * from the raw parser type (FigNode) is needed. This ensures the renderer
 * stays in sync with the domain model by construction.
 */

import type { FigDesignNode, SymbolOverride, MutableFigDesignNode, FigStyleRegistry } from "@aurochs/fig/domain";
import {
  isValidOverridePath,
  isSelfOverride,
  overridePathToIds,
  applyOverrideToNode,
} from "@aurochs/fig/domain";
import type { FigPaint, FigVectorPath } from "@aurochs/fig/types";
import { FIG_NODE_TYPE } from "@aurochs/fig/types";
import type { FigImage, FigBlob } from "@aurochs/fig/parser";
import { styleRefKeys } from "@aurochs/fig/symbols";
import { IDENTITY_MATRIX } from "@aurochs/fig/matrix";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractEffectsProps,
} from "./extract";
import type {
  SceneGraph,
  SceneNode,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  SceneNodeId,
  AffineMatrix,
} from "./types";
import { createNodeId } from "./types";
import { convertPaintsToFills } from "./convert/fill";
import { convertStrokeToSceneStroke } from "./convert/stroke";
import { convertEffectsToScene } from "./convert/effects";
import { decodeGeometryToContours, convertVectorPathsToContours, parseSvgPathD, type DecodedContour } from "./convert/path";
import { generateStarContour, generatePolygonContour, generateLineContour } from "./convert/shape-geometry";
import { extractUniformCornerRadius as sharedExtractUniformCornerRadius, resolveClipsContent as sharedResolveClipsContent } from "../geometry";
import { convertTextNode } from "./convert/text";
import type { Fill, PathContour, BlendMode, MaskNode, CornerRadius, ArcData } from "./types";
import { convertFigmaBlendMode } from "./convert/blend-mode";
import { resolveChildConstraints } from "@aurochs/fig/symbols";
import type { TextAutoResize } from "../text/layout/types";
import {
  pathFromPathData,
  pathToPathData,
  pathBoolean,
  FillRule,
  PathBooleanOperation,
} from "../../vendor/path-bool/index.js";

function convertBlendMode(node: FigDesignNode): BlendMode | undefined {
  return convertFigmaBlendMode(node.blendMode);
}

// =============================================================================
// Mask Detection
// =============================================================================

/**
 * Check if a FigDesignNode acts as a mask for subsequent siblings.
 * Figma's mask property is stored on the raw node data.
 */
function isMaskNode(node: FigDesignNode): boolean {
  return node.mask === true;
}

/** Select fill paints based on whether stroke geometry is being used */
function selectPaintsForFills(
  isStrokeGeometry: boolean,
  paints: { strokePaints: readonly FigPaint[] | undefined; fillPaints: readonly FigPaint[] | undefined },
  images: ReadonlyMap<string, FigImage>
): Fill[] {
  const source = isStrokeGeometry ? paints.strokePaints : paints.fillPaints;
  return convertPaintsToFills(source, images);
}

// =============================================================================
// Build Context
// =============================================================================

/**
 * Configuration for building a scene graph.
 *
 * symbolMap uses FigDesignNode (domain type) — symbol resolution operates
 * on domain objects, not raw parser types.
 */
/**
 * Configuration for `buildSceneGraph`. Every field is required: the builder
 * does not invent defaults. If an input is genuinely absent for a call
 * site (e.g. a tree without INSTANCE nodes needs no symbolMap), the caller
 * passes the explicit "empty" value (`new Map()`, `[]`, `EMPTY_FIG_STYLE_
 * REGISTRY`, `false`) so intent is visible at the call site and never
 * hidden inside the builder.
 */
export type BuildSceneGraphOptions = {
  /** Binary blobs from .fig file. Pass `[]` if the tree has no path data. */
  readonly blobs: readonly FigBlob[];
  /** Image lookup map. Pass `new Map()` if no IMAGE paints are present. */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Canvas size. */
  readonly canvasSize: { width: number; height: number };
  /** Symbol map for INSTANCE resolution. Pass `new Map()` when absent. */
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  /** Whether to include nodes with `visible: false`. */
  readonly showHiddenNodes: boolean;
  /**
   * Style registry for per-path style overrides (vectorData
   * styleOverrideTable → styleIdForFill/styleIdForStrokeFill resolution).
   * Pass `EMPTY_FIG_STYLE_REGISTRY` when the tree carries no shared styles.
   */
  readonly styleRegistry: FigStyleRegistry;
  /**
   * Mutable array for warnings emitted during construction (missing
   * INSTANCE symbols, unknown node types, etc.). Pass a fresh `[]` to
   * collect, or a shared array to aggregate across multiple builds.
   */
  readonly warnings: string[];
};

/**
 * Internal build context — pure-domain. The scene-graph builder does
 * not read raw FigNode, does not translate override guid paths, and
 * does not perform GUID translation. All such work is the
 * responsibility of the domain-convert layer
 * (`@aurochs-builder/fig/context`).
 */
type BuildContext = {
  readonly blobs: readonly FigBlob[];
  readonly images: ReadonlyMap<string, FigImage>;
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  readonly styleRegistry: FigStyleRegistry;
  readonly showHiddenNodes: boolean;
  readonly warnings: string[];
  nodeCounter: number;
};

// =============================================================================
// Node Type & ID helpers
// =============================================================================

/**
 * Get the node type name from a FigDesignNode.
 *
 * FigDesignNode.type is FigNodeType (a string literal from KiwiEnumValue name),
 * so this is a direct read — no enum unwrapping needed.
 */
function getNodeTypeName(node: FigDesignNode): string {
  // FigDesignNode.type is `FigNodeType`, a string-literal union produced by
  // `convertFigNode` during domain conversion. The KiwiEnumValue object
  // shape exists only at the parser level and never reaches this layer.
  return node.type;
}

/**
 * Generate a SceneNodeId from a FigDesignNode.
 *
 * FigDesignNode.id is a branded string "sessionID:localID",
 * which is already unique — use it directly as the SceneNodeId.
 */
function getNodeId(node: FigDesignNode, ctx: BuildContext): SceneNodeId {
  if (node.id) {
    return createNodeId(node.id);
  }
  return createNodeId(`node-${ctx.nodeCounter++}`);
}

// =============================================================================
// Transform Conversion
// =============================================================================

const IDENTITY: AffineMatrix = IDENTITY_MATRIX;

function convertTransform(
  matrix: { m00?: number; m01?: number; m02?: number; m10?: number; m11?: number; m12?: number } | undefined,
): AffineMatrix {
  if (!matrix) {return IDENTITY;}
  return {
    m00: matrix.m00 ?? 1,
    m01: matrix.m01 ?? 0,
    m02: matrix.m02 ?? 0,
    m10: matrix.m10 ?? 0,
    m11: matrix.m11 ?? 1,
    m12: matrix.m12 ?? 0,
  };
}

// =============================================================================
// Corner Radius & Clipping (delegates to shared SoT in geometry/)
// =============================================================================

/**
 * Extract corner radius, preserving per-corner radii when present.
 * Returns CornerRadius (number | [tl,tr,br,bl]) or undefined.
 */
function extractCornerRadius(node: FigDesignNode): CornerRadius | undefined {
  const radii = node.rectangleCornerRadii;
  if (radii && radii.length === 4) {
    // Build the tuple explicitly so TS keeps the literal 4-tuple type
    // without a cast. Each index is known to exist because
    // `radii.length === 4` narrows the array to a readonly[number, ...].
    const tl = radii[0];
    const tr = radii[1];
    const br = radii[2];
    const bl = radii[3];
    // All same → collapse to uniform
    if (tl === tr && tr === br && br === bl) {
      return tl || undefined;
    }
    const tuple: readonly [number, number, number, number] = [tl, tr, br, bl];
    return tuple;
  }
  return node.cornerRadius;
}

function resolveClipsContent(node: FigDesignNode): boolean {
  // clipsContent is pre-resolved at domain construction time
  // (tree-to-document.ts normalizes frameMaskDisabled → clipsContent).
  // Fallback to shared resolver only if domain didn't resolve it.
  if (node.clipsContent !== undefined) { return node.clipsContent; }
  return sharedResolveClipsContent(
    undefined,
    undefined,
    getNodeTypeName(node),
  );
}

// =============================================================================
// Instance Resolution
// =============================================================================

/**
 * Result of resolving an INSTANCE node against its SYMBOL/COMPONENT.
 *
 * `children` is a mutable tree of cloned nodes — every step in the
 * resolution pipeline (overrides, CPA, derived-symbol-data, constraint
 * reflow) mutates these clones. Exposing the mutable type on the
 * returned children lets the caller continue mutating (e.g. a nested
 * INSTANCE resolution can promote overrides into a child's dsd)
 * without re-casting at every use site.
 */
type ResolvedDesignInstance = {
  /** Effective node with visual properties merged from SYMBOL */
  readonly effectiveNode: FigDesignNode;
  /** Resolved children (from instance or inherited from symbol) */
  readonly children: readonly MutableFigDesignNode[];
};

/**
 * Check whether a paint array is declared (i.e. the Kiwi field was present
 * on the original node). An explicitly empty array still counts as
 * "declared" — the node author chose "no paint". An absent array means
 * "inherit from elsewhere" (e.g. SYMBOL). This matches the semantics of
 * `mergeSymbolProperties` in @aurochs/fig/symbols, which checks
 * `if (symbolNode.fillPaints)` — truthy only when declared.
 */
function hasPaintDeclaration(paints: readonly FigPaint[] | undefined): boolean {
  return paints !== undefined && paints.length > 0;
}


/**
 * Deep clone a FigDesignNode tree.
 *
 * Returns `MutableFigDesignNode` — every cloned node is intended to
 * be mutated by the override / CPA / dsd pipelines below. Returning
 * the readonly type would force every mutation site to re-cast
 * (`node as MutableFigDesignNode`), which both clutters the code and
 * hides the fact that clones exist precisely to be mutated. The input
 * stays readonly; only the output is declared mutable.
 */
function deepCloneDesignNode(node: FigDesignNode): MutableFigDesignNode {
  if (!node.children || node.children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: node.children.map(deepCloneDesignNode),
  };
}

/**
 * Find a descendant node by walking the override's guidPath through the tree.
 *
 * Each guid in the path targets one level deeper:
 *   guids[0] selects among the top-level children,
 *   guids[1] selects among that child's children, etc.
 *
 * Both the input and the return value are `MutableFigDesignNode`
 * because every caller either mutates the found node directly
 * (applyOverrideToNode / derivedSymbolData pipeline) or promotes the
 * entry into a mutable child's dsd array. Declaring the type as
 * mutable up-front removes every downstream `as MutableFigDesignNode`
 * cast — the type system now expresses that these functions operate
 * on a deep clone, not on a shared read-only tree.
 */
function findNodeByOverridePath(
  nodes: readonly MutableFigDesignNode[],
  override: SymbolOverride,
): MutableFigDesignNode | undefined {
  const ids = overridePathToIds(override);
  let current: readonly MutableFigDesignNode[] = nodes;
  let found: MutableFigDesignNode | undefined;

  for (const id of ids) {
    found = undefined;
    for (const node of current) {
      if (node.id === id) {
        found = node;
        break;
      }
    }
    if (!found) {
      found = findNodeById(current, id);
      if (!found) { return undefined; }
    }
    // `MutableFigDesignNode.children` is typed as
    // `readonly FigDesignNode[] | undefined` (the mapped type only
    // strips readonly from direct keys, not array element types).
    // We know the tree was produced by `deepCloneDesignNode`, so
    // every child is mutable too — assert via a helper rather than
    // casting at each use site.
    current = mutableChildren(found);
  }
  return found;
}

function mutableChildren(
  node: MutableFigDesignNode,
): readonly MutableFigDesignNode[] {
  const cs = node.children;
  if (!cs) { return []; }
  // Deep clones produced by `deepCloneDesignNode` own every descendant,
  // so widening the element type to MutableFigDesignNode is a
  // no-op at runtime and a precise statement of ownership at the
  // type level. Every other path that builds `children` arrays in
  // this file does so from deepCloneDesignNode output — keeping that
  // invariant is part of the SSoT we enforce here.
  return cs as readonly MutableFigDesignNode[];
}

function findNodeById(
  nodes: readonly MutableFigDesignNode[],
  id: string,
): MutableFigDesignNode | undefined {
  for (const node of nodes) {
    if (node.id === id) { return node; }
    if (node.children) {
      const found = findNodeById(mutableChildren(node), id);
      if (found) { return found; }
    }
  }
  return undefined;
}

/**
 * Apply symbol overrides to cloned children.
 *
 * Applied in two passes:
 *
 * Pass 1: variant switches (`overriddenSymbolID` on a single-guid path).
 * The targeted INSTANCE has its `symbolId` replaced with the variant
 * and its `children` re-cloned from the new variant's SYMBOL. The
 * domain-convert layer has already re-keyed each multi-level override's
 * tail guids into the variant's namespace (see `translateEntryFull` in
 * `@aurochs-builder/fig/context`), so Pass 2 finds its targets
 * directly against the freshly cloned children.
 *
 * Pass 2: property overrides. Each non-variant override locates its
 * target by the already-translated path and has its fields applied.
 */
function applySymbolOverridesToChildren(
  children: readonly MutableFigDesignNode[],
  overrides: readonly import("@aurochs/fig/domain").SymbolOverride[],
  symbolId: string,
  styleRegistry: import("@aurochs/fig/domain").FigStyleRegistry,
  symbolMap: ReadonlyMap<string, FigDesignNode>,
  warnings: string[],
): void {
  // Pass 1: variant switches.
  for (const override of overrides) {
    if (!isValidOverridePath(override)) { continue; }
    if (isSelfOverride(override, symbolId)) { continue; }
    if (!override.overriddenSymbolID) { continue; }
    if (overridePathToIds(override).length !== 1) { continue; }

    const target = findNodeByOverridePath(children, override);
    if (!target || getNodeTypeName(target) !== FIG_NODE_TYPE.INSTANCE) { continue; }

    applyOverrideToNode(target, override);

    const newSymId = `${override.overriddenSymbolID.sessionID}:${override.overriddenSymbolID.localID}`;
    const variantSymbol = symbolMap.get(newSymId);
    if (variantSymbol) {
      const mutableTarget: MutableFigDesignNode = target;
      mutableTarget.children =
        (variantSymbol.children ?? []).map(deepCloneDesignNode);
    }
  }

  // Pass 2: property overrides against the variant-switched tree.
  for (const override of overrides) {
    if (!isValidOverridePath(override)) {
      const w = `symbolOverride has no guidPath — skipped (symbolId=${symbolId})`;
      if (!warnings.includes(w)) { warnings.push(w); }
      continue;
    }
    if (isSelfOverride(override, symbolId)) { continue; }
    // Pass 1 handled single-guid variant switches.
    if (override.overriddenSymbolID && overridePathToIds(override).length === 1) {
      continue;
    }

    const target = findNodeByOverridePath(children, override);
    if (!target) {
      const ids = overridePathToIds(override).join(" → ");
      const w = `symbolOverride target node not found in INSTANCE children (guidPath=${ids}, symbolId=${symbolId})`;
      if (!warnings.includes(w)) { warnings.push(w); }
      continue;
    }

    applyOverrideToNode(target, override);

    const targetFills = resolveStyleRef(target.styleIdForFill, styleRegistry.fills);
    if (targetFills) { target.fills = targetFills; }
    const targetStrokes = resolveStyleRef(target.styleIdForStrokeFill, styleRegistry.strokes);
    if (targetStrokes) { target.strokes = targetStrokes; }
  }
}

/**
 * Resolve a style reference to a paint array via the registry.
 *
 * A `FigStyleId` may carry up to two keys: a local `guid` (same-file
 * definition) and an `assetRef.key` (team-library import). The registry
 * stores both namespaces in a single map, so we try each key in turn and
 * return the first hit. Returns undefined when neither key resolves.
 */
function resolveStyleRef(
  ref: { readonly guid?: { readonly sessionID: number; readonly localID: number }; readonly assetRef?: { readonly key: string } } | undefined,
  map: ReadonlyMap<string, readonly FigPaint[]>,
): readonly FigPaint[] | undefined {
  for (const k of styleRefKeys(ref)) {
    const v = map.get(k);
    if (v) return v;
  }
  return undefined;
}

/**
 * Apply component property assignments to cloned children.
 *
 * Component properties allow INSTANCE nodes to override specific fields
 * on child nodes (text content, visibility, instance swap).
 */
function applyComponentPropertyAssignments(
  children: readonly MutableFigDesignNode[],
  assignments: readonly import("@aurochs/fig/domain").ComponentPropertyAssignment[],
  symbol: FigDesignNode,
): void {
  if (assignments.length === 0) { return; }

  // Build a map from defId → assigned value
  const assignmentMap = new Map<string, import("@aurochs/fig/domain").ComponentPropertyValue>();
  for (const assign of assignments) {
    assignmentMap.set(assign.defId, assign.value);
  }

  // Walk symbol's children to find componentPropertyRefs, then apply assignments
  applyPropsRecursive(children, assignmentMap, symbol);
}

function applyPropsRecursive(
  nodes: readonly MutableFigDesignNode[],
  assignmentMap: ReadonlyMap<string, import("@aurochs/fig/domain").ComponentPropertyValue>,
  _symbol: FigDesignNode,
): void {
  for (const node of nodes) {
    if (node.componentPropertyRefs) {
      for (const ref of node.componentPropertyRefs) {
        const assignedValue = assignmentMap.get(ref.defId);
        if (assignedValue === undefined) { continue; }

        switch (ref.nodeField) {
          case "TEXT_DATA": {
            // Override text content from textValue.characters.
            //
            // When the new characters differ from the node's existing
            // ones we must invalidate `derivedTextData`: the cached
            // glyph contours were computed for the old text and no
            // longer match. But when the CPA re-asserts the same
            // string (common for variant INSTANCEs whose CPA redeclares
            // the SYMBOL's default), clearing dtd throws away a
            // perfectly valid pre-computed glyph path — and we have no
            // way to recompute it without opentype.js fallback, which
            // produces a different glyph (viewfinder vs person.2 for
            // U+10026C). Preserving dtd when the characters match is
            // correct because dsd won't re-supply the dtd for a leaf
            // TEXT whose text didn't actually change.
            const textChars = assignedValue.textValue?.characters;
            if (textChars !== undefined && node.textData) {
              const prevChars = node.textData.characters;
              node.textData = { ...node.textData, characters: textChars };
              if (textChars !== prevChars) {
                node.derivedTextData = undefined;
              }
            }
            break;
          }
          case "VISIBLE": {
            // Toggle visibility from boolValue
            const boolVal = assignedValue.boolValue;
            if (boolVal !== undefined) {
              node.visible = boolVal;
            }
            break;
          }
          case "OVERRIDDEN_SYMBOL_ID": {
            // Instance swap: change the symbolId from referenceValue
            const refVal = assignedValue.referenceValue;
            if (refVal !== undefined) {
              node.symbolId = refVal;
            }
            break;
          }
        }
      }
    }

    if (node.children) {
      applyPropsRecursive(mutableChildren(node), assignmentMap, _symbol);
    }
  }
}


/**
 * Apply derivedSymbolData (pre-computed layout) to cloned children.
 *
 * Each entry targets a child node via guidPath and updates layout properties
 * (transform, size, geometry).
 *
 * derivedTextData in derivedSymbolData is Figma's re-computed glyph paths
 * for the text AFTER all CPA changes have been applied. This is the correct
 * source for patheized text on CPA-modified text nodes — it supersedes the
 * cleared derivedTextData.
 */
function applyDerivedSymbolData(
  children: readonly MutableFigDesignNode[],
  derivedData: readonly SymbolOverride[],
  _ctx: BuildContext,
): void {
  // SSoT: every guid on every path has already been resolved into the
  // SYMBOL descendant namespace at domain-convert time (see
  // `resolveOverridePaths` in `@aurochs-builder/fig/context`). The
  // scene-graph builder looks up paths verbatim — no cascading, no
  // translation, no promotion of entries into nested INSTANCEs.
  for (const entry of derivedData) {
    if (!isValidOverridePath(entry)) { continue; }
    const target = findNodeByOverridePath(children, entry);
    if (!target) { continue; }
    applyOverrideToNode(target, entry);
  }
}

/**
 * Apply constraint-based layout resolution to children of a resized INSTANCE.
 *
 * When an INSTANCE has a different size than its SYMBOL and no derivedSymbolData
 * is available, each child's position and size are adjusted according to their
 * horizontal/vertical constraint settings.
 */
function applyConstraintResolution(
  children: readonly MutableFigDesignNode[],
  symbolSize: { x: number; y: number },
  instanceSize: { x: number; y: number },
): void {
  for (const child of children) {
    // Build constraint-compatible shape from FigDesignNode
    const constraintChild = {
      horizontalConstraint: child.layoutConstraints?.horizontalConstraint,
      verticalConstraint: child.layoutConstraints?.verticalConstraint,
      transform: { m02: child.transform.m02, m12: child.transform.m12 },
      size: { x: child.size.x, y: child.size.y },
    };

    const resolution = resolveChildConstraints(
      constraintChild,
      symbolSize,
      instanceSize,
    );

    if (!resolution) { continue; }
    if (!resolution.posChanged && !resolution.sizeChanged) { continue; }

    // Update transform (position)
    child.transform = {
      ...child.transform,
      m02: resolution.posX,
      m12: resolution.posY,
    };

    // Update size
    if (resolution.sizeChanged) {
      child.size = { x: resolution.dimX, y: resolution.dimY };
    }
  }
}

/**
 * Resolve an INSTANCE node against its SYMBOL/COMPONENT.
 *
 * Full resolution pipeline (matching old SVG renderer's FigResolver):
 *
 * 1. Property merge — inherit SYMBOL's visual properties where INSTANCE has none
 * 2. Self-overrides — apply overrides targeting the instance frame itself
 * 3. Clone & override children — deep clone symbol children, apply per-child overrides
 * 4. Component property assignments — apply text/visibility/swap overrides
 *
 * The INSTANCE retains its own transform and size (these define placement).
 */
function resolveDesignInstance(
  node: FigDesignNode,
  ownChildren: readonly FigDesignNode[],
  ctx: BuildContext,
): ResolvedDesignInstance {
  const symbolId = node.symbolId;
  if (!symbolId) {
    return { effectiveNode: node, children: ownChildren };
  }

  const symbol = ctx.symbolMap.get(symbolId);
  if (!symbol) {
    const warning = `INSTANCE symbol not found in symbolMap: id=${symbolId}`;
    if (!ctx.warnings.includes(warning)) {
      ctx.warnings.push(warning);
    }
    return { effectiveNode: node, children: ownChildren };
  }

  // ── Step 1: Property merge ──
  // This mirrors `mergeSymbolProperties` in @aurochs/fig/symbols (the SoT
  // for FigNode-level INSTANCE resolution): SYMBOL's visual properties
  // always override INSTANCE-level values. Any INSTANCE-specific paint,
  // stroke, or visual tweak arrives via self-referencing `symbolOverrides`
  // which are applied in Step 2. Reading directly-set INSTANCE `fillPaints`
  // here would treat author tooling artefacts (e.g. a stale copy on the
  // INSTANCE frame) as authoritative and diverge from Figma's own export.
  const instanceSize = node.size;
  const symbolSize = symbol.size;
  const sameSize = instanceSize.x === symbolSize.x && instanceSize.y === symbolSize.y;

  const merged: MutableFigDesignNode = {
    ...node,

    // Paint — SYMBOL wins unconditionally when it declares paints. The
    // INSTANCE's fills/strokes are only used when the SYMBOL has none
    // (this preserves the stand-alone-INSTANCE case where no SYMBOL paint
    // exists at all).
    fills: hasPaintDeclaration(symbol.fills) ? symbol.fills : node.fills,
    strokes: hasPaintDeclaration(symbol.strokes) ? symbol.strokes : node.strokes,
    strokeWeight: symbol.strokeWeight ?? node.strokeWeight,
    strokeJoin: symbol.strokeJoin ?? node.strokeJoin,
    strokeCap: symbol.strokeCap ?? node.strokeCap,
    strokeDashes: symbol.strokeDashes ?? node.strokeDashes,

    // Geometry — inherit from SYMBOL
    cornerRadius: symbol.cornerRadius ?? node.cornerRadius,
    rectangleCornerRadii: symbol.rectangleCornerRadii ?? node.rectangleCornerRadii,
    cornerSmoothing: symbol.cornerSmoothing ?? node.cornerSmoothing,

    // fillGeometry/strokeGeometry — inherit only when same size
    // (geometry is resolution-dependent; different size invalidates it)
    fillGeometry: sameSize ? (symbol.fillGeometry ?? node.fillGeometry) : node.fillGeometry,
    strokeGeometry: sameSize ? (symbol.strokeGeometry ?? node.strokeGeometry) : node.strokeGeometry,

    // Effects — SYMBOL is authoritative
    effects: symbol.effects,

    // Compositing
    blendMode: symbol.blendMode ?? node.blendMode,
    opacity: symbol.opacity ?? node.opacity,
    mask: symbol.mask ?? node.mask,

    // Container
    clipsContent: node.clipsContent ?? symbol.clipsContent,

    // Size — use SYMBOL's size for frame rendering;
    // INSTANCE size is used for constraint resolution later
    size: symbol.size,
  };

  // ── Step 2: Self-overrides ──
  // Apply overrides where guidPath targets the SYMBOL frame itself.
  // This restores INSTANCE-specific values (e.g. different fills, opacity)
  // that were overwritten by the SYMBOL merge in Step 1.
  if (node.overrides && node.overrides.length > 0) {
    for (const override of node.overrides) {
      if (!isSelfOverride(override, symbolId) && !isSelfOverride(override, node.id)) {
        continue;
      }
      applyOverrideToNode(merged, override);
    }
    // If self-overrides set styleIdForFill/styleIdForStrokeFill, resolve
    // through guid or assetRef.key via the style registry.
    const mergedFills = resolveStyleRef(merged.styleIdForFill, ctx.styleRegistry.fills);
    if (mergedFills) merged.fills = mergedFills;
    const mergedStrokes = resolveStyleRef(merged.styleIdForStrokeFill, ctx.styleRegistry.strokes);
    if (mergedStrokes) merged.strokes = mergedStrokes;
  }

  // `merged` is mutated by Step 6 (size adjustment) and is the `effectiveNode`
  // returned to the caller. Keeping the mutable type here avoids an `as`
  // cast downstream — the cast would be a symptom that the type pipeline
  // is hiding which values are still in flux versus fully resolved.
  const effectiveNode: MutableFigDesignNode = merged;

  // ── Step 3: Clone children with overrides ──
  // INSTANCE children in .fig are typically empty — SYMBOL children are used.
  // When INSTANCE has own children (rare), those take precedence.
  //
  // `children` is typed as `MutableFigDesignNode[]` because every
  // subsequent pipeline step (overrides, CPA, dsd, constraint
  // resolution) mutates these clones. Declaring the type here removes
  // the `as MutableFigDesignNode` casts that would otherwise appear in
  // each step.
  let children: readonly MutableFigDesignNode[];
  if (ownChildren.length > 0) {
    children = ownChildren.map(deepCloneDesignNode);
  } else {
    children = (symbol.children ?? []).map(deepCloneDesignNode);
  }

  // Apply per-child overrides from symbolOverrides
  if (node.overrides && node.overrides.length > 0) {
    applySymbolOverridesToChildren(children, node.overrides, symbolId, ctx.styleRegistry, ctx.symbolMap, ctx.warnings);
  }

  // ── Step 4: Component property assignments ──
  if (node.componentPropertyAssignments && node.componentPropertyAssignments.length > 0) {
    applyComponentPropertyAssignments(children, node.componentPropertyAssignments, symbol);
  }

  // ── Step 5: Derived symbol data (pre-computed layout for resized instances) ──
  if (node.derivedSymbolData && node.derivedSymbolData.length > 0) {
    applyDerivedSymbolData(children, node.derivedSymbolData, ctx);
  }

  // ── Step 6: Constraint resolution for resized instances ──
  // Mirrors `resolveInstanceLayout` in @aurochs/fig/symbols: the INSTANCE
  // size is honoured when either (a) there is a mechanism to redistribute
  // the SYMBOL's children to the new extent — authored constraint
  // settings or pre-computed derivedSymbolData — or (b) the SYMBOL has
  // no children, so there is nothing to redistribute and the INSTANCE
  // size can be applied directly (leaf INSTANCE — typical of icon /
  // shape components).
  //
  // Without any of these conditions, the instance falls back to the
  // SYMBOL's size; applying the INSTANCE size unconditionally would
  // clip or stretch children relative to a layout they were not
  // designed for, producing the "tighter rounded clip" / "3 different-
  // sized buttons" regressions.
  const sizeChanged = instanceSize.x !== symbolSize.x || instanceSize.y !== symbolSize.y;
  if (sizeChanged) {
    const hasDerivedData = node.derivedSymbolData !== undefined && node.derivedSymbolData.length > 0;
    const hasConstraints = children.some((child) => {
      const hc = child.layoutConstraints?.horizontalConstraint;
      const vc = child.layoutConstraints?.verticalConstraint;
      // Anything other than MIN/MIN means the child has an explicit layout
      // rule authored against the SYMBOL extent, so it is valid to
      // redistribute it to the INSTANCE extent.
      return (hc !== undefined && hc.name !== "MIN") || (vc !== undefined && vc.name !== "MIN");
    });
    // Leaf INSTANCE: SYMBOL has no children to redistribute, so applying
    // the INSTANCE size is unambiguous — there is no layout to disturb.
    // This covers the "Icon=Messages" case where the SYMBOL is a single
    // shape (66×66) but every INSTANCE sits in a 20×20 slot authored
    // on the parent. Without this branch the SYMBOL size leaks through
    // and every such icon renders at the SYMBOL's intrinsic size.
    const isLeafInstance = children.length === 0;

    if (hasDerivedData || hasConstraints || isLeafInstance) {
      if (!hasDerivedData && !isLeafInstance) {
        applyConstraintResolution(children, symbolSize, instanceSize);
      }
      effectiveNode.size = instanceSize;
    }
    // Otherwise: keep SYMBOL size and the original child layout.
  }

  // ── Step 7: Recursively resolve nested INSTANCE children ──
  // Children inherited from SYMBOL may themselves be INSTANCE nodes.
  // These must be resolved against the same symbolMap.
  children = resolveNestedInstances(children, ctx);

  return { effectiveNode, children };
}

/**
 * Recursively resolve INSTANCE nodes within a children array.
 *
 * When SYMBOL children contain nested INSTANCE nodes, those must be
 * resolved (property merge + override + children) before they can
 * be built into scene graph nodes.
 */
function resolveNestedInstances(
  children: readonly MutableFigDesignNode[],
  ctx: BuildContext,
): readonly MutableFigDesignNode[] {
  return children.map((child) => {
    const typeName = getNodeTypeName(child);
    if (typeName !== FIG_NODE_TYPE.INSTANCE) {
      if (child.children && child.children.length > 0) {
        const resolvedGrandchildren = resolveNestedInstances(mutableChildren(child), ctx);
        if (resolvedGrandchildren !== child.children) {
          const updated: MutableFigDesignNode = { ...child, children: resolvedGrandchildren };
          return updated;
        }
      }
      return child;
    }

    const resolved = resolveDesignInstance(child, child.children ?? [], ctx);
    const flattened: MutableFigDesignNode = {
      ...resolved.effectiveNode,
      type: "FRAME",
      children: resolveNestedInstances(resolved.children, ctx),
    };
    return flattened;
  });
}

// =============================================================================
// Node Builders
// =============================================================================

function buildGroupNode(node: FigDesignNode, ctx: BuildContext, children: readonly SceneNode[]): GroupNode {
  const base = extractBaseProps(node);
  const { effects } = extractEffectsProps(node);
  return {
    type: "group",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    children,
  };
}

function buildFrameNode(node: FigDesignNode, ctx: BuildContext, children: readonly SceneNode[]): FrameNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes, strokeAlign } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);
  const cornerRadius = extractCornerRadius(node);
  const clipsContent = resolveClipsContent(node);

  return {
    type: "frame",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    width: size.x,
    height: size.y,
    cornerRadius,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes, strokeAlign }),
    individualStrokeWeights: node.individualStrokeWeights,
    clipsContent,
    children,
    clip: clipsContent ? { type: "rect", width: size.x, height: size.y, cornerRadius } : undefined,
  };
}

function buildRectNode(node: FigDesignNode, ctx: BuildContext): RectNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes, strokeAlign } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);
  const cornerRadius = extractCornerRadius(node);

  return {
    type: "rect",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    width: size.x,
    height: size.y,
    cornerRadius,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes, strokeAlign }),
    individualStrokeWeights: node.individualStrokeWeights,
  };
}

function buildEllipseNode(node: FigDesignNode, ctx: BuildContext): EllipseNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes, strokeAlign } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);

  return {
    type: "ellipse",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    cx: size.x / 2,
    cy: size.y / 2,
    rx: size.x / 2,
    ry: size.y / 2,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes, strokeAlign }),
    arcData: extractArcData(node),
  };
}

/**
 * Extract arc data from an ellipse node (partial arcs and donuts).
 */
function extractArcData(node: FigDesignNode): ArcData | undefined {
  const arcData = node.arcData;
  if (!arcData) { return undefined; }
  const startingAngle = arcData.startingAngle ?? 0;
  const endingAngle = arcData.endingAngle ?? Math.PI * 2;
  const innerRadius = arcData.innerRadius ?? 0;
  // Full circle with no hole = default ellipse, no arcData needed
  if (Math.abs(endingAngle - startingAngle - Math.PI * 2) < 1e-6 && innerRadius === 0) {
    return undefined;
  }
  return { startingAngle, endingAngle, innerRadius };
}

/**
 * Synthesize contours from parametric shape properties when no
 * pre-computed geometry blobs exist (e.g., builder-generated documents).
 */
function synthesizeContours(node: FigDesignNode): PathContour[] {
  const typeName = getNodeTypeName(node);
  const w = node.size?.x ?? 0;
  const h = node.size?.y ?? 0;

  switch (typeName) {
    case "STAR":
      return [generateStarContour({
        width: w,
        height: h,
        pointCount: node.pointCount ?? 5,
        // starInnerScale (newer format) takes precedence over starInnerRadius
        innerRadiusRatio: node.starInnerScale ?? node.starInnerRadius ?? 0.382,
      })];
    case "REGULAR_POLYGON":
      return [generatePolygonContour(w, h, node.pointCount ?? 3)];
    case "LINE":
      return [generateLineContour(w)];
    default:
      return [];
  }
}

/**
 * Resolve the effective fill paints for a vector per-path style override entry.
 *
 * Resolution priority (matching the old SVG renderer's resolveStyleOverrideFillPaints):
 * 1. If the entry has styleIdForFill, resolve via the style registry
 * 2. Otherwise, use the entry's own fillPaints
 * 3. If neither, return undefined (use base fill)
 */
function resolveOverrideEntryPaints(
  entry: {
    readonly fillPaints?: readonly FigPaint[];
    readonly styleIdForFill?: {
      readonly guid?: { readonly sessionID: number; readonly localID: number };
      readonly assetRef?: { readonly key: string };
    };
  },
  styleRegistry: FigStyleRegistry,
): readonly FigPaint[] | undefined {
  // Priority 1: styleIdForFill via style registry (guid or assetRef.key)
  const resolved = resolveStyleRef(entry.styleIdForFill, styleRegistry.fills);
  if (resolved) return resolved;

  // Priority 2: inline fillPaints
  if (entry.fillPaints && entry.fillPaints.length > 0) {
    return entry.fillPaints;
  }

  return undefined;
}

/**
 * Apply per-path style overrides from vectorData.styleOverrideTable.
 * Maps each contour's geometryStyleId to a fill override.
 *
 * Resolves both inline fillPaints and styleIdForFill references
 * (via style registry) — matching the old SVG renderer's behavior.
 */
function applyStyleOverrides(
  contours: readonly DecodedContour[],
  node: FigDesignNode,
  ctx: BuildContext,
): PathContour[] {
  const overrideTable = node.vectorData?.styleOverrideTable;

  if (!overrideTable || overrideTable.length === 0) {
    // No overrides — strip geometryStyleId from contours
    return contours.map(({ geometryStyleId: _, ...rest }) => rest);
  }

  const overrideMap = new Map<number, Fill>();
  for (const entry of overrideTable) {
    const paints = resolveOverrideEntryPaints(entry, ctx.styleRegistry);
    if (paints) {
      const fills = convertPaintsToFills(paints, ctx.images);
      if (fills.length > 0) {
        overrideMap.set(entry.styleID, fills[fills.length - 1]);
      }
    }
  }

  return contours.map(({ geometryStyleId, ...rest }) => {
    if (geometryStyleId !== undefined && overrideMap.has(geometryStyleId)) {
      return { ...rest, fillOverride: overrideMap.get(geometryStyleId)! };
    }
    return rest;
  });
}

function buildVectorNode(node: FigDesignNode, ctx: BuildContext): PathNode {
  const base = extractBaseProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes, strokeAlign } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { effects } = extractEffectsProps(node);

  const vectorPaths = node.vectorPaths;

  const contoursRef = { value: convertVectorPathsToContours(vectorPaths) as DecodedContour[] };
  const isStrokeGeometryRef = { value: false };
  if (contoursRef.value.length === 0) {
    contoursRef.value = decodeGeometryToContours(fillGeometry, ctx.blobs);
  }
  if (contoursRef.value.length === 0) {
    contoursRef.value = decodeGeometryToContours(strokeGeometry, ctx.blobs);
    isStrokeGeometryRef.value = contoursRef.value.length > 0;
  }

  // Last resort: synthesize geometry from parametric shape definition
  if (contoursRef.value.length === 0) {
    contoursRef.value = synthesizeContours(node) as DecodedContour[];
  }

  // Apply per-path style overrides from vectorData
  const resolvedContours = applyStyleOverrides(contoursRef.value, node, ctx);

  // strokeGeometry is Figma's pre-expanded outline of a stroke.
  // It should be *filled* with the stroke colour, not stroked again.
  const fills = selectPaintsForFills(isStrokeGeometryRef.value, { strokePaints, fillPaints }, ctx.images);
  const stroke = isStrokeGeometryRef.value ? undefined : convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes, strokeAlign });

  const { size } = extractSizeProps(node);
  return {
    type: "path",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    contours: resolvedContours,
    fills,
    stroke,
    width: size.x > 0 ? size.x : undefined,
    height: size.y > 0 ? size.y : undefined,
  };
}

/** Extract the name string from a KiwiEnumValue or return the string as-is. */
function extractEnumName(value: unknown): string | undefined {
  if (typeof value === "string") { return value; }
  if (value && typeof value === "object" && "name" in value) {
    // `"name" in value` narrows to `value & { name: unknown }`, so
    // `value.name` is safely `unknown` without any cast.
    const name: unknown = value.name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function extractAutoResizeName(rawAutoResize: unknown): string | undefined {
  return extractEnumName(rawAutoResize);
}

function resolveTextAutoResize(rawAutoResize: unknown): TextAutoResize {
  const name = extractAutoResizeName(rawAutoResize);
  if (name === "NONE" || name === "HEIGHT" || name === "TRUNCATE") {
    return name;
  }
  return "WIDTH_AND_HEIGHT";
}

function buildTextNode(node: FigDesignNode, ctx: BuildContext): TextNode {
  const base = extractBaseProps(node);
  const { effects } = extractEffectsProps(node);
  const textData = convertTextNode(node, ctx.blobs);

  // Resolve textAutoResize from domain textData
  const rawAutoResize = node.textData?.textAutoResize;
  const textAutoResize = resolveTextAutoResize(rawAutoResize);

  return {
    type: "text",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    width: node.size?.x ?? 0,
    height: node.size?.y ?? 0,
    textAutoResize,
    textTruncation: extractEnumName(node.textData?.textTruncation),
    leadingTrim: extractEnumName(node.textData?.leadingTrim),
    hyperlink: node.textData?.hyperlink?.url,
    glyphContours: textData.glyphContours,
    decorationContours: textData.decorationContours,
    fill: textData.fill,
    textLineLayout: textData.textLineLayout,
  };
}

// =============================================================================
// Boolean Operation Computation
// =============================================================================

type BooleanOpType = "UNION" | "SUBTRACT" | "INTERSECT" | "EXCLUDE";

function getBooleanOpType(node: FigDesignNode): BooleanOpType {
  const op = node.booleanOperation;
  if (!op) { return "UNION"; }
  const value = op.value;
  switch (value) {
    case 0: return "UNION";
    case 1: return "SUBTRACT";
    case 2: return "INTERSECT";
    case 3: return "EXCLUDE";
    default: return "UNION";
  }
}

function toPathBoolOp(op: BooleanOpType): PathBooleanOperation {
  switch (op) {
    case "UNION": return PathBooleanOperation.Union;
    case "SUBTRACT": return PathBooleanOperation.Difference;
    case "INTERSECT": return PathBooleanOperation.Intersection;
    case "EXCLUDE": return PathBooleanOperation.Exclusion;
  }
}

/**
 * Apply a 2x3 affine transform to an SVG path d-string by transforming coordinates.
 */
function applyTransformToPathD(d: string, m: AffineMatrix): string {
  if (m.m00 === 1 && m.m01 === 0 && m.m02 === 0 && m.m10 === 0 && m.m11 === 1 && m.m12 === 0) {
    return d;
  }
  // Use simple regex-based transform for M/L/C/Q/Z commands
  return d.replace(/([MLCQZ])\s*([^MLCQZ]*)/gi, (_, cmd: string, args: string) => {
    if (cmd.toUpperCase() === "Z") { return "Z"; }
    const nums = args.trim().split(/[\s,]+/).map(Number);
    const transformed: number[] = [];
    for (let i = 0; i < nums.length; i += 2) {
      if (i + 1 < nums.length) {
        const x = nums[i], y = nums[i + 1];
        transformed.push(m.m00 * x + m.m01 * y + m.m02);
        transformed.push(m.m10 * x + m.m11 * y + m.m12);
      }
    }
    return `${cmd}${transformed.join(" ")}`;
  });
}

/**
 * Collect path d-strings from children of a BOOLEAN_OPERATION node,
 * transforming each to the parent's coordinate system.
 */
function collectChildPathsForBoolean(
  children: readonly FigDesignNode[],
  ctx: BuildContext,
): { d: string; windingRule: "nonzero" | "evenodd" }[] {
  const result: { d: string; windingRule: "nonzero" | "evenodd" }[] = [];

  for (const child of children) {
    const base = extractBaseProps(child);
    if (!base.visible && !ctx.showHiddenNodes) { continue; }

    const typeName = getNodeTypeName(child);
    const childTransform = convertTransform(base.transform);

    // Nested BOOLEAN_OPERATION: recurse
    if (typeName === "BOOLEAN_OPERATION") {
      const nestedResult = computeBooleanResultFromNode(child, ctx);
      if (nestedResult) {
        for (const d of nestedResult) {
          const td = applyTransformToPathD(d, childTransform);
          result.push({ d: td, windingRule: "nonzero" });
        }
      }
      continue;
    }

    // Extract geometry
    const { fillGeometry, strokeGeometry } = extractGeometryProps(child);
    let contours = decodeGeometryToContours(fillGeometry, ctx.blobs);
    if (contours.length === 0) {
      contours = convertVectorPathsToContours(child.vectorPaths);
    }
    if (contours.length === 0) {
      contours = decodeGeometryToContours(strokeGeometry, ctx.blobs);
    }
    if (contours.length === 0) {
      contours = synthesizeContours(child);
    }

    for (const contour of contours) {
      const d = contour.commands.map((cmd) => {
        switch (cmd.type) {
          case "M": return `M${cmd.x} ${cmd.y}`;
          case "L": return `L${cmd.x} ${cmd.y}`;
          case "C": return `C${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
          case "Q": return `Q${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`;
          case "A": return `A${cmd.rx} ${cmd.ry} ${cmd.rotation} ${cmd.largeArc ? 1 : 0} ${cmd.sweep ? 1 : 0} ${cmd.x} ${cmd.y}`;
          case "Z": return "Z";
        }
      }).join("");

      const td = applyTransformToPathD(d, childTransform);
      result.push({ d: td, windingRule: contour.windingRule });
    }
  }

  return result;
}

/**
 * Compute boolean operation result for a BOOLEAN_OPERATION node.
 * Returns SVG path d-strings or undefined if computation fails.
 */
function computeBooleanResultFromNode(
  node: FigDesignNode,
  ctx: BuildContext,
): string[] | undefined {
  const children: readonly FigDesignNode[] = node.children ?? [];
  const childPaths = collectChildPathsForBoolean(children, ctx);

  if (childPaths.length === 0) { return undefined; }
  if (childPaths.length === 1) { return [childPaths[0].d]; }

  const opType = getBooleanOpType(node);
  const boolOp = toPathBoolOp(opType);

  function toFillRuleEnum(wr: "nonzero" | "evenodd"): FillRule {
    return wr === "evenodd" ? FillRule.EvenOdd : FillRule.NonZero;
  }

  try {
    let currentPath = pathFromPathData(childPaths[0].d);
    let currentFillRule = toFillRuleEnum(childPaths[0].windingRule);

    for (let i = 1; i < childPaths.length; i++) {
      const nextPath = pathFromPathData(childPaths[i].d);
      const nextFillRule = toFillRuleEnum(childPaths[i].windingRule);

      const results = pathBoolean(
        currentPath, currentFillRule,
        nextPath, nextFillRule,
        boolOp,
      );

      if (results.length === 0) {
        if (boolOp === PathBooleanOperation.Difference) { continue; }
        return [];
      }

      if (results.length === 1) {
        currentPath = results[0];
      } else {
        const combinedD = results.map((p) => pathToPathData(p)).join(" ");
        currentPath = pathFromPathData(combinedD);
      }
      currentFillRule = FillRule.NonZero;
    }

    const finalD = pathToPathData(currentPath);
    if (!finalD || finalD.trim().length === 0) { return []; }
    return [finalD];
  } catch {
    return undefined;
  }
}

/**
 * Build a PathNode from boolean operation result paths.
 */
function buildBooleanOperationNode(
  node: FigDesignNode,
  ctx: BuildContext,
  resultPaths: string[],
): PathNode {
  const base = extractBaseProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes, strokeAlign } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);

  const contours: PathContour[] = resultPaths.map((d) => ({
    commands: parseSvgPathDToCommands(d),
    windingRule: "evenodd" as const,
  }));

  return {
    type: "path",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    blendMode: convertBlendMode(node),
    contours,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes, strokeAlign }),
  };
}

/**
 * Parse SVG path d-string into PathCommand array for boolean results.
 */
function parseSvgPathDToCommands(d: string): PathContour["commands"][number][] {
  return parseSvgPathD(d);
}

// =============================================================================
// Auto-layout stretch (narrow)
// =============================================================================

/**
 * Apply the Figma auto-layout `stackChildAlignSelf=STRETCH` rule.
 *
 * When the parent FRAME is an auto-layout container (stackMode VERTICAL or
 * HORIZONTAL) and a child has `stackChildAlignSelf=STRETCH`, the child's
 * counter-axis (horizontal for VERTICAL stack, vertical for HORIZONTAL)
 * dimension resolves to the parent's content area on that axis.
 *
 * Scope is deliberately narrow: this only handles the COUNTER-axis stretch,
 * not the primary-axis grow / SPACE_BETWEEN / primary-axis sizing rules
 * (those belong to Task #39's full auto-layout implementation). The
 * narrow fix is enough to correct the visible Activity View list-row
 * separator regression, where `_Separator` carries `stackChildAlignSelf=
 * STRETCH` and its stored size (e.g. 129×1, copied from an unrelated
 * SYMBOL default) is smaller than the parent list-row's inner width.
 *
 * Returns a new children array with stretched sizes applied; children
 * that don't match the stretch condition are returned unchanged so
 * reference equality holds for the common case.
 *
 * The function only reads the subset of FigDesignNode captured by the
 * `StretchParent` / `StretchChild` interfaces below, so it can be
 * unit-tested with minimal literal structures without casting.
 */
export type StretchParent = {
  readonly size?: { readonly x: number; readonly y: number };
  readonly autoLayout?: {
    readonly stackMode?: { readonly name?: string };
    readonly stackPadding?: number | { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  };
};
export type StretchChild = {
  readonly size?: { readonly x: number; readonly y: number };
  readonly layoutConstraints?: {
    readonly stackChildAlignSelf?: { readonly name?: string };
  };
};

export function applyCounterAxisStretch<C extends StretchChild>(
  parent: StretchParent,
  children: readonly C[],
): readonly C[] {
  const autoLayout = parent.autoLayout;
  if (!autoLayout) return children;
  const modeName = autoLayout.stackMode?.name;
  if (modeName !== "VERTICAL" && modeName !== "HORIZONTAL") return children;

  // Parent's content area = size minus padding. `stackPadding` may be a
  // uniform number (Kiwi shorthand) OR a per-side `{top,right,bottom,
  // left}` object (domain expanded form); both are honoured here.
  // When no stackPadding is set the content area equals the parent's size.
  let padCounter = 0;
  const sp = autoLayout.stackPadding;
  if (typeof sp === "number") {
    padCounter = sp * 2;
  } else if (sp && typeof sp === "object") {
    padCounter = modeName === "VERTICAL" ? sp.left + sp.right : sp.top + sp.bottom;
  }
  const pSize = parent.size;
  if (!pSize) return children;
  const counterAxis = modeName === "VERTICAL" ? "x" : "y";
  const counterContent = (counterAxis === "x" ? pSize.x : pSize.y) - padCounter;
  if (counterContent <= 0) return children;

  let changed = false;
  const out: C[] = [];
  for (const child of children) {
    const alignSelf = child.layoutConstraints?.stackChildAlignSelf?.name;
    if (alignSelf !== "STRETCH" || !child.size) {
      out.push(child);
      continue;
    }
    const current = counterAxis === "x" ? child.size.x : child.size.y;
    if (Math.abs(current - counterContent) < 0.5) {
      out.push(child);
      continue;
    }
    const newSize = counterAxis === "x"
      ? { x: counterContent, y: child.size.y }
      : { x: child.size.x, y: counterContent };
    out.push({ ...child, size: newSize });
    changed = true;
  }
  return changed ? out : children;
}

// =============================================================================
// Recursive Builder
// =============================================================================

function buildNode(node: FigDesignNode, ctx: BuildContext): SceneNode | null {
  const base = extractBaseProps(node);

  // Skip hidden nodes unless explicitly shown
  if (!base.visible && !ctx.showHiddenNodes) {
    return null;
  }

  const typeName = getNodeTypeName(node);
  const children = node.children ?? [];

  switch (typeName) {
    case "DOCUMENT":
    case "CANVAS": {
      const childNodes = buildChildren(children, ctx);
      return buildGroupNode(node, ctx, childNodes);
    }

    case "FRAME":
    case "SECTION":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "SYMBOL": {
      const stretched = applyCounterAxisStretch(node, children);
      const childNodes = buildChildren(stretched, ctx);
      return buildFrameNode(node, ctx, childNodes);
    }

    case "INSTANCE": {
      // Resolve INSTANCE against its SYMBOL/COMPONENT:
      // - Merge visual properties (fills, cornerRadius, effects, etc.)
      // - Inherit children if instance has none
      const resolved = resolveDesignInstance(node, children, ctx);
      const stretched = applyCounterAxisStretch(resolved.effectiveNode, resolved.children);
      const childNodes = buildChildren(stretched, ctx);
      return buildFrameNode(resolved.effectiveNode, ctx, childNodes);
    }

    case "GROUP": {
      const childNodes = buildChildren(children, ctx);
      return buildGroupNode(node, ctx, childNodes);
    }

    case "BOOLEAN_OPERATION": {
      // 1. Pre-computed fillGeometry (set by Figma export)
      const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
      const hasMergedGeometry =
        (fillGeometry && fillGeometry.length > 0) ||
        (strokeGeometry && strokeGeometry.length > 0);
      if (hasMergedGeometry) {
        return buildVectorNode(node, ctx);
      }
      // 2. Compute boolean operation from child geometries using path-bool
      const resultPaths = computeBooleanResultFromNode(node, ctx);
      if (resultPaths && resultPaths.length > 0) {
        return buildBooleanOperationNode(node, ctx, resultPaths);
      }
      // 3. Fallback: render children as group
      const childNodes = buildChildren(children, ctx);
      return buildGroupNode(node, ctx, childNodes);
    }

    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return buildRectNode(node, ctx);

    case "ELLIPSE":
      return buildEllipseNode(node, ctx);

    case "VECTOR":
    case "LINE":
    case "STAR":
    case "REGULAR_POLYGON":
      return buildVectorNode(node, ctx);

    case "TEXT":
      return buildTextNode(node, ctx);

    // IMAGE nodes in .fig are rectangles with image fills.
    // The image data lives in the fills array as an IMAGE paint.
    // Render as a rect node — the image fill is handled by the
    // fill conversion pipeline (convertPaintsToFills → ImageFill).
    case "IMAGE":
      return buildRectNode(node, ctx);

    default:
      // Unknown node type - try to render children as group
      if (children.length > 0) {
        const childNodes = buildChildren(children, ctx);
        return buildGroupNode(node, ctx, childNodes);
      }
      return null;
  }
}

/**
 * Build scene nodes from a list of FigDesignNode children.
 *
 * Handles mask processing in a single pass: when a child has `mask: true`,
 * it becomes an SVG mask for all subsequent siblings until the next mask
 * node or the end of the list. Masked siblings are wrapped in a GroupNode
 * with the `mask` field set.
 *
 * This mirrors the old SVG renderer's `renderChildrenWithMasks()` logic,
 * but produces SceneNodes instead of SVG strings.
 */
function buildChildren(children: readonly FigDesignNode[], ctx: BuildContext): SceneNode[] {
  const result: SceneNode[] = [];

  // Track current active mask state across the single loop
  let activeMaskContent: SceneNode | null = null;
  let activeMaskId: SceneNodeId | null = null;
  let maskedChildren: SceneNode[] = [];

  for (const child of children) {
    const base = extractBaseProps(child);
    if (!base.visible && !ctx.showHiddenNodes) {
      continue;
    }

    if (isMaskNode(child)) {
      // Flush previously accumulated masked children
      if (activeMaskId && activeMaskContent && maskedChildren.length > 0) {
        result.push(wrapWithMask(activeMaskId, activeMaskContent, maskedChildren, ctx));
        maskedChildren = [];
      }

      // Build the mask node and start a new mask group
      const maskNode = buildNode(child, ctx);
      if (maskNode) {
        activeMaskId = maskNode.id;
        activeMaskContent = maskNode;
      } else {
        activeMaskId = null;
        activeMaskContent = null;
      }
    } else {
      const node = buildNode(child, ctx);
      if (node) {
        if (activeMaskId) {
          maskedChildren.push(node);
        } else {
          result.push(node);
        }
      }
    }
  }

  // Flush final masked group
  if (activeMaskId && activeMaskContent && maskedChildren.length > 0) {
    result.push(wrapWithMask(activeMaskId, activeMaskContent, maskedChildren, ctx));
  }

  return result;
}

/**
 * Wrap masked children in a GroupNode with the mask field set.
 */
function wrapWithMask(
  maskId: SceneNodeId,
  maskContent: SceneNode,
  maskedChildren: readonly SceneNode[],
  ctx: BuildContext,
): GroupNode {
  return {
    type: "group",
    id: createNodeId(`masked-group-${ctx.nodeCounter++}`),
    transform: IDENTITY,
    opacity: 1,
    visible: true,
    effects: [],
    mask: { maskId, maskContent },
    children: maskedChildren,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a scene graph from FigDesignNode domain objects.
 *
 * @param nodes - Root FigDesignNode nodes to render
 * @param options - Build configuration
 * @returns Format-agnostic scene graph
 */
export function buildSceneGraph(nodes: readonly FigDesignNode[], options: BuildSceneGraphOptions): SceneGraph {
  const ctx: BuildContext = {
    blobs: options.blobs,
    images: options.images,
    symbolMap: options.symbolMap,
    styleRegistry: options.styleRegistry,
    showHiddenNodes: options.showHiddenNodes,
    warnings: options.warnings,
    nodeCounter: 0,
  };

  const children = buildChildren(nodes, ctx);

  const root: GroupNode = {
    type: "group",
    id: createNodeId("root"),
    transform: IDENTITY_MATRIX,
    opacity: 1,
    visible: true,
    effects: [],
    children,
  };

  return {
    width: options.canvasSize.width,
    height: options.canvasSize.height,
    root,
    version: 1,
  };
}
