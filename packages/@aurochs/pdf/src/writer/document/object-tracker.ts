/**
 * @file PDF Object Tracker
 *
 * Manages PDF object numbering and byte offset tracking during serialization.
 */

/**
 * Entry for a PDF indirect object.
 */
export type PdfObjectEntry = {
  /** Object number (1-based) */
  readonly objNum: number;
  /** Generation number (usually 0) */
  readonly gen: number;
  /** Serialized object data (including obj/endobj wrapper) */
  readonly data: Uint8Array;
  /** Byte offset in the output file (set during final assembly) */
  offset?: number;
};

/**
 * Tracks PDF objects during document serialization.
 *
 * Usage:
 * 1. Call allocate() to reserve an object number
 * 2. Build the object content
 * 3. Call set() with the serialized data
 * 4. After all objects are built, call getAll() to get entries for writing
 */
export type PdfObjectTracker = {
  /** Allocate a new object number. Returns the allocated object number. */
  allocate(): number;
  /** Reserve a specific object number. Used when object numbers need to be known before building. */
  reserve(objNum: number): void;
  /** Set the data for an allocated object. */
  set(objNum: number, data: Uint8Array, gen?: number): void;
  /** Get all object entries sorted by object number. */
  getAll(): readonly PdfObjectEntry[];
  /** Get the total number of objects (including free entry 0). Used for xref /Size. */
  getSize(): number;
  /** Check if an object number has been set. */
  has(objNum: number): boolean;
  /** Get the entry for an object number. */
  get(objNum: number): PdfObjectEntry | undefined;
};

/**
 * Create a new PDF object tracker.
 */
export function createPdfObjectTracker(): PdfObjectTracker {
  // eslint-disable-next-line no-restricted-syntax -- mutable counter in closure, incremented by allocate() and reserve()
  let nextObjNum = 1;
  const entries = new Map<number, PdfObjectEntry>();

  return {
    allocate(): number {
      const objNum = nextObjNum;
      nextObjNum += 1;
      return objNum;
    },

    reserve(objNum: number): void {
      if (objNum >= nextObjNum) {
        nextObjNum = objNum + 1;
      }
    },

    set(objNum: number, data: Uint8Array, gen = 0): void {
      entries.set(objNum, { objNum, gen, data });
    },

    getAll(): readonly PdfObjectEntry[] {
      const all = Array.from(entries.values());
      all.sort((a, b) => a.objNum - b.objNum);
      return all;
    },

    getSize(): number {
      return nextObjNum;
    },

    has(objNum: number): boolean {
      return entries.has(objNum);
    },

    get(objNum: number): PdfObjectEntry | undefined {
      return entries.get(objNum);
    },
  };
}
