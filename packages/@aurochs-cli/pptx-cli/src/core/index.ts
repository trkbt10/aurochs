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

// Local type aliases wrapping builder types for MCP consumers
import type {
  ImageSpec as _ImageSpec,
  ConnectorSpec as _ConnectorSpec,
  TableSpec as _TableSpec,
  GroupSpec as _GroupSpec,
  TableUpdateSpec as _TableUpdateSpec,
  SlideTransitionSpec as _SlideTransitionSpec,
  AnimationSpec as _AnimationSpec,
  CommentSpec as _CommentSpec,
  NotesSpec as _NotesSpec,
} from "@aurochs-builder/pptx";

/** Image addition specification */
export type ImageSpec = _ImageSpec;
/** Connector addition specification */
export type ConnectorSpec = _ConnectorSpec;
/** Table addition specification */
export type TableSpec = _TableSpec;
/** Group addition specification */
export type GroupSpec = _GroupSpec;
/** Table update specification */
export type TableUpdateSpec = _TableUpdateSpec;
/** Slide transition specification */
export type SlideTransitionSpec = _SlideTransitionSpec;
/** Animation specification */
export type AnimationSpec = _AnimationSpec;
/** Comment specification */
export type CommentSpec = _CommentSpec;
/** Notes specification */
export type NotesSpec = _NotesSpec;
