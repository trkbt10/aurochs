/**
 * @file MS-OVBA compression
 *
 * Implements the VBA compression algorithm as specified in MS-OVBA 2.4.1.
 * This is the inverse of the decompression in parser/compression.ts.
 *
 * @see MS-OVBA 2.4.1 (Compression and Decompression)
 */

const CHUNK_SIZE = 4096;
const MIN_MATCH_LENGTH = 3;

/**
 * Get chunk boundaries for processing data in 4096-byte segments.
 */
function getChunkBoundaries(dataLength: number): Array<{ start: number; end: number }> {
  const boundaries: Array<{ start: number; end: number }> = [];
  const state = { offset: 0 };
  while (state.offset < dataLength) {
    const chunkEnd = Math.min(state.offset + CHUNK_SIZE, dataLength);
    boundaries.push({ start: state.offset, end: chunkEnd });
    state.offset = chunkEnd;
  }
  return boundaries;
}

/**
 * Process a single chunk and return header + data bytes.
 */
function processChunk(chunk: Uint8Array): number[] {
  const compressed = compressChunk(chunk);

  // Use compressed version if it's smaller
  if (compressed.length < chunk.length) {
    // Write compressed chunk header
    const chunkSize = compressed.length + 2; // +2 for header
    const header = ((chunkSize - 3) & 0x0fff) | (0x03 << 12) | (0x01 << 15);
    return [header & 0xff, (header >> 8) & 0xff, ...compressed];
  }
  // Write raw chunk
  const chunkSize = chunk.length + 2; // +2 for header
  const header = ((chunkSize - 3) & 0x0fff) | (0x03 << 12) | (0x00 << 15);
  return [header & 0xff, (header >> 8) & 0xff, ...Array.from(chunk)];
}

/**
 * Compress data using VBA compression algorithm.
 *
 * @param data - Uncompressed data
 * @returns Compressed data with VBA compression signature
 *
 * @see MS-OVBA 2.4.1.2 (Compression Algorithm)
 */
export function compressVba(data: Uint8Array): Uint8Array {
  if (data.length === 0) {
    // Empty data: just signature byte
    return new Uint8Array([0x01]);
  }

  // Process all chunks and collect results
  const boundaries = getChunkBoundaries(data.length);
  const chunkResults = boundaries.map(({ start, end }) => processChunk(data.subarray(start, end)));

  // Combine signature byte with all chunk results
  const result = [0x01, ...chunkResults.flat()];

  return new Uint8Array(result);
}

/**
 * Compute the number of bits used for length in copy token.
 *
 * @param position - Current decompressed position within chunk (1-based context)
 * @returns Number of bits for length (4-12)
 *
 * @see MS-OVBA 2.4.1.3.19 (CopyToken Help)
 */
export function computeCopyTokenBitCount(position: number): number {
  // The bit count depends on the decompressed position within the current chunk
  // position 1-16: 12 bits for length
  // position 17-32: 11 bits for length
  // position 33-64: 10 bits for length
  // ... and so on

  if (position <= 16) {return 12;}
  if (position <= 32) {return 11;}
  if (position <= 64) {return 10;}
  if (position <= 128) {return 9;}
  if (position <= 256) {return 8;}
  if (position <= 512) {return 7;}
  if (position <= 1024) {return 6;}
  if (position <= 2048) {return 5;}
  return 4;
}

type Token = { isLiteral: boolean; data: number[] };

type CompressState = {
  pos: number;
  tokens: Token[];
  result: number[];
};

/**
 * Process a single position in the chunk.
 * Returns the number of bytes consumed.
 */
function processPosition(
  chunk: Uint8Array,
  state: CompressState
): number {
  const match = findBestMatch(chunk, state.pos);

  if (match.length >= MIN_MATCH_LENGTH) {
    const bitCount = computeCopyTokenBitCount(state.pos);
    const maxLength = (1 << bitCount) - 1 + MIN_MATCH_LENGTH;
    const maxOffset = 1 << (16 - bitCount);
    const length = Math.min(match.length, maxLength);

    if (match.offset <= maxOffset && length >= MIN_MATCH_LENGTH) {
      const encodedLength = length - MIN_MATCH_LENGTH;
      const encodedOffset = match.offset - 1;
      const token = encodedLength | (encodedOffset << bitCount);

      state.tokens.push({
        isLiteral: false,
        data: [token & 0xff, (token >> 8) & 0xff],
      });

      return length;
    }
  }

  // Encode as literal
  state.tokens.push({
    isLiteral: true,
    data: [chunk[state.pos]],
  });

  return 1;
}

/**
 * Compress a single chunk (up to 4096 bytes).
 */
function compressChunk(chunk: Uint8Array): number[] {
  const state: CompressState = { pos: 0, tokens: [], result: [] };

  while (state.pos < chunk.length) {
    const consumed = processPosition(chunk, state);
    state.pos += consumed;

    // Flush tokens when we have 8
    if (state.tokens.length === 8) {
      flushTokens(state.result, state.tokens);
      state.tokens = [];
    }
  }

  // Flush remaining tokens
  if (state.tokens.length > 0) {
    flushTokens(state.result, state.tokens);
  }

  return state.result;
}

type MatchSearchParams = {
  readonly data: Uint8Array;
  readonly pos: number;
  readonly searchPos: number;
  readonly maxLength: number;
  readonly remainingData: number;
};

/**
 * Count matching bytes at a given search position.
 */
function countMatchingBytes(params: MatchSearchParams): number {
  const { data, pos, searchPos, maxLength, remainingData } = params;
  const offset = pos - searchPos;
  const state = { length: 0 };

  while (state.length < remainingData && state.length < maxLength) {
    const sourceIdx = searchPos + (state.length % offset);
    if (data[sourceIdx] !== data[pos + state.length]) {
      break;
    }
    state.length++;
  }

  return state.length;
}

/**
 * Find the best (longest) match in the sliding window.
 */
function findBestMatch(data: Uint8Array, pos: number): { offset: number; length: number } {
  const bitCount = computeCopyTokenBitCount(pos);
  const maxOffset = 1 << (16 - bitCount);
  const maxLength = (1 << bitCount) - 1 + MIN_MATCH_LENGTH;
  const searchStart = Math.max(0, pos - maxOffset);
  const remainingData = data.length - pos;

  // Build array of search positions (pos-1 down to searchStart)
  const searchPositions = Array.from(
    { length: pos - searchStart },
    (_, i) => pos - 1 - i
  );

  // Find the best match using reduce
  const best = searchPositions.reduce(
    (acc, searchPos) => {
      const offset = pos - searchPos;
      const length = countMatchingBytes({ data, pos, searchPos, maxLength, remainingData });

      if (length >= MIN_MATCH_LENGTH && length > acc.length) {
        return { offset, length, foundMax: length === maxLength };
      }
      return acc;
    },
    { offset: 0, length: 0, foundMax: false }
  );

  return { offset: best.offset, length: best.length };
}

/**
 * Flush tokens to result with flag byte prefix.
 */
function flushTokens(result: number[], tokens: ReadonlyArray<{ isLiteral: boolean; data: number[] }>): void {
  if (tokens.length === 0) { return; }

  // Build flag byte: set bit i if token i is a copy token (not literal)
  const flagByte = tokens.reduce(
    (flag, token, i) => (token.isLiteral ? flag : flag | (1 << i)),
    0
  );

  result.push(flagByte);

  // Push token data
  tokens.forEach((token) => result.push(...token.data));
}
