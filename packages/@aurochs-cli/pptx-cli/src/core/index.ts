/**
 * @file Core exports - reusable logic for CLI and MCP
 */

export {
  createPresentationSession,
  type PresentationSession,
  type SessionInfo,
  type RenderResult,
  type AddSlideResult,
  type RemoveSlideResult,
  type ReorderSlideResult,
  type DuplicateSlideResult,
  type ModifySlideResult,
  type AddShapeResult,
  type AddImageResult,
  type AddConnectorResult,
  type AddTableResult,
  type AddGroupResult,
  type UpdateTableResult,
  type SetTransitionResult,
  type AddAnimationsResult,
  type AddCommentsResult,
  type SetSpeakerNotesResult,
  type SlideModInput,
  type ShapeSpec,
} from "./presentation-session";

// Re-export spec types for MCP consumers
export type {
  ImageSpec,
  ConnectorSpec,
  TableSpec,
  GroupSpec,
  TableUpdateSpec,
  SlideTransitionSpec,
  AnimationSpec,
  CommentSpec,
  NotesSpec,
} from "@aurochs-builder/pptx";
