/**
 * @file list command - list slides with summary
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import { extractTextFromShape } from "@aurochs-office/pptx/domain/text-utils";
import { hasShapeOfType } from "./utils";

export type SlideListItem = {
  readonly number: number;
  readonly filename: string;
  readonly title: string | null;
  readonly shapeCount: number;
  readonly hasTable: boolean;
  readonly hasChart: boolean;
  readonly hasImage: boolean;
  readonly transitionType?: string;
};

export type ListData = {
  readonly slides: readonly SlideListItem[];
};

function findTitleInShape(shape: Shape): string | null {
  if (shape.type !== "sp") {
    return null;
  }
  const phType = shape.placeholder?.type;
  if (phType !== "title" && phType !== "ctrTitle") {
    return null;
  }
  const text = extractTextFromShape(shape).trim();
  return text || null;
}

function findTitle(shapes: readonly Shape[]): string | null {
  for (const shape of shapes) {
    const title = findTitleInShape(shape);
    if (title) {
      return title;
    }
  }
  return null;
}

function countShapesRecursive(shapes: readonly Shape[], initial: number): number {
  return shapes.reduce((acc, shape) => {
    const childCount = shape.type === "grpSp" ? countShapesRecursive(shape.children, 0) : 0;
    return acc + 1 + childCount;
  }, initial);
}

function countShapes(shapes: readonly Shape[]): number {
  return countShapesRecursive(shapes, 0);
}

function hasTable(shapes: readonly Shape[]): boolean {
  return hasShapeOfType(shapes, (s) => s.type === "graphicFrame" && s.content.type === "table");
}

function hasChart(shapes: readonly Shape[]): boolean {
  return hasShapeOfType(shapes, (s) => s.type === "graphicFrame" && s.content.type === "chart");
}

function hasImage(shapes: readonly Shape[]): boolean {
  return hasShapeOfType(shapes, (s) => s.type === "pic");
}

/**
 * List slides in a PPTX file with summary information.
 */
export async function runList(filePath: string): Promise<Result<ListData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    const items: SlideListItem[] = [];

    for (const apiSlide of presentation.slides()) {
      const domainSlide = parseSlide(apiSlide.content);
      const shapes = domainSlide?.shapes ?? [];

      items.push({
        number: apiSlide.number,
        filename: apiSlide.filename,
        title: findTitle(shapes),
        shapeCount: countShapes(shapes),
        hasTable: hasTable(shapes),
        hasChart: hasChart(shapes),
        hasImage: hasImage(shapes),
        transitionType: domainSlide?.transition?.type,
      });
    }

    return success({ slides: items });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
