/**
 * @file Base measurement types for PPTX processing
 *
 * These types represent ECMA-376 concepts in a renderer-agnostic way.
 * All measurements are converted to CSS-friendly units (px, degrees).
 *
 * Uses branded types for type safety - prevents mixing Pixels with Degrees, etc.
 *
 * @see ECMA-376 Part 1, DrawingML
 */

// =============================================================================
// Branded Type Utilities
// =============================================================================

/**
 * Brand a primitive type to create a nominal type.
 * This prevents accidental mixing of semantically different values.
 *
 * @example
 * type Pixels = Brand<number, 'Pixels'>;
 * type Degrees = Brand<number, 'Degrees'>;
 * const px: Pixels = 100 as Pixels;
 * const deg: Degrees = 45 as Degrees;
 * // px = deg; // Error: Type 'Degrees' is not assignable to type 'Pixels'
 */
declare const __brand: unique symbol;

/**
 * Brand a primitive type to create a nominal type.
 * Exported for use in other domain type definitions.
 */
export type Brand<K, T> = K & { readonly [__brand]: T };

// =============================================================================
// Measurement Types (Branded)
// =============================================================================

/**
 * Length in pixels (branded)
 * Original EMU values are converted during parsing
 *
 * @example
 * const width = parseEmu("914400") as Pixels; // 1 inch = 96px
 */
export type Pixels = Brand<number, 'Pixels'>;

/**
 * Angle in degrees 0-360 (branded)
 * Original 60000ths values are converted during parsing
 *
 * @example
 * const rotation = parseAngle("5400000") as Degrees; // 90 degrees
 */
export type Degrees = Brand<number, 'Degrees'>;

/**
 * Percentage 0-100 (branded)
 * Original 1000ths or 100000ths values are converted during parsing
 *
 * @example
 * const opacity = parsePercentage100k("50000") as Percent; // 50%
 */
export type Percent = Brand<number, 'Percent'>;

/**
 * Points for font sizes (branded)
 * Original 100ths values are converted during parsing
 *
 * @example
 * const fontSize = parseFontSize("1800") as Points; // 18pt
 */
export type Points = Brand<number, 'Points'>;

// =============================================================================
// Branded Type Constructors
// =============================================================================

/**
 * Create a Pixels value from a number.
 * Use this instead of `as Pixels` for runtime conversion.
 */
export const px = (value: number): Pixels => value as Pixels;

/**
 * Create a Degrees value from a number.
 */
export const deg = (value: number): Degrees => value as Degrees;

/**
 * Create a Percent value from a number.
 */
export const pct = (value: number): Percent => value as Percent;

/**
 * Create a Points value from a number.
 */
export const pt = (value: number): Points => value as Points;

// =============================================================================
// Re-exports for backward compatibility
// =============================================================================

// Geometry types
export type { Point, Size, Bounds, EffectExtent, Transform, GroupTransform } from "./geometry";

// Text types
export type {
  TextAlign,
  TextAnchor,
  FontStyle,
  TextCaps,
  VerticalAlign,
  TextDirection,
  TextTypeface,
  TextShapeType,
} from "./text";

// Line types
export type { LineEndType, LineEndSize, LineCap, LineJoin, CompoundLine, DashStyle } from "./line";

// Shape types
export type { PresetShapeType, AdjustValue } from "./shape";

// Shape locks
export type { GroupLocks, ConnectorLocks, PictureLocks, ShapeLocks, ContentPartLocks } from "./shape-locks";

// Positioning types
export type {
  AlignH,
  AlignV,
  RelFromH,
  PositionH,
  RelFromV,
  PositionV,
  WrapPolygon,
  WrapText,
  WrapDistance,
  WrapSquare,
  WrapThrough,
  WrapTight,
  WrapTopAndBottom,
} from "./positioning";

// Anchor types
export type {
  AbsoluteAnchor,
  AnchorClientData,
  AnchorMarker,
  OneCellAnchor,
  TwoCellAnchor,
  EditAs,
  ContentPart,
  LinkedTextbox,
  TextboxInfo,
} from "./anchor";

// Appearance types
export type { BlackWhiteMode, BlipCompression, OnOffStyleType, RectAlignment, FillEffectType } from "./appearance";

// Style reference types
export type { ColorSchemeIndex, SchemeColorValue, FontCollectionIndex, StyleMatrixColumnIndex, ShapeId } from "./style-ref";

// 3D types
export type { LightRigDirection, LightRigType, PresetCameraType, PresetMaterialType } from "./three-d";

// Effect types
export type {
  EffectContainerType,
  EffectContainer,
  BlendMode,
  ShadowEffect,
  PresetShadowValue,
  PresetShadowEffect,
  GlowEffect,
  ReflectionEffect,
  SoftEdgeEffect,
  AlphaBiLevelEffect,
  AlphaCeilingEffect,
  AlphaFloorEffect,
  AlphaInverseEffect,
  AlphaModulateEffect,
  AlphaModulateFixedEffect,
  AlphaOutsetEffect,
  AlphaReplaceEffect,
  BiLevelEffect,
  BlendEffect,
  ColorChangeEffect,
  ColorReplaceEffect,
  DuotoneEffect,
  FillOverlayEffect,
  GrayscaleEffect,
  RelativeOffsetEffect,
  Effects,
} from "./effects";

// Resource types
export type { ResourceId, ResourcePath, Hyperlink, HyperlinkSound } from "./resource";
