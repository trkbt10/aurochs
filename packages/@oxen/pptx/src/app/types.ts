/**
 * @file Public API type definitions
 * Types for the presentation reader API
 */

import type { XmlDocument, XmlNode } from "@oxen/xml";
import type { IndexTables } from "../parser/slide/shape-tree-indexer";
import type { ResourceMap, ZipFile, SlideSize, SlideTransition } from "../domain";
import type { Timing } from "../domain/animation";
import type { RenderOptions } from "../render/render-options";
import type { TableStyleList } from "../parser/table/style-parser";

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
   * Animation timing data for this slide.
   * Returns undefined if the slide has no animations.
   * @see ECMA-376 Part 1, Section 19.5 (Animation)
   */
  readonly timing: Timing | undefined;

  /**
   * Slide transition effect.
   * Returns undefined if the slide has no transition.
   * @see ECMA-376 Part 1, Section 19.5 (Transitions)
   */
  readonly transition: SlideTransition | undefined;

  /**
   * Theme override documents.
   * Contains override themes that apply to this slide.
   */
  readonly themeOverrides: readonly XmlDocument[];

  /**
   * ZipFile adapter for resource access.
   * Used to read embedded images and other resources during rendering.
   */
  readonly zip: ZipFile;

  /**
   * Default text style from presentation.xml.
   * Provides fallback text styling for slides.
   */
  readonly defaultTextStyle: XmlNode | null;

  /**
   * Table styles from ppt/tableStyles.xml.
   * Provides table styling definitions.
   */
  readonly tableStyles: TableStyleList | null;

  /**
   * Slide dimensions in pixels.
   * Width and height of the slide for rendering.
   */
  readonly slideSize: SlideSize;

  /**
   * Render options for dialect-specific behavior.
   * Controls rendering behavior for different PPTX dialects.
   */
  readonly renderOptions: RenderOptions;
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

  /** Table styles from ppt/tableStyles.xml */
  readonly tableStyles: TableStyleList | null;

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
