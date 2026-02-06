/**
 * @file DocumentAtom parser
 *
 * DocumentAtom (recType=0x03E9) contains slide/notes size.
 * The sizes are stored in "master units" (1/576 inch).
 * To convert to EMU: value * (914400 / 576) = value * 1588.541...
 *
 * @see [MS-PPT] Section 2.4.2 (DocumentAtom)
 */

import type { PptRecord } from "../types";
import { RT } from "../record-types";

/** PPT master unit to EMU conversion factor: 914400 / 576 */
const MASTER_UNIT_TO_EMU = 914400 / 576;

export type DocumentAtomData = {
  readonly slideSizeX: number;
  readonly slideSizeY: number;
  readonly notesSizeX: number;
  readonly notesSizeY: number;
  readonly slideSizeXEmu: number;
  readonly slideSizeYEmu: number;
  readonly serverZoom: { readonly numer: number; readonly denom: number };
  readonly notesMasterPersistIdRef: number;
  readonly handoutMasterPersistIdRef: number;
  readonly firstSlideNumber: number;
  readonly slideSizeType: number;
};

/** Parse a DocumentAtom record. */
export function parseDocumentAtom(record: PptRecord): DocumentAtomData {
  if (record.recType !== RT.DocumentAtom) {
    throw new Error(`Expected DocumentAtom (0x03E9), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);

  const slideSizeX = view.getInt32(0, true);
  const slideSizeY = view.getInt32(4, true);
  const notesSizeX = view.getInt32(8, true);
  const notesSizeY = view.getInt32(12, true);
  const serverZoomNumer = view.getInt32(16, true);
  const serverZoomDenom = view.getInt32(20, true);
  const notesMasterPersistIdRef = view.getUint32(24, true);
  const handoutMasterPersistIdRef = view.getUint32(28, true);
  const firstSlideNumber = view.getUint16(32, true);
  const slideSizeType = view.getUint16(34, true);

  return {
    slideSizeX,
    slideSizeY,
    notesSizeX,
    notesSizeY,
    slideSizeXEmu: Math.round(slideSizeX * MASTER_UNIT_TO_EMU),
    slideSizeYEmu: Math.round(slideSizeY * MASTER_UNIT_TO_EMU),
    serverZoom: { numer: serverZoomNumer, denom: serverZoomDenom },
    notesMasterPersistIdRef,
    handoutMasterPersistIdRef,
    firstSlideNumber,
    slideSizeType,
  };
}
