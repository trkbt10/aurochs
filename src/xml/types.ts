/**
 * @file XML type definitions
 */

/**
 * Branded string type for safe markup content.
 * Prevents mixing raw strings with escaped/safe markup.
 */
export type MarkupString = string & { readonly __brand: "MarkupString" };
