/**
 * @file src/pdf/parser/jpeg2000/jpx-decode.native.spec.ts
 */

import { describe, expect, it } from "vitest";
import { base64ToArrayBuffer } from "../../../buffer/base64";
import { decodeJpxNative } from "./jpx-decode.native";

const JP2_2X1_RGB_BASE64 =
  "AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAAAQAAAAIAAwcHAAAAAAAPY29scgEAAAAAABAAAACYanAyY/9P/1EALwAAAAAAAgAAAAEAAAAAAAAAAAAAAAIAAAABAAAAAAAAAAAAAwcBAQcBAQcBAf9SAAwAAAABAAAEBAAB/1wABEBA/2QAJQABQ3JlYXRlZCBieSBPcGVuSlBFRyB2ZXJzaW9uIDIuNS40/5AACgAAAAAAIAAB/5PfgCALsop/34AYBaLd34AQCT//2Q==";

function decodeBase64(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

describe("decodeJpxNative (JPEG2000 / JP2)", () => {
  it("decodes a tiny lossless JP2 (2x1 RGB)", () => {
    const jp2 = decodeBase64(JP2_2X1_RGB_BASE64);
    const decoded = decodeJpxNative(jp2, { expectedWidth: 2, expectedHeight: 1 });
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);
    expect(decoded.components).toBe(3);
    expect(decoded.bitsPerComponent).toBe(8);
    expect(Array.from(decoded.data)).toEqual([255, 0, 0, 0, 255, 0]);
  });
});

