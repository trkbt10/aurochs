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
  overrideEntries,
  applyOverrideToNode,
} from "@aurochs/fig/domain";
import type { FigPaint, FigVectorPath } from "@aurochs/fig/types";
import { guidToString, safeChildren } from "@aurochs/fig/parser";
import type { FigImage, FigBlob, FigGuid } from "@aurochs/fig/parser";
import {
  getEffectiveSymbolID,
  resolveSymbolGuidStr,
  getInstanceSymbolOverrides,
  buildGuidTranslationMap,
} from "@aurochs/fig/symbols";
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
  /**
   * Raw (Kiwi) symbol map used to build per-INSTANCE GUID translation
   * maps when multi-level derivedSymbolData entries must be cascaded
   * into nested INSTANCE children.
   *
   * Pass the complete raw `nodeMap` whenever the tree contains nested
   * INSTANCE nodes whose outer parents carry overrides that target
   * inner-INSTANCE descendants (e.g., Close Button → Close → Symbol 1
   * → TEXT in Figma's Activity View component). Without it,
   * multi-level override paths silently fail to match because the
   * inner-INSTANCE guids remain in their INSTANCE-scoped namespace
   * instead of being translated into the SYMBOL-scoped namespace used
   * by the resolved children tree.
   *
   * Optional because pure-domain callers (unit tests, synthetic trees
   * without nested overrides) have no raw source to pass. When
   * omitted, multi-level override promotion is skipped — same
   * behaviour as before this option was introduced.
   */
  readonly rawSymbolMap?: ReadonlyMap<string, import("@aurochs/fig/types").FigNode>;
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
 * Internal build context
 */
type BuildContext = {
  readonly blobs: readonly FigBlob[];
  readonly images: ReadonlyMap<string, FigImage>;
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  readonly rawSymbolMap: ReadonlyMap<string, import("@aurochs/fig/types").FigNode> | undefined;
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
    const [tl, tr, br, bl] = radii;
    // All same → collapse to uniform
    if (tl === tr && tr === br && br === bl) {
      return tl || undefined;
    }
    return [tl, tr, br, bl] as readonly [number, number, number, number];
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
 */
type ResolvedInstance = {
  /** Effective node with visual properties merged from SYMBOL */
  readonly effectiveNode: FigDesignNode;
  /** Resolved children (from instance or inherited from symbol) */
  readonly children: readonly FigDesignNode[];
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
 */
function deepCloneDesignNode(node: FigDesignNode): FigDesignNode {
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
 */
function findNodeByOverridePath(
  nodes: readonly FigDesignNode[],
  override: SymbolOverride,
): FigDesignNode | undefined {
  const ids = overridePathToIds(override);
  let current: readonly FigDesignNode[] = nodes;
  let found: FigDesignNode | undefined;

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
    current = found.children ?? [];
  }
  return found;
}

function findNodeById(nodes: readonly FigDesignNode[], id: string): FigDesignNode | undefined {
  for (const node of nodes) {
    if (node.id === id) { return node; }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) { return found; }
    }
  }
  return undefined;
}

/**
 * Apply symbol overrides to cloned children.
 *
 * Each override specifies a guidPath (target node) and properties to replace.
 * Properties follow the same structure as FigDesignNode fields.
 */
function applySymbolOverridesToChildren(
  children: readonly FigDesignNode[],
  overrides: readonly import("@aurochs/fig/domain").SymbolOverride[],
  symbolId: string,
  styleRegistry: import("@aurochs/fig/domain").FigStyleRegistry,
): void {
  for (const override of overrides) {
    if (!isValidOverridePath(override)) { continue; }
    if (isSelfOverride(override, symbolId)) { continue; }

    const target = findNodeByOverridePath(children, override);
    if (!target) { continue; }

    const mutable = target as MutableFigDesignNode;
    applyOverrideToNode(mutable, override);

    // Resolve styleIdForFill / styleIdForStrokeFill after override application
    if (mutable.styleIdForFill) {
      const resolved = styleRegistry.fills.get(guidToString(mutable.styleIdForFill.guid));
      if (resolved) { mutable.fills = resolved; }
    }
    if (mutable.styleIdForStrokeFill) {
      const resolved = styleRegistry.strokes.get(guidToString(mutable.styleIdForStrokeFill.guid));
      if (resolved) { mutable.strokes = resolved; }
    }
  }
}

/**
 * Apply component property assignments to cloned children.
 *
 * Component properties allow INSTANCE nodes to override specific fields
 * on child nodes (text content, visibility, instance swap).
 */
