/**
 * @file Re-export matrix operations from @aurochs/fig/matrix
 *
 * SoT: @aurochs/fig/matrix — FigMatrix type and operations are owned by the fig package.
 */

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
} from "@aurochs/fig/matrix";
