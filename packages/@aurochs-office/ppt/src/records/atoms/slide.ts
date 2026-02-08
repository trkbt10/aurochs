/**
 * @file SlideAtom, SlidePersistAtom parsers
 *
 * @see [MS-PPT] Section 2.4.13 (SlideAtom)
 * @see [MS-PPT] Section 2.4.14 (SlidePersistAtom)
 */

import type { PptRecord } from "../types";
import { RT } from "../record-types";

export type SlideAtomData = {
  readonly layoutType: number;
  readonly masterIdRef: number;
  readonly notesIdRef: number;
  readonly flags: number;
};

/** Parse a SlideAtom (recType=0x03EF). */
export function parseSlideAtom(record: PptRecord): SlideAtomData {
  if (record.recType !== RT.SlideAtom) {
    throw new Error(`Expected SlideAtom (0x03EF), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);

  // SlideAtom: 24 bytes minimum
  // offset 0: layoutType (u32) - actually it's a SlideLayoutAtom struct
  // The first 4 bytes are geom (layout geometry type)
  const layoutType = view.getInt32(0, true);
  // offset 4-11: 8 bytes of placeholder types (SlideLayoutAtom.placeholderIDs)
  // offset 12: masterIdRef (u32)
  const masterIdRef = view.getUint32(12, true);
  // offset 16: notesIdRef (u32)
  const notesIdRef = view.getUint32(16, true);
  // offset 20: flags (u16) - bit 0: fMasterObjects, bit 1: fMasterScheme, bit 2: fMasterBackground
  const flags = view.getUint16(20, true);

  return { layoutType, masterIdRef, notesIdRef, flags };
}

export type SlidePersistAtomData = {
  readonly persistIdRef: number;
  readonly flags: number;
  readonly numberOfTexts: number;
  readonly slideId: number;
  readonly reserved: number;
};

/** Parse a SlidePersistAtom (recType=0x03F3). */
export function parseSlidePersistAtom(record: PptRecord): SlidePersistAtomData {
  if (record.recType !== RT.SlidePersistAtom) {
    throw new Error(`Expected SlidePersistAtom (0x03F3), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);

  return {
    persistIdRef: view.getUint32(0, true),
    flags: view.getUint32(4, true),
    numberOfTexts: view.getInt32(8, true),
    slideId: view.getInt32(12, true),
    reserved: view.getUint32(16, true),
  };
}
