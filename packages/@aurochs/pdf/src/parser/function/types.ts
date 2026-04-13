/**
 * @file PDF Function domain types (ISO 32000-1 §7.10).
 *
 * PDF Functions are standalone mathematical objects that map m input values
 * to n output values. They appear in multiple contexts:
 * - Shading patterns (axial/radial gradient color functions)
 * - Separation / DeviceN color spaces (tint transforms)
 * - Soft masks, transfer functions, halftone spot functions, etc.
 *
 * This module defines the parsed, type-safe representations of PDF
 * Function dictionaries. Parsing from native PDF objects and evaluation
 * are in sibling modules (parse.ts, evaluate.ts).
 */

/**
 * FunctionType 2: Exponential interpolation (ISO 32000-1 §7.10.3).
 *
 * Defines a single-input function:
 *   f(x) = C0 + x^N × (C1 − C0)
 *
 * where x is clamped to Domain, and C0/C1 are the boundary output values.
 */
export type PdfFunctionType2 = Readonly<{
  readonly type: "FunctionType2";
  /** Output values at the domain minimum (default: [0.0]). */
  readonly c0: readonly number[];
  /** Output values at the domain maximum (default: [1.0]). */
  readonly c1: readonly number[];
  /** Interpolation exponent. */
  readonly n: number;
  /** Input domain [min, max]. */
  readonly domain?: readonly [number, number];
}>;

/**
 * FunctionType 0: Sampled function (ISO 32000-1 §7.10.2).
 *
 * Maps m input values to n output values via a lookup table of samples,
 * with multi-linear interpolation between grid points.
 *
 * Evaluation steps (per the spec):
 * 1. Clip each input x_i to Domain[2i]..Domain[2i+1]
 * 2. Encode: e_i = Interpolate(x_i, Domain[2i], Domain[2i+1], Encode[2i], Encode[2i+1])
 * 3. Clip e_i to [0, Size[i]−1]
 * 4. Multi-linear interpolation across 2^m surrounding sample points
 * 5. Decode: y_j = Interpolate(r_j, 0, 2^BitsPerSample−1, Decode[2j], Decode[2j+1])
 * 6. Clip y_j to Range[2j]..Range[2j+1]
 */
export type PdfFunctionType0 = Readonly<{
  readonly type: "FunctionType0";
  /** Number of input dimensions. */
  readonly m: number;
  /** Number of output dimensions. */
  readonly n: number;
  /** Domain: pairs [min, max] for each input dimension (length = 2×m). */
  readonly domain: readonly number[];
  /** Range: pairs [min, max] for each output dimension (length = 2×n). */
  readonly range: readonly number[];
  /** Number of samples along each input dimension (length = m). */
  readonly size: readonly number[];
  /** Bits per sample value (1, 2, 4, 8, 12, 16, 24, or 32). */
  readonly bitsPerSample: number;
  /** Encode: pairs [min, max] mapping input domain to sample grid indices (length = 2×m). */
  readonly encode: readonly number[];
  /** Decode: pairs [min, max] mapping sample values to output range (length = 2×n). */
  readonly decode: readonly number[];
  /** Raw sample data (decoded from the PDF stream). */
  readonly samples: Uint8Array;
}>;

/**
 * Union of all supported PDF Function types.
 *
 * Discriminated on the `type` field ("FunctionType0" | "FunctionType2").
 * Extend this union when adding support for FunctionType 3 (stitching)
 * or FunctionType 4 (PostScript calculator).
 */
export type PdfFunction = PdfFunctionType0 | PdfFunctionType2;
