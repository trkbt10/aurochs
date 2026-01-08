/**
 * @file Layout engine types
 *
 * Common types used by diagram layout algorithms.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import type { DiagramTreeNode } from "./tree-builder";
import type {
  DiagramAlgorithmType,
  DiagramAlgorithmParam,
  DiagramConstraint,
} from "../types";

// =============================================================================
// Layout Result Types
// =============================================================================

/**
 * Positioned node with calculated bounds
 */
export type LayoutNode = {
  /** Reference to the tree node */
  readonly treeNode: DiagramTreeNode;
  /** X position (left edge) */
  readonly x: number;
  /** Y position (top edge) */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Rotation angle in degrees (optional) */
  readonly rotation?: number;
  /** Child layout nodes */
  readonly children: readonly LayoutNode[];
};

/**
 * Layout bounds for a region
 */
export type LayoutBounds = {
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
};

/**
 * Result of layout calculation
 */
export type LayoutResult = {
  /** Root layout nodes */
  readonly nodes: readonly LayoutNode[];
  /** Total bounds of the layout */
  readonly bounds: LayoutBounds;
};

// =============================================================================
// Layout Context
// =============================================================================

/**
 * Context passed to layout algorithms
 */
export type LayoutContext = {
  /** Available bounds for layout */
  readonly bounds: LayoutBounds;
  /** Algorithm parameters */
  readonly params: ReadonlyMap<string, DiagramAlgorithmParamValue>;
  /** Constraints to apply */
  readonly constraints: readonly DiagramConstraint[];
  /** Default spacing between nodes */
  readonly defaultSpacing: number;
  /** Default node width */
  readonly defaultNodeWidth: number;
  /** Default node height */
  readonly defaultNodeHeight: number;
};

/**
 * Resolved algorithm parameter value
 */
export type DiagramAlgorithmParamValue = string | number | boolean;

// =============================================================================
// Algorithm Registration
// =============================================================================

/**
 * Layout algorithm function signature
 */
export type LayoutAlgorithmFn = (
  nodes: readonly DiagramTreeNode[],
  context: LayoutContext
) => LayoutResult;

/**
 * Registry of layout algorithms by type
 */
export type LayoutAlgorithmRegistry = ReadonlyMap<
  DiagramAlgorithmType,
  LayoutAlgorithmFn
>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a default layout context
 */
export function createDefaultContext(
  bounds: LayoutBounds,
  params?: readonly DiagramAlgorithmParam[],
  constraints?: readonly DiagramConstraint[]
): LayoutContext {
  const paramMap = new Map<string, DiagramAlgorithmParamValue>();
  if (params) {
    for (const param of params) {
      if (param.type && param.value !== undefined) {
        paramMap.set(param.type, param.value);
      }
    }
  }

  return {
    bounds,
    params: paramMap,
    constraints: constraints ?? [],
    defaultSpacing: 10,
    defaultNodeWidth: 100,
    defaultNodeHeight: 60,
  };
}

/**
 * Get a parameter value with fallback
 */
export function getParam<T extends DiagramAlgorithmParamValue>(
  context: LayoutContext,
  key: string,
  defaultValue: T
): T {
  const value = context.params.get(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Create empty layout result
 */
export function createEmptyResult(): LayoutResult {
  return {
    nodes: [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
  };
}

/**
 * Merge bounds to encompass all
 */
export function mergeBounds(...bounds: LayoutBounds[]): LayoutBounds {
  if (bounds.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
