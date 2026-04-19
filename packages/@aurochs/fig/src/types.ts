/**
 * @file Fig format types
 */

import type { CompressionType } from "./compression";

// =============================================================================
// File Header Types
// =============================================================================

/** .fig file header structure */
export type FigHeader = {
  /** Magic header "fig-kiwi" */
  readonly magic: "fig-kiwi";
  /** Version character (typically '0') */
  readonly version: string;
  /** Payload size in bytes */
  readonly payloadSize: number;
};

/** Header size in bytes (8 magic + 1 version + 3 reserved + 4 size = 16) */
export const FIG_HEADER_SIZE = 16;

/** Magic header string */
export const FIG_MAGIC = "fig-kiwi";

// =============================================================================
// Kiwi Schema Types
// =============================================================================

/** Kiwi primitive types */
export type KiwiPrimitiveType =
  | "bool"
  | "byte"
  | "int"
  | "uint"
  | "float"
  | "string"
  | "int64"
  | "uint64";

/** Kiwi definition kinds */
export type KiwiDefinitionKind = "ENUM" | "STRUCT" | "MESSAGE";

/** Kiwi field definition */
export type KiwiField = {
  readonly name: string;
  readonly type: KiwiPrimitiveType | string;
  readonly typeId: number;
  readonly isArray: boolean;
  readonly value: number;
};

/** Kiwi definition (enum, struct, or message) */
export type KiwiDefinition = {
  readonly name: string;
  readonly kind: KiwiDefinitionKind;
  readonly fields: readonly KiwiField[];
};

/** Kiwi schema */
export type KiwiSchema = {
  readonly definitions: readonly KiwiDefinition[];
};

// =============================================================================
// Parsed Fig File Types
// =============================================================================

/** Parsed resource (image, etc.) */
export type FigResource = {
  readonly id: string;
  readonly type: "image" | "video" | "font" | "unknown";
  readonly data: Uint8Array;
  readonly mimeType?: string;
};

/** Parsed fig file data */
export type FigFile = {
  readonly header: FigHeader;
  readonly schema: KiwiSchema;
  readonly document: FigDocument;
  readonly resources: readonly FigResource[];
};

// =============================================================================
// Raw Kiwi Node Types (matching binary format)
// =============================================================================

/** Enum value as stored in Kiwi binary format */
export type KiwiEnumValue<T extends string = string> = {
  readonly value: number;
  readonly name: T;
};

/** GUID as stored in Kiwi binary format */
export type FigGuid = {
  readonly sessionID: number;
  readonly localID: number;
};

/**
 * Style reference as stored in Kiwi binary format.
 *
 * Corresponds to the Kiwi schema `StyleId` message (typeId 108).
 * References a shared style definition (fill style, stroke style, etc.)
 * via its GUID.
 */
/**
 * A shared-style reference.
 *
 * `guid` points to a style definition node in the same file. `assetRef`
 * (team-library key + version) points to a style imported from another
 * Figma file. A single reference may carry either, both, or neither.
 *
 * Resolution order used by the style registry: prefer `guid` (same-file
 * reference is authoritative). Fall back to `assetRef.key`, which we
 * match against any node in the same file whose own `key` equals the
 * asset key — Figma emits such "proxy" style-definition nodes on the
 * Internal Only Canvas so asset-referenced styles resolve locally.
 */
export type FigStyleId = {
  readonly guid?: FigGuid;
  readonly assetRef?: FigAssetRef;
};

/**
 * Team-library asset identifier (Kiwi schema `AssetRef`, typeId 105).
 * `key` is the stable content hash of the asset; `version` encodes the
 * library version at import time.
 */
export type FigAssetRef = {
  readonly key: string;
  readonly version?: string;
};

/** Parent index as stored in Kiwi binary format */
export type FigParentIndex = {
  readonly guid: FigGuid;
  readonly position: string;
};

/**
 * Style override entry within a Kiwi TextData.styleOverrideTable.
 *
 * Each entry is a NodeChange with only style-related fields populated.
 * The `styleID` field identifies which characters use this override
 * (referenced via TextData.characterStyleIDs).
 *
 * @see Kiwi schema: TextData.styleOverrideTable (array of NodeChange)
 */
export type FigTextStyleOverrideEntry = {
  readonly styleID: number;
  readonly fontSize?: number;
  readonly fontName?: FigFontName;
  readonly fillPaints?: readonly FigPaint[];
  readonly textDecoration?: KiwiEnumValue;
  readonly textCase?: KiwiEnumValue;
  readonly lineHeight?: FigValueWithUnits;
  readonly letterSpacing?: FigValueWithUnits;
  readonly [key: string]: unknown;
};

