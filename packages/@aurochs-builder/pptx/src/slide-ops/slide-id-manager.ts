/**
 * @file Slide ID manager
 *
 * Manages IDs for slide entries in presentation.xml.
 *
 * - Slide ID: <p:sldId id="..."> value (must be unique in the presentation)
 * - Slide rId: relationship ID in ppt/_rels/presentation.xml.rels
 */

/**
 * Generate a new unique slide ID for <p:sldId id="...">.
 *
 * PowerPoint commonly starts slide IDs at 256. If existing IDs are below 256,
 * this function still starts from 256 to match common expectations.
 */
export function generateSlideId(existingIds: readonly number[]): number {
  const validIds = existingIds.filter(Number.isFinite);
  const maxId = validIds.length > 0 ? Math.max(255, ...validIds) : 255;
  return maxId + 1;
}

/**
 * Generate a new unique relationship ID for presentation.xml.rels.
 *
 * Commonly uses "rId1", "rId2", ...; we pick max numeric suffix + 1.
 */
export function generateSlideRId(existingRIds: readonly string[]): string {
  const numbers = existingRIds
    .map((rId) => {
      const match = /^rId(\d+)$/i.exec(rId);
      if (!match) {return 0;}
      const n = Number.parseInt(match[1] ?? "", 10);
      return Number.isFinite(n) ? n : 0;
    });
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `rId${max + 1}`;
}
