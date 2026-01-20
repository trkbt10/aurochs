/**
 * @file Grid offsets utilities
 *
 * Shared helpers for virtualized 2D grids (rows/cols with sizes and offsets).
 */

export function clampRange(
  start: number,
  end: number,
  min: number,
  max: number,
): { start: number; end: number } {
  return {
    start: Math.max(min, Math.min(max, start)),
    end: Math.max(min, Math.min(max, end)),
  };
}

/**
 * Compute prefix sums for sizes: offsets[0]=0, offsets[i+1]=offsets[i]+sizes[i]
 */
export function computePrefixSums(sizes: readonly number[]): readonly number[] {
  const offsets = new Array<number>(sizes.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < sizes.length; i += 1) {
    offsets[i + 1] = offsets[i] + sizes[i]!;
  }
  return offsets;
}

/**
 * Find a 0-based item index for a given scroll offset in px.
 *
 * `offsets` must be a prefix-sum array of length `count+1`.
 */
export function findIndexAtOffset(offsets: readonly number[], offsetPx: number): number {
  if (offsets.length < 2) {
    throw new Error("offsets must include at least [0, size]");
  }

  const last = offsets[offsets.length - 1]!;
  const clamped = Math.max(0, Math.min(last, offsetPx));

  let lo = 0;
  let hi = offsets.length - 1;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (offsets[mid]! <= clamped) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return Math.min(offsets.length - 2, lo);
}

