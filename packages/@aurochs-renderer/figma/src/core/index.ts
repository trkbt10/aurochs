/**
 * @file Core shared utilities barrel export
 */

export {
  isPlaceholderColor,
  figColorToHex,
  figColorToRgba,
  getPaintType,
} from "./color";

export {
  IDENTITY_MATRIX,
  isIdentityMatrix,
  createTranslationMatrix,
  createScaleMatrix,
  createRotationMatrix,
  multiplyMatrices,
  extractTranslation,
  extractScale,
  extractRotation,
} from "./transform";
