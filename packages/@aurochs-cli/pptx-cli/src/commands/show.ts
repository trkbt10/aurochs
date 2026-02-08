/**
 * @file show command - display slide content
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { createZipAdapter } from "@aurochs-office/pptx/domain";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { createParseContext } from "@aurochs-office/pptx/parser/context";
import { createRenderContext } from "@aurochs-renderer/pptx";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { serializeShape, type ShapeJson } from "../serializers/shape-serializer";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import { resolveChartsForSlide, type ResolvedChartJson } from "../serializers/chart-resolver";

export type ShowData = {
  readonly number: number;
  readonly filename: string;
  readonly transition?: SlideTransition;
  readonly shapes: readonly ShapeJson[];
  readonly charts?: readonly ResolvedChartJson[];
};

function resolveChartsIfAny(options: {
  readonly zipPackage: Parameters<typeof resolveChartsForSlide>[0]["zipPackage"];
  readonly slideFilename: string;
  readonly chartResourceIds: readonly string[];
}): readonly ResolvedChartJson[] | undefined {
  if (options.chartResourceIds.length === 0) {
    return undefined;
  }
  return resolveChartsForSlide(options);
}

function collectChartResourceIds(shapes: readonly Shape[]): readonly string[] {
  const ids = new Set<string>();

  const visit = (shape: Shape): void => {
    if (shape.type === "graphicFrame" && shape.content.type === "chart") {
      ids.add(shape.content.data.resourceId);
    }
    if (shape.type === "grpSp") {
      for (const child of shape.children) {
        visit(child);
      }
    }
  };

  for (const shape of shapes) {
    visit(shape);
  }

  return [...ids];
}

/**
 * Display content of a specific slide in a PPTX file.
 */
export async function runShow(filePath: string, slideNumber: number): Promise<Result<ShowData>> {
  try {
    const { zipPackage, presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    if (slideNumber < 1 || slideNumber > presentation.count) {
      return error("SLIDE_NOT_FOUND", `Slide ${slideNumber} not found. Valid range: 1-${presentation.count}`);
    }

    const apiSlide = presentation.getSlide(slideNumber);
    const zipFile = createZipAdapter(presentationFile);
    const renderContext = createRenderContext({ apiSlide, zip: zipFile, slideSize: presentation.size });
    const parseCtx = createParseContext(renderContext.slideRenderContext);
    const domainSlide = parseSlide(apiSlide.content, parseCtx);

    if (!domainSlide) {
      return error("PARSE_ERROR", `Failed to parse slide ${slideNumber}`);
    }

    const chartResourceIds = collectChartResourceIds(domainSlide.shapes);
    const charts = resolveChartsIfAny({
      zipPackage,
      slideFilename: apiSlide.filename,
      chartResourceIds,
    });

    return success({
      number: apiSlide.number,
      filename: apiSlide.filename,
      transition: domainSlide.transition,
      shapes: domainSlide.shapes.map((s) => serializeShape(s)),
      charts,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
