/**
 * @file Shared relationship path utilities for PPTX builders
 */

/**
 * Compute the .rels path for a given slide XML path.
 *
 * Example: "ppt/slides/slide1.xml" → "ppt/slides/_rels/slide1.xml.rels"
 */
export function getSlideRelsPath(slidePath: string): string {
  return slidePath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");
}
