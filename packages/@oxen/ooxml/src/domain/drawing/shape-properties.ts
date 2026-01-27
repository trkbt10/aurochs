/**
 * Shape/outline types shared across OOXML formats.
 */

import type { EMU } from "../units";
import type { DrawingTransform } from "./transform";

/**
 * Line cap type.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.31 (ST_LineCap)
 */
export type LineCap = "flat" | "rnd" | "sq";

/**
 * Compound line type.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.33 (ST_CompoundLine)
 */
export type CompoundLine = "sng" | "dbl" | "thickThin" | "thinThick" | "tri";

/**
 * Outline properties.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */
export type DrawingOutline = {
  /** Width in EMUs */
  readonly w?: EMU;
  /** Cap type */
  readonly cap?: LineCap;
  /** Compound type */
  readonly cmpd?: CompoundLine;
  /** No fill */
  readonly noFill?: boolean;
  /** Solid fill color (hex) */
  readonly solidFill?: string;
};

/**
 * Shape properties for a picture or shape.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.35 (spPr)
 */
export type DrawingShapeProperties = {
  /** Transform */
  readonly xfrm?: DrawingTransform;
  /** Preset geometry */
  readonly prstGeom?: string;
  /** No fill */
  readonly noFill?: boolean;
  /** Solid fill color (hex) */
  readonly solidFill?: string;
  /** Outline */
  readonly ln?: DrawingOutline;
};

