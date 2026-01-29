/**
 * @file Standalone SVG slide renderer
 *
 * Provides a pure function to render a Slide to SVG format.
 * This is the public API for SVG rendering, replacing the
 * Slide.renderSVG() method.
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 */

import type { Slide } from "@oxen-office/pptx/app/types";
import type { XmlDocument, XmlElement } from "@oxen/xml";
import { getByPath } from "@oxen/xml";
import { renderSlideSvgIntegrated } from "../slide-render";
import { createSlideContext, type SlideContext } from "@oxen-office/pptx/parser/slide/context";
import { createPlaceholderTable, createColorMap } from "@oxen-office/pptx/parser/slide/resource-adapters";
import { parseTheme, parseMasterTextStyles } from "@oxen-office/pptx/parser/drawing-ml/index";
import { DEFAULT_RENDER_OPTIONS } from "../render-options";

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
 * Build SlideContext from a Slide object.
 *
 * This function coordinates parser and render layer utilities to build
 * the complete context needed for rendering.
 *
 * @param slide - Slide data with all rendering context
 * @returns SlideContext for use in rendering
 */
function buildSlideContextFromSlide(slide: Slide): SlideContext {
  // Extract color map from master
  const masterClrMap = getByPath(slide.master, ["p:sldMaster", "p:clrMap"]);

  // Extract color map override from slide (if present)
  const slideClrMapOvr = getByPath(slide.content, ["p:sld", "p:clrMapOvr", "a:overrideClrMapping"]);

  // Get slide content element
  const slideContent = getByPath(slide.content, ["p:sld"]);

  const slideParams = {
    content: slideContent as XmlElement,
    resources: slide.relationships,
    colorMapOverride: slideClrMapOvr !== undefined ? createColorMap(slideClrMapOvr) : undefined,
  };

  // Get layout content element for background lookup
  const layoutContent = getByPath(slide.layout, ["p:sldLayout"]);

  // Get master content element for background lookup
  const masterContent = getByPath(slide.master, ["p:sldMaster"]);

  const layout = {
    placeholders: createPlaceholderTable(slide.layoutTables),
    resources: slide.layoutRelationships,
    content: layoutContent as XmlElement | undefined,
  };

  const master = {
    textStyles: parseMasterTextStyles(slide.masterTextStyles as XmlElement | undefined),
    placeholders: createPlaceholderTable(slide.masterTables),
    colorMap: createColorMap(masterClrMap),
    resources: slide.masterRelationships,
    content: masterContent as XmlElement | undefined,
  };

  const theme = parseTheme(slide.theme, slide.themeOverrides as XmlDocument[]);

  const presentation = {
    theme,
    defaultTextStyle: slide.defaultTextStyle as XmlElement | null,
    zip: slide.zip,
    renderOptions: slide.renderOptions ?? DEFAULT_RENDER_OPTIONS,
    themeResources: slide.themeRelationships,
    tableStyles: slide.tableStyles ?? undefined,
  };

  return createSlideContext({ slide: slideParams, layout, master, presentation });
}

/**
 * Render a slide to SVG format.
 *
 * This is the public API for SVG rendering, replacing the Slide.renderSVG() method.
 * The function takes a Slide object containing all necessary data and returns
 * a complete SVG document.
 *
 * @param slide - Slide data with all rendering context
 * @returns SVG string and any warnings
 *
 * @example
 * ```typescript
 * import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
 *
 * const { svg, warnings } = renderSlideToSvg(slide);
 * ```
 */
export function renderSlideToSvg(slide: Slide): SvgRenderResult {
  const slideRenderCtx = buildSlideContextFromSlide(slide);
  const result = renderSlideSvgIntegrated(slide.content as XmlDocument, slideRenderCtx, slide.slideSize);
  return {
    svg: result.svg,
    warnings: result.warnings,
  };
}
