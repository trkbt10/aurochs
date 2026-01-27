/**
 * Picture types shared across OOXML formats.
 */

import type { DrawingBlipFill } from "./blip";
import type { NonVisualPictureProps } from "./non-visual";
import type { DrawingShapeProperties } from "./shape-properties";

/**
 * Picture element (pic:pic).
 *
 * @see ECMA-376 Part 1, Section 20.2.2.6 (pic)
 */
export type DrawingPicture = {
  /** Non-visual properties */
  readonly nvPicPr?: NonVisualPictureProps;
  /** Blip fill */
  readonly blipFill?: DrawingBlipFill;
  /** Shape properties */
  readonly spPr?: DrawingShapeProperties;
};