function applyComponentPropertyAssignments(
  children: readonly FigDesignNode[],
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
  nodes: readonly FigDesignNode[],
  assignmentMap: ReadonlyMap<string, import("@aurochs/fig/domain").ComponentPropertyValue>,
  _symbol: FigDesignNode,
): void {
  for (const node of nodes) {
    if (node.componentPropertyRefs) {
      for (const ref of node.componentPropertyRefs) {
        const assignedValue = assignmentMap.get(ref.defId);
        if (assignedValue === undefined) { continue; }

        const mutable = node as MutableFigDesignNode;
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
              mutable.textData = { ...node.textData, characters: textChars };
              if (textChars !== prevChars) {
                mutable.derivedTextData = undefined;
              }
            }
            break;
          }
          case "VISIBLE": {
            // Toggle visibility from boolValue
            const boolVal = assignedValue.boolValue;
            if (boolVal !== undefined) {
              mutable.visible = boolVal;
            }
            break;
          }
          case "OVERRIDDEN_SYMBOL_ID": {
            // Instance swap: change the symbolId from referenceValue
            const refVal = assignedValue.referenceValue;
            if (refVal !== undefined) {
              mutable.symbolId = refVal;
            }
            break;
          }
        }
      }
    }

    if (node.children) {
      applyPropsRecursive(node.children, assignmentMap, _symbol);
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
  children: readonly FigDesignNode[],
  derivedData: readonly SymbolOverride[],
  ctx: BuildContext,
): void {
  for (const entry of derivedData) {
    if (!isValidOverridePath(entry)) { continue; }

    const target = findNodeByOverridePath(children, entry);
    if (target) {
      applyOverrideToNode(target as MutableFigDesignNode, entry);
      continue;
    }

    // Target not found directly. Two cases where we can still
    // successfully apply the override via cascade into a nested
    // INSTANCE:
    //
    //  (A) Multi-level path [childId, ..., descendantGuid]: find the
    //      direct child INSTANCE at childId, translate the tail
    //      guids into the child's SYMBOL namespace, attach the
    //      remaining path to the child's own derivedSymbolData.
    //
    //  (B) Single-guid path [descendantGuid] that doesn't match any
    //      direct child: the guid belongs to a *grandchild* of one
    //      of our INSTANCE children. Try each INSTANCE child: build
    //      its translation map seeded with this guid and see if it
    //      maps to one of that child's SYMBOL descendants. If yes,
    //      attach the translated entry to that INSTANCE's dsd so the
    //      next nested resolveInstance call picks it up.
    //
    // Both cases are exercised by the Close Button xmark chain
    // (Close Button → Close → Symbol 1 → TEXT): the outer CB emits
    // a 3-level path (case A), Close's own dsd then holds a 2-level
    // entry (another A), and finally Symbol 1 receives a 1-level
    // entry that still needs translation to match its SYMBOL
    // descendants (case B).
    const ids = overridePathToIds(entry);
    const guids = entry.guidPath?.guids ?? [];

    if (ids.length >= 2) {
      // Case A
      const directChildId = ids[0];
      const directChild = findDirectChildById(children, directChildId);
      if (!directChild || getNodeTypeName(directChild) !== "INSTANCE") { continue; }

      const translatedTail = translateRemainingPathToSymbolNamespace(
        directChild,
        guids.slice(1),
        ctx,
      );
      if (!translatedTail) { continue; }

      const promoted: SymbolOverride = {
        ...entry,
        guidPath: { guids: translatedTail } as SymbolOverride["guidPath"],
      };
      const mutableChild = directChild as MutableFigDesignNode;
      const existing = mutableChild.derivedSymbolData ?? [];
      mutableChild.derivedSymbolData = [...existing, promoted];
      continue;
    }

    if (ids.length === 1) {
      // Case B — try each INSTANCE child in order; attach to the
      // first one whose translation map resolves this guid to one
      // of its own SYMBOL descendants.
      let attached = false;
      for (const child of children) {
        if (getNodeTypeName(child) !== "INSTANCE") { continue; }
        const translatedTail = translateRemainingPathToSymbolNamespace(
          child,
          guids,
          ctx,
        );
        if (!translatedTail || translatedTail === guids) { continue; }

        // Only attach if translation produced a guid that actually
        // matches one of this child's resolved SYMBOL descendants
        // — otherwise we might mis-attribute the override.
        const newFirstId = guidToString(translatedTail[0]);
        if (!symbolHasDescendantId(child, newFirstId, ctx)) { continue; }

        const promoted: SymbolOverride = {
          ...entry,
          guidPath: { guids: translatedTail } as SymbolOverride["guidPath"],
        };
        const mutableChild = child as MutableFigDesignNode;
        const existing = mutableChild.derivedSymbolData ?? [];
        mutableChild.derivedSymbolData = [...existing, promoted];
        attached = true;
        break;
      }
      if (!attached) { continue; }
    }
  }
}

