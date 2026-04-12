/**
 * @file Text edit action handlers
 */

import type { HandlerMap } from "./handler-types";
import { createInactiveTextEditState } from "../types";

export const TEXT_EDIT_HANDLERS: HandlerMap = {
  ENTER_TEXT_EDIT(state, action) {
    return {
      ...state,
      textEdit: {
        type: "active",
        nodeId: action.nodeId,
      },
    };
  },

  EXIT_TEXT_EDIT(state) {
    return {
      ...state,
      textEdit: createInactiveTextEditState(),
    };
  },
};
