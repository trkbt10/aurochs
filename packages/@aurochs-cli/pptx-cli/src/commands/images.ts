/**
 * @file images command - display embedded image information from PPTX slides
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { getSlideNumbers, collectShapes } from "./utils";

export type PptxImageJson = {
  readonly slideNumber: number;
  readonly index: number;
  readonly name?: string;
  readonly description?: string;
  readonly resourceId: string;
  readonly width?: number;
  readonly height?: number;
  readonly mediaType?: "video" | "audio";
};

export type ImagesData = {
  readonly count: number;
  readonly images: readonly PptxImageJson[];
};

export type ImagesOptions = {
  readonly slides?: string;
};

/**
 * Display embedded image information from PPTX slides.
 */
export async function runImages(filePath: string, options: ImagesOptions): Promise<Result<ImagesData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    const slideNumbers = getSlideNumbers(options.slides, presentation.count);
    const images: PptxImageJson[] = [];
    // eslint-disable-next-line no-restricted-syntax -- mutable counter incremented in loop
    let imageIndex = 0;

    for (const slideNumber of slideNumbers) {
      const apiSlide = presentation.getSlide(slideNumber);
      const domainSlide = parseSlide(apiSlide.content);
      const shapes = domainSlide?.shapes ?? [];

      const picShapes = collectShapes(shapes, (s) => (s.type === "pic" ? s : undefined));

      for (const pic of picShapes) {
        const entry: PptxImageJson = {
          slideNumber,
          index: imageIndex,
          resourceId: pic.blipFill.resourceId as string,
          ...(pic.nonVisual.name && { name: pic.nonVisual.name }),
          ...(pic.nonVisual.description && { description: pic.nonVisual.description }),
          ...(pic.properties.transform?.width != null && { width: Math.round(pic.properties.transform.width) }),
          ...(pic.properties.transform?.height != null && { height: Math.round(pic.properties.transform.height) }),
          ...(pic.mediaType && { mediaType: pic.mediaType }),
        };
        images.push(entry);
        imageIndex++;
      }
    }

    return success({ count: images.length, images });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
