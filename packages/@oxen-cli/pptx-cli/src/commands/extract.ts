/**
 * @file extract command - extract text from slides
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { parseSlide } from "@oxen-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@oxen-cli/cli-core";
import type { Shape } from "@oxen-office/pptx/domain/shape";
import { extractTextFromShape } from "@oxen-office/pptx/domain/text-utils";

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

function parseRangePart(part: string, maxSlide: number, result: number[]): void {
  if (part.includes("-")) {
    const [startStr, endStr] = part.split("-").map((s) => s.trim());
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return;
    }
    for (let i = Math.max(1, start); i <= Math.min(maxSlide, end); i++) {
      if (!result.includes(i)) {
        result.push(i);
      }
    }
  } else {
    const num = parseInt(part, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= maxSlide && !result.includes(num)) {
      result.push(num);
    }
  }
}

/**
 * Parse slide range string into slide numbers.
 * Examples: "1", "1,3,5", "1-3", "1-3,5,7-9"
 */
function parseSlideRange(range: string, maxSlide: number): number[] {
  const result: number[] = [];
  const parts = range.split(",").map((s) => s.trim());

  for (const part of parts) {
    parseRangePart(part, maxSlide, result);
  }

  return result.sort((a, b) => a - b);
}

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

function getSlideNumbers(options: ExtractOptions, count: number): number[] {
  if (options.slides) {
    return parseSlideRange(options.slides, count);
  }
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Extract text from slides in a PPTX file.
 */
export async function runExtract(filePath: string, options: ExtractOptions): Promise<Result<ExtractData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const { presentationFile } = await loadPptxBundleFromBuffer(buffer);
    const presentation = openPresentation(presentationFile);

    const slideNumbers = getSlideNumbers(options, presentation.count);

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
