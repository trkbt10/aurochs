/**
 * @file Validator module exports
 */

export {
  validateFigFile,
  runValidation,
  type ValidationResult,
  type ValidationError,
} from "./structure-validator";

export {
  compareFigFiles,
  type ComparisonResult,
  type ChunkComparison,
} from "./binary-comparator";

export {
  analyzeMessageFormat,
  compareMessageFormats,
  type MessageAnalysis,
  type FieldInfo,
} from "./message-analyzer";

export { runComparison } from "./binary-comparator";
