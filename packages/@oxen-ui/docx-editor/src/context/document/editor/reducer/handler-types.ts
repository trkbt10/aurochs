/**
 * @file DOCX Editor Handler Types
 *
 * Type definitions for action handlers and handler maps.
 */

import type { DocxEditorState, DocxEditorAction } from "../types";

// =============================================================================
// Handler Type Definitions
// =============================================================================

/**
 * Action handler function signature.
 *
 * Takes current state and action, returns new state.
 * Must be a pure function with no side effects.
 */
export type ActionHandler<A extends DocxEditorAction = DocxEditorAction> = (
  state: DocxEditorState,
  action: A,
) => DocxEditorState;

/**
 * Handler map type.
 *
 * Maps action types to their handlers with proper type inference.
 */
export type HandlerMap = {
  readonly [K in DocxEditorAction["type"]]?: ActionHandler<
    Extract<DocxEditorAction, { type: K }>
  >;
};

// =============================================================================
// Handler Utilities
// =============================================================================

/**
 * Create a typed handler for a specific action type.
 *
 * This helper ensures type safety when defining individual handlers.
 */
export function createHandler<K extends DocxEditorAction["type"]>(
  _type: K,
  handler: ActionHandler<Extract<DocxEditorAction, { type: K }>>,
): ActionHandler<Extract<DocxEditorAction, { type: K }>> {
  return handler;
}

/**
 * Combine multiple handler maps into one.
 *
 * Later maps override earlier ones for the same action type.
 */
export function combineHandlers(...maps: readonly HandlerMap[]): HandlerMap {
  return Object.assign({}, ...maps);
}
