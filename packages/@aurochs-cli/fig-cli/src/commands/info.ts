/**
 * @file info command - display fig file metadata
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadFigFile } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type InfoData = {
  readonly pageCount: number;
  readonly nodeCount: number;
  readonly blobCount: number;
  readonly imageCount: number;
};

/** Get fig file metadata. */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const loaded = await loadFigFile(filePath);

    return success({
      pageCount: loaded.canvases.length,
      nodeCount: loaded.parsed.nodeChanges.length,
      blobCount: loaded.parsed.blobs.length,
      imageCount: loaded.parsed.images.size,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse fig file: ${getErrorMessage(caughtError)}`);
  }
}
