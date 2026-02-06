/**
 * @file Top-level PPT stream parser
 *
 * Implements the PPT persist mechanism:
 * 1. Read CurrentUser stream → last UserEditAtom offset
 * 2. Walk UserEditAtom chain → collect PersistDirectoryAtom entries
 * 3. Build persist directory: persistId → stream offset
 * 4. Resolve DocumentContainer and SlideContainers
 *
 * @see [MS-PPT] Section 2.1.1 (CurrentUserAtom)
 * @see [MS-PPT] Section 2.1.2 (UserEditAtom)
 * @see [MS-PPT] Section 2.1.3 (PersistDirectoryAtom)
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { readPptRecord, RECORD_HEADER_SIZE } from "../records/record-reader";
import { parsePptRecordTree } from "../records/container-parser";
import { findChildByType, findChildrenByType } from "../records/record-iterator";
import { parseSlidePersistAtom, type SlidePersistAtomData } from "../records/atoms/slide";
import type { PptParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";

export type PptStreamParseResult = {
  readonly documentRecord: PptRecord;
  readonly slideRecords: readonly PptRecord[];
  readonly slidePersists: readonly SlidePersistAtomData[];
  readonly persistDirectory: ReadonlyMap<number, number>;
  readonly noteRecords: readonly PptRecord[];
  readonly masterRecords: readonly PptRecord[];
};

/**
 * Parse the CurrentUser stream to find the offset of the last UserEditAtom.
 */
