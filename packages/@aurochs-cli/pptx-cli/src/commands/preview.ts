/**
 * @file preview command - ASCII art visualization of slides
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { createZipAdapter } from "@aurochs-office/pptx/domain";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { createParseContext } from "@aurochs-office/pptx/parser/context";
import { enrichSlideContent, type FileReader } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { createRenderContext } from "@aurochs-renderer/pptx";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { serializeShape, type SerializationContext, type ShapeJson } from "../serializers/shape-serializer";
import { renderSlideAscii } from "@aurochs-renderer/pptx/ascii";
import type { Chart } from "@aurochs-office/chart/domain";
import type { Shape } from "@aurochs-office/pptx/domain/shape";

export type PreviewSlide = {
  readonly number: number;
  readonly filename: string;
  readonly ascii: string;
  readonly shapes: readonly ShapeJson[];
  readonly shapeCount: number;
};

export type PreviewData = {
  readonly slides: readonly PreviewSlide[];
  readonly slideWidth: number;
  readonly slideHeight: number;
};

export type PreviewOptions = {
  readonly width: number;
  readonly border?: boolean;
};

/**
 * Generate an ASCII art preview of one or all slides.
 */
export async function runPreview(
  filePath: string,
  slideNumber: number | undefined,
  options: PreviewOptions,
): Promise<Result<PreviewData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    if (slideNumber !== undefined && (slideNumber < 1 || slideNumber > presentation.count)) {
      return error("SLIDE_NOT_FOUND", `Slide ${slideNumber} not found. Valid range: 1-${presentation.count}`);
    }

    const start = slideNumber ?? 1;
    const end = slideNumber ?? presentation.count;
    const slides: PreviewSlide[] = [];
    const zipFile = createZipAdapter(presentationFile);

    for (let i = start; i <= end; i++) {
      const apiSlide = presentation.getSlide(i);

      // Build parse context with layout/master inheritance for placeholder transforms
      const renderContext = createRenderContext({ apiSlide, zip: zipFile, slideSize: presentation.size });
      const parseCtx = createParseContext(renderContext.slideRenderContext);
      const domainSlide = parseSlide(apiSlide.content, parseCtx);

      if (!domainSlide) {
        continue;
      }

      // Enrich slide with chart/diagram data from archive
      const fileReader: FileReader = {
        readFile: (path: string) => apiSlide.zip.file(path)?.asArrayBuffer() ?? null,
        resolveResource: (id: string) => apiSlide.relationships.getTarget(id),
        getResourceByType: (relType: string) => apiSlide.relationships.getTargetByType(relType),
      };
      const resourceStore = createResourceStore();
      const enrichedSlide = enrichSlideContent(domainSlide, fileReader, resourceStore);

      // Build serialization context with resolvers from resource store
      const ctx: SerializationContext = {
        resolveChart: (resourceId: string) => resourceStore.get(resourceId)?.parsed as Chart | undefined,
        resolveDiagramShapes: (diagramRef) => {
          const entry = resourceStore.get(diagramRef.dataResourceId ?? "");
          return (entry?.parsed as { shapes?: readonly Shape[] } | undefined)?.shapes;
        },
      };

      const shapes = enrichedSlide.shapes.map((s) => serializeShape(s, ctx));
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

    return success({
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
