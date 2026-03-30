/**
 * @file Synchronous buffer reader for PNG parsing
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

type ReadRequest = {
  length: number;
  allowLess: boolean;
  func: (data: Uint8Array) => void;
};

export type SyncReader = {
  /** Queue a read request for `length` bytes. Negative length means "at most". */
  read: (length: number, callback: (data: Uint8Array) => void) => void;
  /** Execute all queued reads against the buffer. */
  process: () => void;
};

/**
 * Create a synchronous buffer reader that queues read requests and processes
 * them against a contiguous Uint8Array buffer.
 */
export function createSyncReader(buffer: Uint8Array): SyncReader {
  const state = {
    buffer,
    reads: [] as ReadRequest[],
  };

  return {
    read(length: number, callback: (data: Uint8Array) => void): void {
      state.reads.push({
        length: Math.abs(length),
        allowLess: length < 0,
        func: callback,
      });
    },

    process(): void {
      while (state.reads.length > 0 && state.buffer.length) {
        const read = state.reads[0];

        if (state.buffer.length && (state.buffer.length >= read.length || read.allowLess)) {
          state.reads.shift();
          const buf = state.buffer;
          state.buffer = buf.slice(read.length);
          read.func(buf.slice(0, read.length));
        } else {
          break;
        }
      }

      if (state.reads.length > 0) {
        throw new Error("There are some read requests waiting on finished stream");
      }

      if (state.buffer.length > 0) {
        throw new Error("unrecognised content at end of stream");
      }
    },
  };
}
