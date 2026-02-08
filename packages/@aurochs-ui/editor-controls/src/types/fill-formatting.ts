/**
 * @file Generic fill formatting type
 *
 * Represents fill state in a format-agnostic way.
 * Only covers none + solid as first-class; gradient/pattern/image
 * are represented as "other" (opaque) and rendered via format-specific slots.
 */

export type FillFormatting =
  | { readonly type: "none" }
  | { readonly type: "solid"; readonly color: string }
  | { readonly type: "other"; readonly label: string };
