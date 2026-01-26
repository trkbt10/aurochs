/**
 * @file BOF record parser (BIFF5/7/8)
 */

import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

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
 * Parse a BOF (0x0809) record data payload.
 */
export function parseBofRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): BofRecord {
  if (data.length !== 8 && data.length !== 16) {
    throw new Error(`Invalid BOF payload length: ${data.length} (expected 8 or 16)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const rawVersion = view.getUint16(0, true);
  const version = rawVersion & 0xff00;
  const dt = view.getUint16(2, true);

  if (version === 0x0600) {
    if (data.length === 8) {
      try {
        throw new Error(`Invalid BOF payload length for BIFF8: ${data.length} (expected 16)`);
      } catch (err) {
        warnOrThrow(
          ctx,
          {
            code: "BOF_TRUNCATED",
            where: "BOF",
            message: "BOF payload is truncated (BIFF8 expected 16 bytes); proceeding with defaulted fields.",
            meta: { dataLength: data.length },
          },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }
    if (data.length === 16) {
      return {
        version,
        substreamType: mapSubstreamType(dt),
        buildId: view.getUint16(4, true),
        buildYear: view.getUint16(6, true),
        fileHistoryFlags: view.getUint32(8, true),
        lowestBiffVersion: view.getUint32(12, true),
      };
    }
    return {
      version,
      substreamType: mapSubstreamType(dt),
      buildId: view.getUint16(4, true),
      buildYear: view.getUint16(6, true),
      fileHistoryFlags: 0,
      lowestBiffVersion: version,
    };
  }

  if (version === 0x0500) {
    return {
      version,
      substreamType: mapSubstreamType(dt),
      buildId: view.getUint16(4, true),
      buildYear: view.getUint16(6, true),
      fileHistoryFlags: 0,
      lowestBiffVersion: version,
    };
  }

  throw new Error(`Unsupported BIFF version in BOF: 0x${rawVersion.toString(16)}`);
}