/**
 * Kiwi TextData message as decoded from the binary format.
 *
 * Contains the text content plus per-character styling information.
 * The `characters` field is the same as the NodeChange-level `characters` field.
 *
 * @see Kiwi schema: TextData (message type 85)
 */
export type FigKiwiTextData = {
  readonly characters: string;
  /**
   * Per-character style ID array. Each element corresponds to a character
   * and references a styleOverrideTable entry by its styleID field.
   * ID 0 means "use the node's base style" (no override).
   */
  readonly characterStyleIDs?: readonly number[];
  /**
   * Style override table. Each entry is a sparse NodeChange with only
   * style-related fields (fontSize, fontName, fillPaints, etc.).
   */
  readonly styleOverrideTable?: readonly FigTextStyleOverrideEntry[];
  readonly [key: string]: unknown;
};

// =============================================================================
// Derived Text Data Types (Kiwi schema representation)
// =============================================================================

/**
 * Baseline data from Kiwi derivedTextData.
 * Each baseline represents a line of text with its position and metrics.
 */
export type FigDerivedBaseline = {
  readonly position: FigVector;
  readonly width: number;
  readonly lineY: number;
  readonly lineHeight: number;
  readonly lineAscent: number;
  readonly firstCharacter: number;
  readonly endCharacter: number;
};

/**
 * Glyph data from Kiwi derivedTextData.
 * Each glyph references a blob index containing its path commands.
 */
export type FigDerivedGlyph = {
  readonly commandsBlob: number;
  readonly position: FigVector;
  readonly fontSize: number;
  /**
   * Source-string codepoint index of this glyph. Optional because
   * Figma's layout engine inserts synthetic glyphs (most notably the
   * ellipsis for `textTruncation=ENDING`) that do not correspond to
   * any source codepoint — those carry `firstCharacter = undefined`.
   * Renderers use this to distinguish "real" text glyphs from
   * synthetic insertions during post-layout filtering (e.g.
   * truncation tail suppression in `extractDerivedTextPathData`).
   */
  readonly firstCharacter?: number;
  readonly advance: number;
  readonly rotation?: number;
  readonly styleOverrideTable?: number;
};

/**
 * Decoration data from Kiwi derivedTextData (underlines, strikethroughs).
 */
export type FigDerivedDecoration = {
  readonly rects: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
  readonly styleID?: number;
};

/**
 * Per-line derived data in Kiwi derivedTextData.
 *
 * Each entry corresponds to one visually rendered line (after wrapping,
 * truncation, and BIDI resolution). The `characters` field — when present —
 * holds the substring of the source string displayed on that line; this is
 * the primary cue renderers use to detect line breaks vs. the source's own
 * `\n`-split text.
 */
export type FigDerivedLine = {
  readonly directionality?: KiwiEnumValue;
  readonly characters?: string;
  readonly baselinePosition?: FigVector;
  readonly width?: number;
};

/**
 * Per-font metadata stored alongside glyphs.
 *
 * Figma records the actual font family/style used for each glyph so that
 * renderers can reconstruct the exact line-height and baseline metrics,
 * even when the consuming environment does not have the font installed.
 */
export type FigFontMetaData = {
  readonly key?: {
    readonly family?: string;
    readonly style?: string;
    readonly postscript?: string;
  };
  readonly fontLineHeight?: number;
  readonly fontStyle?: KiwiEnumValue;
  readonly fontWeight?: number;
  /** Digest hash for font identity (opaque). */
  readonly fontDigest?: readonly number[];
};

/**
 * Pre-computed text rendering data from Kiwi binary format.
 * Contains glyph outlines, baselines, and decorations for path-based text rendering.
 *
 * `truncationStartIndex` (when >= 0) marks the codepoint index where the
 * displayed text begins showing truncation. `truncatedHeight` is the height
 * at which the text was cut (for multi-line truncation).
 */
export type FigDerivedTextData = {
  readonly layoutSize?: FigVector;
  readonly baselines?: readonly FigDerivedBaseline[];
  readonly glyphs?: readonly FigDerivedGlyph[];
  readonly decorations?: readonly FigDerivedDecoration[];
  readonly fontMetaData?: readonly FigFontMetaData[];
  readonly derivedLines?: readonly FigDerivedLine[];
  readonly truncationStartIndex?: number;
  readonly truncatedHeight?: number;
  readonly logicalIndexToCharacterOffsetMap?: readonly number[];
};

// =============================================================================
// Symbol/Instance Data Types (Kiwi schema representation)
// =============================================================================

/**
 * GUID path for targeting nested nodes in symbol overrides.
 */
export type FigGuidPath = {
  readonly guids: readonly FigGuid[];
};

