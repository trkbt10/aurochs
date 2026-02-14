/**
 * @file CFB FAT (File Allocation Table) serialization
 *
 * Builds and serializes the FAT for sector chains.
 * @see MS-CFB 2.3 (Compound File FAT Sectors)
 */

import { ENDOFCHAIN, FATSECT, FREESECT } from "../constants";

/**
 * FAT builder for allocating and chaining sectors.
 */
export type FatBuilder = {
  /** Allocate a contiguous chain of sectors */
  allocateChain(sectorCount: number): number;
  /** Mark a sector as FAT sector */
  markFatSector(sector: number): void;
  /** Get the current FAT entries */
  getEntries(): Uint32Array;
  /** Get the number of allocated sectors */
  getSectorCount(): number;
};

/**
 * Create a FAT builder.
 */
export function createFatBuilder(initialCapacity = 128): FatBuilder {
  let entries = new Uint32Array(initialCapacity);
  let allocatedCount = 0;

  // Initialize all entries as free
  entries.fill(FREESECT);

  function ensureCapacity(needed: number): void {
    if (needed > entries.length) {
      const newCapacity = Math.max(entries.length * 2, needed);
      const newEntries = new Uint32Array(newCapacity);
      newEntries.fill(FREESECT);
      newEntries.set(entries);
      entries = newEntries;
    }
  }

  return {
    allocateChain(sectorCount: number): number {
      if (sectorCount === 0) {
        return ENDOFCHAIN;
      }

      const startSector = allocatedCount;
      ensureCapacity(allocatedCount + sectorCount);

      // Create chain
      for (let i = 0; i < sectorCount; i++) {
        const currentSector = startSector + i;
        if (i === sectorCount - 1) {
          entries[currentSector] = ENDOFCHAIN;
        } else {
          entries[currentSector] = currentSector + 1;
        }
      }

      allocatedCount += sectorCount;
      return startSector;
    },

    markFatSector(sector: number): void {
      ensureCapacity(sector + 1);
      entries[sector] = FATSECT;
      if (sector >= allocatedCount) {
        allocatedCount = sector + 1;
      }
    },

    getEntries(): Uint32Array {
      return entries.subarray(0, allocatedCount);
    },

    getSectorCount(): number {
      return allocatedCount;
    },
  };
}

/**
 * Serialize FAT entries to sector(s).
 * Each sector can hold (sectorSize / 4) FAT entries.
 */
export function serializeFatSectors(entries: Uint32Array, sectorSize: number): Uint8Array {
  const entriesPerSector = sectorSize / 4;
  const sectorCount = Math.ceil(entries.length / entriesPerSector);
  const totalSize = sectorCount * sectorSize;
  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);

  // Fill with FREESECT
  for (let i = 0; i < totalSize; i += 4) {
    view.setUint32(i, FREESECT, true);
  }

  // Write FAT entries
  for (let i = 0; i < entries.length; i++) {
    view.setUint32(i * 4, entries[i], true);
  }

  return result;
}
