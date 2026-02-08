/**
 * @file BinTable (PlcBte) parser for .doc binary format
 *
 * Reference: [MS-DOC] 2.8.40 – PlcBteChpx, 2.8.41 – PlcBtePapx
 *
 * A PlcBte maps file character positions (FCs) to FKP page numbers.
 * Structure: rgfc[n+1] (4B each) + rgpn[n] (4B each)
 * Total size = (n+1)*4 + n*4 = 4 + 8*n → n = (size - 4) / 8
 *
 * To find the FKP page for a given FC:
 *   Binary search rgfc to find i such that rgfc[i] ≤ fc < rgfc[i+1]
 *   Return rgpn[i]
 */

/** A BinTable entry mapping an FC range to an FKP page number. */
export type BinTableEntry = {
  readonly fcStart: number;
  readonly fcEnd: number;
  readonly pageNumber: number;
};

/** Parsed BinTable. */
export type BinTable = {
  readonly entries: readonly BinTableEntry[];
};

/** Parse a PlcBte structure from the table stream. */
export function parseBinTable(tableStream: Uint8Array, fc: number, lcb: number): BinTable {
  if (lcb === 0) return { entries: [] };

  if (fc + lcb > tableStream.length) {
    throw new Error(`BinTable extends beyond table stream: ${fc} + ${lcb} > ${tableStream.length}`);
  }

  const n = (lcb - 4) / 8;
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid BinTable size: lcb=${lcb} yields non-integer count ${n}`);
  }

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const entries: BinTableEntry[] = [];

  for (let i = 0; i < n; i++) {
    const fcStart = view.getUint32(fc + i * 4, true);
    const fcEnd = view.getUint32(fc + (i + 1) * 4, true);
    const pageNumber = view.getUint32(fc + (n + 1) * 4 + i * 4, true);
    entries.push({ fcStart, fcEnd, pageNumber });
  }

  return { entries };
}

/** Find the FKP page number for a given FC using binary search. */
export function findFkpPage(binTable: BinTable, targetFc: number): number | undefined {
  const { entries } = binTable;
  if (entries.length === 0) return undefined;

  // Binary search for the entry containing targetFc
  // eslint-disable-next-line no-restricted-syntax -- binary search
  let lo = 0;
  // eslint-disable-next-line no-restricted-syntax -- binary search
  let hi = entries.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const entry = entries[mid];
    if (targetFc < entry.fcStart) {
      hi = mid - 1;
    } else if (targetFc >= entry.fcEnd) {
      lo = mid + 1;
    } else {
      return entry.pageNumber;
    }
  }

  return undefined;
}
