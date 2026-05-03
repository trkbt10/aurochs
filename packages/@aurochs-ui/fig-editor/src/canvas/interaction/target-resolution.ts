/** @file Resolve canvas interaction targets from hit areas, selection mode, and point. */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { findNodeById } from "@aurochs-builder/fig/node-ops";
import { findDeepestBoundsAtPoint, type BoundsLike, type PointLike } from "./bounds";

export type CanvasTargetBounds = BoundsLike & {
  readonly id: string;
};

export type CanvasTargetMode = "select" | "path-edit";

export type ResolveCanvasInteractionTargetOptions = {
  readonly pageChildren: readonly FigDesignNode[];
  readonly itemBounds: readonly CanvasTargetBounds[];
  readonly point: PointLike;
  readonly hitNodeId: FigNodeId;
  readonly mode: CanvasTargetMode;
  readonly canEditPath: (node: FigDesignNode | undefined) => boolean;
};

/** Resolve the node that should receive the current canvas interaction. */
export function resolveCanvasInteractionTarget({
  pageChildren,
  itemBounds,
  point,
  hitNodeId,
  mode,
  canEditPath,
}: ResolveCanvasInteractionTargetOptions): FigNodeId {
  if (mode !== "path-edit") {
    return hitNodeId;
  }

  const targetBounds = findDeepestBoundsAtPoint(itemBounds, point, (bounds) => {
    return canEditPath(findNodeById(pageChildren, bounds.id as FigNodeId));
  });

  return targetBounds ? targetBounds.id as FigNodeId : hitNodeId;
}
