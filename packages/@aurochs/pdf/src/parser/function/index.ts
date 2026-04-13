/**
 * @file PDF Function module — domain types, parsing, and evaluation.
 *
 * PDF Functions (ISO 32000-1 §7.10) are general-purpose mathematical
 * objects that appear in shadings, color spaces, transfer functions, etc.
 */

export type { PdfFunction, PdfFunctionType0, PdfFunctionType2 } from "./types";
export { parsePdfFunction, parsePdfFunctionType0, parsePdfFunctionType2 } from "./parse";
export { evaluatePdfFunction, evaluatePdfFunctionType0, evaluatePdfFunctionType2 } from "./evaluate";
