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
export class PdfObjectTracker {
  private nextObjNum = 1;
  private entries = new Map<number, PdfObjectEntry>();

  /**
   * Allocate a new object number.
   * @returns The allocated object number
   */
  allocate(): number {
    const objNum = this.nextObjNum;
    this.nextObjNum += 1;
    return objNum;
  }

  /**
   * Reserve a specific object number.
   * Used when object numbers need to be known before building.
   * @param objNum - The object number to reserve
   */
  reserve(objNum: number): void {
    if (objNum >= this.nextObjNum) {
      this.nextObjNum = objNum + 1;
    }
  }

  /**
   * Set the data for an allocated object.
   * @param objNum - The object number
   * @param data - The serialized object data (without obj/endobj wrapper)
   * @param gen - Generation number (default: 0)
   */
  set(objNum: number, data: Uint8Array, gen = 0): void {
    this.entries.set(objNum, { objNum, gen, data });
  }

  /**
   * Get all object entries sorted by object number.
   */
  getAll(): readonly PdfObjectEntry[] {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => a.objNum - b.objNum);
    return entries;
  }

  /**
   * Get the total number of objects (including free entry 0).
   * Used for xref /Size.
   */
  getSize(): number {
    return this.nextObjNum;
  }

  /**
   * Check if an object number has been set.
   */
  has(objNum: number): boolean {
    return this.entries.has(objNum);
  }

  /**
   * Get the entry for an object number.
   */
  get(objNum: number): PdfObjectEntry | undefined {
    return this.entries.get(objNum);
  }
}
