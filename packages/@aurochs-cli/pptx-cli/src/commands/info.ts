/**
 * @file info command - display presentation metadata
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { EMU_PER_PIXEL } from "@aurochs-office/pptx/domain";

export type InfoData = {
  readonly slideCount: number;
  readonly slideSize: {
    readonly width: number;
    readonly height: number;
    readonly widthEmu: number;
    readonly heightEmu: number;
  };
  readonly appVersion: number | null;
};

/**
 * Get presentation metadata from a PPTX file.
 */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    const widthEmu = Math.round(presentation.size.width * EMU_PER_PIXEL);
    const heightEmu = Math.round(presentation.size.height * EMU_PER_PIXEL);

    return success({
      slideCount: presentation.count,
      slideSize: {
        width: presentation.size.width,
        height: presentation.size.height,
        widthEmu,
        heightEmu,
      },
      appVersion: presentation.appVersion,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
