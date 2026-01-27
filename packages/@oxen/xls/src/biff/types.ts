/**
 * @file BIFF core types
 */

export type BiffRecord = {
  type: number;
  length: number;
  data: Uint8Array;
  offset: number;
};

export type ReadRecordOptions = {
  strict?: boolean;
  maxRecordDataLength?: number;
};
