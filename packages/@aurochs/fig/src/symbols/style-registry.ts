/**
 * @file Style Registry — maps styleId GUIDs to FigPaint arrays
 *
 * Figma's .fig format uses `styleIdForFill` (a StyleId with a GUID) to
 * reference shared fill styles. Each node that uses a fill style has both
 * `styleIdForFill` and `fillPaints` set — the `fillPaints` is the resolved
 * paint array for that style.
 *
 * When a `symbolOverride` sets `styleIdForFill` on a child node, the
 * child's `fillPaints` (inherited from the SYMBOL) becomes stale and must
 * be replaced with the paint array from the referenced style.
 *
 * This module builds the mapping by scanning all nodes for
 * (styleIdForFill, fillPaints) pairs, then provides lookup during
 * override application.
 */

import type { FigNode, MutableFigNode, FigPaint } from "../types";
import type { FigStyleRegistry } from "../domain/document";
import { guidToString } from "@aurochs/fig/parser";

// =============================================================================
// Construction
// =============================================================================

/**
 * Build a style registry from a node map.
 *
 * In Figma's .fig format, shared styles are stored as regular nodes
 * whose GUID matches the `styleIdForFill` / `styleIdForStrokeFill`
 * references on consumer nodes. The style definition node's own
 * `fillPaints` / `strokePaints` is the authoritative paint for that style.
 *
 * Consumer nodes may carry stale `fillPaints` caches that don't match
 * the style definition, so we always look up the definition node directly.
 *
 * Algorithm:
 * 1. Collect all style GUIDs referenced by styleIdForFill / styleIdForStrokeFill
 * 2. For each GUID, look up the corresponding node in nodeMap
 * 3. Use that node's fillPaints / strokePaints as the authoritative value
 */
export function buildFigStyleRegistry(nodeMap: ReadonlyMap<string, FigNode>): FigStyleRegistry {
  // Step 1: Collect all referenced style GUIDs
  const fillStyleIds = new Set<string>();
  const strokeStyleIds = new Set<string>();

  for (const [, node] of nodeMap) {
    if (node.styleIdForFill) {
      fillStyleIds.add(guidToString(node.styleIdForFill.guid));
    }
    if (node.styleIdForStrokeFill) {
      strokeStyleIds.add(guidToString(node.styleIdForStrokeFill.guid));
    }
  }

  // Step 2 & 3: Look up style definition nodes and extract their paints
  const fills = new Map<string, readonly FigPaint[]>();
  for (const styleGuid of fillStyleIds) {
    const styleNode = nodeMap.get(styleGuid);
    if (styleNode?.fillPaints && styleNode.fillPaints.length > 0) {
      fills.set(styleGuid, styleNode.fillPaints);
    }
  }

  const strokes = new Map<string, readonly FigPaint[]>();
  for (const styleGuid of strokeStyleIds) {
    const styleNode = nodeMap.get(styleGuid);
    if (styleNode?.strokePaints && styleNode.strokePaints.length > 0) {
      strokes.set(styleGuid, styleNode.strokePaints);
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

  if (node.styleIdForFill) {
    const resolved = registry.fills.get(guidToString(node.styleIdForFill.guid));
    if (resolved && resolved !== fillPaints) {
      fillPaints = resolved;
      changed = true;
    }
  }

  if (node.styleIdForStrokeFill) {
    const resolved = registry.strokes.get(guidToString(node.styleIdForStrokeFill.guid));
    if (resolved && resolved !== strokePaints) {
      strokePaints = resolved;
      changed = true;
    }
  }

  if (!changed) {
    return node;
  }

  return { ...node, fillPaints, strokePaints } as FigNode;
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
  if (node.styleIdForFill) {
    const paints = registry.fills.get(guidToString(node.styleIdForFill.guid));
    if (paints) {
      node.fillPaints = paints;
    }
  }

  if (node.styleIdForStrokeFill) {
    const paints = registry.strokes.get(guidToString(node.styleIdForStrokeFill.guid));
    if (paints) {
      node.strokePaints = paints;
    }
  }
}

