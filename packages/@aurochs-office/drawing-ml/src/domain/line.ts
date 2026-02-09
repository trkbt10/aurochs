/**
 * @file Common DrawingML line (stroke) types
 *
 * Renderer-agnostic line styling types shared across OOXML formats.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */

import type { Percent, Pixels } from "./units";
import type { BaseFill } from "./fill";

/**
 * Line end specification.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd/tailEnd)
 */
export type LineEnd = {
  readonly type: "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";
  readonly width: "sm" | "med" | "lg";
  readonly length: "sm" | "med" | "lg";
};

/**
 * Custom dash specification.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.21 (custDash)
 */
export type CustomDash = {
  readonly dashes: readonly {
    readonly dashLength: Percent;
    readonly spaceLength: Percent;
  }[];
};

/**
 * Line cap style.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.31 (ST_LineCap)
 */
export type LineCap = "flat" | "round" | "square";

/**
 * Line compound style.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.33 (ST_CompoundLine)
 */
export type CompoundLine = "sng" | "dbl" | "thickThin" | "thinThick" | "tri";

/**
 * Line join style.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.56 (ST_LineJoin)
 */
export type LineJoin = "bevel" | "miter" | "round";

/**
 * Base line properties shared across OOXML formats.
 */
export type BaseLine = {
  readonly width: Pixels;
  readonly cap: LineCap;
  readonly compound: CompoundLine;
  readonly alignment: "ctr" | "in";
  readonly fill: BaseFill;
  readonly dash: string | CustomDash;
  readonly headEnd?: LineEnd;
  readonly tailEnd?: LineEnd;
  readonly join: LineJoin;
  readonly miterLimit?: number;
};
