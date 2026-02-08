/**
 * @file Adapter interface for bidirectional type conversion
 *
 * Each format-specific package (pptx-editor, docx-editor, xlsx-editor)
 * provides an adapter that converts between its native types and the
 * generic formatting types used by shared editors.
 */

/**
 * Bidirectional adapter between format-specific types and generic formatting types.
 *
 * @template TFormat - The format-specific type (e.g., PPTX RunProperties)
 * @template TGeneric - The generic formatting type (e.g., TextFormatting)
 */
export type FormattingAdapter<TFormat, TGeneric> = {
  /** Convert format-specific value to generic representation (for display). */
  readonly toGeneric: (value: TFormat) => TGeneric;
  /** Apply a partial generic update back to the format-specific value (for onChange). */
  readonly applyUpdate: (current: TFormat, update: Partial<TGeneric>) => TFormat;
};
