/**
 * @file Handler type definitions
 *
 * Type definitions for reducer action handlers.
 */

import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";

/**
 * Action handler function type
 */
export type ActionHandler<A extends PresentationEditorAction = PresentationEditorAction> = (
  state: PresentationEditorState,
  action: A
) => PresentationEditorState;

/**
 * Handler map type - maps action types to their handlers
 */
export type HandlerMap = {
  readonly [K in PresentationEditorAction["type"]]?: ActionHandler<
    Extract<PresentationEditorAction, { type: K }>
  >;
};
