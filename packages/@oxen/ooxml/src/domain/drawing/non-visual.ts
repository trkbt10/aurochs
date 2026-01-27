/**
 * Non-visual drawing properties shared across OOXML formats.
 */

/**
 * Non-visual drawing properties.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.8 (cNvPr)
 * @see ECMA-376 Part 1, Section 20.4.2.4 (docPr)
 */
export type NonVisualDrawingProps = {
  /** Unique identifier */
  readonly id: number;
  /** Name of the drawing object */
  readonly name: string;
  /** Description (alt text) */
  readonly descr?: string;
  /** Title */
  readonly title?: string;
  /** Hidden */
  readonly hidden?: boolean;
};

/**
 * Non-visual picture properties.
 *
 * @see ECMA-376 Part 1, Section 20.2.2.5 (nvPicPr)
 */
export type NonVisualPictureProps = {
  /** Common non-visual properties */
  readonly cNvPr?: NonVisualDrawingProps;
};

