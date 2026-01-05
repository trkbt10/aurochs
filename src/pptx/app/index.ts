/**
 * @file Presentation reader entry point
 * Main entry point for reading PPTX files
 */

import type { PresentationFile } from "../types/file";
import type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions } from "./types";
import type { SlideFileInfo, ZipFile } from "../opc";
import type { SlideSize } from "../domain";
import type { XmlElement } from "../../xml";
import type { SlideData } from "../domain/slide/data";
import type { RenderOptions } from "../render/render-options";
import { parseContentTypes, buildSlideFileInfoList } from "../opc";
import { parseSlideSizeFromXml, parseDefaultTextStyle, parseAppVersion } from "../domain";
import { createZipAdapter } from "../reader/zip-adapter";
import { readXml, getRelationships, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../parser/slide/xml-reader";
import { createSlide } from "../reader/slide/slide-builder";
import { loadLayoutData, loadMasterData, loadThemeData, loadDiagramData } from "../parser/slide/loader";

// Re-export types for convenience
export type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions };

/**
 * Parse a slide from file
 */
function parseSlide(
  file: PresentationFile,
  slideInfo: SlideFileInfo,
  appVersion: number,
  zipAdapter: ZipFile,
  defaultTextStyle: XmlElement | null,
  slideSize: SlideSize,
  renderOptions?: RenderOptions,
): Slide {
  // Read slide content
  const content = readXml(file, slideInfo.path, appVersion, true, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  if (content === null) {
    throw new Error(`Failed to read slide: ${slideInfo.path}`);
  }

  // Get slide relationships
  const relationships = getRelationships(file, slideInfo.path, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);

  // Load layout
  const layoutData = loadLayoutData(file, relationships);

  // Load master
  const masterData = loadMasterData(file, layoutData.layoutRelationships);

  // Load theme
  const themeData = loadThemeData(file, masterData.masterRelationships);

  // Load diagram
  const diagramData = loadDiagramData(file, relationships);

  const data: SlideData = {
    number: slideInfo.number,
    filename: slideInfo.filename,
    content,
    layout: layoutData.layout,
    layoutTables: layoutData.layoutTables,
    master: masterData.master,
    masterTables: masterData.masterTables,
    masterTextStyles: masterData.masterTextStyles,
    theme: themeData.theme,
    relationships,
    layoutRelationships: layoutData.layoutRelationships,
    masterRelationships: masterData.masterRelationships,
    themeRelationships: themeData.themeRelationships,
    themeOverrides: themeData.themeOverrides,
    diagram: diagramData.diagram,
    diagramRelationships: diagramData.diagramRelationships,
  };

  return createSlide(data, zipAdapter, defaultTextStyle, slideSize, renderOptions);
}

/**
 * Create a Presentation instance from a PresentationFile
 * @param file - A PresentationFile implementation (e.g., from fflate, pako, or filesystem)
 * @param options - Optional presentation options (e.g., render dialect)
 * @returns A Presentation object for accessing slides and metadata
 * @throws Error if the file is not a valid PPTX or cannot be read
 *
 * @example
 * ```typescript
 * import { openPresentation } from "web-pptx";
 * import { createPresentationFile } from "web-pptx/fflate";
 *
 * const file = createPresentationFile(pptxBuffer);
 * const presentation = openPresentation(file);
 *
 * console.log(`${presentation.count} slides, ${presentation.size.width}x${presentation.size.height}`);
 *
 * for (const slide of presentation.slides()) {
 *   const svg = slide.renderSVG();
 *   // ...
 * }
 * ```
 *
 * @example Dialect-specific rendering
 * ```typescript
 * import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "web-pptx";
 *
 * const presentation = openPresentation(file, {
 *   renderOptions: LIBREOFFICE_RENDER_OPTIONS,
 * });
 * ```
 */
export function openPresentation(file: PresentationFile, options?: PresentationOptions): Presentation {
  const renderOptions = options?.renderOptions;
  const zipAdapter = createZipAdapter(file);

  // Parse content types to get slide list
  const contentTypesXml = readXml(file, "[Content_Types].xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  if (contentTypesXml === null) {
    throw new Error("Failed to read [Content_Types].xml");
  }
  const contentTypes = parseContentTypes(contentTypesXml);

  // Build slide file info
  const slideFiles = buildSlideFileInfoList(contentTypes.slides);

  // Read app version from app.xml
  const appXml = readXml(file, "docProps/app.xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  const appVersion = parseAppVersion(appXml);

  // Read presentation.xml for slide size and default text style
  const presentationXml = readXml(file, "ppt/presentation.xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  const size = parseSlideSizeFromXml(presentationXml);
  const defaultTextStyle = parseDefaultTextStyle(presentationXml);

  // Read thumbnail
  const thumbnail = file.readBinary("docProps/thumbnail.jpeg");

  // Create list function
  const list = (options?: ListOptions): SlideInfo[] => {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? slideFiles.length;

    return slideFiles.slice(offset, offset + limit).map((info) => ({
      number: info.number,
      filename: info.filename,
    }));
  };

  // Create getSlide function
  const getSlide = (slideNumber: number): Slide => {
    const slideInfo = slideFiles.find((s) => s.number === slideNumber);
    if (slideInfo === undefined) {
      throw new Error(`Slide ${slideNumber} not found`);
    }
    return parseSlide(file, slideInfo, appVersion ?? 16, zipAdapter, defaultTextStyle, size, renderOptions);
  };

  // Create slides generator function
  function* slidesGenerator(): IterableIterator<Slide> {
    for (const slideInfo of slideFiles) {
      yield parseSlide(file, slideInfo, appVersion ?? 16, zipAdapter, defaultTextStyle, size, renderOptions);
    }
  }

  return {
    size,
    count: slideFiles.length,
    thumbnail,
    appVersion,
    defaultTextStyle,
    list,
    getSlide,
    slides: slidesGenerator,
  };
}
