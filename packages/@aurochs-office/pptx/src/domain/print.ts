/**
 * @file Print properties types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.2.1.28 - Print Properties
 */

// =============================================================================
// Print Types
// =============================================================================

/**
 * Print color mode.
 * @see ECMA-376 Part 1, Section 19.2.1.28 (prnPr)
 */
export type PrintColorMode =
  | "bw"
  | "gray"
  | "clr";

/**
 * Print output type.
 * @see ECMA-376 Part 1, Section 19.2.1.28 (prnPr)
 */
export type PrintWhat =
  | "slides"
  | "handouts1"
  | "handouts2"
  | "handouts3"
  | "handouts4"
  | "handouts6"
  | "handouts9"
  | "notes"
  | "outline";

/**
 * Print properties for presentation.
 * @see ECMA-376 Part 1, Section 19.2.1.28 (prnPr)
 */
export type PrintProperties = {
  readonly colorMode?: PrintColorMode;
  readonly frameSlides?: boolean;
  readonly hiddenSlides?: boolean;
  readonly printWhat?: PrintWhat;
  readonly scaleToFitPaper?: boolean;
};
