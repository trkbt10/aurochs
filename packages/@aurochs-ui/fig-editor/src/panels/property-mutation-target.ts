/** @file Property-panel mutation target domain. */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../context/fig-editor/types";

export type PropertyMutationTarget = {
  readonly primaryNode: FigDesignNode;
  readonly nodeIds: readonly FigNodeId[];
  readonly isMultiSelection: boolean;
};

/** Build the property-panel mutation target from the current selection state. */
export function createPropertyMutationTarget(params: {
  readonly primaryNode: FigDesignNode;
  readonly selectedNodes: readonly FigDesignNode[];
}): PropertyMutationTarget {
  const selectedIds = params.selectedNodes.map((node) => node.id);
  if (selectedIds.length === 0) {
    throw new Error("PropertyMutationTarget requires at least one selected node.");
  }
  if (!selectedIds.includes(params.primaryNode.id)) {
    throw new Error("PropertyMutationTarget primary node must be part of the selected nodes.");
  }

  return {
    primaryNode: params.primaryNode,
    nodeIds: Array.from(new Set(selectedIds)),
    isMultiSelection: selectedIds.length > 1,
  };
}

/** Create a property-panel node update action for every node in the target. */
export function createPropertyTargetUpdateAction(params: {
  readonly target: PropertyMutationTarget;
  readonly updater: (node: FigDesignNode) => FigDesignNode;
}): FigEditorAction {
  return {
    type: "UPDATE_NODES",
    source: "property-panel",
    nodeIds: params.target.nodeIds,
    updater: params.updater,
  };
}

/** Create a property-panel node update action for the target primary node only. */
export function createPropertyPrimaryUpdateAction(params: {
  readonly target: PropertyMutationTarget;
  readonly updater: (node: FigDesignNode) => FigDesignNode;
}): FigEditorAction {
  return {
    type: "UPDATE_NODE",
    source: "property-panel",
    nodeId: params.target.primaryNode.id,
    updater: params.updater,
  };
}
