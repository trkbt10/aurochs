/**
 * @file Visual comparison utilities
 *
 * Re-exports comparison utilities from the root spec/visual-regression/compare.ts
 * for use within @aurochs-renderer packages.
 */

import {
  compareSvgToSnapshot as compareSvgToSnapshotImpl,
  svgToPng as svgToPngImpl,
  hasSnapshot as hasSnapshotImpl,
  listSnapshots as listSnapshotsImpl,
} from "../../../../spec/visual-regression/compare";
import type { CompareOptions, CompareResult } from "./types";

type CompareSvgToSnapshotArgs = {
  readonly svg: string;
  readonly snapshotName: string;
  readonly slideNumber: number;
  readonly options?: CompareOptions;
};

/** Converts an SVG string to a PNG buffer using resvg. */
export function svgToPng(
  svg: string,
  width?: number,
  options: Pick<CompareOptions, "resvgFontFiles" | "resvgLoadSystemFonts"> = {},
): Buffer {
  return svgToPngImpl(svg, width, { ...options });
}

/** Compares a rendered SVG to a reference snapshot image. */
export function compareSvgToSnapshot(args: CompareSvgToSnapshotArgs): CompareResult {
  const { svg, snapshotName, slideNumber, options } = args;
  return compareSvgToSnapshotImpl({
    svg,
    snapshotName,
    slideNumber,
    options: options ? { ...options } : undefined,
  });
}

/** Checks whether a snapshot exists for the given name and slide number. */
export function hasSnapshot(snapshotName: string, slideNumber: number): boolean {
  return hasSnapshotImpl(snapshotName, slideNumber);
}

/** Lists all slide numbers with snapshots for the given snapshot name. */
export function listSnapshots(snapshotName: string): number[] {
  return listSnapshotsImpl(snapshotName);
}
