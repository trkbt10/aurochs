/**
 * @file PDF coordinate domain
 *
 * Exports types and utilities for PDF coordinate system handling.
 */

export type { PdfPoint, PdfBBox, PdfMatrix } from "./types";
export {
  IDENTITY_MATRIX,
  multiplyMatrices,
  transformPoint,
  invertMatrix,
  translationMatrix,
  scalingMatrix,
  rotationMatrix,
  isIdentityMatrix,
  isSimpleTransform,
  getMatrixScale,
  getMatrixRotation,
  decomposeMatrix,
  hasShear,
} from "./matrix";
export type { MatrixDecomposition } from "./matrix";
