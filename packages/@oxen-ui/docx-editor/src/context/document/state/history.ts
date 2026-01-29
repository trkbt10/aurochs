/**
 * @file Undo/redo history (shared)
 *
 * Wraps `@oxen-ui/editor-core/history` without cross-package re-exports.
 */

import type { UndoRedoHistory as CoreUndoRedoHistory } from "@oxen-ui/editor-core/history";
import {
  canRedo as coreCanRedo,
  canUndo as coreCanUndo,
  clearHistory as coreClearHistory,
  createHistory as coreCreateHistory,
  pushHistory as corePushHistory,
  redoCount as coreRedoCount,
  redoHistory as coreRedoHistory,
  replacePresent as coreReplacePresent,
  undoCount as coreUndoCount,
  undoHistory as coreUndoHistory,
} from "@oxen-ui/editor-core/history";

export type UndoRedoHistory<T> = CoreUndoRedoHistory<T>;

export const canRedo = coreCanRedo;
export const canUndo = coreCanUndo;
export const clearHistory = coreClearHistory;
export const createHistory = coreCreateHistory;
export const pushHistory = corePushHistory;
export const redoCount = coreRedoCount;
export const redoHistory = coreRedoHistory;
export const replacePresent = coreReplacePresent;
export const undoCount = coreUndoCount;
export const undoHistory = coreUndoHistory;
