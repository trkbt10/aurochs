/**
 * @file Slide object factory
 *
 * Creates Slide objects with rendering capabilities from SlideData.
 * This is the API layer that builds the public Slide interface.
 */

import type { Slide } from "../types/api";
import type { ZipFile, SlideSize } from "../domain";
import type { XmlElement, XmlDocument } from "../../xml";
import { getByPath } from "../../xml";
import type { SlideData } from "../domain/slide/data";
import type { RenderOptions } from "../render/render-options";
import type { SlideRenderContext } from "../render/core/slide-context";
import { createSlideRenderContext } from "../render/core/slide-context";
import { createPlaceholderTable, createColorMap } from "../parser/slide/resource-adapters";
import { parseTheme, parseMasterTextStyles } from "../parser/drawing-ml";
import { DEFAULT_RENDER_OPTIONS } from "../render/render-options";
import { renderSlideIntegrated, renderSlideSvgIntegrated } from "./slide-render";
import { parseSlideTimingData } from "../parser/timing-parser";

/**
 * Build SlideRenderContext directly from SlideData.
 *
 * This function coordinates parser and render layer utilities to build
 * the complete context needed for rendering.
 *
 * @param data - Complete slide data with all parsed XML
 * @param zip - ZipFile adapter for reading resources
 * @param defaultTextStyle - Default text style from presentation.xml
 * @param renderOptions - Optional render options for dialect-specific behavior
 * @returns SlideRenderContext for use in rendering
 */
function buildSlideRenderContext(
  data: SlideData,
  zip: ZipFile,
  defaultTextStyle: XmlElement | null,
  renderOptions?: RenderOptions,
): SlideRenderContext {
  // Extract color map from master
  const masterClrMap = getByPath(data.master, ["p:sldMaster", "p:clrMap"]);

  // Extract color map override from slide (if present)
  const slideClrMapOvr = getByPath(data.content, ["p:sld", "p:clrMapOvr", "a:overrideClrMapping"]);

  // Get slide content element
  const slideContent = getByPath(data.content, ["p:sld"]);

  const slide = {
    content: slideContent as XmlElement,
    resources: data.relationships,
    colorMapOverride: slideClrMapOvr !== undefined ? createColorMap(slideClrMapOvr) : undefined,
  };

  // Get layout content element for background lookup
  const layoutContent = getByPath(data.layout, ["p:sldLayout"]);

  // Get master content element for background lookup
  const masterContent = getByPath(data.master, ["p:sldMaster"]);

  const layout = {
    placeholders: createPlaceholderTable(data.layoutTables),
    resources: data.layoutRelationships,
    content: layoutContent as XmlElement | undefined,
  };

  const master = {
    textStyles: parseMasterTextStyles(data.masterTextStyles),
    placeholders: createPlaceholderTable(data.masterTables),
    colorMap: createColorMap(masterClrMap),
    resources: data.masterRelationships,
    content: masterContent as XmlElement | undefined,
  };

  const theme = parseTheme(data.theme, data.themeOverrides);

  const presentation = {
    theme,
    defaultTextStyle,
    zip,
    renderOptions: renderOptions ?? DEFAULT_RENDER_OPTIONS,
    themeResources: data.themeRelationships,
  };

  return createSlideRenderContext(slide, layout, master, presentation);
}

/**
 * Create a Slide object from SlideData.
 *
 * This is the main factory function that builds the public Slide API object
 * with rendering methods.
 *
 * @param data - Complete slide data with all parsed XML
 * @param zip - ZipFile adapter for reading resources
 * @param defaultTextStyle - Default text style from presentation.xml
 * @param slideSize - Slide dimensions
 * @param renderOptions - Optional render options for dialect-specific behavior
 * @returns A Slide object with rendering methods
 */
export function createSlide(
  data: SlideData,
  zip: ZipFile,
  defaultTextStyle: XmlElement | null,
  slideSize: SlideSize,
  renderOptions?: RenderOptions,
): Slide {
  const renderHTML = (): string => {
    const slideRenderCtx = buildSlideRenderContext(data, zip, defaultTextStyle, renderOptions);
    const result = renderSlideIntegrated(data.content as XmlDocument, slideRenderCtx, slideSize);
    return `<style>${result.styles}</style>${result.html}`;
  };

  const renderSVG = (): string => {
    // Use render for SVG output (text style inheritance now implemented)
    const slideRenderCtx = buildSlideRenderContext(data, zip, defaultTextStyle, renderOptions);
    const result = renderSlideSvgIntegrated(data.content as XmlDocument, slideRenderCtx, slideSize);
    return result.svg;
  };

  // Parse timing data (lazy, cached)
  const timing = parseSlideTimingData(data.content);

  return {
    number: data.number,
    filename: data.filename,
    content: data.content,
    layout: data.layout,
    layoutTables: data.layoutTables,
    master: data.master,
    masterTables: data.masterTables,
    masterTextStyles: data.masterTextStyles,
    theme: data.theme,
    relationships: data.relationships,
    layoutRelationships: data.layoutRelationships,
    masterRelationships: data.masterRelationships,
    themeRelationships: data.themeRelationships,
    diagram: data.diagram,
    diagramRelationships: data.diagramRelationships,
    timing,
    renderHTML,
    renderSVG,
  };
}
