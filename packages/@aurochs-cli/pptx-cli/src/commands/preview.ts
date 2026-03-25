/**
 * @file preview command - ASCII art and SVG visualization of slides
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";

import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { createParseContext } from "@aurochs-office/pptx/parser/context";
import { loadSlideExternalContent } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { createSlideContextFromApiSlide } from "@aurochs-office/pptx/parser/slide/context";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { renderSlideSvgIntegrated } from "@aurochs-renderer/pptx/slide-render";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { serializeShape, type ShapeJson } from "../serializers/shape-serializer";
import { renderSlideAscii } from "@aurochs-renderer/pptx/ascii";

export type PreviewFormat = "ascii" | "svg";

export type PreviewSlide = {
  readonly number: number;
  readonly filename: string;
  readonly ascii?: string;
  readonly svg?: string;
  readonly shapes: readonly ShapeJson[];
  readonly shapeCount: number;
};

export type PreviewData = {
  readonly format: PreviewFormat;
  readonly slides: readonly PreviewSlide[];
  readonly slideWidth: number;
  readonly slideHeight: number;
};

export type PreviewOptions = {
  readonly format?: PreviewFormat;
  readonly width: number;
  readonly border?: boolean;
};

/**
 * Generate an ASCII art or SVG preview of one or all slides.
 */
export async function runPreview(
  filePath: string,
  slideNumber: number | undefined,
  options: PreviewOptions,
): Promise<Result<PreviewData>> {
  const format = options.format ?? "ascii";

  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    if (slideNumber !== undefined && (slideNumber < 1 || slideNumber > presentation.count)) {
      return error("SLIDE_NOT_FOUND", `Slide ${slideNumber} not found. Valid range: 1-${presentation.count}`);
    }

    const start = slideNumber ?? 1;
    const end = slideNumber ?? presentation.count;
    const slides: PreviewSlide[] = [];
    for (let i = start; i <= end; i++) {
      const apiSlide = presentation.getSlide(i);

      // Build parse context with layout/master inheritance for placeholder transforms
      const slideCtx = createSlideContextFromApiSlide(apiSlide);
      const parseCtx = createParseContext(slideCtx);
      const domainSlide = parseSlide(apiSlide.content, parseCtx);

      if (!domainSlide) {
        continue;
      }

      // Load external content (charts, diagrams, OLE, images) into ResourceStore
      const resourceStore = createResourceStore();
      const fileReader = slideCtx.toFileReader();
      const enrichedSlide = loadSlideExternalContent(domainSlide, fileReader, resourceStore);

      const shapes = enrichedSlide.shapes.map((s) => serializeShape(s, resourceStore));

      if (format === "svg") {
        // SVG output using integrated renderer
        const svgResult = renderSlideSvgIntegrated(
          apiSlide.content,
          slideCtx,
          presentation.size,
        );
        slides.push({
          number: apiSlide.number,
          filename: apiSlide.filename,
          svg: svgResult.svg,
          shapes,
          shapeCount: shapes.length,
        });
      } else {
        // ASCII output (default)
        const ascii = renderSlideAscii({
          shapes,
          slideWidth: presentation.size.width,
          slideHeight: presentation.size.height,
          terminalWidth: options.width,
          showBorder: options.border,
        });
        slides.push({
          number: apiSlide.number,
          filename: apiSlide.filename,
          ascii,
          shapes,
          shapeCount: shapes.length,
        });
      }
    }

    return success({
      format,
      slides,
      slideWidth: presentation.size.width,
      slideHeight: presentation.size.height,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
