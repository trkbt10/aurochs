/**
 * @file Types barrel export
 *
 * Domain types (FigDesignDocument, FigDesignNode, FigPage, FigNodeId, FigPageId,
 * and domain utilities like guidToNodeId, parseId, etc.) are in @aurochs/fig/domain.
 * Import them from there directly.
 *
 * This file exports only builder-specific types: ID generation utilities and node specs.
 */

export {
  createIdCounter,
  nextNodeId,
  nextPageId,
} from "./node-id";

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
