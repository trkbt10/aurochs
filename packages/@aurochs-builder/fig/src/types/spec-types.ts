/**
 * @file Node spec types for creating new design nodes
 *
 * Specs are plain data objects describing what node to create.
 * They are consumed by the node factory to produce FigDesignNode instances.
 * The type field discriminates the union.
 */

import type { FigColor, FigPaint, FigEffect, KiwiEnumValue } from "@aurochs/fig/types";
import type { FigNodeId, AutoLayoutProps } from "@aurochs/fig/domain";

// =============================================================================
// Base Spec
// =============================================================================

/**
 * Common properties shared by all node specs.
 */
export type BaseNodeSpec = {
  readonly name?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly fills?: readonly FigPaint[];
  readonly strokes?: readonly FigPaint[];
  readonly strokeWeight?: number;
  readonly effects?: readonly FigEffect[];
  readonly opacity?: number;
  readonly visible?: boolean;
};

// =============================================================================
// Shape Specs
// =============================================================================

export type RectNodeSpec = BaseNodeSpec & {
  readonly type: "RECTANGLE";
};

export type RoundedRectNodeSpec = BaseNodeSpec & {
  readonly type: "ROUNDED_RECTANGLE";
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly [number, number, number, number];
};

export type EllipseNodeSpec = BaseNodeSpec & {
  readonly type: "ELLIPSE";
};

export type LineNodeSpec = BaseNodeSpec & {
  readonly type: "LINE";
};

export type StarNodeSpec = BaseNodeSpec & {
  readonly type: "STAR";
  readonly pointCount?: number;
  readonly starInnerRadius?: number;
};

export type PolygonNodeSpec = BaseNodeSpec & {
  readonly type: "REGULAR_POLYGON";
  readonly pointCount?: number;
};

export type VectorNodeSpec = BaseNodeSpec & {
  readonly type: "VECTOR";
  readonly vectorPaths?: readonly { readonly windingRule?: string; readonly data?: string }[];
};

// =============================================================================
// Container Specs
// =============================================================================

export type FrameNodeSpec = BaseNodeSpec & {
  readonly type: "FRAME";
  readonly clipsContent?: boolean;
  readonly autoLayout?: AutoLayoutProps;
  readonly backgroundColor?: FigColor;
};

export type GroupNodeSpec = BaseNodeSpec & {
  readonly type: "GROUP";
};

export type SectionNodeSpec = BaseNodeSpec & {
  readonly type: "SECTION";
};

export type BooleanOperationNodeSpec = BaseNodeSpec & {
  readonly type: "BOOLEAN_OPERATION";
  readonly booleanOperation: KiwiEnumValue;
};

// =============================================================================
// Content Specs
// =============================================================================

export type TextNodeSpec = BaseNodeSpec & {
  readonly type: "TEXT";
  readonly characters: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontStyle?: string;
  readonly textAlignHorizontal?: KiwiEnumValue;
  readonly textAlignVertical?: KiwiEnumValue;
};

// =============================================================================
// Component Specs
// =============================================================================

export type ComponentNodeSpec = BaseNodeSpec & {
  readonly type: "COMPONENT";
  readonly clipsContent?: boolean;
  readonly autoLayout?: AutoLayoutProps;
};

export type InstanceNodeSpec = BaseNodeSpec & {
  readonly type: "INSTANCE";
  readonly symbolId: FigNodeId;
};

// =============================================================================
// Union
// =============================================================================

/**
 * Discriminated union of all node creation specs.
 * The `type` field determines which node type to create.
 */
export type NodeSpec =
  | RectNodeSpec
  | RoundedRectNodeSpec
  | EllipseNodeSpec
  | LineNodeSpec
  | StarNodeSpec
  | PolygonNodeSpec
  | VectorNodeSpec
  | FrameNodeSpec
  | GroupNodeSpec
  | SectionNodeSpec
  | BooleanOperationNodeSpec
  | TextNodeSpec
  | ComponentNodeSpec
  | InstanceNodeSpec;
