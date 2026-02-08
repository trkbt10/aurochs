/**
 * @file Style property inheritance resolver
 *
 * Resolves style inheritance chains by walking the basedOn references
 * and collecting SPRMs from base styles (most general first, most specific last).
 *
 * When applying to a paragraph/run, the order is:
 *   base style SPRMs → parent style SPRMs → own style SPRMs → direct SPRMs
 * Since SPRM application is last-writer-wins, this naturally gives correct inheritance.
 */

import type { DocStyle } from "../domain/types";
import type { Sprm } from "../sprm/sprm-decoder";
import type { StyleUpxEntry } from "../stream/style-sheet";

/** Resolved SPRM chains per style, ready for application. */
export type StyleResolver = {
  /** Get inherited paragraph SPRMs for a style (base → derived order). */
  readonly getParagraphSprms: (styleIndex: number) => readonly Sprm[];
  /** Get inherited character SPRMs for a style (base → derived order). */
  readonly getCharacterSprms: (styleIndex: number) => readonly Sprm[];
};

/**
 * Create a style resolver from parsed style sheet data.
 *
 * @param styles - Parsed DocStyle array
 * @param upxMap - Map of style index → UPX SPRM data
 */
export function createStyleResolver(
  styles: readonly DocStyle[],
  upxMap: ReadonlyMap<number, StyleUpxEntry>,
): StyleResolver {
  // Cache resolved SPRM chains
  const papCache = new Map<number, readonly Sprm[]>();
  const chpCache = new Map<number, readonly Sprm[]>();

  // Build style lookup by index
  const styleByIndex = new Map<number, DocStyle>();
  for (const style of styles) {
    styleByIndex.set(style.index, style);
  }

  function resolveChain(styleIndex: number): readonly number[] {
    // Walk basedOn chain, collecting style indices from base to derived
    const chain: number[] = [];
    const visited = new Set<number>();
    let current: number | undefined = styleIndex;

    while (current !== undefined && !visited.has(current)) {
      visited.add(current);
      chain.push(current);
      const style = styleByIndex.get(current);
      current = style?.basedOn;
    }

    // Reverse so base is first, most derived is last
    chain.reverse();
    return chain;
  }

  function getParagraphSprms(styleIndex: number): readonly Sprm[] {
    const cached = papCache.get(styleIndex);
    if (cached) return cached;

    const chain = resolveChain(styleIndex);
    const allSprms: Sprm[] = [];
    for (const idx of chain) {
      const upx = upxMap.get(idx);
      if (upx?.paragraphSprms) {
        allSprms.push(...upx.paragraphSprms);
      }
    }

    papCache.set(styleIndex, allSprms);
    return allSprms;
  }

  function getCharacterSprms(styleIndex: number): readonly Sprm[] {
    const cached = chpCache.get(styleIndex);
    if (cached) return cached;

    const chain = resolveChain(styleIndex);
    const allSprms: Sprm[] = [];
    for (const idx of chain) {
      const upx = upxMap.get(idx);
      if (upx?.characterSprms) {
        allSprms.push(...upx.characterSprms);
      }
    }

    chpCache.set(styleIndex, allSprms);
    return allSprms;
  }

  return { getParagraphSprms, getCharacterSprms };
}