export function parseCurrentUserStream(bytes: Uint8Array): number {
  // CurrentUserAtom: recType=0x0FF6
  // Payload layout:
  //   u32: size (payload size)
  //   u32: headerToken (0xE391C9F3 for non-encrypted)
  //   u32: offsetToCurrentEdit
  //   u16: docFileVersion
  //   u8:  majorVersion
  //   u8:  minorVersion
  const record = readPptRecord(bytes, 0);
  if (record.recType !== RT.CurrentUserAtom) {
    throw new Error(`Expected CurrentUserAtom (0x0FF6), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  // Skip size (4), headerToken (4)
  const offsetToCurrentEdit = view.getUint32(8, true);
  return offsetToCurrentEdit;
}

/**
 * Walk the UserEditAtom chain and collect persist directory entries.
 * Returns a merged persist directory (later edits override earlier ones).
 */
function buildPersistDirectory(
  docStream: Uint8Array,
  firstUserEditOffset: number,
  ctx: PptParseContext,
): { persistDir: Map<number, number>; docPersistIdRef: number } {
  const persistDir = new Map<number, number>();
  let docPersistIdRef = 1;
  let currentOffset = firstUserEditOffset;
  const visited = new Set<number>();

  while (currentOffset !== 0 && !visited.has(currentOffset)) {
    visited.add(currentOffset);

    if (currentOffset + RECORD_HEADER_SIZE > docStream.length) {
      warnOrThrow(ctx,
        { code: "PPT_PERSIST_OFFSET_INVALID", where: "buildPersistDirectory", message: `UserEditAtom offset ${currentOffset} out of range` },
        new Error(`UserEditAtom offset ${currentOffset} out of range`),
      );
      break;
    }

    const userEditRecord = readPptRecord(docStream, currentOffset);
    if (userEditRecord.recType !== RT.UserEditAtom) {
      warnOrThrow(ctx,
        { code: "PPT_PERSIST_OFFSET_INVALID", where: "buildPersistDirectory", message: `Expected UserEditAtom at offset ${currentOffset}, got 0x${userEditRecord.recType.toString(16)}` },
        new Error(`Expected UserEditAtom at offset ${currentOffset}`),
      );
      break;
    }

    const ueView = new DataView(userEditRecord.data.buffer, userEditRecord.data.byteOffset, userEditRecord.data.byteLength);
    // UserEditAtom payload:
    //   u32: lastSlideIdRef
    //   u16: version
    //   u8:  minorVersion
    //   u8:  majorVersion
    //   u32: offsetLastEdit (previous UserEditAtom, 0 if first)
    //   u32: offsetPersistDirectory
    //   u32: docPersistIdRef
    //   u32: persistIdSeed
    const offsetLastEdit = ueView.getUint32(8, true);
    const offsetPersistDir = ueView.getUint32(12, true);
    docPersistIdRef = ueView.getUint32(16, true);

    // Read PersistDirectoryAtom
    if (offsetPersistDir + RECORD_HEADER_SIZE <= docStream.length) {
      const pdRecord = readPptRecord(docStream, offsetPersistDir);
      if (pdRecord.recType === RT.PersistDirectoryAtom) {
        parsePersistDirectoryEntries(pdRecord, persistDir);
      }
    }

    currentOffset = offsetLastEdit;
  }

  return { persistDir, docPersistIdRef };
}

/**
 * Parse PersistDirectoryAtom entries into the persist directory map.
 *
 * Format: sequence of { u32 packed (persistId:20 | cPersist:12), u32[cPersist] offsets }
 */
function parsePersistDirectoryEntries(record: PptRecord, target: Map<number, number>): void {
  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  let offset = 0;

  while (offset + 4 <= record.data.byteLength) {
    const packed = view.getUint32(offset, true); offset += 4;
    const startPersistId = packed & 0x000FFFFF;
    const count = (packed >> 20) & 0x0FFF;

    for (let i = 0; i < count && offset + 4 <= record.data.byteLength; i++) {
      const streamOffset = view.getUint32(offset, true); offset += 4;
      // Only set if not already set (earlier edits have priority in reverse walk,
      // but we walk forward, so later sets override)
      target.set(startPersistId + i, streamOffset);
    }
  }
}

/**
 * Parse the PowerPoint Document stream.
 */
export function parsePptDocumentStream(
  docStream: Uint8Array,
  currentUserStream: Uint8Array | undefined,
  ctx: PptParseContext,
): PptStreamParseResult {
  // Step 1: Find the last UserEditAtom
  let firstUserEditOffset: number;

  if (currentUserStream && currentUserStream.length > 0) {
    firstUserEditOffset = parseCurrentUserStream(currentUserStream);
  } else {
    // Fallback: scan from end of document stream for UserEditAtom
    firstUserEditOffset = findLastUserEditAtom(docStream);
  }

  // Step 2: Build persist directory
  const { persistDir, docPersistIdRef } = buildPersistDirectory(docStream, firstUserEditOffset, ctx);

  // Step 3: Resolve DocumentContainer
  const docOffset = persistDir.get(docPersistIdRef);
  if (docOffset === undefined) {
    throw new Error(`DocumentContainer persist ID ${docPersistIdRef} not found in persist directory`);
  }

  const documentRecord = parsePptRecordTree(docStream, docOffset);
  if (documentRecord.recType !== RT.DocumentContainer) {
    throw new Error(`Expected DocumentContainer at offset ${docOffset}, got 0x${documentRecord.recType.toString(16)}`);
  }

  // Step 4: Find SlideListWithText containers in the document
  const slideListWithTexts = findChildrenByType(documentRecord.children ?? [], RT.SlideListWithText);

  // The first SlideListWithText (recInstance=0) contains slide references
  // The second (recInstance=1) contains master slide references
  // The third (recInstance=2) contains notes references
  const slidePersists: SlidePersistAtomData[] = [];
  const notesPersists: SlidePersistAtomData[] = [];

  for (const slt of slideListWithTexts) {
    const persistAtoms = findChildrenByType(slt.children ?? [], RT.SlidePersistAtom);
    const parsedPersists = persistAtoms.map(a => parseSlidePersistAtom(a));

    if (slt.recInstance === 0) {
      slidePersists.push(...parsedPersists);
    } else if (slt.recInstance === 2) {
      notesPersists.push(...parsedPersists);
    }
  }

  // Step 5: Resolve slide records
  const slideRecords: PptRecord[] = [];
  for (const sp of slidePersists) {
    const slideOffset = persistDir.get(sp.persistIdRef);
    if (slideOffset === undefined) {
      warnOrThrow(ctx,
        { code: "PPT_SLIDE_PARSE_FAILED", where: "parsePptDocumentStream", message: `Slide persist ID ${sp.persistIdRef} not found`, meta: { persistId: sp.persistIdRef } },
        new Error(`Slide persist ID ${sp.persistIdRef} not found`),
      );
      continue;
    }
    try {
      const slideRecord = parsePptRecordTree(docStream, slideOffset);
      slideRecords.push(slideRecord);
    } catch (err) {
      warnOrThrow(ctx,
        { code: "PPT_SLIDE_PARSE_FAILED", where: "parsePptDocumentStream", message: `Failed to parse slide at offset ${slideOffset}: ${err instanceof Error ? err.message : String(err)}` },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  // Step 6: Resolve notes records
  const noteRecords: PptRecord[] = [];
  for (const np of notesPersists) {
    const notesOffset = persistDir.get(np.persistIdRef);
    if (notesOffset === undefined) continue;
    try {
      const notesRecord = parsePptRecordTree(docStream, notesOffset);
      noteRecords.push(notesRecord);
    } catch {
      // Notes are optional, skip on error
    }
  }

  // Step 7: Resolve master records
  const masterRecords: PptRecord[] = [];
  // Masters are found by scanning the persist directory for MainMasterContainer records
  for (const [, offset] of persistDir) {
    if (offset + RECORD_HEADER_SIZE > docStream.length) continue;
    try {
      const rec = readPptRecord(docStream, offset);
      if (rec.recType === RT.MainMasterContainer) {
        masterRecords.push(parsePptRecordTree(docStream, offset));
      }
    } catch {
      // Skip invalid entries
    }
  }

  return {
    documentRecord,
    slideRecords,
    slidePersists,
    persistDirectory: persistDir,
    noteRecords,
    masterRecords,
  };
}

/** Fallback: scan backward from end of stream for the last UserEditAtom. */
function findLastUserEditAtom(docStream: Uint8Array): number {
  // Scan backward looking for UserEditAtom type (0x0FF5)
  for (let offset = docStream.length - RECORD_HEADER_SIZE; offset >= 0; offset--) {
    try {
      const record = readPptRecord(docStream, offset);
      if (record.recType === RT.UserEditAtom && record.recLen >= 20 && record.recLen <= 32) {
        return offset;
      }
    } catch {
      // Keep scanning
    }
  }
  throw new Error("Could not find UserEditAtom in PowerPoint Document stream");
}
