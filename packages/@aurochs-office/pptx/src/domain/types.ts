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
// OOXML Unit Types - DO NOT RE-EXPORT
// =============================================================================
// Import directly from "@/ooxml/domain/units" for:
// Brand, Pixels, Degrees, Percent, Points, EMU, px, deg, pct, pt, emu
// =============================================================================

// =============================================================================
// PPTX-specific Branded Types
// =============================================================================

// Import Brand for defining PPTX-specific types (import is OK, re-export is not)
import type { Brand } from "@aurochs-office/drawing-ml/domain/units";

/**
 * Relationship ID (rId1, rId2, etc.) used in .rels files
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type RelationshipId = Brand<string, "RelationshipId">;

/**
 * Hex color string (#RRGGBB or RRGGBB format)
 */
export type HexColor = Brand<string, "HexColor">;

// =============================================================================
// PPTX-specific Branded Type Constructors
// =============================================================================

/**
 * Create a RelationshipId from a string.
 */
export const rId = (value: string): RelationshipId => value as RelationshipId;

/**
 * Create a HexColor from a string.
 */
export const hexColor = (value: string): HexColor => value as HexColor;

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
export type { BlackWhiteMode, OnOffStyleType, RectAlignment, FillEffectType } from "./appearance";

// Style reference types
export type {
  ColorSchemeIndex,
  SchemeColorValue,
  FontCollectionIndex,
  StyleMatrixColumnIndex,
  ShapeId,
} from "./style-ref";

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
