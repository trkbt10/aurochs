/**
 * @file Slide domain module exports
 *
 * Pure domain types for slide resources.
 * No render layer dependencies.
 *
 * NOTE: Parser-specific types have been moved to their proper locations:
 * - IndexTables: parser/slide/shape-tree-indexer.ts
 * - SlideLayoutAttributes: parser/slide/layout-parser.ts
 * - SlideData, LayoutData, etc.: parser/slide/data-types.ts
 */

// Types
export type {
  SlideSize,
  SlideSizeType,
  Background,
  SlideTiming,
  BuildEntry,
  AnimationSequence,
  Animation,
  Slide,
  SlideLayout,
  SlideLayoutType,
  SlideLayoutId,
  SlideMaster,
  HandoutMaster,
  NotesMaster,
} from "./types";

// Slide content indexing types (pure domain type only)
export type { SlideNodeType } from "./indexing";

// Placeholder text style mappings
export type { MasterTextStyleName } from "./placeholder-styles";
export {
  PLACEHOLDER_TO_TEXT_STYLE,
  TITLE_TYPES,
  isTitleType,
  getTextStyleName,
} from "./placeholder-styles";
