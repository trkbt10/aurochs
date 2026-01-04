/**
 * @file Public API type definitions
 * Types for the presentation reader API
 */

import type { XmlDocument, XmlNode } from "../../xml";
import type { IndexTables } from "../core/types";
import type { ResourceMap } from "../opc";
import type { SlideSize } from "../domain";
import type { RenderOptions } from "../render/render-options";

/**
 * Options for opening a presentation
 */
export type PresentationOptions = {
  /** Render options for dialect-specific behavior */
  renderOptions?: RenderOptions;
};

/**
 * Options for paginated slide listing
 */
export type ListOptions = {
  /** Starting position (0-based) */
  offset?: number;
  /** Number of items to retrieve */
  limit?: number;
};

/**
 * Lightweight slide summary (no parsing required)
 */
export type SlideInfo = {
  /** Slide number (1-based) */
  number: number;
  /** Filename without extension (e.g., "slide1") */
  filename: string;
};

/**
 * Parsed slide data
 * Reflects PPTX XML structure directly without abstraction
 */
export type Slide = {
  /** Slide number (1-based) */
  readonly number: number;

  /** Filename without extension */
  readonly filename: string;

  /** Parsed p:sld element */
  readonly content: XmlDocument;

  /** Parsed slide layout (p:sldLayout) */
  readonly layout: XmlDocument | null;

  /** Layout index tables for shape lookup */
  readonly layoutTables: IndexTables;

  /** Parsed slide master (p:sldMaster) */
  readonly master: XmlDocument | null;

  /** Master index tables for shape lookup */
  readonly masterTables: IndexTables;

  /** Master text styles (p:txStyles) */
  readonly masterTextStyles: XmlNode | undefined;

  /** Parsed theme (a:theme) */
  readonly theme: XmlDocument | null;

  /** Slide relationships */
  readonly relationships: ResourceMap;

  /** Layout relationships */
  readonly layoutRelationships: ResourceMap;

  /** Master relationships */
  readonly masterRelationships: ResourceMap;

  /** Theme relationships */
  readonly themeRelationships: ResourceMap;

  /** Diagram content if present */
  readonly diagram: XmlDocument | null;

  /** Diagram relationships */
  readonly diagramRelationships: ResourceMap;

  /**
   * Render slide as HTML string
   * @returns HTML representation of the slide
   */
  renderHTML(): string;

  /**
   * Render slide as SVG string
   * @returns SVG representation of the slide
   */
  renderSVG(): string;
};

/**
 * Presentation reader type
 */
export type Presentation = {
  /** Slide dimensions in pixels */
  readonly size: SlideSize;

  /** Total number of slides */
  readonly count: number;

  /** Thumbnail image data if present */
  readonly thumbnail: ArrayBuffer | null;

  /** PowerPoint application version */
  readonly appVersion: number | null;

  /** Default text style from presentation.xml */
  readonly defaultTextStyle: XmlNode | null;

  /**
   * List slides with pagination support
   * @param options - Pagination options
   * @returns Array of slide summaries
   */
  list(options?: ListOptions): SlideInfo[];

  /**
   * Get a specific slide (lazy parsing)
   * @param slideNumber - Slide number (1-based)
   * @returns Parsed slide data
   * @throws Error if slide number is out of range
   */
  getSlide(slideNumber: number): Slide;

  /**
   * Iterate over all slides
   * @yields Parsed slide data one at a time
   */
  slides(): IterableIterator<Slide>;
};
