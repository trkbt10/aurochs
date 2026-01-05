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

// Data types
export type {
  SlideData,
  LayoutData,
  MasterData,
  ThemeData,
  DiagramData,
} from "./data";
