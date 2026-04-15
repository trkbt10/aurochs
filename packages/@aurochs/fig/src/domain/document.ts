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

import type { FigNodeType, FigMatrix, FigVector, FigColor, FigPaint, FigEffect, FigStrokeWeight, FigFontName, KiwiEnumValue } from "../types";
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
  /**
   * Per-character style IDs.
   *
   * Each element corresponds to a character in `characters` and references
   * an entry in `styleOverrideTable` by its `styleID` field.
   * Characters with the same ID share the same style override.
   * ID 0 means "use the node's base style" (no override).
   *
   * This is a direct representation of Figma's Kiwi TextData.characterStyleIDs.
   * @see Kiwi schema: TextData.characterStyleIDs
   */
  readonly characterStyleIDs?: readonly number[];
  /**
   * Style override table.
   *
   * Each entry defines a set of style properties (fontSize, fontName,
   * fillPaints, etc.) that override the node's base style for characters
   * referencing this entry's `styleID` via `characterStyleIDs`.
   *
   * This is a direct representation of Figma's Kiwi TextData.styleOverrideTable.
   * The entries are sparse subsets of NodeChange — only style-related fields
   * are present.
   *
   * @see Kiwi schema: TextData.styleOverrideTable (array of NodeChange)
   */
  readonly styleOverrideTable?: readonly TextStyleOverride[];
};

/**
 * A style override entry for per-character text styling.
 *
 * In Figma's Kiwi format, this is a NodeChange with only style-related
 * fields populated. We model the relevant subset here.
 *
 * Each override is identified by `styleID`, which is referenced from
 * `characterStyleIDs`. The fields present in this override replace the
 * node's base style for the corresponding characters.
 */
export type TextStyleOverride = {
  /** Unique ID referenced by characterStyleIDs. 0 = base style (never in the table). */
  readonly styleID: number;
  readonly fontSize?: number;
  readonly fontName?: FigFontName;
  readonly fillPaints?: readonly FigPaint[];
  readonly textDecoration?: KiwiEnumValue;
  readonly textCase?: KiwiEnumValue;
  readonly lineHeight?: { readonly value: number; readonly units: KiwiEnumValue };
  readonly letterSpacing?: { readonly value: number; readonly units: KiwiEnumValue };
  readonly fontWeight?: number;
  readonly textStyleId?: number;
};

// =============================================================================
// Blend Mode
// =============================================================================

/**
 * Blend mode string literals matching SVG/CSS mix-blend-mode values.
 * In Kiwi format, stored as KiwiEnumValue; in domain, normalized to string.
 */
export type BlendMode =
  | "PASS_THROUGH"
  | "NORMAL"
  | "DARKEN"
  | "MULTIPLY"
  | "LINEAR_BURN"
  | "COLOR_BURN"
  | "LIGHTEN"
  | "SCREEN"
  | "LINEAR_DODGE"
  | "COLOR_DODGE"
  | "OVERLAY"
  | "SOFT_LIGHT"
  | "HARD_LIGHT"
  | "DIFFERENCE"
  | "EXCLUSION"
  | "HUE"
  | "SATURATION"
  | "COLOR"
  | "LUMINOSITY";

// =============================================================================
// Derived Text Data (for high-fidelity text rendering)
// =============================================================================

/**
 * Baseline data from derivedTextData.
 *
 * Each baseline represents a line of text with its position and metrics.
 * Stored in the .fig binary for pre-computed text layout.
 */
export type DerivedBaseline = {
  readonly position: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly lineY: number;
  readonly lineHeight: number;
  readonly lineAscent: number;
  readonly firstCharacter: number;
  readonly endCharacter: number;
};

/**
 * Glyph data from derivedTextData.
 *
 * Each glyph references a blob index containing its path commands,
 * positioned and sized for rendering.
 */
export type DerivedGlyph = {
  readonly commandsBlob: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly fontSize: number;
  readonly firstCharacter: number;
  readonly advance: number;
  readonly rotation?: number;
  readonly styleOverrideTable?: number;
};

/**
 * Decoration data from derivedTextData (underlines, strikethroughs).
 */
export type DerivedDecoration = {
  readonly rects: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
  readonly styleID?: number;
};

/**
 * Pre-computed text rendering data from .fig files.
 *
 * Contains glyph outlines, baselines, and decorations for 0% diff
 * text rendering. When present, renderers use this instead of
 * font measurement for exact Figma-parity output.
 */
