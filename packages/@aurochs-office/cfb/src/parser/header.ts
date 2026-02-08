/**
 * @file MS-CFB header parser
 */

import { CFB_HEADER_SIZE, CFB_SIGNATURE } from "../constants";
import { CfbFormatError, CfbUnsupportedError } from "../errors";
import type { CfbHeader } from "../types";

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/** Parse the 512-byte CFB header. */
export function parseCfbHeader(bytes: Uint8Array, opts: { readonly strict: boolean }): CfbHeader {
  if (!(bytes instanceof Uint8Array)) {
    throw new CfbFormatError("openCfb: bytes must be a Uint8Array");
  }
  if (bytes.length < CFB_HEADER_SIZE) {
    throw new CfbFormatError(`CFB header is truncated: ${bytes.length} bytes`);
  }

  const signature = bytes.subarray(0, 8);
  if (!bytesEqual(signature, CFB_SIGNATURE)) {
    throw new CfbFormatError("Invalid CFB signature");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const majorVersion = view.getUint16(26, true);
  if (majorVersion !== 3 && majorVersion !== 4) {
    throw new CfbUnsupportedError(`Unsupported CFB major version: ${majorVersion}`);
  }

  const byteOrder = view.getUint16(28, true);
  if (opts.strict && byteOrder !== 0xfffe) {
    throw new CfbFormatError(`Invalid byte order: 0x${byteOrder.toString(16)}`);
  }

  const sectorShift = view.getUint16(30, true);
  const sectorSize = 1 << sectorShift;
  if (majorVersion === 3 && sectorSize !== 512) {
    throw new CfbFormatError(`Invalid sector size for major version 3: ${sectorSize}`);
  }
  if (majorVersion === 4 && sectorSize !== 4096) {
    throw new CfbFormatError(`Invalid sector size for major version 4: ${sectorSize}`);
  }

  const miniSectorShift = view.getUint16(32, true);
  const miniSectorSize = 1 << miniSectorShift;
  if (opts.strict && miniSectorSize !== 64) {
    throw new CfbFormatError(`Invalid mini sector size: ${miniSectorSize}`);
  }

  const numberOfFatSectors = view.getUint32(44, true);
  const firstDirectorySector = view.getUint32(48, true);
  const miniStreamCutoffSize = view.getUint32(56, true);
  const firstMiniFatSector = view.getUint32(60, true);
  const numberOfMiniFatSectors = view.getUint32(64, true);
  const firstDifatSector = view.getUint32(68, true);
  const numberOfDifatSectors = view.getUint32(72, true);

  if (opts.strict && miniStreamCutoffSize !== 0x1000) {
    throw new CfbFormatError(`Invalid mini stream cutoff size: ${miniStreamCutoffSize}`);
  }

  const difat: number[] = [];
  for (let i = 0; i < 109; i++) {
    difat.push(view.getUint32(76 + i * 4, true));
  }

  return {
    majorVersion,
    sectorSize,
    miniSectorSize,
    miniStreamCutoffSize,
    numberOfFatSectors,
    firstDirectorySector,
    firstMiniFatSector,
    numberOfMiniFatSectors,
    firstDifatSector,
    numberOfDifatSectors,
    difat,
  };
}
