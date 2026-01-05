/**
 * @file Slide accessor - Re-export from render layer
 *
 * This file re-exports from the canonical location in render/core/slide-context.ts.
 * All new code should import directly from render/core/slide-context.
 *
 * @deprecated Import from '../../render/core/slide-context' instead
 */

export type {
  SlideMasterParams,
  SlideLayoutParams,
  SlideParams,
  PresentationContext,
  ParagraphContext,
  ShapeContext,
  SlideRenderContext,
  PlaceholderContext,
  ResourceContext,
  BackgroundSource,
  BackgroundContext,
  TextStyleContext,
} from "../../render/core/slide-context";

export {
  createParagraphContext,
  createShapeContext,
  createSlideRenderContext,
  toColorResolveContext,
  toPlaceholderContext,
  toResourceContext,
  toTextStyleContext,
} from "../../render/core/slide-context";
