/**
 * @file BIFF8 BOUNDSHEET record parser
 */

import { parseShortUnicodeString } from "../strings/short-unicode-string";

export type BoundsheetType =
  | "worksheet" // 0x00
  | "macroSheet" // 0x01
  | "chart" // 0x02
  | "vbModule"; // 0x06

export type BoundsheetHiddenState =
  | "visible" // 0x00
  | "hidden" // 0x01
  | "veryHidden"; // 0x02

export type BoundsheetRecord = {
  readonly streamPosition: number;
  readonly sheetType: BoundsheetType;
  readonly hiddenState: BoundsheetHiddenState;
  readonly sheetName: string;
};

function mapSheetType(dt: number): BoundsheetType {
  switch (dt) {
    case 0x00:
      return "worksheet";
    case 0x01:
      return "macroSheet";
    case 0x02:
      return "chart";
    case 0x06:
      return "vbModule";
    default:
      throw new Error(`Unknown BOUNDSHEET sheet type: 0x${dt.toString(16)}`);
  }
}

function mapHiddenState(hsState: number): BoundsheetHiddenState {
  switch (hsState) {
    case 0x00:
      return "visible";
    case 0x01:
      return "hidden";
    case 0x02:
      return "veryHidden";
    default:
      throw new Error(`Unknown BOUNDSHEET hidden state: 0x${hsState.toString(16)}`);
  }
}

/**
 * Parse a BIFF8 BOUNDSHEET (0x0085) record data payload.
 */
export function parseBoundsheetRecord(data: Uint8Array): BoundsheetRecord {
  if (data.length < 7) {
    throw new Error(`BOUNDSHEET payload is too short: ${data.length}`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const streamPosition = view.getUint32(0, true);
  const grbit = view.getUint16(4, true);

  const hsState = grbit & 0x0003;
  const dt = (grbit >> 8) & 0xff;

  const cch = data[6];
  const namePayload = data.subarray(7);
  const { text: sheetName } = parseShortUnicodeString(namePayload, cch);

  return {
    streamPosition,
    sheetType: mapSheetType(dt),
    hiddenState: mapHiddenState(hsState),
    sheetName,
  };
}

