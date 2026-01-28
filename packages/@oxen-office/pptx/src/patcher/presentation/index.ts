/**
 * @file Presentation-level patching exports
 */

export { generateSlideId, generateSlideRId } from "./slide-id-manager";
export type { SlideAddResult, SlideDuplicateResult, SlideRemoveResult, SlideReorderResult } from "./slide-manager";
export { addSlide, duplicateSlide, removeSlide, reorderSlide } from "./slide-manager";
