/**
 * @file Handler type definitions for the fig editor reducer
 */

import type { FigEditorState, FigEditorAction } from "../types";

/**
 * Action handler function type.
 */
export type ActionHandler<A extends FigEditorAction = FigEditorAction> = (
  state: FigEditorState,
  action: A,
) => FigEditorState;

/**
 * Handler map type - maps action types to their handlers.
 */
export type HandlerMap = {
  readonly [K in FigEditorAction["type"]]?: ActionHandler<
    Extract<FigEditorAction, { type: K }>
  >;
};
