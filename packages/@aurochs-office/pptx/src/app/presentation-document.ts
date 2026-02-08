/**
 * @file Presentation document types for editor interoperability
 *
 * Defines the document shape used by editor consumers when working with
 * PPTX presentation data, including rendering context dependencies.
 */

import type { Slide, Presentation, PresentationFile } from "../domain";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResourceResolver } from "../domain/resource-resolver";
import type { ResolvedBackgroundFill } from "@aurochs-renderer/pptx";
import type { Slide as ApiSlide } from "./types";

/**
 * Embedded font data extracted from source document (e.g., PDF).
 *
 * Contains font program data that can be used to create @font-face
 * declarations for accurate rendering in web contexts.
 */
export type EmbeddedFontData = {
  /** Font family name (e.g., "Hiragino Sans") */
  readonly fontFamily: string;
  /** Font format ("opentype", "truetype", "type1", "cff") */
  readonly format: string;
  /** Raw font data */
  readonly data: Uint8Array;
  /** MIME type for the font */
  readonly mimeType: string;
};

/**
 * Slide identifier
 */
export type SlideId = string;

/**
 * Slide with ID for tracking
 *
 * Contains the domain slide data plus the original API slide for proper rendering context.
 */
export type SlideWithId = {
  readonly id: SlideId;
  /** Parsed domain slide (for editing) */
  readonly slide: Slide;
  /**
   * Original API slide from the presentation reader.
   * Required for proper rendering with full context (theme, master, layout inheritance).
   * Contains all XML data needed to build SlideRenderContext.
   */
  readonly apiSlide?: ApiSlide;
  /** Pre-resolved background (from slide -> layout -> master inheritance) */
  readonly resolvedBackground?: ResolvedBackgroundFill;
  /** Layout path override for editor-driven layout selection */
  readonly layoutPathOverride?: string;
};

/**
 * Presentation document for editing
 *
 * Contains all information needed to render slides correctly,
 * including theme colors, fonts, and resource resolution.
 */
export type PresentationDocument = {
  /** Original presentation data */
  readonly presentation: Presentation;
  /** Slides with their IDs */
  readonly slides: readonly SlideWithId[];
  /** Slide dimensions */
  readonly slideWidth: Pixels;
  readonly slideHeight: Pixels;

  // === Rendering Context ===
  /** Color context for resolving theme/scheme colors */
  readonly colorContext: ColorContext;
  /** Font scheme for resolving theme fonts (+mj-lt, +mn-lt, etc.) */
  readonly fontScheme?: FontScheme;
  /** Resource resolver for images and embedded content */
  readonly resources: ResourceResolver;

  /**
   * Presentation file for PPTX resources.
   * Used to build SlideRenderContext for proper rendering after edits.
   */
  readonly presentationFile?: PresentationFile;

  // === Embedded Fonts (from PDF import) ===
  /**
   * Embedded fonts extracted from source document.
   * Only present for PDF imports where fonts are embedded in the PDF.
   */
  readonly embeddedFonts?: readonly EmbeddedFontData[];

  /**
   * Pre-generated @font-face CSS for embedded fonts.
   * Can be injected into SVG <style> or HTML <style> for rendering.
   */
  readonly embeddedFontCss?: string;
};
