/**
 * @file Constraint resolution for INSTANCE nodes
 *
 * When an INSTANCE is resized relative to its SYMBOL, child positions
 * and sizes must be adjusted according to their constraint settings.
 *
 * Per-child constraint math lives in @aurochs/fig/symbols (shared with builder).
 * This module provides the higher-level orchestration:
 * - applyConstraintsToChildren: depth-1 constraint application
 * - resolveInstanceLayout: strategy selection (derived vs constraint)
 */

import type { FigNode, FigMatrix, MutableFigNode } from "@aurochs/fig/types";
import { CONSTRAINT_TYPE_VALUES } from "@aurochs/fig/constants";
import { guidToString } from "@aurochs/fig/parser";
import { getConstraintValue, resolveChildConstraints } from "@aurochs/fig/symbols";
import type { FigDerivedSymbolData } from "./symbol-resolver";

// =============================================================================
// Apply constraints to children
// =============================================================================

/**
 * Apply constraint resolution to direct children of a symbol/instance.
 *
 * Only processes depth-1 children (not recursive). Each child's
 * horizontalConstraint and verticalConstraint determine how its
 * position and size adjust when the parent is resized.
 *
 * @param children     Cloned children from the SYMBOL
 * @param symbolSize   Original SYMBOL size { x, y }
 * @param instanceSize Actual INSTANCE size { x, y }
 * @returns New array of children with adjusted transforms and sizes
 */
export function applyConstraintsToChildren(
  children: readonly FigNode[],
  symbolSize: { x: number; y: number },
  instanceSize: { x: number; y: number },
): readonly FigNode[] {
  return children.map((child) => {
    const resolution = resolveChildConstraints(child, symbolSize, instanceSize);

    // No transform/size — skip
    if (!resolution) {return child;}

    // Nothing changed — skip
    if (!resolution.posChanged && !resolution.sizeChanged) {return child;}

    const result: MutableFigNode = {
      ...child,
      transform: {
        ...(child.transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 } satisfies FigMatrix),
        m02: resolution.posX,
        m12: resolution.posY,
      },
      size: {
        x: resolution.dimX,
        y: resolution.dimY,
      },
    };

    // When size changes, clear pre-baked geometry so the renderer
    // falls back to size-based shape rendering (rect, ellipse, etc.)
    if (resolution.sizeChanged) {
      result.fillGeometry = undefined;
      result.strokeGeometry = undefined;
    }

    return result;
  });
}

// =============================================================================
// Instance layout resolution
// =============================================================================

/**
 * Check whether derivedSymbolData entries reference GUIDs that actually
 * exist among the given children. Exported .fig files may carry
 * derivedSymbolData referencing external component library GUIDs that
 * don't exist in this file (orphaned entries).
 */
function isDerivedDataApplicable(derivedSymbolData: FigDerivedSymbolData, children: readonly FigNode[]): boolean {
  return derivedSymbolData.some((entry) => {
    const firstGuid = entry.guidPath?.guids?.[0];
    if (!firstGuid) {return false;}
    const key = guidToString(firstGuid);
    return children.some((child) => {
      return child.guid != null && guidToString(child.guid) === key;
    });
  });
}

/**
 * Clear fillGeometry/strokeGeometry on children whose size was changed by
 * derivedSymbolData, so the renderer falls back to size-based shape rendering.
 *
 * Returns the set of child GUID strings that were matched by dsd entries,
 * so callers can identify children NOT covered by dsd.
 */
function clearDerivedGeometry(derivedSymbolData: FigDerivedSymbolData, children: readonly FigNode[]): Set<string> {
  const matched = new Set<string>();
  for (const entry of derivedSymbolData) {
    if (!entry.size) {continue;}
    const targetGuid = entry.guidPath?.guids?.[entry.guidPath.guids.length - 1];
    if (!targetGuid) {continue;}
    const targetKey = guidToString(targetGuid);
    for (const child of children) {
      if (child.guid && guidToString(child.guid) === targetKey) {
        // Children are MutableFigNode clones from cloneSymbolChildren
        (child as MutableFigNode).fillGeometry = undefined;
        (child as MutableFigNode).strokeGeometry = undefined;
        matched.add(targetKey);
      }
    }
  }
  return matched;
}

