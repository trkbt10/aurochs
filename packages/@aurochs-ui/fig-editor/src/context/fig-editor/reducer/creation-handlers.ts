/**
 * @file Creation mode action handlers
 */

import type { HandlerMap } from "./handler-types";
import { createSelectMode } from "../types";

export const CREATION_HANDLERS: HandlerMap = {
  SET_CREATION_MODE(state, action) {
    return {
      ...state,
      creationMode: action.mode,
    };
  },
};