/**
 * Symbol override entry as stored in Kiwi binary format.
 *
 * Each entry targets a specific child node (via guidPath) and overrides
 * one or more of its properties. Structurally an override is a guidPath
 * plus a payload of typed FigNode-shaped fields.
 *
 * We cannot literally write `Partial<FigNode>` here because FigNode contains
 * `derivedSymbolData: FigKiwiSymbolOverride[]` — that circularity causes
 * TypeScript to widen field accesses back to `unknown`. Instead we maintain
 * `FigKiwiSymbolOverridePayload` as the SoT for "which FigNode fields may
 * appear in an override" and keep it in sync with FigNode by construction.
 */
export type FigKiwiSymbolOverridePayload = {
  readonly name?: string;
  readonly visible?: boolean;
  readonly opacity?: number;
  // Domain BlendMode string union — same SSoT rule as stroke enums.
  readonly blendMode?: BlendMode;
  readonly mask?: boolean;
  readonly clipsContent?: boolean;
  readonly frameMaskDisabled?: boolean;
  readonly transform?: FigMatrix;
  readonly size?: FigVector;
  readonly fillPaints?: readonly FigPaint[];
  readonly strokePaints?: readonly FigPaint[];
  readonly strokeWeight?: FigStrokeWeight;
  // Stroke enums are the **domain** string-union representation across
  // FigNode, FigKiwiSymbolOverride, and FigDesignNode. The parser
  // converts raw Kiwi `{ value, name }` to the string at input, and
  // the builder maps back at emission. There is only one in-memory
  // shape per concept — no `KiwiEnumValue | string` unions anywhere.
  readonly strokeJoin?: FigStrokeJoin;
  readonly strokeCap?: FigStrokeCap;
  readonly strokeAlign?: FigStrokeAlign;
  readonly strokeDashes?: readonly number[];
  readonly borderTopWeight?: number;
  readonly borderRightWeight?: number;
  readonly borderBottomWeight?: number;
  readonly borderLeftWeight?: number;
  readonly borderStrokeWeightsIndependent?: boolean;
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];
  readonly rectangleTopLeftCornerRadius?: number;
  readonly rectangleTopRightCornerRadius?: number;
  readonly rectangleBottomLeftCornerRadius?: number;
  readonly rectangleBottomRightCornerRadius?: number;
  readonly rectangleCornerRadiiIndependent?: boolean;
  readonly fillGeometry?: readonly FigFillGeometry[];
  readonly strokeGeometry?: readonly FigFillGeometry[];
  readonly vectorPaths?: readonly FigVectorPath[];
  readonly vectorData?: FigVectorData;
  readonly effects?: readonly FigEffect[];
  readonly styleIdForFill?: FigStyleId;
  readonly styleIdForStrokeFill?: FigStyleId;
  readonly characters?: string;
  readonly textData?: FigKiwiTextData;
  readonly derivedTextData?: FigDerivedTextData;
  readonly componentPropAssignments?: readonly FigComponentPropAssignment[];
  readonly overriddenSymbolID?: FigGuid;
};

export type FigKiwiSymbolOverride = FigKiwiSymbolOverridePayload & {
  readonly guidPath: FigGuidPath;
};

/**
 * Symbol data message as stored in Kiwi binary format.
 *
 * Contains the SYMBOL/COMPONENT reference and override data
 * for INSTANCE nodes.
 */
export type FigKiwiSymbolData = {
  readonly symbolID?: FigGuid;
  readonly overriddenSymbolID?: FigGuid;
  readonly symbolOverrides?: readonly FigKiwiSymbolOverride[];
  readonly [key: string]: unknown;
};

// =============================================================================
// Component Property Types (Kiwi schema representation)
// =============================================================================

/**
 * Component property definition as stored in Kiwi binary format.
 */
export type FigComponentPropDef = {
  readonly id?: FigGuid;
  readonly name?: string;
  readonly type?: KiwiEnumValue;
  readonly initialValue?: FigComponentPropValue;
  readonly sortPosition?: string;
  readonly [key: string]: unknown;
};

/**
 * Component property value as stored in Kiwi binary format.
 */
export type FigComponentPropValue = {
  readonly boolValue?: boolean;
  readonly textValue?: { readonly characters: string };
  readonly guidValue?: FigGuid;
  readonly numberValue?: number;
  readonly [key: string]: unknown;
};

/**
 * Component property reference as stored in Kiwi binary format.
 * Binds a node field to a component property definition.
 */
export type FigComponentPropRef = {
  readonly defID?: FigGuid;
  readonly componentPropNodeField?: KiwiEnumValue;
  readonly [key: string]: unknown;
};

// =============================================================================
// Export Setting (Kiwi schema representation)
// =============================================================================

/**
 * Export setting as stored in Kiwi binary format.
 */
export type FigExportSetting = {
  readonly suffix?: string;
  readonly imageType?: KiwiEnumValue;
  readonly constraint?: { readonly type?: KiwiEnumValue; readonly value?: number };
  readonly svgDataName?: boolean;
  readonly [key: string]: unknown;
};

