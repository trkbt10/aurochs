/**
 * @file MS-CFB chain walkers
 */

import { ENDOFCHAIN, FREESECT, MAXREGSECT } from "../constants";
import { CfbFormatError } from "../errors";
import { fatGet } from "./fat";

/** Walk a FAT chain starting from `startSector` until ENDOFCHAIN or error. */
export function walkFatChain(fat: Uint32Array, startSector: number, opts: { readonly maxSteps: number }): readonly number[] {
  const out: number[] = [];
  const visited = new Set<number>();

  for (let steps = 0, current = startSector; steps < opts.maxSteps; steps++) {
    if (current === ENDOFCHAIN) {
      return out;
    }
    if (current === FREESECT) {
      throw new CfbFormatError("FAT chain encountered FREESECT");
    }
    if (current > MAXREGSECT) {
      throw new CfbFormatError(`FAT chain encountered reserved value: 0x${current.toString(16)}`);
    }
    if (visited.has(current)) {
      throw new CfbFormatError("FAT chain has a cycle");
    }
    visited.add(current);
    out.push(current);
    current = fatGet(fat, current);
  }

  throw new CfbFormatError("FAT chain exceeded max steps");
}

/** Walk a MiniFAT chain starting from `startMiniSector` until ENDOFCHAIN or error. */
export function walkMiniFatChain(miniFat: Uint32Array, startMiniSector: number, opts: { readonly maxSteps: number }): readonly number[] {
  const out: number[] = [];
  const visited = new Set<number>();

  for (let steps = 0, current = startMiniSector; steps < opts.maxSteps; steps++) {
    if (current === ENDOFCHAIN) {
      return out;
    }
    if (current === FREESECT) {
      throw new CfbFormatError("MiniFAT chain encountered FREESECT");
    }
    if (current > MAXREGSECT) {
      throw new CfbFormatError(`MiniFAT chain encountered reserved value: 0x${current.toString(16)}`);
    }
    if (visited.has(current)) {
      throw new CfbFormatError("MiniFAT chain has a cycle");
    }
    visited.add(current);
    out.push(current);
    current = miniFat[current] ?? FREESECT;
  }

  throw new CfbFormatError("MiniFAT chain exceeded max steps");
}
