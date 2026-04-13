/**
 * @file High-level fig design document model
 *
 * Provides a structured, immutable view of a .fig file that is suitable
 * for editor state management and CRUD operations.
 *
 * The key differences from the raw FigNode tree:
 * - Branded IDs (FigNodeId, FigPageId) instead of raw FigGuid
 * - Typed properties instead of open index signature
 * - _raw field preserves unknown Kiwi fields for roundtrip fidelity
 *
 * These are domain types consumed by renderer, builder, and editor.
 */

import type { FigNodeType, FigMatrix, FigVector, FigColor, FigPaint, FigEffect, FigStrokeWeight, KiwiEnumValue } from "../types";
import type { LoadedFigFile, FigImage, FigMetadata } from "../roundtrip";
import type { FigNodeId, FigPageId } from "./node-id";

// =============================================================================
// AutoLayout Types
// =============================================================================

/**
 * AutoLayout (Flex-like layout) properties for frame/symbol nodes.
 *
 * These map directly to Figma's auto-layout properties.
 * Enum values stored as KiwiEnumValue for binary compatibility.
 */
export type AutoLayoutProps = {
  readonly stackMode: KiwiEnumValue;
  readonly stackSpacing?: number;
  readonly stackPadding?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly stackPrimaryAlignItems?: KiwiEnumValue;
  readonly stackCounterAlignItems?: KiwiEnumValue;
  readonly stackPrimaryAlignContent?: KiwiEnumValue;
  readonly stackWrap?: boolean;
  readonly stackCounterSpacing?: number;
  readonly itemReverseZIndex?: boolean;
};

/**
 * Constraint properties for a child node within an AutoLayout parent.
 */
export type LayoutConstraints = {
  readonly stackPositioning?: KiwiEnumValue;
  readonly stackPrimarySizing?: KiwiEnumValue;
  readonly stackCounterSizing?: KiwiEnumValue;
  readonly horizontalConstraint?: KiwiEnumValue;
  readonly verticalConstraint?: KiwiEnumValue;
};

// =============================================================================
// Text Data Types
// =============================================================================

/**
 * Text-specific data extracted from TEXT nodes.
 */
export type TextData = {
  readonly characters: string;
  readonly fontSize: number;
  readonly fontName: { readonly family: string; readonly style: string; readonly postscript: string };
  readonly textAlignHorizontal?: KiwiEnumValue;
  readonly textAlignVertical?: KiwiEnumValue;
  readonly textAutoResize?: KiwiEnumValue;
  readonly textDecoration?: KiwiEnumValue;
  readonly textCase?: KiwiEnumValue;
  readonly lineHeight?: { readonly value: number; readonly units: KiwiEnumValue };
  readonly letterSpacing?: { readonly value: number; readonly units: KiwiEnumValue };
};

// =============================================================================
// Component/Instance Data Types
// =============================================================================

/**
 * Symbol override for an instance node.
 */
export type SymbolOverride = {
  readonly guidPath: string;
  readonly [key: string]: unknown;
};

// =============================================================================
// Design Node
// =============================================================================

/**
 * A single node in the design document tree.
 *
 * This is the high-level representation of a Figma node,
 * carrying typed properties and branded IDs.
 *
 * The _raw field preserves the complete original FigNode data
 * (excluding children) for roundtrip export fidelity. Fields not
 * explicitly modeled here (e.g., advanced constraints, export settings,
 * derived data) are preserved through _raw.
 */
export type FigDesignNode = {
  readonly id: FigNodeId;
  readonly type: FigNodeType;
  readonly name: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly transform: FigMatrix;
  readonly size: FigVector;

  // Paint & stroke
  readonly fills: readonly FigPaint[];
  readonly strokes: readonly FigPaint[];
  readonly strokeWeight: FigStrokeWeight;
  readonly strokeAlign?: KiwiEnumValue;
  readonly strokeJoin?: KiwiEnumValue;
  readonly strokeCap?: KiwiEnumValue;

  // Geometry
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];

  // Effects
  readonly effects: readonly FigEffect[];

  // Hierarchy
  readonly children?: readonly FigDesignNode[];

  // Frame/container specifics
  readonly clipsContent?: boolean;
  readonly autoLayout?: AutoLayoutProps;
  readonly layoutConstraints?: LayoutConstraints;

  // Text specifics
  readonly textData?: TextData;

  // Component/instance specifics
  /**
   * Reference to the SYMBOL/COMPONENT this INSTANCE resolves to.
   *
   * Uses FigNodeId (branded "sessionID:localID" string) — the same type as
   * the keys of `FigDesignDocument.components`. This type-level guarantee
   * prevents accidental assignment of raw FigGuid structs or untyped strings.
   *
   * Must be produced via `guidToNodeId(getEffectiveSymbolID(raw))` — no
   * other construction path is valid.
   */
  readonly symbolId?: FigNodeId;
  readonly overrides?: readonly SymbolOverride[];

  // Boolean operation specifics
  readonly booleanOperation?: KiwiEnumValue;

  // Star/polygon specifics
  readonly pointCount?: number;
  readonly starInnerRadius?: number;

  /**
   * Raw Kiwi node data preserved for roundtrip fidelity.
   * Contains fields not explicitly modeled in this type.
   * Excluded: guid, parentIndex, children, type, name, visible, opacity,
   * transform, size, fillPaints, strokePaints (these are modeled above).
   */
  readonly _raw?: Record<string, unknown>;
};

// =============================================================================
// Page
// =============================================================================

/**
 * A page in the design document (corresponds to a CANVAS node in .fig).
 */
export type FigPage = {
  readonly id: FigPageId;
  readonly name: string;
  readonly backgroundColor: FigColor;
  readonly children: readonly FigDesignNode[];

  /** Raw CANVAS node data for roundtrip */
  readonly _raw?: Record<string, unknown>;
};

// =============================================================================
// Design Document
// =============================================================================

/**
 * Default background color for new pages (Figma's default canvas background).
 */
export const DEFAULT_PAGE_BACKGROUND: FigColor = { r: 0.9607843, g: 0.9607843, b: 0.9607843, a: 1 };

/**
 * High-level representation of a complete .fig design file.
 *
 * Analogous to PresentationDocument in the PPTX pipeline.
 */
export type FigDesignDocument = {
  readonly pages: readonly FigPage[];
  /** Components (SYMBOL/COMPONENT nodes) indexed by their node ID */
  readonly components: ReadonlyMap<string, FigDesignNode>;
  /** Images extracted from the .fig ZIP */
  readonly images: ReadonlyMap<string, FigImage>;
  /** File metadata (name, export date, etc.) */
  readonly metadata: FigMetadata | null;

  /**
   * Original loaded file data for roundtrip export.
   * Present only when the document was loaded from an existing .fig file.
   * Used by the export pipeline to preserve schema compatibility.
   */
  readonly _loaded?: LoadedFigFile;
};
