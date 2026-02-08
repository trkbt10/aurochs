/**
 * @file Presentation reader entry point
 * Main entry point for reading PPTX files
 */

import type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions } from "./types";
import type { SlideFileInfo } from "../domain/content-types";
import type { SlideSize } from "../domain";
import type { ZipFile } from "@aurochs-office/opc";
import { getBasename, getByPath, getChildren, type XmlDocument, type XmlElement } from "@aurochs/xml";
import type { SlideData } from "../parser/slide/data-types";
import type { RenderOptions } from "@aurochs-renderer/pptx";
import type { TableStyleList } from "../parser/table/style-parser";
import { parseSlideSizeFromXml, parseDefaultTextStyle, parseAppVersion } from "./presentation-info";
import { parseTableStyleList } from "../parser/table/style-parser";
import { createZipAdapter } from "../domain/zip-adapter";
import { readXml, getRelationships, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../parser/slide/xml-reader";
import { createSlide } from "./slide-builder";
import { loadLayoutData, loadMasterData, loadThemeData, loadDiagramData } from "../parser/slide/loader";
import type { PresentationFile } from "../domain";
import { RELATIONSHIP_TYPES } from "../domain/relationships";

/**
 * Parse a slide from file
 */
type ParseSlideOptions = {
  readonly file: PresentationFile;
  readonly slideInfo: SlideFileInfo;
  readonly appVersion: number;
  readonly zipAdapter: ZipFile;
  readonly defaultTextStyle: XmlElement | null;
  readonly tableStyles: TableStyleList | null;
  readonly slideSize: SlideSize;
  readonly renderOptions?: RenderOptions;
};

function parseSlide({
  file,
  slideInfo,
  appVersion,
  zipAdapter,
  defaultTextStyle,
  tableStyles,
  slideSize,
  renderOptions,
}: ParseSlideOptions): Slide {
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

  return createSlide({ data, zip: zipAdapter, defaultTextStyle, tableStyles, slideSize, renderOptions });
}

function buildSlideFileInfoListFromPresentation(file: PresentationFile, presentationXml: XmlDocument): SlideFileInfo[] {
  const sldIdLst = getByPath(presentationXml, ["p:presentation", "p:sldIdLst"]);
  if (!sldIdLst) {
    throw new Error("ppt/presentation.xml is missing p:sldIdLst (required for slide order)");
  }

  const sldIds = getChildren(sldIdLst, "p:sldId");
  if (sldIds.length === 0) {
    throw new Error("ppt/presentation.xml: p:sldIdLst has no p:sldId entries");
  }

  const presentationRels = getRelationships(file, "ppt/presentation.xml", DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);

  return sldIds.map((sldId, index) => {
    const rId = sldId.attrs["r:id"];
    if (!rId) {
      throw new Error("ppt/presentation.xml: p:sldId is missing r:id");
    }

    const target = presentationRels.getTarget(rId);
    if (!target) {
      throw new Error(`ppt/_rels/presentation.xml.rels: missing Target for ${rId}`);
    }

    const type = presentationRels.getType(rId);
    if (type !== RELATIONSHIP_TYPES.SLIDE) {
      throw new Error(
        `ppt/_rels/presentation.xml.rels: ${rId} is not a slide relationship (Type=${type ?? "undefined"})`,
      );
    }

    return {
      path: target,
      number: index + 1,
      filename: getBasename(target),
    };
  });
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
 * import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
 *
 * const file = createPresentationFile(pptxBuffer);
 * const presentation = openPresentation(file);
 *
 * console.log(`${presentation.count} slides, ${presentation.size.width}x${presentation.size.height}`);
 *
 * for (const slide of presentation.slides()) {
 *   const { svg } = renderSlideToSvg(slide);
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

  // Require content types (OPC requirement)
  if (readXml(file, "[Content_Types].xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS) === null) {
    throw new Error("Failed to read [Content_Types].xml");
  }

  // Read app version from app.xml
  const appXml = readXml(file, "docProps/app.xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  const appVersion = parseAppVersion(appXml);

  // Read presentation.xml for slide size and default text style
  const presentationXml = readXml(file, "ppt/presentation.xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  if (presentationXml === null) {
    throw new Error("Failed to read ppt/presentation.xml");
  }
  const size = parseSlideSizeFromXml(presentationXml);
  const defaultTextStyle = parseDefaultTextStyle(presentationXml);

  // ECMA-376: slide order is defined by p:sldIdLst in presentation.xml (not by file naming/content types)
  const slideFiles = buildSlideFileInfoListFromPresentation(file, presentationXml);

  // Read table styles from ppt/tableStyles.xml
  const tableStylesXml = readXml(file, "ppt/tableStyles.xml", 16, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  const tableStylesRoot = tableStylesXml ? getByPath(tableStylesXml, ["a:tblStyleLst"]) : undefined;
  const tableStyles = tableStylesRoot ? (parseTableStyleList(tableStylesRoot) ?? null) : null;

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
    return parseSlide({
      file,
      slideInfo,
      appVersion: appVersion ?? 16,
      zipAdapter,
      defaultTextStyle,
      tableStyles,
      slideSize: size,
      renderOptions,
    });
  };

  // Create slides generator function
  function* slidesGenerator(): IterableIterator<Slide> {
    for (const slideInfo of slideFiles) {
      yield parseSlide({
        file,
        slideInfo,
        appVersion: appVersion ?? 16,
        zipAdapter,
        defaultTextStyle,
        tableStyles,
        slideSize: size,
        renderOptions,
      });
    }
  }

  return {
    size,
    count: slideFiles.length,
    thumbnail,
    appVersion,
    defaultTextStyle,
    tableStyles,
    list,
    getSlide,
    slides: slidesGenerator,
  };
}
