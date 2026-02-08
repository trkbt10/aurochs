/**
 * @file Slide utility functions for PPTX building
 *
 * Common utilities used when processing slides, extracted from build.ts pattern.
 */

import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import type { XmlDocument } from "@aurochs/xml";
import type { BackgroundFillSpec } from "../types/spec-types";
import { applyBackground, applyImageBackground, isImageBackground } from "./background-builder";
import type { BuildContext } from "./registry";

/**
 * Get shape ID from a parsed shape.
 * ContentPart shapes use "0" as their ID.
 */
export function getShapeId(shape: { type: string; nonVisual?: { id: string } }): string {
  return shape.type === "contentPart" ? "0" : (shape.nonVisual?.id ?? "0");
}

/**
 * Extract existing shape IDs from an API slide.
 * Used to prevent ID collisions when adding new elements.
 */
export function getExistingShapeIds(apiSlide: { content: unknown }): string[] {
  const domainSlide = parseSlide(apiSlide.content as Parameters<typeof parseSlide>[0]);
  if (!domainSlide) {
    return [];
  }
  return domainSlide.shapes.map(getShapeId);
}

/**
 * Apply background specification to a slide.
 * Handles both solid/gradient and image backgrounds.
 */
export async function applyBackgroundSpec(
  slideDoc: XmlDocument,
  spec: BackgroundFillSpec | undefined,
  ctx: BuildContext,
): Promise<XmlDocument> {
  if (!spec) {
    return slideDoc;
  }
  if (isImageBackground(spec)) {
    return applyImageBackground(slideDoc, spec, ctx);
  }
  return applyBackground(slideDoc, spec);
}
