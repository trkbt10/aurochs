/**
 * @file BIFF EOF record parser
 */

export type EofRecord = Record<never, never>;

/**
 * Parse an EOF (0x000A) record data payload.
 *
 * The EOF record is a marker record and must have a 0-byte payload.
 */
export function parseEofRecord(data: Uint8Array): EofRecord {
  if (data.length !== 0) {
    throw new Error(`Invalid EOF payload length: ${data.length} (expected 0)`);
  }
  return {};
}

