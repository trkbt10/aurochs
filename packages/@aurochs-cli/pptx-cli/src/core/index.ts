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

// Builder types re-exported for MCP consumers
export type {
  ImageSpec,
  ConnectorSpec,
  TableSpec,
  GroupSpec,
  TableUpdateSpec,
  SlideTransitionSpec,
  AnimationSpec,
  SimpleCommentSpec,
  SimpleNotesSpec,
} from "@aurochs-builder/pptx";
