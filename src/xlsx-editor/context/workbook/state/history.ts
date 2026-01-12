/**
 * @file Undo/Redo history state management
 *
 * Generic history implementation for any state type.
 * Provides immutable operations for push, undo, and redo.
 */

import type { UndoRedoHistory } from "../editor/types";

// =============================================================================
// Functions
// =============================================================================

/**
 * Create initial history with given present value
 */
export function createHistory<T>(initial: T): UndoRedoHistory<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

/**
 * Push new state to history (clears future)
 */
export function pushHistory<T>(
  history: UndoRedoHistory<T>,
  newPresent: T,
): UndoRedoHistory<T> {
  return {
    past: [...history.past, history.present],
    present: newPresent,
    future: [],
  };
}

/**
 * Undo - move to previous state
 */
export function undoHistory<T>(
  history: UndoRedoHistory<T>,
): UndoRedoHistory<T> {
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
 * Redo - move to next state
 */
export function redoHistory<T>(
  history: UndoRedoHistory<T>,
): UndoRedoHistory<T> {
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

/**
 * Check if history can undo
 */
export function canUndo<T>(history: UndoRedoHistory<T>): boolean {
  return history.past.length > 0;
}

/**
 * Check if history can redo
 */
export function canRedo<T>(history: UndoRedoHistory<T>): boolean {
  return history.future.length > 0;
}
