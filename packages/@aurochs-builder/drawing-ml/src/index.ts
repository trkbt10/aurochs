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

// Input spec types: import directly from @aurochs-office/drawing-ml/domain/spec

// Fill builders
export {
  buildColor,
  buildFill,
  buildGradientFill,
  buildPatternFill,
  buildSolidFill,
  buildSolidFillFromSpec,
  buildThemeFill,
  buildBlipFill,
  buildSimpleBlipFill,
  buildCroppedBlipFill,
  buildTiledBlipFill,
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
