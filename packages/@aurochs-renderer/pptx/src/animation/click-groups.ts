/**
 * @file Click group extraction
 *
 * Extracts click groups from PPTX timing trees for step-by-step playback.
 * This is separate from the player which only handles playback logic.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import type {
  TimeNode,
  ParallelTimeNode,
  SequenceTimeNode,
  ExclusiveTimeNode,
} from "@aurochs-office/pptx/domain/animation";

// =============================================================================
// Types
// =============================================================================

/**
 * Click group for step-by-step animation playback.
 *
 * Represents a group of animations that play on a single click/tap in PowerPoint.
 * In ECMA-376, these are `clickEffect` nodes within the `mainSeq` sequence.
 *
 * @see ECMA-376 Part 1, Section 19.5.33 (cTn nodeType)
 */
export type ClickGroup = {
  /** 0-based group index */
  readonly index: number;
  /** Time nodes to play for this click */
  readonly nodes: readonly TimeNode[];
  /** Whether this group auto-advances without waiting for click */
  readonly isAutoAdvance: boolean;
};

/**
 * Timing-like object for extraction.
 */
export type TimingLike = {
  readonly rootTimeNode?: TimeNode;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a time node is a container node (has children).
 */
function isContainerNode(node: TimeNode): node is ParallelTimeNode | SequenceTimeNode | ExclusiveTimeNode {
  return "children" in node;
}

/**
 * Find the main sequence node in a timing tree.
 *
 * The main sequence is a sequence node with nodeType="mainSeq".
 * It contains click groups that advance on user interaction.
 *
 * @see ECMA-376 Part 1, Section 19.5.33 (cTn nodeType)
 */
function findMainSequence(rootNode: TimeNode | undefined): SequenceTimeNode | null {
  if (!rootNode) {
    return null;
  }

  function traverse(node: TimeNode): SequenceTimeNode | null {
    // Check if this node is the main sequence
    if (node.type === "sequence" && node.nodeType === "mainSeq") {
      return node;
    }

    // Recurse into container nodes
    if (isContainerNode(node)) {
      for (const child of node.children) {
        const result = traverse(child);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  return traverse(rootNode);
}

/**
 * Check if a time node has an auto-advance condition (plays without click).
 *
 * Nodes with afterEffect or delay-only conditions auto-advance.
 * Nodes with onClick or onNext require user interaction.
 */
function hasAutoAdvanceCondition(node: TimeNode): boolean {
  // afterEffect and withEffect auto-advance
  if (node.nodeType === "afterEffect" || node.nodeType === "withEffect") {
    return true;
  }

  // Check start conditions for onClick/onNext
  if (node.startConditions) {
    for (const cond of node.startConditions) {
      if (cond.event === "onClick" || cond.event === "onNext") {
        return false;
      }
    }
  }

  // Default: auto-advance if no explicit click trigger
  return true;
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Extract click groups from timing tree.
 *
 * Click groups represent sets of animations that play together on a single
 * click/tap. In PowerPoint, each click advances through these groups.
 *
 * @example
 * ```typescript
 * const groups = extractClickGroups(timing);
 * // groups[0] = first click group
 * // groups[1] = second click group
 * // etc.
 * ```
 */
export function extractClickGroups(timing: TimingLike | null): ClickGroup[] {
  if (!timing?.rootTimeNode) {
    return [];
  }

  const mainSeq = findMainSequence(timing.rootTimeNode);
  if (!mainSeq) {
    return [];
  }

  const groups: ClickGroup[] = [];

  for (const child of mainSeq.children) {
    // clickEffect nodes are click boundaries
    // Also include clickPar for paragraph-level builds
    if (child.nodeType === "clickEffect" || child.nodeType === "clickPar") {
      groups.push({
        index: groups.length,
        nodes: [child],
        isAutoAdvance: hasAutoAdvanceCondition(child),
      });
    }
  }

  return groups;
}
