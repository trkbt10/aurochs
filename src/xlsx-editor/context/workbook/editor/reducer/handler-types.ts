/**
 * @file Handler type definitions for XLSX editor
 *
 * Type definitions for reducer action handlers.
 */

import type { XlsxEditorState, XlsxEditorAction } from "../types";

/**
 * Action handler function type
 */
export type ActionHandler<A extends XlsxEditorAction = XlsxEditorAction> = (
  state: XlsxEditorState,
  action: A,
) => XlsxEditorState;

/**
 * Handler map type - maps action types to their handlers
 */
export type HandlerMap = {
  readonly [K in XlsxEditorAction["type"]]?: ActionHandler<
    Extract<XlsxEditorAction, { type: K }>
  >;
};
