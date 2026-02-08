/**
 * @file Undo/Redo history state management
 *
 * Generic history implementation for any state type.
 * Provides immutable operations for push, undo, and redo.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Undo/Redo history state.
 *
 * Uses the immutable triple-array pattern:
 * - past: Stack of previous states (most recent at end)
 * - present: Current state
 * - future: Stack of undone states (most recent at start)
 */
export type UndoRedoHistory<T> = {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new history with an initial state.
 */
export function createHistory<T>(initial: T): UndoRedoHistory<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

// =============================================================================
// History Operations
// =============================================================================

/**
 * Push a new state to history, clearing future.
 *
 * This is used when a new action is performed, which invalidates
 * any undone states in the future stack.
 */
export function pushHistory<T>(history: UndoRedoHistory<T>, newPresent: T): UndoRedoHistory<T> {
  return {
    past: [...history.past, history.present],
    present: newPresent,
    future: [],
  };
}

/**
 * Undo the last action.
 *
 * Moves present to future, and pops past to present.
 * Returns unchanged history if nothing to undo.
 */
export function undoHistory<T>(history: UndoRedoHistory<T>): UndoRedoHistory<T> {
  if (history.past.length === 0) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

/**
 * Redo the last undone action.
 *
 * Moves present to past, and pops future to present.
 * Returns unchanged history if nothing to redo.
 */
export function redoHistory<T>(history: UndoRedoHistory<T>): UndoRedoHistory<T> {
  if (history.future.length === 0) {
    return history;
  }

  const next = history.future[0];
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

// =============================================================================
// Query / Utility Functions
// =============================================================================

/**
 * Check if undo is available.
 */
export function canUndo<T>(history: UndoRedoHistory<T>): boolean {
  return history.past.length > 0;
}

/**
 * Check if redo is available.
 */
export function canRedo<T>(history: UndoRedoHistory<T>): boolean {
  return history.future.length > 0;
}

/**
 * Get the number of undo steps available.
 */
export function undoCount<T>(history: UndoRedoHistory<T>): number {
  return history.past.length;
}

/**
 * Get the number of redo steps available.
 */
export function redoCount<T>(history: UndoRedoHistory<T>): number {
  return history.future.length;
}

/**
 * Clear all history, keeping only present.
 */
export function clearHistory<T>(history: UndoRedoHistory<T>): UndoRedoHistory<T> {
  return {
    past: [],
    present: history.present,
    future: [],
  };
}

/**
 * Replace present without adding to history.
 *
 * Useful for minor updates that shouldn't create undo points.
 */
export function replacePresent<T>(history: UndoRedoHistory<T>, newPresent: T): UndoRedoHistory<T> {
  return {
    ...history,
    present: newPresent,
  };
}

