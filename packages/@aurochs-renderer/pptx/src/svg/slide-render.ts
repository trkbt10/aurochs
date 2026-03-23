/**
 * @file Standalone SVG slide renderer
 *
 * Provides a pure function to render a Slide to SVG format.
 * This is the public API for SVG rendering.
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 */

import type { Slide } from "@aurochs-office/pptx/app/types";
import { renderSlideSvgIntegrated } from "../slide-render";
import { buildSlideRenderContext } from "../context/api-render-context";

/**
 * Result of rendering a slide to SVG.
 */
export type SvgRenderResult = {
  /** Complete SVG document string */
  readonly svg: string;
  /** Warnings generated during rendering */
  readonly warnings: readonly string[];
};

/**
 * Render a slide to SVG format.
 *
 * This is the public API for SVG rendering.
 *
 * @param slide - Slide data with all rendering context
 * @returns SVG string and any warnings
 */
export function renderSlideToSvg(slide: Slide): SvgRenderResult {
  const slideRenderCtx = buildSlideRenderContext({
    apiSlide: slide,
    zip: slide.zip,
    defaultTextStyle: slide.defaultTextStyle,
    renderOptions: slide.renderOptions,
  });
  const result = renderSlideSvgIntegrated(slide.content, slideRenderCtx, slide.slideSize);
  return {
    svg: result.svg,
    warnings: result.warnings,
  };
}
