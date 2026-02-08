/**
 * @file src/pdf/native/filters/flate.spec.ts
 */

import { zlibSync } from "fflate";
import { decodeStreamData } from "./index";
import type { PdfDict, PdfObject } from "../core/types";

function asDict(entries: Record<string, PdfObject>): PdfDict {
  return { type: "dict", map: new Map(Object.entries(entries)) };
}

function encodePngSubPredictor(raw: Uint8Array, rowBytes: number, bytesPerPixel: number): Uint8Array {
  if (raw.length % rowBytes !== 0) {throw new Error("raw length must align to rowBytes");}
  const rows = raw.length / rowBytes;
  const out = new Uint8Array(rows * (rowBytes + 1));
  for (let y = 0; y < rows; y += 1) {
    const srcRow = y * rowBytes;
    const dstRow = y * (rowBytes + 1);
    out[dstRow] = 1; // Sub
    for (let x = 0; x < rowBytes; x += 1) {
      const rawByte = raw[srcRow + x] ?? 0;
      const left = x >= bytesPerPixel ? (raw[srcRow + x - bytesPerPixel] ?? 0) : 0;
      out[dstRow + 1 + x] = (rawByte - left + 256) & 0xff;
    }
  }
  return out;
}

describe("FlateDecode DecodeParms predictors", () => {
  it("applies PNG predictor (Predictor>=10) using row filter bytes", () => {
    const raw = new TextEncoder().encode("HelloWorld"); // 10 bytes
    const columns = 5;
    const colors = 1;
    const bytesPerPixel = colors;
    const rowBytes = columns * bytesPerPixel;

    const predicted = encodePngSubPredictor(raw, rowBytes, bytesPerPixel);
    const compressed = zlibSync(predicted);

    const decodeParms: PdfDict = asDict({
      Predictor: { type: "number", value: 12 },
      Columns: { type: "number", value: columns },
      Colors: { type: "number", value: colors },
      BitsPerComponent: { type: "number", value: 8 },
    });

    const decoded = decodeStreamData(compressed, { filters: ["FlateDecode"], decodeParms: [decodeParms] });
    expect(decoded).toEqual(raw);
  });

  it("applies TIFF predictor 2 (Predictor=2) across rows", () => {
    const raw = new Uint8Array([10, 12, 9, 8, 7, 5]); // 2 rows of 3
    const columns = 3;
    const colors = 1;
    const rowBytes = columns * colors;

    // TIFF predictor encodes each byte as (raw - left) mod 256 within the row, without a filter byte.
    const encoded = new Uint8Array(raw.length);
    for (let rowStart = 0; rowStart < raw.length; rowStart += rowBytes) {
      for (let x = 0; x < rowBytes; x += 1) {
        const left = x >= colors ? (raw[rowStart + x - colors] ?? 0) : 0;
        encoded[rowStart + x] = ((raw[rowStart + x] ?? 0) - left + 256) & 0xff;
      }
    }

    const compressed = zlibSync(encoded);
    const decodeParms: PdfDict = asDict({
      Predictor: { type: "number", value: 2 },
      Columns: { type: "number", value: columns },
      Colors: { type: "number", value: colors },
      BitsPerComponent: { type: "number", value: 8 },
    });

    const decoded = decodeStreamData(compressed, { filters: ["FlateDecode"], decodeParms: [decodeParms] });
    expect(decoded).toEqual(raw);
  });
});