// =============================================================================
// Component Property Assignment (Kiwi schema representation)
// =============================================================================

/**
 * Component property assignment as stored in Kiwi binary format.
 *
 * Represents an overridden value for a component property on an INSTANCE node.
 * `defID` references the ComponentPropertyDef on the SYMBOL.
 */
export type FigComponentPropAssignment = {
  readonly defID: FigGuid;
  readonly value: {
    readonly boolValue?: boolean;
    readonly textValue?: {
      readonly characters: string;
      readonly lines?: readonly unknown[];
    };
    readonly [key: string]: unknown;
  };
};

// =============================================================================
// Node Type
// =============================================================================

/**
 * Fig node as decoded from Kiwi binary format.
 * This represents the raw structure, not a high-level API.
 *
 * Typed fields cover the most commonly accessed properties.
 * The index signature provides access to additional Kiwi schema fields.
 */
export type FigNode = {
  readonly guid: FigGuid;
  readonly phase: KiwiEnumValue;
  readonly type: KiwiEnumValue<FigNodeType>;
  readonly name?: string;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly parentIndex?: FigParentIndex;
  readonly transform?: FigMatrix;
  readonly size?: FigVector;
  readonly fillPaints?: readonly FigPaint[];
  /** Frame background paints used by real Figma exports. */
  readonly backgroundPaints?: readonly FigPaint[];
  readonly strokePaints?: readonly FigPaint[];
  readonly strokeWeight?: FigStrokeWeight;
  // Stroke enums use domain string-unions (FigStroke{Join,Cap,Align})
  // across FigNode, FigKiwiSymbolOverride, FigDesignNode, and
  // SymbolOverride. The parser converts raw Kiwi `{ value, name }`
  // to the string at input time; the builder emits the `{ value,
  // name }` form back at output time. No mixed shapes in memory.
  readonly strokeAlign?: FigStrokeAlign;
  readonly strokeJoin?: FigStrokeJoin;
  readonly strokeCap?: FigStrokeCap;
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];
  /** Individual corner radius fields (real .fig format — alternative to array) */
  readonly rectangleTopLeftCornerRadius?: number;
  readonly rectangleTopRightCornerRadius?: number;
  readonly rectangleBottomRightCornerRadius?: number;
  readonly rectangleBottomLeftCornerRadius?: number;
  readonly fillGeometry?: readonly FigFillGeometry[];
  readonly strokeGeometry?: readonly FigFillGeometry[];
  readonly vectorPaths?: readonly FigVectorPath[];
  /** Vector data including network blob and per-path style overrides */
  readonly vectorData?: FigVectorData;
  readonly effects?: readonly FigEffect[];
  /** Style reference for fill paint (Kiwi schema field 332) */
  readonly styleIdForFill?: FigStyleId;
  /** Style reference for stroke paint (Kiwi schema field 333) */
  readonly styleIdForStrokeFill?: FigStyleId;
  /** Stroke dash pattern */
  readonly strokeDashes?: readonly number[];
  /** Per-side stroke weights (Figma "Independent stroke weights" feature) */
  readonly borderTopWeight?: number;
  readonly borderRightWeight?: number;
  readonly borderBottomWeight?: number;
  readonly borderLeftWeight?: number;
  readonly borderStrokeWeightsIndependent?: boolean;
  readonly mask?: boolean;
  readonly clipsContent?: boolean;
  readonly frameMaskDisabled?: boolean;
  readonly backgroundColor?: FigColor;
  readonly backgroundEnabled?: boolean;
  readonly backgroundOpacity?: number;
  readonly documentColorProfile?: KiwiEnumValue;
  /** Blend mode for compositing (domain string-union SSoT). */
  readonly blendMode?: BlendMode;
  /** iOS-style corner smoothing (0-1 range) */
  readonly cornerSmoothing?: number;

  // ---- AutoLayout (frame-level) ----
  /** Stack (auto-layout) direction: VERTICAL or HORIZONTAL */
  readonly stackMode?: KiwiEnumValue;
  /** Spacing between stack children (px) */
  readonly stackSpacing?: number;
  /** Padding: number (uniform) or per-side object */
  readonly stackPadding?: number;
  /** Vertical padding (legacy shorthand, Kiwi field) */
  readonly stackVerticalPadding?: number;
  /** Horizontal padding (legacy shorthand, Kiwi field) */
  readonly stackHorizontalPadding?: number;
  /** Right padding override */
  readonly stackPaddingRight?: number;
  /** Bottom padding override */
  readonly stackPaddingBottom?: number;
  /** Primary axis alignment */
  readonly stackPrimaryAlignItems?: KiwiEnumValue;
  /** Counter axis alignment */
  readonly stackCounterAlignItems?: KiwiEnumValue;
  /** Primary axis content distribution */
  readonly stackPrimaryAlignContent?: KiwiEnumValue;
  /** Whether children wrap to next line */
  readonly stackWrap?: boolean;
  /** Spacing between wrapped rows/columns */
  readonly stackCounterSpacing?: number;
  /** Reverse z-order of children */
  readonly itemReverseZIndex?: boolean;

  // ---- AutoLayout (child-level) ----
  /** How this child is positioned in the parent stack (AUTO or ABSOLUTE) */
  readonly stackPositioning?: KiwiEnumValue;
  /** How this child sizes on primary axis (FIXED, HUG, FILL) */
  readonly stackPrimarySizing?: KiwiEnumValue;
  /** How this child sizes on counter axis (FIXED, HUG, FILL) */
  readonly stackCounterSizing?: KiwiEnumValue;
  /** Horizontal constraint for non-auto-layout positioning */
  readonly horizontalConstraint?: KiwiEnumValue;
  /** Vertical constraint for non-auto-layout positioning */
  readonly verticalConstraint?: KiwiEnumValue;
  /** AutoLayout child cross-axis alignment override (STRETCH, AUTO, etc.) */
  readonly stackChildAlignSelf?: KiwiEnumValue;
  /** AutoLayout child primary-axis grow factor (0 = fixed, 1 = fill container) */
  readonly stackChildPrimaryGrow?: number;

  // ---- Boolean operation ----
  /** Boolean operation type (UNION, SUBTRACT, INTERSECT, EXCLUDE) */
  readonly booleanOperation?: KiwiEnumValue;

  // ---- Symbol/Instance fields ----
  /** Symbol data for INSTANCE nodes (symbolID, overrides) */
  readonly symbolData?: FigKiwiSymbolData;
  /** Top-level symbolID (builder-generated format) */
  readonly symbolID?: FigGuid;
  /** Overridden symbol ID for variant swapping */
  readonly overriddenSymbolID?: FigGuid;
  /** Top-level symbol overrides (builder-generated format) */
  readonly symbolOverrides?: readonly FigKiwiSymbolOverride[];
  /** Derived symbol data (computed transforms for INSTANCE children) */
  readonly derivedSymbolData?: readonly FigKiwiSymbolOverride[];
  /** Component property references (bound property definition IDs, string format) */
  readonly componentPropertyReferences?: readonly string[];
  /** Component property assignments (overridden values on INSTANCE) */
  readonly componentPropAssignments?: readonly FigComponentPropAssignment[];
  /** Component property definitions (on SYMBOL/COMPONENT nodes, Kiwi format) */
  readonly componentPropDefs?: readonly FigComponentPropDef[];
  /** Component property references on child nodes (binds field to prop def) */
  readonly componentPropRefs?: readonly FigComponentPropRef[];

  // ---- Style-definition fields (shared-style proxy nodes) ----
  /**
   * Style classification for nodes that ARE style definitions (rather than
   * consumers). A style-definition node's own `fillPaints` / `strokePaints`
   * is the authoritative paint value for the referenced style, and its
   * `key` matches the `assetRef.key` of every consumer's `styleIdForFill` /
   * `styleIdForStrokeFill`. Figma places such nodes on the Internal Only
   * Canvas so they do not render as visible content.
   */
  readonly styleType?: KiwiEnumValue;
  /**
   * Team-library asset key for a node that is a style or component
   * definition. Used to resolve `styleIdForFill.assetRef.key` references
   * to their local style-definition node when the asset was imported from
   * another Figma file.
   */
  readonly key?: string;

  // ---- Section fields ----
  /** Whether section contents are hidden (collapsed) */
  readonly sectionContentsHidden?: boolean;

  // ---- Shape fields ----
  /** Number of points for STAR and REGULAR_POLYGON nodes */
  readonly pointCount?: number;
  /** Inner radius ratio for STAR nodes (0-1 range, default 0.382) */
  readonly starInnerRadius?: number;
  /** Star inner scale factor (0-1). Controls inner vertex positions relative to outer. */
  readonly starInnerScale?: number;
  /** Stroke dash pattern (separate from strokeDashes for legacy compat) */
  readonly dashPattern?: readonly number[];
  /** Handle mirroring mode for vector point handles */
  readonly handleMirroring?: KiwiEnumValue;

  // ---- Export settings ----
  /** Export settings for the node (Kiwi ExportSettings message) */
  readonly exportSettings?: readonly FigExportSetting[];

  // ---- Internal metadata ----
  /** Whether this node is internal-only (e.g., Internal Only Canvas) */
  readonly internalOnly?: boolean;

  // ---- Text fields ----
  /** Text characters content */
  readonly characters?: string;
  /** Font size in pixels */
  readonly fontSize?: number;
  /** Font family and style */
  readonly fontName?: FigFontName;
  /** Horizontal text alignment */
  readonly textAlignHorizontal?: KiwiEnumValue;
  /** Vertical text alignment */
  readonly textAlignVertical?: KiwiEnumValue;
  /** Text auto-resize mode */
  readonly textAutoResize?: KiwiEnumValue;
  /** Text decoration (underline, strikethrough) */
  readonly textDecoration?: KiwiEnumValue;
  /** Text case transformation (UPPER, LOWER, TITLE, etc.) */
  readonly textCase?: KiwiEnumValue;
  /** Line height with units */
  readonly lineHeight?: FigValueWithUnits;
  /** Letter spacing with units */
  readonly letterSpacing?: FigValueWithUnits;
  /** Text truncation mode (ENDING = ellipsis at end) */
  readonly textTruncation?: KiwiEnumValue;
  /** Leading trim mode (CAP_HEIGHT = trim to cap height) */
  readonly leadingTrim?: KiwiEnumValue;
  /** Variable font axis values */
  readonly fontVariations?: readonly { readonly axisTag: number; readonly axisValue: number }[];
  /** Hyperlink data */
  readonly hyperlink?: { readonly url?: string };
  /** Kiwi TextData message for TEXT nodes (per-character styling) */
  readonly textData?: FigKiwiTextData;
  /** Pre-computed text rendering data (glyph outlines, baselines, decorations) */
  readonly derivedTextData?: FigDerivedTextData;

  // ---- Ellipse fields ----
  /** Arc data for partial ellipse/donut shapes */
  readonly arcData?: {
    readonly startingAngle: number;
    readonly endingAngle: number;
    readonly innerRadius: number;
  };

  /**
   * Children (added by tree-builder, not present in raw Kiwi format).
   *
   * The element type is `FigNode | undefined | null` because real .fig
   * files encountered in the wild have sparse arrays: Figma's edit
   * history can leave deleted-node slots as `undefined` and some
   * library fixtures carry explicit `null` placeholders. All
   * tree-walking code must go through `safeChildren`, which filters
   * both out at the boundary (`c != null` covers both cases).
   */
  readonly children?: readonly (FigNode | null | undefined)[];
  /** Additional fields (Kiwi schema has many optional fields) */
  readonly [key: string]: unknown;
};

