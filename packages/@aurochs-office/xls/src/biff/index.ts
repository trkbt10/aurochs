/**
 * @file BIFF record parsing foundation exports
 */

export { BIFF_RECORD_TYPES } from "./record-types";
export type { BiffRecordType } from "./record-types";
export { readRecord } from "./record-reader";
export { readRecordWithContinues } from "./continue-handler";
export { iterateRecords } from "./stream-iterator";
export type { BiffRecord, ReadRecordOptions } from "./types";
export type { IterateRecordsOptions } from "./stream-iterator";
export type { ReadRecordWithContinuesResult } from "./continue-handler";
