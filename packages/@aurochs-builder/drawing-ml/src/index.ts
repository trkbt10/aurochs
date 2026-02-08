/**
 * @file DrawingML builder utilities
 *
 * This package provides shared builders for DrawingML elements used across
 * PPTX, DOCX, and XLSX formats. These builders convert simplified spec types
 * into domain model objects.
 *
 * @example
 * ```typescript
 * import { buildFill, buildLine, buildTextBody } from "@aurochs-builder/drawing-ml";
 * // or import specific modules:
 * import { buildSolidFill, buildGradientFill } from "@aurochs-builder/drawing-ml/fill";
 * import { buildLine, buildLineEnd } from "@aurochs-builder/drawing-ml/line";
 * ```
 */

// Types - spec types for building DrawingML elements
export {
  isThemeColor,
  type ThemeColorSpec,
  type ColorSpec,
  type GradientStopSpec,
  type GradientFillSpec,
  type PatternFillSpec,
  type SolidFillSpec,
  type ThemeFillSpec,
  type FillSpec,
  type LineEndType,
  type LineEndSize,
  type LineEndSpec,
  type DashStyle,
  type LineCap,
  type LineJoin,
  type CompoundLine,
  type LineSpec,
  type ShadowEffectSpec,
  type GlowEffectSpec,
  type SoftEdgeEffectSpec,
  type ReflectionEffectSpec,
  type EffectsSpec,
  type BevelPresetType,
  type PresetMaterialType,
  type BevelSpec,
  type Shape3dSpec,
  type TextAlign,
  type TextAnchor,
  type TextVerticalType,
  type UnderlineStyle,
  type StrikeStyle,
  type TextCaps,
  type TextVerticalPosition,
  type BulletType,
  type BulletSpec,
  type TextOutlineSpec,
  type TextEffectSpec,
  type HyperlinkSpec,
  type TextRunSpec,
  type LineSpacingSpec,
  type TextParagraphSpec,
  type RichTextSpec,
  type TextSpec,
  type TextWrapping,
  type TextBodyPropertiesSpec,
} from "./types";

// Fill builders
export {
  buildColor,
  buildFill,
  buildGradientFill,
  buildPatternFill,
  buildSolidFill,
  buildSolidFillFromSpec,
  buildThemeFill,
} from "./fill";

// Line builders
export { buildLine, buildLineEnd, buildLineFromSpec } from "./line";

// Effect builders
export { buildEffects, buildBevel, buildShape3d } from "./effect";
export type { Bevel3d, Shape3d } from "./effect";

// Text builders
export { buildTextBody, buildParagraph, buildTextRun, collectHyperlinks } from "./text";
export type {
  TextBody,
  BodyProperties,
  Paragraph,
  ParagraphProperties,
  TextRun,
  RunProperties,
  BulletStyle,
  Bullet,
  LineSpacing,
  Hyperlink,
  HyperlinkInfo,
} from "./text";

// Transform builders
export { buildTransform, buildGroupTransform } from "./transform";
export type { Transform2D, TransformSpec, GroupTransform, GroupTransformSpec } from "./transform";
