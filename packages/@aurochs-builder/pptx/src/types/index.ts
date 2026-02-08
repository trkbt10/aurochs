/**
 * @file Type definitions for PPTX builder
 *
 * This module provides PPTX-specific type definitions for build specifications.
 *
 * NOTE: Common types should be imported directly from @aurochs-builder/drawing-ml:
 * - Color types: ColorSpec, ThemeColorSpec, isThemeColor
 * - Fill types: FillSpec, SolidFillSpec, GradientFillSpec, PatternFillSpec, ThemeFillSpec, GradientStopSpec
 * - Line types: LineEndSpec, LineSpec, DashStyle, LineCap, LineJoin, CompoundLine
 * - Effect types: EffectsSpec, ShadowEffectSpec, GlowEffectSpec, SoftEdgeEffectSpec, ReflectionEffectSpec
 * - 3D types: BevelSpec, Shape3dSpec, BevelPresetType, PresetMaterialType
 * - Text types: TextSpec, TextRunSpec, TextParagraphSpec, RichTextSpec, TextBodyPropertiesSpec, etc.
 */

// PPTX-specific spec types
export {
  // Shape types
  type PlaceholderSpec,
  type ShapeSpec,
  // Custom geometry types
  type CustomGeometrySpec,
  type GeometryPathFillMode,
  type GeometryPathSpec,
  type MoveToSpec,
  type LineToSpec,
  type ArcToSpec,
  type QuadBezierToSpec,
  type CubicBezierToSpec,
  type CloseSpec,
  type PathCommandSpec,
  // Blip effects types
  type BlipEffectSpec,
  // Image/media types
  type ImageSpec,
  type MediaEmbedSpec,
  // Connector types
  type ConnectorSpec,
  // Group types
  type GroupSpec,
  // Table types (new tables)
  type TableCellSpec,
  type TableSpec,
  // Table update types (existing tables)
  type TableTextRunSpec,
  type TableParagraphSpec,
  type TableTextBodySpec,
  type TableCellUpdateSpec,
  type TableRowAddSpec,
  type TableColumnAddSpec,
  type TableUpdateSpec,
  // Chart types
  type ChartSeriesSpec,
  type ChartDataSpec,
  type ChartTransformSpec,
  type ChartUpdateSpec,
  type ChartOptionsSpec,
  type ChartAddSpec,
  // Background types
  type BackgroundSolidSpec,
  type BackgroundGradientSpec,
  type BackgroundImageSpec,
  type BackgroundFillSpec,
  // Transition types
  type SlideTransitionSpec,
  // Animation types
  type AnimationClassSpec,
  type AnimationSpec,
  // Comment/Notes types
  type CommentSpec,
  type NotesSpec,
  // Diagram types
  type DiagramNodeTextUpdateSpec,
  type DiagramNodeAddSpec,
  type DiagramNodeRemoveSpec,
  type DiagramConnectionSpec,
  type DiagramChangeSpec,
  type SmartArtUpdateSpec,
  // Slide types
  type SlideModSpec,
  // Note: SlideAddSpec, SlideRemoveSpec, SlideReorderSpec, SlideDuplicateSpec
  // are exported from slide-ops module to avoid duplicate exports
  // Build types
  type BuildSpec,
  type BuildData,
  // Theme types
  type ThemeSchemeColorName,
  type ThemeColorSchemeEditSpec,
  type ThemeFontSpec,
  type ThemeFontSchemeEditSpec,
  type ThemeEditSpec,
} from "./spec-types";
