/**
 * @file Types barrel export
 */

export type {
  FigNodeId,
  FigPageId,
} from "./node-id";

export {
  createIdCounter,
  nextNodeId,
  nextPageId,
  guidToNodeId,
  guidToPageId,
  parseId,
  toNodeId,
  toPageId,
} from "./node-id";

export type {
  FigDesignDocument,
  FigDesignNode,
  FigPage,
  AutoLayoutProps,
  LayoutConstraints,
  TextData,
  SymbolOverride,
} from "./document";

export { DEFAULT_PAGE_BACKGROUND } from "./document";

export type {
  NodeSpec,
  BaseNodeSpec,
  RectNodeSpec,
  RoundedRectNodeSpec,
  EllipseNodeSpec,
  LineNodeSpec,
  StarNodeSpec,
  PolygonNodeSpec,
  VectorNodeSpec,
  FrameNodeSpec,
  GroupNodeSpec,
  SectionNodeSpec,
  BooleanOperationNodeSpec,
  TextNodeSpec,
  ComponentNodeSpec,
  InstanceNodeSpec,
} from "./spec-types";
