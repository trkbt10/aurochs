/**
 * @file Builder-internal node type definitions
 *
 * These types describe the shape of node objects as constructed by the
 * fig-file-builder before they are passed to the Kiwi encoder.
 *
 * The Kiwi encoder accepts `Record<string, unknown>` because it operates
 * on schema-driven field names. These types serve as the builder's SoT
 * for which fields exist and what shapes they take, eliminating `as` casts
 * inside builder logic.
 *
 * Field names match the Figma Kiwi schema's `NodeChange` message definition.
 */

import type { FigMatrix } from "../../types";
import type { EffectData } from "../effect/types";
import type { Stroke } from "../types";
import type { ArcData } from "../shape";

// =============================================================================
// Kiwi scalar sub-types
// =============================================================================

/** GUID as stored in Kiwi binary — { sessionID, localID } */
export type KiwiGuid = {
  readonly sessionID: number;
  readonly localID: number;
};

/** Kiwi enum value — { value, name } */
export type KiwiEnum<T extends string = string> = {
  readonly value: number;
  readonly name: T;
};

/** Parent index — { guid, position } */
export type KiwiParentIndex = {
  readonly guid: KiwiGuid;
  readonly position: string;
};

/** Color — { r, g, b, a } */
export type KiwiColor = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

/** Vector (2D) */
export type KiwiVector = {
  readonly x: number;
  readonly y: number;
};

/** Fill paint as stored in the Kiwi NodeChange */
export type KiwiFillPaint = {
  readonly type: KiwiEnum;
  readonly color?: KiwiColor;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: KiwiEnum;
};

/** Symbol data wrapper */
export type KiwiSymbolData = {
  readonly symbolID: KiwiGuid;
  readonly overriddenSymbolID?: KiwiGuid;
};

/** Fill geometry entry */
export type KiwiFillGeometry = {
  readonly windingRule: KiwiEnum;
  readonly commandsBlob: number;
  readonly styleID: number;
};

/** Value with units (for lineHeight, letterSpacing) */
export type KiwiValueWithUnits = {
  readonly value: number;
  readonly units: KiwiEnum;
};

/** Text data */
export type KiwiTextData = {
  readonly characters: string;
  readonly characterStyleIDs: number[];
};

/** Derived text data (for path rendering) */
export type KiwiDerivedTextData = {
  readonly layoutSize?: { readonly x: number; readonly y: number };
  readonly baselines?: readonly unknown[];
  readonly glyphs?: readonly unknown[];
};

/** Derived symbol data entry (constraint resolution) */
export type KiwiDerivedSymbolEntry = {
  readonly guidPath: { readonly guids: readonly KiwiGuid[] };
  readonly transform: FigMatrix;
  readonly size: KiwiVector;
};

/** Vector data */
export type KiwiVectorData = {
  readonly vectorNetworkBlob?: number;
  readonly normalizedSize?: KiwiVector;
};

// =============================================================================
// Builder node — the shape of a node object inside the builder
// =============================================================================

/**
 * A node object as constructed by the fig-file-builder.
 *
 * All fields are optional except the core identity fields (guid, phase, type,
 * name, visible, opacity) which are always set by createNodeChange.
 *
 * This type is used internally by the builder. When passing to the Kiwi
 * encoder, cast to `Record<string, unknown>` at the boundary.
 */
export type BuilderNode = {
  // ---- Core identity ----
  guid: KiwiGuid;
  phase: KiwiEnum;
  type: KiwiEnum;
  name: string;
  visible: boolean;
  opacity: number;

  // ---- Hierarchy ----
  parentIndex?: KiwiParentIndex;

  // ---- Geometry ----
  size?: KiwiVector;
  transform?: FigMatrix;

  // ---- Fill ----
  fillPaints?: readonly KiwiFillPaint[];
  fillGeometry?: readonly KiwiFillGeometry[];

  // ---- Stroke ----
  strokePaints?: readonly Stroke[];
  strokeWeight?: number;
  strokeCap?: KiwiEnum;
  strokeJoin?: KiwiEnum;
  strokeAlign?: KiwiEnum;
  dashPattern?: readonly number[];

  // ---- Frame ----
  frameMaskDisabled?: boolean;
  cornerRadius?: number;
  rectangleCornerRadii?: readonly [number, number, number, number];

  // ---- AutoLayout (frame-level) ----
  stackMode?: KiwiEnum;
  stackSpacing?: number;
  stackPadding?: number;
  stackVerticalPadding?: number;
  stackHorizontalPadding?: number;
  stackPaddingRight?: number;
  stackPaddingBottom?: number;
  stackPrimaryAlignItems?: KiwiEnum;
  stackCounterAlignItems?: KiwiEnum;
  stackPrimaryAlignContent?: KiwiEnum;
  stackWrap?: boolean;
  stackCounterSpacing?: number;
  itemReverseZIndex?: boolean;

  // ---- AutoLayout (child-level) ----
  stackPositioning?: KiwiEnum;
  stackPrimarySizing?: KiwiEnum;
  stackCounterSizing?: KiwiEnum;
  horizontalConstraint?: KiwiEnum;
  verticalConstraint?: KiwiEnum;

  // ---- Symbol / Instance ----
  symbolData?: KiwiSymbolData;
  componentPropertyReferences?: readonly string[];
  derivedSymbolData?: readonly KiwiDerivedSymbolEntry[];

  // ---- Text ----
  fontSize?: number;
  fontName?: { family: string; style: string; postscript: string };
  textAlignHorizontal?: KiwiEnum;
  textAlignVertical?: KiwiEnum;
  textAutoResize?: KiwiEnum;
  textDecoration?: KiwiEnum;
  textCase?: KiwiEnum;
  lineHeight?: KiwiValueWithUnits;
  letterSpacing?: KiwiValueWithUnits;
  textData?: KiwiTextData;
  derivedTextData?: KiwiDerivedTextData;

  // ---- Ellipse ----
  arcData?: ArcData;

  // ---- Star / Polygon ----
  pointCount?: number;
  starInnerRadius?: number;

  // ---- Vector ----
  vectorData?: KiwiVectorData;
  handleMirroring?: KiwiEnum;

  // ---- Effects ----
  effects?: readonly EffectData[];

  // ---- Mask ----
  mask?: boolean;

  // ---- Canvas-specific ----
  backgroundOpacity?: number;
  backgroundColor?: KiwiColor;
  backgroundEnabled?: boolean;
  internalOnly?: boolean;
  documentColorProfile?: KiwiEnum;

  // ---- Section-specific ----
  sectionContentsHidden?: boolean;

  // ---- Boolean operation ----
  booleanOperation?: KiwiEnum;
};

/**
 * Cast a BuilderNode to the Kiwi encoder's expected type.
 *
 * The Kiwi encoder processes fields by schema-defined name lookup,
 * so the cast is safe — unknown fields are simply ignored.
 */
export function toKiwiRecord(node: BuilderNode): Record<string, unknown> {
  return node as unknown as Record<string, unknown>;
}
