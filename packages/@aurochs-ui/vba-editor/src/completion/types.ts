/**
 * @file Completion Types
 *
 * Types for VBA IntelliSense (code completion).
 */

import type { VbaProcedure } from "@aurochs-office/vba";

// =============================================================================
// Completion Item
// =============================================================================

/**
 * Kind of completion item for icon/styling.
 */
export type CompletionItemKind =
  | "keyword"    // Dim, Sub, Function, If, etc.
  | "type"       // Integer, String, Variant, etc.
  | "builtin"    // MsgBox, Left, Mid, etc.
  | "variable"   // User-defined variables
  | "procedure"  // Sub/Function from current module
  | "property"   // Property Get/Let/Set
  | "constant"   // vbCrLf, vbTab, etc.
  | "module";    // Module names for qualified access

/**
 * Completion item displayed in the popup.
 */
export type CompletionItem = {
  /** Display text */
  readonly label: string;
  /** Kind for icon/styling */
  readonly kind: CompletionItemKind;
  /** Short description (e.g., "String Function") */
  readonly detail?: string;
  /** Full documentation */
  readonly documentation?: string;
  /** Text to insert on accept (defaults to label) */
  readonly insertText?: string;
  /** Custom sort key (defaults to label) */
  readonly sortKey?: string;
};

// =============================================================================
// Completion Context
// =============================================================================

/**
 * What triggered completion.
 */
export type CompletionTrigger =
  | "manual"    // Ctrl+Space
  | "dot"       // After "."
  | "typing";   // While typing identifier

/**
 * Context for completion - where the cursor is.
 */
export type CompletionContext = {
  /** What triggered completion */
  readonly trigger: CompletionTrigger;
  /** Partial text before cursor (e.g., "Di" when typing "Dim") */
  readonly prefix: string;
  /** Where prefix starts in source */
  readonly prefixStartOffset: number;
  /** Current line number (1-based) */
  readonly line: number;
  /** Current column (1-based) */
  readonly column: number;
  /** Token type before cursor position (for context) */
  readonly precedingToken?: string;
  /** Object name before "." (for member completion) */
  readonly objectName?: string;
};

// =============================================================================
// Completion Provider
// =============================================================================

/**
 * Provider interface for completion sources.
 */
export type CompletionProvider = {
  /** Unique identifier */
  readonly id: string;
  /** Characters that auto-trigger this provider */
  readonly triggerCharacters?: readonly string[];
  /** Provide completion items for context */
  readonly provideCompletions: (
    context: CompletionContext,
    source: string,
    procedures: readonly VbaProcedure[],
  ) => readonly CompletionItem[];
};

// =============================================================================
// Completion State
// =============================================================================

/**
 * State for completion popup.
 */
export type CompletionState = {
  /** Is popup visible */
  readonly isOpen: boolean;
  /** Available completion items (filtered and sorted) */
  readonly items: readonly CompletionItem[];
  /** Currently highlighted item index */
  readonly highlightedIndex: number;
  /** Context that triggered completion */
  readonly context: CompletionContext | undefined;
};

/**
 * Initial completion state.
 */
export const INITIAL_COMPLETION_STATE: CompletionState = {
  isOpen: false,
  items: [],
  highlightedIndex: 0,
  context: undefined,
};