export type DerivedTextData = {
  readonly layoutSize?: { readonly x: number; readonly y: number };
  readonly baselines?: readonly DerivedBaseline[];
  readonly glyphs?: readonly DerivedGlyph[];
  readonly decorations?: readonly DerivedDecoration[];
  readonly fontMetaData?: readonly unknown[];
  readonly derivedLines?: readonly unknown[];
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
// Component Property Types
//
// Figma's component properties allow SYMBOL/COMPONENT authors to define
// named, typed slots (text, boolean, color, instance swap, etc.) that
// INSTANCE nodes can override.
//
// Data flow:
//   SYMBOL/COMPONENT node  →  componentPropertyDefs  (definitions)
//   Child nodes of SYMBOL  →  componentPropertyRefs  (bindings to defs)
//   INSTANCE node          →  componentPropertyAssignments  (overridden values)
// =============================================================================

/**
 * Component property type.
 *
 * Maps to Figma's ComponentPropType enum:
 *   BOOL=0, TEXT=1, COLOR=2, INSTANCE_SWAP=3, VARIANT=4, NUMBER=5, IMAGE=6, SLOT=7
 */
export type ComponentPropertyType =
  | "BOOL"
  | "TEXT"
  | "COLOR"
  | "INSTANCE_SWAP"
  | "VARIANT"
  | "NUMBER"
  | "IMAGE"
  | "SLOT";

/**
 * Component property value.
 *
 * Each field corresponds to a ComponentPropertyType:
 * - BOOL       → boolValue
 * - TEXT       → textValue
 * - INSTANCE_SWAP / VARIANT → referenceValue (FigNodeId of the target COMPONENT)
 * - NUMBER     → numberValue
 *
 * At runtime, exactly one field is populated based on the property type.
 * No index signature — all known value shapes are explicit.
 */
export type ComponentPropertyValue = {
  readonly boolValue?: boolean;
  readonly textValue?: {
    readonly characters: string;
  };
  /**
   * References a COMPONENT/SYMBOL node for INSTANCE_SWAP or VARIANT properties.
   * Converted from raw FigGuid to FigNodeId at domain construction time
   * via `guidToNodeId()`, ensuring type-safe lookup against `components` map.
   */
  readonly referenceValue?: FigNodeId;
  readonly numberValue?: number;
};

/**
 * A component property definition on a SYMBOL/COMPONENT node.
 *
 * Defines a named, typed slot that INSTANCE nodes can override.
 */
export type ComponentPropertyDef = {
  /** Unique identifier for this definition (GUID → FigNodeId for lookup) */
  readonly id: FigNodeId;
  /** Human-readable name (e.g., "Label", "Show Icon", "Variant") */
  readonly name: string;
  /** Property type */
  readonly type: ComponentPropertyType;
  /** Initial/default value */
  readonly initialValue?: ComponentPropertyValue;
  /** Sort order in Figma's property panel */
  readonly sortPosition?: string;
};

/**
 * What node field a component property reference binds to.
 *
 * Maps to Figma's ComponentPropNodeField enum:
 *   VISIBLE=0, TEXT_DATA=1, OVERRIDDEN_SYMBOL_ID=2, INHERIT_FILL_STYLE_ID=3, SLOT_CONTENT_ID=4
 */
export type ComponentPropertyNodeField =
  | "VISIBLE"
  | "TEXT_DATA"
  | "OVERRIDDEN_SYMBOL_ID"
  | "INHERIT_FILL_STYLE_ID"
  | "SLOT_CONTENT_ID";

/**
 * A component property reference on a child node of a SYMBOL/COMPONENT.
 *
 * Binds a specific node field to a property definition so the field
 * can be overridden by INSTANCE property assignments.
 */
export type ComponentPropertyRef = {
  /** References a ComponentPropertyDef.id */
  readonly defId: FigNodeId;
  /** Which node field this reference controls */
  readonly nodeField: ComponentPropertyNodeField;
};

/**
 * A component property assignment on an INSTANCE node.
 *
 * Overrides the value of a component property defined on the SYMBOL.
 */
export type ComponentPropertyAssignment = {
  /** References a ComponentPropertyDef.id */
  readonly defId: FigNodeId;
  /** The overridden value */
  readonly value: ComponentPropertyValue;
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
  /** iOS-style corner smoothing (0 = none, 1 = full) */
  readonly cornerSmoothing?: number;

  // Visual compositing
  /**
   * Blend mode for compositing this node onto the canvas.
   * PASS_THROUGH means the node inherits the parent's blend mode.
   * Stored as KiwiEnumValue in .fig binary, normalized to string at domain level.
   */
  readonly blendMode?: BlendMode;

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
  /**
   * Pre-computed glyph outlines for high-fidelity text rendering.
   * Contains path blobs, baselines, and decorations from the .fig binary.
   * When present, renderers use this for exact Figma-parity output
   * instead of font measurement.
   */
  readonly derivedTextData?: DerivedTextData;

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

  /**
   * Component property definitions (on SYMBOL/COMPONENT nodes).
   * Defines the named, typed slots that INSTANCE nodes can override.
   */
  readonly componentPropertyDefs?: readonly ComponentPropertyDef[];

  /**
   * Component property references (on child nodes within a SYMBOL/COMPONENT).
   * Binds a node field (e.g., text content, visibility) to a property definition.
   */
  readonly componentPropertyRefs?: readonly ComponentPropertyRef[];

  /**
   * Component property assignments (on INSTANCE nodes).
   * Contains the overridden values for properties defined on the referenced SYMBOL.
   */
  readonly componentPropertyAssignments?: readonly ComponentPropertyAssignment[];

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
