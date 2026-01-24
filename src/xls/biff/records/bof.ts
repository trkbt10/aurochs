/**
 * @file BIFF8 BOF record parser
 */

export type BofSubstreamType =
  | "workbookGlobals" // 0x0005
  | "vbModule" // 0x0006
  | "worksheet" // 0x0010
  | "chart" // 0x0020
  | "macroSheet" // 0x0040
  | "workspace"; // 0x0100

export type BofRecord = {
  readonly version: number;
  readonly substreamType: BofSubstreamType;
  readonly buildId: number;
  readonly buildYear: number;
  readonly fileHistoryFlags: number;
  readonly lowestBiffVersion: number;
};

function mapSubstreamType(dt: number): BofSubstreamType {
  switch (dt) {
    case 0x0005:
      return "workbookGlobals";
    case 0x0006:
      return "vbModule";
    case 0x0010:
      return "worksheet";
    case 0x0020:
      return "chart";
    case 0x0040:
      return "macroSheet";
    case 0x0100:
      return "workspace";
    default:
      throw new Error(`Unknown BOF substream type: 0x${dt.toString(16)}`);
  }
}

/**
 * Parse a BIFF8 BOF (0x0809) record data payload.
 *
 * - Expected BIFF8 version: 0x0600
 * - Expected payload length: 16 bytes
 */
export function parseBofRecord(data: Uint8Array): BofRecord {
  if (data.length !== 16) {
    throw new Error(`Invalid BOF payload length: ${data.length} (expected 16)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const version = view.getUint16(0, true);
  if (version !== 0x0600) {
    throw new Error(`Unsupported BIFF version in BOF: 0x${version.toString(16)}`);
  }

  const dt = view.getUint16(2, true);

  return {
    version,
    substreamType: mapSubstreamType(dt),
    buildId: view.getUint16(4, true),
    buildYear: view.getUint16(6, true),
    fileHistoryFlags: view.getUint32(8, true),
    lowestBiffVersion: view.getUint32(12, true),
  };
}

