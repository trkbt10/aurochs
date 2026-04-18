/**
 * @file Style Registry — resolves styleId references to FigPaint arrays
 *
 * Figma's .fig format uses `styleIdForFill` / `styleIdForStrokeFill` to
 * reference shared styles. A `StyleId` carries up to two reference keys:
 *
 * 1. `guid` — a local GUID pointing at a style-definition node in the
 *    same file.
 * 2. `assetRef.key` — a team-library asset key pointing at a style
 *    imported from another Figma file. Figma emits a local proxy node
 *    (typically on the Internal Only Canvas) whose own `key` matches
 *    this assetRef.key and whose own `fillPaints` / `strokePaints`
 *    carry the resolved paint value. The proxy has `styleType` set
 *    (e.g. FILL).
 *
 * Both key spaces are stored in a single map; GUID keys are formatted
 * via `guidToString` and assetRef keys are stored verbatim. The two
 * namespaces do not collide because GUID strings have the form
 * "sessionID:localID" (digits and a colon only) whereas assetRef keys
 * are hex content hashes.
 *
 * When a `symbolOverride` sets `styleIdForFill` on a child node, the
 * child's `fillPaints` (inherited from the SYMBOL) becomes stale and must
 * be replaced with the paint array resolved through this registry.
 */

import type { FigNode, MutableFigNode, FigPaint, FigStyleId } from "../types";
import type { FigStyleRegistry } from "../domain/document";
import { guidToString } from "@aurochs/fig/parser";

// =============================================================================
// Construction
// =============================================================================

/**
 * Extract the lookup key for a style reference.
 *
 * Prefers `guid` over `assetRef.key` when both are present: same-file
 * references are considered authoritative. Returns undefined when the
 * reference carries neither.
 */
export function styleRefKey(ref: FigStyleId | undefined): string | undefined {
  if (!ref) return undefined;
  if (ref.guid) return guidToString(ref.guid);
  if (ref.assetRef?.key) return ref.assetRef.key;
  return undefined;
}

/**
 * Extract all lookup keys carried by a style reference.
 *
 * When both `guid` and `assetRef.key` are present, either may resolve —
 * consumers try keys in preference order (guid, then assetRef) until one
 * hits. Returning both keeps `styleRefKey` simple for the common case
 * while still supporting files where the guid is dangling but the
 * asset-ref proxy is present.
 */
export function styleRefKeys(ref: FigStyleId | undefined): readonly string[] {
  if (!ref) return [];
  const keys: string[] = [];
  if (ref.guid) keys.push(guidToString(ref.guid));
  if (ref.assetRef?.key) keys.push(ref.assetRef.key);
  return keys;
}

/**
 * Build a style registry from a node map.
 *
 * Two indexing strategies are merged into a single map:
 *
 * - GUID path: for every node that references a style via
 *   `styleIdForFill.guid` or `styleIdForStrokeFill.guid`, look up the
 *   referenced node by GUID and store its own paint array.
 * - AssetRef path: for every node that IS a style-definition proxy
 *   (has a non-empty `key` and a `styleType` — Figma emits these on
 *   the Internal Only Canvas to resolve assetRef references locally),
 *   store its paint array under its `key`.
 *
 * Consumer nodes may carry stale `fillPaints` caches that don't match
 * the style definition, so we always look up the definition directly.
 */
export function buildFigStyleRegistry(nodeMap: ReadonlyMap<string, FigNode>): FigStyleRegistry {
  const fills = new Map<string, readonly FigPaint[]>();
  const strokes = new Map<string, readonly FigPaint[]>();

  // Strategy 1: Resolve guid-based references.
  const fillGuids = new Set<string>();
  const strokeGuids = new Set<string>();
  for (const [, node] of nodeMap) {
    if (node.styleIdForFill?.guid) {
      fillGuids.add(guidToString(node.styleIdForFill.guid));
    }
    if (node.styleIdForStrokeFill?.guid) {
      strokeGuids.add(guidToString(node.styleIdForStrokeFill.guid));
    }
  }
  for (const g of fillGuids) {
    const n = nodeMap.get(g);
    if (n?.fillPaints && n.fillPaints.length > 0) fills.set(g, n.fillPaints);
  }
  for (const g of strokeGuids) {
    const n = nodeMap.get(g);
    if (n?.strokePaints && n.strokePaints.length > 0) strokes.set(g, n.strokePaints);
  }

  // Strategy 2: Register every node that is itself a style-definition
  // proxy under its assetRef key. A proxy has both `styleType` and a
  // non-empty `key`; its paint array is authoritative for any consumer
  // whose `styleIdForFill.assetRef.key` matches that key.
  for (const [, node] of nodeMap) {
    if (!node.styleType || typeof node.key !== "string" || node.key.length === 0) continue;
    const typeName = node.styleType.name;
    if (typeName === "FILL" && node.fillPaints && node.fillPaints.length > 0) {
      fills.set(node.key, node.fillPaints);
    }
    if (typeName === "STROKE" && node.strokePaints && node.strokePaints.length > 0) {
      strokes.set(node.key, node.strokePaints);
    }
  }

  return { fills, strokes };
}

// =============================================================================
// Resolution
// =============================================================================

/**
 * Resolve styleIdForFill / styleIdForStrokeFill on an immutable FigNode.
 *
 * If the node's `styleIdForFill` references a style in the registry,
 * returns a new node with `fillPaints` replaced by the registry value.
 * Returns the original node unchanged if no resolution is needed.
 *
 * This handles the case where a node's `fillPaints` is stale
 * (style was changed after the node's fillPaints cache was set).
 */
export function resolveNodeStyleIds(
  node: FigNode,
  registry: FigStyleRegistry,
): FigNode {
  if (!node.styleIdForFill && !node.styleIdForStrokeFill) {
    return node;
  }

  let fillPaints = node.fillPaints;
  let strokePaints = node.strokePaints;
  let changed = false;

  const fillResolved = resolvePaintFromRegistry(node.styleIdForFill, registry.fills);
  if (fillResolved && fillResolved !== fillPaints) {
    fillPaints = fillResolved;
    changed = true;
  }

  const strokeResolved = resolvePaintFromRegistry(node.styleIdForStrokeFill, registry.strokes);
  if (strokeResolved && strokeResolved !== strokePaints) {
    strokePaints = strokeResolved;
    changed = true;
  }

  if (!changed) {
    return node;
  }

  return { ...node, fillPaints, strokePaints } as FigNode;
}

/**
 * Resolve a paint array through a registry using any of the reference's
 * keys. Tries guid first (authoritative same-file reference), falls back
 * to assetRef.key when present. Returns undefined when neither hits.
 */
function resolvePaintFromRegistry(
  ref: FigStyleId | undefined,
  map: ReadonlyMap<string, readonly FigPaint[]>,
): readonly FigPaint[] | undefined {
  for (const k of styleRefKeys(ref)) {
    const v = map.get(k);
    if (v) return v;
  }
  return undefined;
}

/**
 * Resolve styleIdForFill / styleIdForStrokeFill on a mutable node clone.
 *
 * Used inside `applyOverrides` where nodes are MutableFigNode clones
 * created by `deepCloneNode`.
 */
export function resolveStyleIdOnMutableNode(
  node: MutableFigNode,
  registry: FigStyleRegistry,
): void {
  const fills = resolvePaintFromRegistry(node.styleIdForFill, registry.fills);
  if (fills) node.fillPaints = fills;

  const strokes = resolvePaintFromRegistry(node.styleIdForStrokeFill, registry.strokes);
  if (strokes) node.strokePaints = strokes;
}

