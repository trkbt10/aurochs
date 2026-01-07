/**
 * @file Presentation document types for editor interoperability
 *
 * Defines the document shape used by editor consumers when working with
 * PPTX presentation data, including rendering context dependencies.
 */

import type { Slide, Presentation, PresentationFile } from "../domain";
import type { Pixels } from "../domain/types";
import type { ColorContext, FontScheme } from "../domain/resolution";
import type { ResourceResolver, ResolvedBackgroundFill } from "../render/core";
import type { Slide as ApiSlide } from "./types";

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
};
