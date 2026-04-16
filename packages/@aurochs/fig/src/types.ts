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
export type FigStyleId = {
  readonly guid: FigGuid;
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
  readonly firstCharacter: number;
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
 * Pre-computed text rendering data from Kiwi binary format.
 * Contains glyph outlines, baselines, and decorations for path-based text rendering.
 */
export type FigDerivedTextData = {
  readonly layoutSize?: FigVector;
  readonly baselines?: readonly FigDerivedBaseline[];
  readonly glyphs?: readonly FigDerivedGlyph[];
  readonly decorations?: readonly FigDerivedDecoration[];
  readonly fontMetaData?: readonly unknown[];
  readonly derivedLines?: readonly unknown[];
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
 * one or more of its properties. The overridden properties are the same
 * fields as FigNode (fillPaints, opacity, visible, etc.).
 *
 * The index signature is required because overrides carry arbitrary
 * node properties as their payload — this is inherent to the Kiwi schema.
 */
export type FigKiwiSymbolOverride = {
  readonly guidPath: FigGuidPath;
  readonly [key: string]: unknown;
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
  readonly strokePaints?: readonly FigPaint[];
  readonly strokeWeight?: FigStrokeWeight;
  readonly strokeAlign?: KiwiEnumValue;
  readonly strokeJoin?: KiwiEnumValue;
  readonly strokeCap?: KiwiEnumValue;
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];
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
  /** Blend mode for compositing */
  readonly blendMode?: string | KiwiEnumValue;
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

  /** Children (added by tree-builder, not present in raw Kiwi format) */
  readonly children?: readonly FigNode[];
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
 * Base paint interface
 *
 * The type and blendMode fields accept both string literals (API format)
 * and KiwiEnumValue objects (binary .fig format).
 */
export type FigPaintBase = {
  readonly type: FigPaintType | KiwiEnumValue;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: string | KiwiEnumValue;
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
export type FigImagePaint = FigPaintBase & {
  readonly type: "IMAGE";
  /** API format: image reference string */
  readonly imageRef?: string;
  /** API format: scale mode */
  readonly scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  /** Kiwi format: image scale mode as KiwiEnumValue */
  readonly imageScaleMode?: KiwiEnumValue;
  /** 2x3 affine transform for image positioning within the element */
  readonly transform?: FigImageTransform;
  /** Kiwi format: image data reference (hash-based) */
  readonly image?: { readonly hash?: readonly number[] };
  /** Kiwi format: alternative image hash (string or byte array) */
  readonly imageHash?: string | readonly number[];
};

/**
 * Union of all paint types
 */
export type FigPaint =
  | FigSolidPaint
  | FigGradientPaint
  | FigImagePaint
  | FigPaintBase;

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
  readonly blendMode?: string | KiwiEnumValue;
  readonly showShadowBehindNode?: boolean;
};
