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

import type { FigDesignNode, SymbolOverride, MutableFigDesignNode } from "@aurochs/fig/domain";
import {
  isValidOverridePath,
  isSelfOverride,
  overridePathToIds,
  overrideEntries,
  applyOverrideToNode,
} from "@aurochs/fig/domain";
import type { FigPaint, FigVectorPath } from "@aurochs/fig/types";
import type { FigImage, FigBlob } from "@aurochs/fig/parser";
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
export type BuildSceneGraphOptions = {
  /** Binary blobs from .fig file */
  readonly blobs: readonly FigBlob[];
  /** Image lookup map */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Canvas size */
  readonly canvasSize: { width: number; height: number };
  /** Symbol map for INSTANCE resolution (domain objects) */
  readonly symbolMap?: ReadonlyMap<string, FigDesignNode>;
  /** Whether to include hidden nodes */
  readonly showHiddenNodes?: boolean;
};

/**
 * Internal build context
 */
type BuildContext = {
  readonly blobs: readonly FigBlob[];
  readonly images: ReadonlyMap<string, FigImage>;
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  readonly showHiddenNodes: boolean;
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
  const type = node.type;
  if (!type) { return "UNKNOWN"; }
  if (typeof type === "string") { return type; }
  // KiwiEnumValue fallback
  if (typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "UNKNOWN";
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
 * Check if a fills array is effectively empty (no visible fills).
 * Instance nodes in Figma .fig files typically have empty fillPaints,
 * with the actual fills stored on the SYMBOL.
 */
function hasVisibleFills(fills: readonly FigPaint[] | undefined): boolean {
  if (!fills || fills.length === 0) {return false;}
  return fills.some((p) => p.visible !== false);
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
  children: FigDesignNode[],
  overrides: readonly import("@aurochs/fig/domain").SymbolOverride[],
  symbolId: string,
): void {
  for (const override of overrides) {
    if (!isValidOverridePath(override)) { continue; }
    if (isSelfOverride(override, symbolId)) { continue; }

    const target = findNodeByOverridePath(children, override);
    if (!target) { continue; }

    applyOverrideToNode(target as MutableFigDesignNode, override);
  }
}

/**
 * Apply component property assignments to cloned children.
 *
 * Component properties allow INSTANCE nodes to override specific fields
 * on child nodes (text content, visibility, instance swap).
 */
function applyComponentPropertyAssignments(
  children: FigDesignNode[],
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
  nodes: FigDesignNode[],
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
            // Override text content from textValue.characters
            const textChars = assignedValue.textValue?.characters;
            if (textChars !== undefined && node.textData) {
              mutable.textData = { ...node.textData, characters: textChars };
              // Clear stale derived text data since text changed
              mutable.derivedTextData = undefined;
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
      applyPropsRecursive(node.children as FigDesignNode[], assignmentMap, _symbol);
    }
  }
}


/**
 * Apply derivedSymbolData (pre-computed layout) to cloned children.
 *
 * Each entry targets a child node via guidPath and updates layout properties
 * (transform, size, geometry). Avoids overwriting derivedTextData on nodes
 * whose text was already changed by componentPropertyAssignments (it would
 * contain stale glyph paths for the old text).
 */
function applyDerivedSymbolData(
  children: FigDesignNode[],
  derivedData: readonly SymbolOverride[],
): void {
  const textChangedIds = new Set<string>();
  collectTextChangedNodes(children, textChangedIds);

  for (const entry of derivedData) {
    if (!isValidOverridePath(entry)) { continue; }

    const target = findNodeByOverridePath(children, entry);
    if (!target) { continue; }

    applyOverrideToNode(
      target as MutableFigDesignNode,
      entry,
      { skipDerivedTextData: textChangedIds.has(target.id) },
    );
  }
}

/**
 * Collect IDs of nodes whose derivedTextData has been cleared
 * (indicating text was changed by componentPropertyAssignments).
 */
function collectTextChangedNodes(
  nodes: readonly FigDesignNode[],
  ids: Set<string>,
): void {
  for (const node of nodes) {
    if (node.derivedTextData === undefined && node.textData) {
      // A TEXT node without derivedTextData — may have been cleared
      // by CPA. We track it to avoid re-adding stale data.
      ids.add(node.id);
    }
    if (node.children) {
      collectTextChangedNodes(node.children, ids);
    }
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
  children: FigDesignNode[],
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
    return { effectiveNode: node, children: ownChildren };
  }

  // ── Step 1: Property merge ──
  // Inherit SYMBOL's visual properties where INSTANCE has no explicit value.
  const effectiveNode: FigDesignNode = {
    ...node,
    // Paint
    fills: hasVisibleFills(node.fills) ? node.fills : symbol.fills,
    strokes: (node.strokes?.length ?? 0) > 0 ? node.strokes : symbol.strokes,
    strokeWeight: node.strokeWeight ?? symbol.strokeWeight,
    strokeJoin: node.strokeJoin ?? symbol.strokeJoin,
    strokeCap: node.strokeCap ?? symbol.strokeCap,

    // Geometry
    cornerRadius: node.cornerRadius ?? symbol.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii ?? symbol.rectangleCornerRadii,
    cornerSmoothing: node.cornerSmoothing ?? symbol.cornerSmoothing,

    // Effects
    effects: (node.effects?.length ?? 0) > 0 ? node.effects : symbol.effects,

    // Blend mode (INSTANCE may be PASS_THROUGH → inherit from SYMBOL)
    blendMode: node.blendMode ?? symbol.blendMode,

    // Opacity: INSTANCE retains its own (for placement), but if not set, inherit
    // Note: opacity is always set (default 1), so this is effectively a no-op
    // unless the instance has opacity=1 and symbol has a different value.

    // Clipping
    clipsContent: node.clipsContent ?? symbol.clipsContent,
  };

  // ── Step 2: Self-overrides ──
  // Apply overrides where guidPath targets the symbol/instance frame itself.
  if (node.overrides && node.overrides.length > 0) {
    for (const override of node.overrides) {
      if (!isSelfOverride(override, symbolId) && !isSelfOverride(override, node.id)) {
        continue;
      }
      applyOverrideToNode(effectiveNode as MutableFigDesignNode, override);
    }
  }

  // ── Step 3: Clone children with overrides ──
  // Use own children if available, otherwise deep-clone from SYMBOL.
  let children: FigDesignNode[];
  if (ownChildren.length > 0) {
    children = ownChildren.map(deepCloneDesignNode);
  } else {
    children = (symbol.children ?? []).map(deepCloneDesignNode);
  }

  // Apply per-child overrides from symbolOverrides
  if (node.overrides && node.overrides.length > 0) {
    applySymbolOverridesToChildren(children, node.overrides, symbolId);
  }

  // ── Step 4: Component property assignments ──
  if (node.componentPropertyAssignments && node.componentPropertyAssignments.length > 0) {
    applyComponentPropertyAssignments(children, node.componentPropertyAssignments, symbol);
  }

  // ── Step 5: Derived symbol data (pre-computed layout for resized instances) ──
  // When the instance has a different size than the symbol, Figma computes
  // adjusted transform/size values for each child. These are stored as
  // override entries targeting child nodes.
  if (node.derivedSymbolData && node.derivedSymbolData.length > 0) {
    applyDerivedSymbolData(children, node.derivedSymbolData);
  }

  // ── Step 6: Constraint resolution for resized instances ──
  // When instance size differs from symbol size and no derivedSymbolData
  // provides pre-computed layout, apply constraint-based resolution.
  const instanceSize = node.size;
  const symbolSize = symbol.size;
  const sizeChanged = instanceSize.x !== symbolSize.x || instanceSize.y !== symbolSize.y;
  if (sizeChanged && (!node.derivedSymbolData || node.derivedSymbolData.length === 0)) {
    applyConstraintResolution(children, symbolSize, instanceSize);
  }

  return { effectiveNode, children };
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
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
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
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes }),
    clipsContent,
    children,
    clip: clipsContent ? { type: "rect", width: size.x, height: size.y, cornerRadius } : undefined,
  };
}

function buildRectNode(node: FigDesignNode, ctx: BuildContext): RectNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
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
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes }),
  };
}

function buildEllipseNode(node: FigDesignNode, ctx: BuildContext): EllipseNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
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
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes }),
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
        innerRadiusRatio: node.starInnerRadius ?? 0.382,
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
 * Apply per-path style overrides from vectorData.styleOverrideTable.
 * Maps each contour's geometryStyleId to a fill override.
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
    if (entry.fillPaints && entry.fillPaints.length > 0) {
      const fills = convertPaintsToFills(entry.fillPaints, ctx.images);
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
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
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
  const stroke = isStrokeGeometryRef.value ? undefined : convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes });

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

function extractAutoResizeName(rawAutoResize: unknown): string | undefined {
  if (typeof rawAutoResize === "string") {return rawAutoResize;}
  return (rawAutoResize as { name?: string } | undefined)?.name;
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
  const children = (node.children ?? []) as readonly FigDesignNode[];
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
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
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
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight, { strokeCap, strokeJoin, dashPattern: strokeDashes }),
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
    symbolMap: options.symbolMap ?? new Map(),
    showHiddenNodes: options.showHiddenNodes ?? false,
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
