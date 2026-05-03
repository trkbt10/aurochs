/** @file Resolve the current user intent from fig editor state. */

import type { DragState } from "@aurochs-ui/editor-core/drag-state";
import type { FigNodeId } from "@aurochs/fig/domain";
import type { FigCreationMode, FigTextEditState } from "./types";

export type FigUserIntentKind =
  | "select"
  | "path-edit"
  | "create-frame"
  | "create-rectangle"
  | "create-ellipse"
  | "create-line"
  | "create-star"
  | "create-polygon"
  | "create-text"
  | "text-edit"
  | "pending-move"
  | "move"
  | "pending-resize"
  | "resize"
  | "pending-rotate"
  | "rotate"
  | "marquee"
  | "create-drag";

export type FigUserIntent = {
  readonly kind: FigUserIntentKind;
  readonly source: "tool" | "text-edit" | "drag";
};

export type ResolveFigUserIntentOptions = {
  readonly creationMode: FigCreationMode;
  readonly textEdit: FigTextEditState;
  readonly drag: DragState<FigNodeId>;
};

/** Resolve the active user intent with explicit precedence: text edit, drag, then tool. */
export function resolveFigUserIntent({
  creationMode,
  textEdit,
  drag,
}: ResolveFigUserIntentOptions): FigUserIntent {
  if (textEdit.type === "active") {
    return { kind: "text-edit", source: "text-edit" };
  }

  if (drag.type !== "idle") {
    return { kind: drag.type === "create" ? "create-drag" : drag.type, source: "drag" };
  }

  return resolveToolIntent(creationMode);
}

function resolveToolIntent(mode: FigCreationMode): FigUserIntent {
  switch (mode.type) {
    case "select":
      return { kind: "select", source: "tool" };
    case "pen":
      return { kind: "path-edit", source: "tool" };
    case "frame":
      return { kind: "create-frame", source: "tool" };
    case "rectangle":
      return { kind: "create-rectangle", source: "tool" };
    case "ellipse":
      return { kind: "create-ellipse", source: "tool" };
    case "line":
      return { kind: "create-line", source: "tool" };
    case "star":
      return { kind: "create-star", source: "tool" };
    case "polygon":
      return { kind: "create-polygon", source: "tool" };
    case "text":
      return { kind: "create-text", source: "tool" };
  }
}

/** Returns true when the current intent creates or previews a newly-created node. */
export function isCreationIntent(intent: FigUserIntent): boolean {
  return intent.kind === "create-frame"
    || intent.kind === "create-rectangle"
    || intent.kind === "create-ellipse"
    || intent.kind === "create-line"
    || intent.kind === "create-star"
    || intent.kind === "create-polygon"
    || intent.kind === "create-text";
}

/** Returns true when the current intent is manipulating existing selection chrome. */
export function isSelectionTransformIntent(intent: FigUserIntent): boolean {
  return intent.kind === "pending-move"
    || intent.kind === "move"
    || intent.kind === "pending-resize"
    || intent.kind === "resize"
    || intent.kind === "pending-rotate"
    || intent.kind === "rotate";
}
