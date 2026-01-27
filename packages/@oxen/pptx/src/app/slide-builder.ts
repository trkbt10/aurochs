/**
 * @file Slide object factory
 *
 * Creates Slide objects from SlideData.
 * This is the API layer that builds the public Slide interface.
 */

import type { Slide } from "./types";
import type { ZipFile, SlideSize } from "../domain";
import type { XmlElement } from "@oxen/xml";
import type { SlideData } from "../parser/slide/data-types";
import type { RenderOptions } from "../render/render-options";
import type { TableStyleList } from "../parser/table/style-parser";
import { DEFAULT_RENDER_OPTIONS } from "../render/render-options";
import { parseSlideTimingData } from "../parser/timing-parser";
import { parseSlideTransitionData } from "../parser/slide/transition-parser";

/**
 * Create a Slide object from SlideData.
 *
 * This is the main factory function that builds the public Slide API object
 * with rendering methods.
 *
 * @param data - Complete slide data with all parsed XML
 * @param zip - ZipFile adapter for reading resources
 * @param defaultTextStyle - Default text style from presentation.xml
 * @param tableStyles - Table styles from ppt/tableStyles.xml
 * @param slideSize - Slide dimensions
 * @param renderOptions - Optional render options for dialect-specific behavior
 * @returns A Slide object with rendering methods
 */
export function createSlide(
  data: SlideData,
  zip: ZipFile,
  defaultTextStyle: XmlElement | null,
  tableStyles: TableStyleList | null,
  slideSize: SlideSize,
  renderOptions?: RenderOptions,
): Slide {
  // Parse timing data (lazy, cached)
  const timing = parseSlideTimingData(data.content);

  // Parse transition data
  const transition = parseSlideTransitionData(data.content);

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
    transition,
    // New properties for standalone rendering
    themeOverrides: data.themeOverrides,
    zip,
    defaultTextStyle,
    tableStyles,
    slideSize,
    renderOptions: renderOptions ?? DEFAULT_RENDER_OPTIONS,
  };
}
