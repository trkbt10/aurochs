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
 * Base line properties shared across OOXML formats.
 */
export type BaseLine = {
  readonly width: Pixels;
  readonly cap: "flat" | "round" | "square";
  readonly compound: "sng" | "dbl" | "thickThin" | "thinThick" | "tri";
  readonly alignment: "ctr" | "in";
  readonly fill: BaseFill;
  readonly dash: string | CustomDash;
  readonly headEnd?: LineEnd;
  readonly tailEnd?: LineEnd;
  readonly join: "bevel" | "miter" | "round";
  readonly miterLimit?: number;
};
