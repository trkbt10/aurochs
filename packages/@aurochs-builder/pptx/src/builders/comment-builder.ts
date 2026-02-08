/**
 * @file Comment builder for build command
 *
 * Adds comments to slides using the patcher APIs.
 */

import type { ZipPackage } from "@aurochs/zip";
import { addCommentToSlide } from "@aurochs-builder/pptx/patcher";
import type { CommentSpec } from "../types";

/**
 * Apply comments to a slide.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML
 * @param specs - Comment specifications
 */
export function applyComments(pkg: ZipPackage, slidePath: string, specs: readonly CommentSpec[]): void {
  for (const spec of specs) {
    addCommentToSlide(pkg, slidePath, {
      authorName: spec.authorName,
      authorInitials: spec.authorInitials,
      text: spec.text,
      x: spec.x,
      y: spec.y,
    });
  }
}
