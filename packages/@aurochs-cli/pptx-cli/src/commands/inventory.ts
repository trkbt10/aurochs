/**
 * @file inventory command - media inventory summary of a PPTX file
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { collectShapes } from "./utils";

export type InventoryData = {
  readonly slides: number;
  readonly images: number;
  readonly tables: number;
  readonly charts: number;
  readonly diagrams: number;
  readonly textOnlySlides: readonly number[];
};

/**
 * Generate media inventory summary for a PPTX file.
 */
export async function runInventory(filePath: string): Promise<Result<InventoryData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    let totalImages = 0;
    let totalTables = 0;
    let totalCharts = 0;
    let totalDiagrams = 0;
    const textOnlySlides: number[] = [];

    for (const apiSlide of presentation.slides()) {
      const domainSlide = parseSlide(apiSlide.content);
      const shapes = domainSlide?.shapes ?? [];

      const images = collectShapes(shapes, (s) => (s.type === "pic" ? true : undefined));
      const tables = collectShapes(shapes, (s) =>
        s.type === "graphicFrame" && s.content.type === "table" ? true : undefined,
      );
      const charts = collectShapes(shapes, (s) =>
        s.type === "graphicFrame" && s.content.type === "chart" ? true : undefined,
      );
      const diagrams = collectShapes(shapes, (s) =>
        s.type === "graphicFrame" && s.content.type === "diagram" ? true : undefined,
      );

      totalImages += images.length;
      totalTables += tables.length;
      totalCharts += charts.length;
      totalDiagrams += diagrams.length;

      if (images.length === 0 && tables.length === 0 && charts.length === 0 && diagrams.length === 0) {
        textOnlySlides.push(apiSlide.number);
      }
    }

    return success({
      slides: presentation.count,
      images: totalImages,
      tables: totalTables,
      charts: totalCharts,
      diagrams: totalDiagrams,
      textOnlySlides,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