/**
 * Mutable version of FigNode for use in clone-and-mutate operations.
 *
 * `deepCloneNode` creates a shallow copy of a FigNode. The resulting
 * object is structurally identical but needs to be mutated by
 * `applyOverrides`, `applyComponentPropAssignments`, etc.
 *
 * Using this type instead of `Record<string, unknown>` preserves
 * type safety while allowing mutation.
 */
export type MutableFigNode = {
  -readonly [K in keyof FigNode]: FigNode[K];
};

/** Fig document tree (high-level, for tree building) */
export type FigDocument = {
  readonly type: KiwiEnumValue<FigNodeType>;
  readonly children?: readonly FigNode[];
  readonly [key: string]: unknown;
};

// =============================================================================
// Builder Types
// =============================================================================

/** Options for building a .fig file */
export type FigBuildOptions = {
  /** Compression type to use (default: "deflate") */
  compression?: CompressionType;
  /** Compression level (0-9, default: 6) */
  compressionLevel?: number;
};

/** Input for building a .fig file */
export type FigBuildInput = {
  readonly schema: KiwiSchema;
  readonly document: FigDocument;
  readonly resources?: readonly FigResource[];
};

// =============================================================================
// Figma Node Types
// =============================================================================

/**
 * Known Figma node types
 */
