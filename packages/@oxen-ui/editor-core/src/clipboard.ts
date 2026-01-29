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






export function incrementPasteCount<TPayload>(
  content: ClipboardContent<TPayload>,
): ClipboardContent<TPayload> {
  return {
    ...content,
    pasteCount: content.pasteCount + 1,
  };
}






export function markAsCut<TPayload>(
  content: ClipboardContent<TPayload>,
): ClipboardContent<TPayload> {
  return { ...content, isCut: true };
}






export function markAsCopy<TPayload>(
  content: ClipboardContent<TPayload>,
): ClipboardContent<TPayload> {
  return { ...content, isCut: false };
}

