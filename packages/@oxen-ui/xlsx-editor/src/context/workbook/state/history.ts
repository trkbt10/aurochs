/**
 * @file Undo/redo history (shared)
 *
 * Wraps `@oxen-ui/editor-core/history` without cross-package re-exports.
 */

import type { UndoRedoHistory as CoreUndoRedoHistory } from "@oxen-ui/editor-core/history";
import {
  canRedo as coreCanRedo,
  canUndo as coreCanUndo,
  createHistory as coreCreateHistory,
  pushHistory as corePushHistory,
  redoHistory as coreRedoHistory,
  undoHistory as coreUndoHistory,
} from "@oxen-ui/editor-core/history";

export type UndoRedoHistory<T> = CoreUndoRedoHistory<T>;

export const canRedo = coreCanRedo;
export const canUndo = coreCanUndo;
export const createHistory = coreCreateHistory;
export const pushHistory = corePushHistory;
export const redoHistory = coreRedoHistory;
export const undoHistory = coreUndoHistory;