export type FigNodeType =
  | "DOCUMENT"
  | "CANVAS"
  | "FRAME"
  | "GROUP"
  | "RECTANGLE"
  | "ROUNDED_RECTANGLE"
  | "ELLIPSE"
  | "VECTOR"
  | "TEXT"
  | "LINE"
  | "BOOLEAN_OPERATION"
  | "COMPONENT"
  | "COMPONENT_SET"
  | "INSTANCE"
  | "SYMBOL"
  | "STAR"
  | "REGULAR_POLYGON"
  | "SLICE"
  | "STICKY"
  | "CONNECTOR"
  | "SHAPE_WITH_TEXT"
  | "CODE_BLOCK"
  | "STAMP"
  | "WIDGET"
  | "EMBED"
  | "LINK_UNFURL"
  | "MEDIA"
  | "SECTION"
  | "TABLE"
  | "TABLE_CELL";

// =============================================================================
// Figma Geometry Types
// =============================================================================

/**
 * Figma 2x3 affine transform matrix
 * Represents a 2D transformation: [a c tx; b d ty]
 */
export type FigMatrix = {
  readonly m00: number; // a (scale x)
  readonly m01: number; // c (skew x)
  readonly m02: number; // tx (translate x)
  readonly m10: number; // b (skew y)
  readonly m11: number; // d (scale y)
  readonly m12: number; // ty (translate y)
};

