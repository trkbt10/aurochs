/**
 * @file show command - display slide content
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";

import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { createParseContext } from "@aurochs-office/pptx/parser/context";
import { loadSlideExternalContent } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { createRenderContext } from "@aurochs-renderer/pptx";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { serializeShape, type ShapeJson } from "../serializers/shape-serializer";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";

export type ShowData = {
  readonly number: number;
  readonly filename: string;
  readonly transition?: SlideTransition;
  readonly shapes: readonly ShapeJson[];
};

/**
 * Display content of a specific slide in a PPTX file.
 */
export async function runShow(filePath: string, slideNumber: number): Promise<Result<ShowData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    if (slideNumber < 1 || slideNumber > presentation.count) {
      return error("SLIDE_NOT_FOUND", `Slide ${slideNumber} not found. Valid range: 1-${presentation.count}`);
    }

    const apiSlide = presentation.getSlide(slideNumber);
    const renderContext = createRenderContext({ apiSlide, slideSize: presentation.size });
    if (!renderContext.slideRenderContext) {
      throw new Error("slideRenderContext is required for show");
    }
    const parseCtx = createParseContext(renderContext.slideRenderContext);
    const domainSlide = parseSlide(apiSlide.content, parseCtx);

    if (!domainSlide) {
      return error("PARSE_ERROR", `Failed to parse slide ${slideNumber}`);
    }

    // Load external content (charts, diagrams, OLE, images) into ResourceStore
    const { fileReader, resourceStore } = renderContext;
    const enrichedSlide = loadSlideExternalContent(domainSlide, fileReader, resourceStore);

    return success({
      number: apiSlide.number,
      filename: apiSlide.filename,
      transition: domainSlide.transition,
      shapes: enrichedSlide.shapes.map((s) => serializeShape(s, resourceStore)),
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
