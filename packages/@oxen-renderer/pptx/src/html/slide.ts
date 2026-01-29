/**
 * @file Slide renderer
 *
 * Converts Slide domain objects to HTML output.
 */

import type { Background, Slide, SlideSize } from "@oxen-office/pptx/domain/index";
import type { CoreRenderContext } from "../render-context";
import type { RenderWarning } from "../warnings";
import type { ResolvedBackgroundFill } from "../background-fill";
import { buildStyle, div, EMPTY_HTML, type HtmlString, unsafeHtml } from "./index";
import { fillToBackground } from "./fill";
import { renderShapes } from "./shape";

// =============================================================================
// Render Result
// =============================================================================

/**
 * Slide render result
 */
export type SlideRenderResult = {
  /** Rendered HTML content */
  readonly html: HtmlString;

  /** Generated CSS styles */
  readonly styles: string;

  /** Warnings generated during rendering */
  readonly warnings: readonly RenderWarning[];
};

// =============================================================================
// Background Rendering
// =============================================================================

/**
 * Convert ResolvedBackgroundFill to CSS background value
 */
function resolvedBackgroundToCss(resolved: ResolvedBackgroundFill): string {
  switch (resolved.type) {
    case "solid":
      return resolved.color;
    case "gradient": {
      if (resolved.isRadial) {
        const cx = resolved.radialCenter?.cx ?? 50;
        const cy = resolved.radialCenter?.cy ?? 50;
        const stops = resolved.stops
          .map((s) => `${s.color} ${s.position}%`)
          .join(", ");
        return `radial-gradient(circle at ${cx}% ${cy}%, ${stops})`;
      }
      const angle = 90 - resolved.angle; // CSS uses clockwise from top
      const stops = resolved.stops
        .map((s) => `${s.color} ${s.position}%`)
        .join(", ");
      return `linear-gradient(${angle}deg, ${stops})`;
    }
    case "image":
      if (resolved.mode === "tile") {
        return `url("${resolved.dataUrl}") repeat`;
      }
      return `url("${resolved.dataUrl}") center/cover no-repeat`;
  }
}

/**
 * Convert Background fill to CSS background value (resource-aware)
 */
function backgroundFillToCss(
  background: Background | undefined,
  ctx: CoreRenderContext
): string | undefined {
  if (!background?.fill) {
    return undefined;
  }

  const fill = background.fill;
  if (fill.type === "blipFill") {
    const imagePath = ctx.resources.resolve(fill.resourceId);
    if (imagePath !== undefined) {
      if (fill.tile) {
        return `url("${imagePath}") repeat`;
      }
      if (fill.stretch !== undefined) {
        return `url("${imagePath}") center/100% 100% no-repeat`;
      }
      return `url("${imagePath}") center/cover no-repeat`;
    }
  }

  return fillToBackground(fill, ctx.colorContext);
}

/**
 * Render slide background
 *
 * Uses ctx.resolvedBackground (pre-resolved from slide/layout/master hierarchy)
 * if available, otherwise falls back to slide.background.
 */
function renderBackground(
  background: Background | undefined,
  slideSize: SlideSize,
  ctx: CoreRenderContext
): HtmlString {
  const bgStyle = resolveBackgroundCss(background, ctx);

  if (bgStyle === undefined) {
    return EMPTY_HTML;
  }

  return div({
    class: "slide-background",
    style: buildStyle({
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      background: bgStyle,
      "z-index": "-1",
    }),
  });
}

function resolveBackgroundCss(
  background: Background | undefined,
  ctx: CoreRenderContext
): string | undefined {
  // Prefer pre-resolved background (handles inheritance correctly)
  if (ctx.resolvedBackground !== undefined) {
    return resolvedBackgroundToCss(ctx.resolvedBackground);
  }
  return backgroundFillToCss(background, ctx);
}

// =============================================================================
// Slide Rendering
// =============================================================================

/**
 * Build slide container styles
 */
function buildSlideStyles(slideSize: SlideSize): Record<string, string> {
  return {
    position: "relative",
    width: `${slideSize.width}px`,
    height: `${slideSize.height}px`,
    overflow: "hidden",
    "font-family": "'Calibri', 'Arial', sans-serif",
    "font-size": "18px",
    "line-height": "1.2",
  };
}

/**
 * Render a slide to HTML
 */
export function renderSlide(slide: Slide, ctx: CoreRenderContext): SlideRenderResult {
  // Render background
  const backgroundHtml = renderBackground(slide.background, ctx.slideSize, ctx);

  // Render shapes
  const shapesHtml = renderShapes(slide.shapes, ctx);

  // Build slide container
  const slideStyles = buildSlideStyles(ctx.slideSize);

  const slideHtml = div(
    {
      class: "slide",
      style: buildStyle(slideStyles),
    },
    backgroundHtml,
    shapesHtml
  );

  return {
    html: slideHtml,
    styles: "", // No dynamic styles currently generated
    warnings: ctx.warnings.getAll(),
  };
}

/**
 * Render a slide with wrapper for standalone display
 */
export function renderSlideStandalone(slide: Slide, ctx: CoreRenderContext): HtmlString {
  const result = renderSlide(slide, ctx);

  // Add base styles
  const baseStyles = `
.slide {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.slide * {
  box-sizing: border-box;
}
.shape {
  pointer-events: auto;
}
.text-body {
  pointer-events: none;
}
.text-body * {
  pointer-events: auto;
}
.hyperlink {
  color: inherit;
  text-decoration: underline;
}
.hyperlink:hover {
  opacity: 0.8;
}
`;

  return unsafeHtml(`
<style>
${baseStyles}
${result.styles}
</style>
${result.html}
`);
}

// =============================================================================
// Multiple Slides Rendering
// =============================================================================

/**
 * Render multiple slides
 */
export function renderSlides(
  slides: readonly Slide[],
  ctx: CoreRenderContext
): readonly SlideRenderResult[] {
  return slides.map((slide) => renderSlide(slide, ctx));
}

// =============================================================================
// Empty Slide Generation
// =============================================================================

/**
 * Create empty slide HTML for error cases.
 *
 * Used when slide parsing fails and we need to return a valid HTML structure.
 *
 * @param slideSize - Slide dimensions
 * @returns HTML string for an empty white slide
 */
export function createEmptySlideHtml(slideSize: SlideSize): string {
  return `<div class="slide" style="width:${slideSize.width}px;height:${slideSize.height}px;background:#fff;"></div>`;
}