/**
 * 2D vector
 */
export type FigVector = {
  readonly x: number;
  readonly y: number;
};

/**
 * Value with units (used for lineHeight, letterSpacing).
 *
 * Kiwi encoding: `{ value: number, units: KiwiEnumValue }`.
 * Units enum values: PIXELS, PERCENT, AUTO.
 */
export type FigValueWithUnits = {
  readonly value: number;
  readonly units: KiwiEnumValue;
};

/**
 * Font name reference.
 *
 * Kiwi encoding stores `family`, `style`, and optionally `postscript`.
 */
export type FigFontName = {
  readonly family: string;
  readonly style: string;
  readonly postscript?: string;
};

// =============================================================================
// Figma Color Types
// =============================================================================

/**
 * RGBA color (0-1 range)
 */
export type FigColor = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

// =============================================================================
// Figma Paint Types
// =============================================================================

/**
 * Paint type enum
 */
export type FigPaintType =
  | "SOLID"
  | "GRADIENT_LINEAR"
  | "GRADIENT_RADIAL"
  | "GRADIENT_ANGULAR"
  | "GRADIENT_DIAMOND"
  | "IMAGE"
  | "EMOJI"
  | "VIDEO";

/**
 * Gradient stop
 */
export type FigGradientStop = {
  readonly position: number;
  readonly color: FigColor;
};

/**
 * Base paint interface.
 *
 * `type` and `blendMode` are SSoT string unions across the fig package.
 * Kiwi binary stores these as `KiwiEnumValue { value, name }`; the
 * parser normalises to the string name at input time and the builder
 * rebuilds the enum shape at output time. No in-memory paint carries
 * the raw enum shape.
 */
export type FigPaintBase = {
  readonly type: FigPaintType;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
};

/**
 * Solid paint
 */
export type FigSolidPaint = FigPaintBase & {
  readonly type: "SOLID";
  readonly color: FigColor;
};

/**
 * Gradient paint transform matrix.
 *
 * Maps gradient space → normalized object space (0..1, 0..1).
 * Same structure as FigMatrix but fields are optional because the
 * Kiwi binary format may omit identity components.
 *
 * Gradient space convention:
 *   (1, 0) → gradient start (0% stop position)
 *   (0, 0) → gradient end (100% stop position)
 */
export type FigGradientTransform = {
  readonly m00?: number; // a (scale x) — default 1
  readonly m01?: number; // c (skew x) — default 0
  readonly m02?: number; // tx (translate x) — default 0
  readonly m10?: number; // b (skew y) — default 0
  readonly m11?: number; // d (scale y) — default 1
  readonly m12?: number; // ty (translate y) — default 0
};

/**
 * Gradient paint
 *
 * Supports both API format (gradientHandlePositions, gradientStops)
 * and Kiwi format (transform, stops).
 */
export type FigGradientPaint = FigPaintBase & {
  readonly type:
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND";
  /** API format: gradient handle positions (start, end, width handle) */
  readonly gradientHandlePositions?: readonly FigVector[];
  /** API format: gradient color stops */
  readonly gradientStops?: readonly FigGradientStop[];
  /** Kiwi format: 2x3 affine transform mapping gradient space → normalized object space */
  readonly transform?: FigGradientTransform;
  /** Kiwi format: gradient color stops (equivalent to gradientStops) */
  readonly stops?: readonly FigGradientStop[];
};

/**
 * Image paint transform.
 *
 * Controls how the image is positioned and scaled within the element.
 * Uses the same 2x3 affine matrix structure as gradient transforms.
 * The transform maps image space → normalized object space (0..1, 0..1).
 */
export type FigImageTransform = FigGradientTransform;

/**
 * Image paint
 */
/** Image paint scale mode — SSoT string union. */
export type FigImageScaleMode = "FILL" | "FIT" | "CROP" | "TILE" | "STRETCH";

