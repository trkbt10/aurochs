/** @file Reducer-level guard for user-operation domain enforcement. */

import { resolveFigUserIntent } from "../user-intent";
import { allowsFigNodeMutationSource, allowsFigUserOperation, resolveFigUserOperationDomain } from "../user-operation";
import type { FigEditorAction, FigEditorState } from "../types";

/** Returns true when the current state permits the requested editor action. */
export function isFigEditorActionAllowed(state: FigEditorState, action: FigEditorAction): boolean {
  const domain = resolveFigUserOperationDomain(resolveFigUserIntent({
    creationMode: state.creationMode,
    textEdit: state.textEdit,
    drag: state.drag,
  }));

  switch (action.type) {
    case "SET_DOCUMENT":
      return allowsFigUserOperation(domain, "set-document");
    case "SELECT_PAGE":
    case "ADD_PAGE":
    case "DELETE_PAGE":
    case "MOVE_PAGE":
    case "RENAME_PAGE":
      return allowsFigUserOperation(domain, "edit-page");
    case "ADD_NODE":
      return allowsFigUserOperation(domain, "add-node") || allowsFigUserOperation(domain, "commit-create");
    case "UPDATE_NODE":
    case "UPDATE_NODES":
      return allowsFigNodeMutationSource(domain, action.source);
    case "ADD_IMAGE_ASSET":
    case "RENAME_NODE":
      return allowsFigNodeMutationSource(domain, action.source);
    case "REORDER_NODE":
      return allowsFigUserOperation(domain, "reorder-node");
    case "SET_CREATION_MODE":
      return allowsFigUserOperation(domain, "set-tool");
    case "SELECT_NODE":
    case "SELECT_MULTIPLE_NODES":
      return allowsFigUserOperation(domain, "select-node") || allowsFigUserOperation(domain, "marquee-select");
    case "CLEAR_NODE_SELECTION":
      return allowsFigUserOperation(domain, "clear-selection");
    case "ENTER_TEXT_EDIT":
      return allowsFigUserOperation(domain, "enter-text-edit");
    case "EXIT_TEXT_EDIT":
      return allowsFigUserOperation(domain, "exit-text-edit");
    case "DELETE_NODES":
      return allowsFigUserOperation(domain, "delete-selection");
    case "DUPLICATE_NODES":
      return allowsFigUserOperation(domain, "duplicate-selection");
    case "GROUP_SELECTION":
      return allowsFigUserOperation(domain, "group-selection");
    case "MAKE_COMPONENT_FROM_SELECTION":
      return allowsFigUserOperation(domain, "make-component");
    case "MAKE_SYMBOL_FROM_SELECTION":
      return allowsFigUserOperation(domain, "make-symbol");
    case "OUTLINE_SELECTION":
      return allowsFigUserOperation(domain, "outline-selection");
    case "BOOLEAN_OPERATION_SELECTION":
      return allowsFigUserOperation(domain, "boolean-operation");
    case "UNDO":
      return allowsFigUserOperation(domain, "undo");
    case "REDO":
      return allowsFigUserOperation(domain, "redo");
    case "COPY":
      return allowsFigUserOperation(domain, "copy-selection");
    case "PASTE":
      return allowsFigUserOperation(domain, "paste");
    case "START_PENDING_MOVE":
    case "START_MOVE":
      return allowsFigUserOperation(domain, "start-move");
    case "START_PENDING_RESIZE":
    case "START_RESIZE":
      return allowsFigUserOperation(domain, "start-resize");
    case "START_PENDING_ROTATE":
    case "START_ROTATE":
      return allowsFigUserOperation(domain, "start-rotate");
    case "CONFIRM_MOVE":
    case "PREVIEW_MOVE":
      return allowsFigUserOperation(domain, "preview-move");
    case "CONFIRM_RESIZE":
    case "PREVIEW_RESIZE":
      return allowsFigUserOperation(domain, "preview-resize");
    case "CONFIRM_ROTATE":
    case "PREVIEW_ROTATE":
      return allowsFigUserOperation(domain, "preview-rotate");
    case "END_DRAG":
    case "COMMIT_DRAG":
      return allowsFigUserOperation(domain, "commit-transform");
    case "START_MARQUEE":
    case "UPDATE_MARQUEE":
    case "END_MARQUEE":
      return allowsFigUserOperation(domain, "marquee-select");
    case "START_CREATE_DRAG":
      return allowsFigUserOperation(domain, "start-create");
    case "UPDATE_CREATE_DRAG":
    case "END_CREATE_DRAG":
    case "COMMIT_CREATION":
      return allowsFigUserOperation(domain, "commit-create");
  }
}
