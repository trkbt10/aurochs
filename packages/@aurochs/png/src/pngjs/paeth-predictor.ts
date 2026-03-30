/**
 * @file Paeth predictor algorithm for PNG filtering
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

/**
 * Computes the Paeth predictor value used in PNG sub-byte filtering.
 *
 * Given three neighboring bytes (left, above, upper-left), returns the one
 * closest to the linear estimate `left + above - upLeft`. Ties are broken
 * in the order: left, above, upper-left, as specified by the PNG specification (RFC 2083).
 *
 * @param left - The byte immediately to the left of the current byte
 * @param above - The byte immediately above the current byte
 * @param upLeft - The byte diagonally above-left of the current byte
 * @returns The neighbor byte closest to the Paeth estimate
 */
export function paethPredictor(left: number, above: number, upLeft: number): number {
  const paeth = left + above - upLeft;
  const pLeft = Math.abs(paeth - left);
  const pAbove = Math.abs(paeth - above);
  const pUpLeft = Math.abs(paeth - upLeft);

  if (pLeft <= pAbove && pLeft <= pUpLeft) {
    return left;
  }
  if (pAbove <= pUpLeft) {
    return above;
  }
  return upLeft;
}
