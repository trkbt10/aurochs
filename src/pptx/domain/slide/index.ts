/**
 * @file Slide domain module exports
 *
 * Pure domain types for slide resources.
 * No render layer dependencies.
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
  // Params types (pure data, no render dependencies)
  SlideMasterParams,
  SlideLayoutParams,
  SlideParams,
} from "./types";

// Slide content indexing types
export type { IndexTables, SlideNodeType } from "./indexing";

// Placeholder text style mappings
export type { MasterTextStyleName } from "./placeholder-styles";
export {
  PLACEHOLDER_TO_TEXT_STYLE,
  TITLE_TYPES,
  isTitleType,
  getTextStyleName,
} from "./placeholder-styles";

// Data types
export type {
  SlideData,
  LayoutData,
  MasterData,
  ThemeData,
  DiagramData,
} from "./data";
