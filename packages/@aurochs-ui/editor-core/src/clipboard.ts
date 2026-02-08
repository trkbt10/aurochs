/**
 * @file Generic clipboard state
 *
 * Provides generic clipboard helpers shared across editors.
 */

export type ClipboardContent<TPayload> = {
  readonly payload: TPayload;
  readonly pasteCount: number;
  readonly isCut: boolean;
};


























/**
 * Create a new clipboard content object with a payload.
 */
export function createClipboardContent<TPayload>(params: {
  readonly payload: TPayload;
  readonly isCut?: boolean;
}): ClipboardContent<TPayload> {
  const { payload, isCut } = params;
  return {
    payload,
    pasteCount: 0,
    isCut: isCut ?? false,
  };
}


























/**
 * Increment the paste count of clipboard content.
 */
export function incrementPasteCount<TPayload>(
  content: ClipboardContent<TPayload>,
): ClipboardContent<TPayload> {
  return {
    ...content,
    pasteCount: content.pasteCount + 1,
  };
}


























/**
 * Mark clipboard content as cut (will be removed on paste).
 */
export function markAsCut<TPayload>(
  content: ClipboardContent<TPayload>,
): ClipboardContent<TPayload> {
  return { ...content, isCut: true };
}


























/**
 * Mark clipboard content as copy (will not be removed on paste).
 */
export function markAsCopy<TPayload>(
  content: ClipboardContent<TPayload>,
): ClipboardContent<TPayload> {
  return { ...content, isCut: false };
}

