/**
 * @file Completion Module Exports
 */

export type {
  CompletionItem,
  CompletionItemKind,
  CompletionContext,
  CompletionTrigger,
  CompletionProvider,
  CompletionState,
} from "./types";

export { INITIAL_COMPLETION_STATE } from "./types";

export {
  detectCompletionContext,
  collectCompletions,
  filterAndRankCompletions,
  applyCompletion,
} from "./vba-completion";

export { useVbaCompletion } from "./useVbaCompletion";
export type { UseVbaCompletionArgs, UseVbaCompletionResult } from "./useVbaCompletion";

export { detectParameterContext } from "./parameter-hints";
export type { ParameterHint, ParameterInfo } from "./parameter-hints";
