/**
 * @file Notes builder for build command
 *
 * Sets speaker notes for slides using the patcher APIs.
 */

import type { ZipPackage } from "@oxen/zip";
import { setSlideNotes } from "@oxen-builder/pptx/patcher";
import type { NotesSpec } from "../types";

/**
 * Apply speaker notes to a slide.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML
 * @param spec - Notes specification
 */
export function applyNotes(
  pkg: ZipPackage,
  slidePath: string,
  spec: NotesSpec,
): void {
  setSlideNotes(pkg, slidePath, {
    text: spec.text,
  });
}