/**
 * Check whether a given id appears among the SYMBOL descendants of
 * an INSTANCE (walking through nested INSTANCEs' SYMBOLs as well).
 * Used by case-B promotion to avoid attaching overrides to a child
 * whose translation map coincidentally mapped the guid but whose
 * subtree doesn't actually contain that descendant.
 */
function symbolHasDescendantId(
  instance: FigDesignNode,
  targetId: string,
  ctx: BuildContext,
): boolean {
  if (!instance.symbolId) { return false; }
  const symbol = ctx.symbolMap.get(instance.symbolId);
  if (!symbol) { return false; }
  return walkContainsId(symbol.children ?? [], targetId, ctx);
}

function walkContainsId(
  nodes: readonly FigDesignNode[],
  targetId: string,
  ctx: BuildContext,
  depth = 0,
): boolean {
  if (depth > 10) { return false; }
  for (const n of nodes) {
    if (n.id === targetId) { return true; }
    if (n.children && n.children.length > 0) {
      if (walkContainsId(n.children, targetId, ctx, depth + 1)) { return true; }
    }
    // Recurse through nested INSTANCE's SYMBOL
    if (getNodeTypeName(n) === "INSTANCE" && n.symbolId) {
      const sym = ctx.symbolMap.get(n.symbolId);
      if (sym && walkContainsId(sym.children ?? [], targetId, ctx, depth + 1)) { return true; }
    }
  }
  return false;
}

function findDirectChildById(
  children: readonly FigDesignNode[],
  id: string,
): FigDesignNode | undefined {
  for (const child of children) {
    if (child.id === id) { return child; }
  }
  return undefined;
}

/**
 * Translate the tail guids of a multi-level override path into the
 * SYMBOL-scoped namespace used by the child INSTANCE's resolved
 * descendants.
 *
 * Only the first guid of the tail is translated — the same
 * "level-at-a-time" convention as the top-level
 * `translateOverrides` in @aurochs/fig/symbols. Deeper levels are
 * handled by subsequent nested resolveInstance calls recursively.
 */
function translateRemainingPathToSymbolNamespace(
  childInstance: FigDesignNode,
  tailGuids: readonly FigGuid[],
  ctx: BuildContext,
): readonly FigGuid[] | undefined {
  if (tailGuids.length === 0) { return undefined; }
  if (!childInstance.symbolId) { return undefined; }
  if (!ctx.rawSymbolMap) { return undefined; }

  const rawChildInstance = ctx.rawSymbolMap.get(childInstance.id);
  if (!rawChildInstance) {
    // The INSTANCE isn't in the raw map (may happen for synthetic
    // test trees). Without the raw node we can't build the
    // translation map; skip this promotion — better to drop the
    // override than apply one on the wrong node.
    return undefined;
  }

  const effectiveGuid = getEffectiveSymbolID(rawChildInstance);
  if (!effectiveGuid) { return undefined; }

  const resolvedSymbol = resolveSymbolGuidStr(effectiveGuid, ctx.rawSymbolMap);
  if (!resolvedSymbol) { return undefined; }

  // Seed the translation map with a synthetic override whose first
  // guid is `tailGuids[0]`. `buildGuidTranslationMap` derives its
  // mapping from the set of override guids it's asked about — without
  // this seed the child INSTANCE's own (empty) dsd/overrides produce
  // an empty map and we'd fall through to "no translation".
  //
  // Example: outer Close Button's dsd targets
  // `[Close_guid, inner_guid=5432:23135, text_guid=5426:2011]`.
  // After first-level translation and promotion into Close's tail,
  // the INSTANCE-scoped `5432:23135` must resolve to the
  // SYMBOL-scoped `15:407`. Close itself has no overrides, so the map
  // is empty unless we tell buildGuidTranslationMap "I need 5432:23135
  // matched". With the seeded entry in place, its localID-based
  // heuristics map it to SYMBOL descendant 15:407.
  const seed: import("@aurochs/fig/types").FigKiwiSymbolOverride = {
    guidPath: { guids: [tailGuids[0]] },
  } as unknown as import("@aurochs/fig/types").FigKiwiSymbolOverride;
  const seededOverrides = [
    ...(getInstanceSymbolOverrides(rawChildInstance) ?? []),
    seed,
  ];

  const translationMap = buildGuidTranslationMap(
    safeChildren(resolvedSymbol.node),
    rawChildInstance.derivedSymbolData,
    seededOverrides,
    rawChildInstance.componentPropAssignments,
    ctx.rawSymbolMap,
  );

  if (translationMap.size === 0) {
    return tailGuids;
  }

  const firstTailStr = guidToString(tailGuids[0]);
  const mapped = translationMap.get(firstTailStr);
  if (!mapped) {
    return tailGuids;
  }

  return [parseGuidStr(mapped), ...tailGuids.slice(1)];
}

