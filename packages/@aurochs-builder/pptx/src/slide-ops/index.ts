/**
 * @file Slide operations
 *
 * This module provides slide add/remove/reorder/duplicate operations.
 */

// ZipPackage operations (CLI use)
export {
  applySlideOperations,
  type SlideAddSpec,
  type SlideRemoveSpec,
  type SlideReorderSpec,
  type SlideDuplicateSpec,
  type SlideOperationsResult,
  type SlideOpsStats,
  type SlideOperationsOptions,
} from "./slide-operations";

// PresentationDocument operations (Editor use)
export {
  addSlide,
  removeSlide,
  reorderSlide,
  duplicateSlide,
  type SlideAddResult,
  type SlideRemoveResult,
  type SlideReorderResult,
  type SlideDuplicateResult,
} from "./slide-manager";

export { generateSlideId, generateSlideRId } from "./slide-id-manager";
export { addSlideToList, removeSlideFromList, reorderSlideInList } from "./parts/presentation";