/**
 * Result of instance layout resolution.
 */
export type InstanceLayoutResult = {
  /** Adjusted children array */
  readonly children: readonly FigNode[];
  /** Whether instance size should be applied to the merged node */
  readonly sizeApplied: boolean;
};

/**
 * Resolve layout for a resized INSTANCE's children.
 *
 * Strategy:
 * 1. If derivedSymbolData exists and its GUIDs match actual children,
 *    Figma has pre-computed the layout — use it as-is.
 *    When dsd only partially covers children (e.g. partial GUID translation),
 *    supplement with constraint-based resolution for uncovered children.
 * 2. Otherwise, fall back to constraint-based resolution.
 *
 * @param children           Cloned children (overrides already applied)
 * @param symbolSize         Original SYMBOL size
 * @param instanceSize       Actual INSTANCE size
 * @param derivedSymbolData  Pre-computed layout data (may be orphaned)
 */
export function resolveInstanceLayout(
  { children, symbolSize, instanceSize, derivedSymbolData }: { children: readonly FigNode[]; symbolSize: { x: number; y: number }; instanceSize: { x: number; y: number }; derivedSymbolData: FigDerivedSymbolData | undefined; }
): InstanceLayoutResult {
  // Strategy 1: derivedSymbolData with valid GUIDs
  if (derivedSymbolData && derivedSymbolData.length > 0) {
    if (isDerivedDataApplicable(derivedSymbolData, children)) {
      const coveredGuids = clearDerivedGeometry(derivedSymbolData, children);

      // Supplement: apply constraint-based resolution to children NOT
      // covered by dsd. This handles partial GUID translation where some
      // dsd entries couldn't be mapped to children (e.g. non-contiguous
      // session GUIDs that majority-vote can't resolve).
      const supplemented = supplementConstraints({ children, symbolSize, instanceSize, coveredGuids });

      return { children: supplemented, sizeApplied: true };
    }
  }

  // Strategy 2: constraint-based resolution
  const hasConstraints = children.some((child) => {
    return (
      getConstraintValue(child.horizontalConstraint) !== CONSTRAINT_TYPE_VALUES.MIN ||
      getConstraintValue(child.verticalConstraint) !== CONSTRAINT_TYPE_VALUES.MIN
    );
  });

  if (hasConstraints) {
    return {
      children: applyConstraintsToChildren(children, symbolSize, instanceSize),
      sizeApplied: true,
    };
  }

  // No derived data and no constraints: keep original layout
  return { children, sizeApplied: false };
}

/**
 * Apply constraint-based resolution to children that weren't covered
 * by derivedSymbolData (their GUIDs weren't in the dsd entries).
 * Children already covered by dsd are left as-is to preserve Figma's
 * pre-computed layout values.
 */
function supplementConstraints(
  { children, symbolSize, instanceSize, coveredGuids }: { children: readonly FigNode[]; symbolSize: { x: number; y: number }; instanceSize: { x: number; y: number }; coveredGuids: Set<string>; }
): readonly FigNode[] {
  return children.map((child) => {
    const guidKey = child.guid ? guidToString(child.guid) : undefined;

    // Skip children already handled by dsd
    if (guidKey && coveredGuids.has(guidKey)) {return child;}

    // Skip children without constraints
    if (
      getConstraintValue(child.horizontalConstraint) === CONSTRAINT_TYPE_VALUES.MIN &&
      getConstraintValue(child.verticalConstraint) === CONSTRAINT_TYPE_VALUES.MIN
    ) {
      return child;
    }

    const resolution = resolveChildConstraints(child, symbolSize, instanceSize);
    if (!resolution) {return child;}
    if (!resolution.posChanged && !resolution.sizeChanged) {return child;}

    const result: MutableFigNode = {
      ...child,
      transform: {
        ...(child.transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 } satisfies FigMatrix),
        m02: resolution.posX,
        m12: resolution.posY,
      },
      size: {
        x: resolution.dimX,
        y: resolution.dimY,
      },
    };

    if (resolution.sizeChanged) {
      result.fillGeometry = undefined;
      result.strokeGeometry = undefined;
    }

    return result;
  });
}