/**
 * Parse a "sessionID:localID" string back into a FigGuid, mirroring
 * the private helper in `@aurochs/fig/symbols/guid-translation`.
 */
function parseGuidStr(s: string): FigGuid {
  const [session, local] = s.split(":");
  return { sessionID: Number(session), localID: Number(local) };
}

/**
 * Apply constraint-based layout resolution to children of a resized INSTANCE.
 *
 * When an INSTANCE has a different size than its SYMBOL and no derivedSymbolData
 * is available, each child's position and size are adjusted according to their
 * horizontal/vertical constraint settings.
 */
function applyConstraintResolution(
  children: readonly FigDesignNode[],
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

    const mutable = child as MutableFigDesignNode;

    // Update transform (position)
    mutable.transform = {
      ...child.transform,
      m02: resolution.posX,
      m12: resolution.posY,
    };

    // Update size
    if (resolution.sizeChanged) {
      mutable.size = { x: resolution.dimX, y: resolution.dimY };
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
function resolveInstance(
  node: FigDesignNode,
  ownChildren: readonly FigDesignNode[],
  ctx: BuildContext,
): ResolvedInstance {
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
    // If self-overrides set styleIdForFill/styleIdForStrokeFill,
    // resolve the fills/strokes from the style registry
    if (merged.styleIdForFill) {
      const resolved = ctx.styleRegistry.fills.get(guidToString(merged.styleIdForFill.guid));
      if (resolved) { merged.fills = resolved; }
    }
    if (merged.styleIdForStrokeFill) {
      const resolved = ctx.styleRegistry.strokes.get(guidToString(merged.styleIdForStrokeFill.guid));
      if (resolved) { merged.strokes = resolved; }
    }
  }

  // `merged` is mutated by Step 6 (size adjustment) and is the `effectiveNode`
  // returned to the caller. Keeping the mutable type here avoids an `as`
  // cast downstream — the cast would be a symptom that the type pipeline
  // is hiding which values are still in flux versus fully resolved.
  const effectiveNode: MutableFigDesignNode = merged;

  // ── Step 3: Clone children with overrides ──
  // INSTANCE children in .fig are typically empty — SYMBOL children are used.
  // When INSTANCE has own children (rare), those take precedence.
  let children: readonly FigDesignNode[];
  if (ownChildren.length > 0) {
    children = ownChildren.map(deepCloneDesignNode);
  } else {
    children = (symbol.children ?? []).map(deepCloneDesignNode);
  }

  // Apply per-child overrides from symbolOverrides
  if (node.overrides && node.overrides.length > 0) {
    applySymbolOverridesToChildren(children, node.overrides, symbolId, ctx.styleRegistry);
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
  children: readonly FigDesignNode[],
  ctx: BuildContext,
): readonly FigDesignNode[] {
  return children.map((child) => {
    const typeName = getNodeTypeName(child);
    if (typeName !== "INSTANCE") {
      if (child.children && child.children.length > 0) {
        const resolvedGrandchildren = resolveNestedInstances(child.children, ctx);
        if (resolvedGrandchildren !== child.children) {
          const updated: MutableFigDesignNode = { ...child, children: resolvedGrandchildren };
          return updated;
        }
      }
      return child;
    }

    const resolved = resolveInstance(child, child.children ?? [], ctx);
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
  entry: { readonly fillPaints?: readonly FigPaint[]; readonly styleIdForFill?: { readonly guid: { readonly sessionID: number; readonly localID: number } } },
  styleRegistry: FigStyleRegistry,
): readonly FigPaint[] | undefined {
  // Priority 1: styleIdForFill via style registry
  if (entry.styleIdForFill) {
    const resolved = styleRegistry.fills.get(guidToString(entry.styleIdForFill.guid));
    if (resolved) {
      return resolved;
    }
  }

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
    const name = (value as Record<string, unknown>).name;
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
      const childNodes = buildChildren(children, ctx);
      return buildFrameNode(node, ctx, childNodes);
    }

    case "INSTANCE": {
      // Resolve INSTANCE against its SYMBOL/COMPONENT:
      // - Merge visual properties (fills, cornerRadius, effects, etc.)
      // - Inherit children if instance has none
      const resolved = resolveInstance(node, children, ctx);
      const childNodes = buildChildren(resolved.children, ctx);
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
    rawSymbolMap: options.rawSymbolMap ?? undefined,
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
