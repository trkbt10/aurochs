/**
 * @file src/pdf/parser/pattern.types.ts
 *
 * Parsed `/Pattern` resource types (subset).
 *
 * Initial supported subset:
 * - PatternType 2 (shading patterns)
 */

import type { PdfMatrix } from "../../domain";
import type { PdfShading } from "../shading/shading.types";

export type PdfShadingPattern = Readonly<{
  readonly patternType: 2;
  readonly matrix: PdfMatrix;
  readonly shading: PdfShading;
}>;

export type PdfTilingPattern = Readonly<{
  readonly patternType: 1;
  readonly paintType: 1 | 2;
  readonly tilingType: 1 | 2 | 3;
  readonly bbox: readonly [number, number, number, number];
  readonly xStep: number;
  readonly yStep: number;
  readonly matrix: PdfMatrix;
  readonly content: string;
}>;

export type PdfPattern = PdfShadingPattern | PdfTilingPattern;