export type FigImagePaint = FigPaintBase & {
  readonly type: "IMAGE";
  /** API format: image reference string */
  readonly imageRef?: string;
  /** API format: scale mode (SSoT string). Parser normalises Kiwi enum to string. */
  readonly scaleMode?: FigImageScaleMode;
  /** Kiwi format: image scale mode — same semantic as scaleMode, string form. */
  readonly imageScaleMode?: FigImageScaleMode;
  /** 2x3 affine transform for image positioning within the element */
  readonly transform?: FigImageTransform;
  /** API/builder format: 2x3 affine transform for image positioning. */
  readonly imageTransform?: FigImageTransform;
  /**
   * Multiplier on the natural image size (TILE tile scale, or user-adjusted
   * scale for FILL/FIT/CROP). API format uses `scalingFactor`; Kiwi binary
   * stores `scale`.
   */
  readonly scalingFactor?: number;
  /** Kiwi-format multiplier. Semantics match `scalingFactor`. */
  readonly scale?: number;
  /**
   * Rotation of the image in radians, applied about the element center.
   * Kiwi binary field.
   */
  readonly rotation?: number;
  /** Kiwi format: image data reference (hash-based) */
  readonly image?: { readonly hash?: readonly number[] };
  /** Kiwi format: alternative image hash (string or byte array) */
  readonly imageHash?: string | readonly number[];
};

/**
 * Union of all paint types. Discriminated by the `type` string so
 * TypeScript can narrow via `paint.type === "SOLID"` etc.
 *
 * Historically this union also included the bare `FigPaintBase`, used
 * as a catch-all for unrecognised paint kinds coming out of the kiwi
 * decoder. That shape is no longer representable: the parser layer
 * normalises every `type` field to a `FigPaintType` literal, and
 * anything it cannot normalise is rejected at the parser boundary.
 */
export type FigPaint =
  | FigSolidPaint
  | FigGradientPaint
  | FigImagePaint;

// =============================================================================
// Figma Stroke Types
// =============================================================================

/**
 * Stroke weight type
 */
export type FigStrokeWeight =
  | number
  | {
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
      readonly left: number;
    };

/**
 * Blend mode string literals matching SVG/CSS mix-blend-mode values.
 *
 * SSoT for blend-mode representation across the fig package. Kiwi
 * stores a `KiwiEnumValue { value, name }`; parser normalises to this
 * string at input time and the builder maps back at output. No
 * in-memory Fig* type carries the raw enum shape.
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

/**
 * Stroke cap type
 */
export type FigStrokeCap =
  | "NONE"
  | "ROUND"
  | "SQUARE"
  | "LINE_ARROW"
  | "TRIANGLE_ARROW";

/**
 * Stroke join type
 */
export type FigStrokeJoin = "MITER" | "BEVEL" | "ROUND";

/**
 * Stroke align type
 */
export type FigStrokeAlign = "INSIDE" | "OUTSIDE" | "CENTER";

// =============================================================================
// Figma Geometry Path Types
// =============================================================================

/**
 * Fill/stroke geometry as stored in Kiwi binary format.
 * References a commandsBlob index into the blobs array.
 */
export type FigFillGeometry = {
  readonly windingRule?: KiwiEnumValue | string;
  readonly commandsBlob?: number;
  readonly styleID?: number;
};

/**
 * Per-path style override entry in vectorData.styleOverrideTable.
 *
 * Each entry overrides fill/stroke properties for geometry paths
 * whose styleID matches this entry's styleID field.
 * Analogous to TextData.styleOverrideTable for text styling.
 */
export type FigVectorStyleOverride = {
  readonly styleID: number;
  readonly fillPaints?: readonly FigPaint[];
  readonly strokePaints?: readonly FigPaint[];
  readonly styleIdForFill?: FigStyleId;
  readonly styleIdForStrokeFill?: FigStyleId;
  readonly [key: string]: unknown;
};

/**
 * Vector data as stored in Kiwi binary format.
 *
 * Contains the vector network blob, normalized size, and per-path
 * style overrides for VECTOR nodes.
 */
export type FigVectorData = {
  readonly vectorNetworkBlob?: number;
  readonly normalizedSize?: FigVector;
  readonly styleOverrideTable?: readonly FigVectorStyleOverride[];
  readonly [key: string]: unknown;
};

/**
 * Vector path as stored in Kiwi binary format.
 *
 * The windingRule can be:
 * - A string literal ("NONZERO", "EVENODD", "ODD") in builder-generated files
 * - A KiwiEnumValue ({ value, name }) in real .fig files
 */
export type FigVectorPath = {
  readonly windingRule?: string | KiwiEnumValue;
  readonly data?: string;
};

// =============================================================================
// Figma Effect Types
// =============================================================================

/**
 * Effect type enum
 */
export type FigEffectType =
  | "INNER_SHADOW"
  | "DROP_SHADOW"
  | "LAYER_BLUR"
  | "FOREGROUND_BLUR"
  | "BACKGROUND_BLUR";

/**
 * Figma effect as stored in Kiwi binary format.
 */
export type FigEffect = {
  readonly type: FigEffectType | KiwiEnumValue<FigEffectType>;
  readonly visible?: boolean;
  readonly color?: FigColor;
  readonly offset?: FigVector;
  readonly radius?: number;
  readonly spread?: number;
  readonly blendMode?: BlendMode;
  readonly showShadowBehindNode?: boolean;
};
