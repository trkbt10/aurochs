/**
 * @file Records module barrel export
 */

export type { PptRecord } from "./types";
export { RT } from "./record-types";
export { readPptRecord, recordTotalSize, RECORD_HEADER_SIZE } from "./record-reader";
export { parsePptRecordTree, parseContainerChildren } from "./container-parser";
export { iterateRecords, findChildByType, findChildrenByType } from "./record-iterator";
