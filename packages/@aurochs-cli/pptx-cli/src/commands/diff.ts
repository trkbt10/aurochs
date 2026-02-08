/**
 * @file diff command - compare text content between two PPTX files
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import { extractTextFromShape } from "@aurochs-office/pptx/domain/text-utils";

export type DiffData = {
  readonly fileA: string;
  readonly fileB: string;
  readonly slideCountA: number;
  readonly slideCountB: number;
  readonly identicalSlides: readonly number[];
  readonly diffSlides: readonly number[];
  readonly addedSlides?: readonly number[];
  readonly removedSlides?: readonly number[];
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

async function extractSlideTexts(filePath: string): Promise<string[]> {
  const { presentationFile } = await loadPresentationBundle(filePath);
  const presentation = openPresentation(presentationFile);

  const texts: string[] = [];
  for (const apiSlide of presentation.slides()) {
    const domainSlide = parseSlide(apiSlide.content);
    const shapes = domainSlide?.shapes ?? [];
    texts.push(collectAllText(shapes).join("\n"));
  }
  return texts;
}

/**
 * Compare text content between two PPTX files slide-by-slide.
 */
export async function runDiff(fileA: string, fileB: string): Promise<Result<DiffData>> {
  let textsA: string[];
  try {
    textsA = await extractSlideTexts(fileA);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${fileA}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${fileA}: ${(err as Error).message}`);
  }

  let textsB: string[];
  try {
    textsB = await extractSlideTexts(fileB);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${fileB}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${fileB}: ${(err as Error).message}`);
  }

  const commonCount = Math.min(textsA.length, textsB.length);
  const identicalSlides: number[] = [];
  const diffSlides: number[] = [];

  for (let i = 0; i < commonCount; i++) {
    if (textsA[i] === textsB[i]) {
      identicalSlides.push(i + 1);
    } else {
      diffSlides.push(i + 1);
    }
  }

  const result: DiffData = {
    fileA,
    fileB,
    slideCountA: textsA.length,
    slideCountB: textsB.length,
    identicalSlides,
    diffSlides,
    ...(textsB.length > textsA.length && {
      addedSlides: Array.from({ length: textsB.length - textsA.length }, (_, i) => textsA.length + i + 1),
    }),
    ...(textsA.length > textsB.length && {
      removedSlides: Array.from({ length: textsA.length - textsB.length }, (_, i) => textsB.length + i + 1),
    }),
  };

  return success(result);
}
