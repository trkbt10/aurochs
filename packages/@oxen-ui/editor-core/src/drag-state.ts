/**
 * @file Generic drag state helpers
 *
 * Provides minimal shared helpers for drag-state unions.
 */

export type IdleDragState = {
  readonly type: "idle";
};

export function createIdleDragState(): IdleDragState {
  return { type: "idle" };
}

export function isDragIdle<TDrag extends { readonly type: string }>(
  drag: TDrag,
): drag is Extract<TDrag, IdleDragState> {
  return drag.type === "idle";
}

