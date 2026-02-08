/**
 * @file extract command - extract text from slides
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import { extractTextFromShape } from "@aurochs-office/pptx/domain/text-utils";
import { getSlideNumbers } from "./utils";

export type SlideTextItem = {
  readonly number: number;
  readonly text: string;
};

export type ExtractData = {
  readonly slides: readonly SlideTextItem[];
};

export type ExtractOptions = {
  readonly slides?: string; // Range like "1,3-5"
};

function collectAllText(shapes: readonly Shape[]): string[] {
  const texts: string[] = [];
  for (const shape of shapes) {
    const text = extractTextFromShape(shape).trim();
    if (text) {
      texts.push(text);
    }
    if (shape.type === "grpSp") {
      texts.push(...collectAllText(shape.children));
    }
  }
  return texts;
}

/**
 * Extract text from slides in a PPTX file.
 */
export async function runExtract(filePath: string, options: ExtractOptions): Promise<Result<ExtractData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    const slideNumbers = getSlideNumbers(options.slides, presentation.count);

    const items: SlideTextItem[] = [];

    for (const slideNumber of slideNumbers) {
      const apiSlide = presentation.getSlide(slideNumber);
      const domainSlide = parseSlide(apiSlide.content);
      const shapes = domainSlide?.shapes ?? [];

      const texts = collectAllText(shapes);
      items.push({
        number: slideNumber,
        text: texts.join("\n"),
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
