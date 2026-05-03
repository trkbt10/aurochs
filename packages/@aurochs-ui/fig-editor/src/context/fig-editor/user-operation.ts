/** @file Domain object for operations permitted by the current fig user intent. */

import type { FigUserIntent } from "./user-intent";
import { isCreationIntent, isSelectionTransformIntent } from "./user-intent";
import type { FigNodeMutationSource } from "./types";

export type FigUserOperation =
  | "set-document"
  | "edit-page"
  | "add-node"
  | "update-property"
  | "update-text-edit"
  | "update-path-edit"
  | "reorder-node"
  | "set-tool"
  | "undo"
  | "redo"
  | "copy-selection"
  | "paste"
  | "delete-selection"
  | "duplicate-selection"
  | "group-selection"
  | "make-component"
  | "make-symbol"
  | "outline-selection"
  | "boolean-operation"
  | "exit-text-edit"
  | "select-node"
  | "clear-selection"
  | "start-move"
  | "start-resize"
  | "start-rotate"
  | "preview-move"
  | "preview-resize"
  | "preview-rotate"
  | "commit-transform"
  | "marquee-select"
  | "start-create"
  | "commit-create"
  | "enter-text-edit"
  | "resolve-path-target"
  | "edit-vector-path"
  | "open-context-menu";

export type FigUserOperationDomain = {
  readonly intent: FigUserIntent;
  readonly allowed: ReadonlySet<FigUserOperation>;
};

/** Builds the operation domain for the current user intent. UI handlers must consume this gate before dispatching. */
export function resolveFigUserOperationDomain(intent: FigUserIntent): FigUserOperationDomain {
  return { intent, allowed: new Set(resolveAllowedOperations(intent)) };
}

/** Returns true when the operation is allowed for the current resolved intent. */
export function allowsFigUserOperation(domain: FigUserOperationDomain, operation: FigUserOperation): boolean {
  return domain.allowed.has(operation);
}

/** Returns true when a node mutation source is permitted by the current user intent. */
export function allowsFigNodeMutationSource(domain: FigUserOperationDomain, source: FigNodeMutationSource): boolean {
  switch (source) {
    case "property-panel":
    case "layer-panel":
      return allowsFigUserOperation(domain, "update-property");
    case "text-edit":
      return allowsFigUserOperation(domain, "update-text-edit");
    case "path-edit":
      return allowsFigUserOperation(domain, "update-path-edit");
    case "canvas-menu":
      return allowsFigUserOperation(domain, "outline-selection")
        || allowsFigUserOperation(domain, "boolean-operation")
        || allowsFigUserOperation(domain, "update-path-edit");
    case "test":
      return true;
  }
}

function resolveAllowedOperations(intent: FigUserIntent): readonly FigUserOperation[] {
  if (intent.kind === "text-edit") {
    return ["exit-text-edit", "update-text-edit"];
  }
  if (intent.kind === "path-edit") {
    return [
      "set-tool",
      "add-node",
      "update-path-edit",
      "resolve-path-target",
      "select-node",
      "edit-vector-path",
      "open-context-menu",
    ];
  }
  if (isCreationIntent(intent) || intent.kind === "create-drag") {
    const operations: FigUserOperation[] = [
      "start-create",
      "commit-create",
      "open-context-menu",
    ];
    if (isCreationIntent(intent)) {
      operations.push("set-tool");
    }
    return operations;
  }
  if (intent.kind === "select") {
    return [
      "set-tool",
      "undo",
      "redo",
      "copy-selection",
      "paste",
      "delete-selection",
      "duplicate-selection",
      "group-selection",
      "make-component",
      "make-symbol",
      "outline-selection",
      "boolean-operation",
      "set-document",
      "edit-page",
      "add-node",
      "update-property",
      "reorder-node",
      "select-node",
      "clear-selection",
      "start-move",
      "start-resize",
      "start-rotate",
      "marquee-select",
      "enter-text-edit",
      "open-context-menu",
    ];
  }
  if (intent.kind === "marquee") {
    return ["marquee-select"];
  }
  if (isSelectionTransformIntent(intent)) {
    return [
      intent.kind === "pending-move" || intent.kind === "move" ? "preview-move" : undefined,
      intent.kind === "pending-resize" || intent.kind === "resize" ? "preview-resize" : undefined,
      intent.kind === "pending-rotate" || intent.kind === "rotate" ? "preview-rotate" : undefined,
      "commit-transform",
    ].filter((operation): operation is FigUserOperation => operation !== undefined);
  }
  return [];
}
