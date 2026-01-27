/**
 * @file src/pdf/native/filters/predictor.ts
 */

import type { PdfDict, PdfObject } from "../core/types";

function dictGetNumber(dict: PdfDict, key: string): number | null {
  const v = dict.map.get(key);
  if (!v || v.type !== "number") {return null;}
  if (!Number.isFinite(v.value)) {return null;}
  return Math.trunc(v.value);
}

function decodeTiffPredictor2(
  data: Uint8Array,
  rowBytes: number,
  bytesPerPixel: number,
): Uint8Array {
  if (rowBytes <= 0) {throw new Error("Predictor: invalid rowBytes");}
  if (bytesPerPixel <= 0) {throw new Error("Predictor: invalid bytesPerPixel");}
  if (data.length % rowBytes !== 0) {throw new Error("Predictor: data length is not aligned to row size");}

  const out = new Uint8Array(data.length);
  out.set(data);
  for (let rowStart = 0; rowStart < out.length; rowStart += rowBytes) {
    for (let x = bytesPerPixel; x < rowBytes; x += 1) {
      out[rowStart + x] = ((out[rowStart + x] ?? 0) + (out[rowStart + x - bytesPerPixel] ?? 0)) & 0xff;
    }
  }
  return out;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {return a;}
  if (pb <= pc) {return b;}
  return c;
}

function decodePngPredictor(
  data: Uint8Array,
  rowBytes: number,
  bytesPerPixel: number,
): Uint8Array {
  if (rowBytes <= 0) {throw new Error("Predictor: invalid rowBytes");}
  if (bytesPerPixel <= 0) {throw new Error("Predictor: invalid bytesPerPixel");}

  const rowBytesWithFilter = rowBytes + 1;
  if (data.length % rowBytesWithFilter !== 0) {
    throw new Error("Predictor: data length is not aligned to PNG predictor rows");
  }
  const rows = data.length / rowBytesWithFilter;
  const out = new Uint8Array(rows * rowBytes);

  for (let y = 0; y < rows; y += 1) {
    const srcRowStart = y * rowBytesWithFilter;
    const filterType = data[srcRowStart] ?? 0;
    const src = srcRowStart + 1;
    const dst = y * rowBytes;

    switch (filterType) {
      case 0: // None
        for (let x = 0; x < rowBytes; x += 1) {out[dst + x] = data[src + x] ?? 0;}
        break;
      case 1: // Sub
        for (let x = 0; x < rowBytes; x += 1) {
          const raw = data[src + x] ?? 0;
          const left = x >= bytesPerPixel ? (out[dst + x - bytesPerPixel] ?? 0) : 0;
          out[dst + x] = (raw + left) & 0xff;
        }
        break;
      case 2: // Up
        for (let x = 0; x < rowBytes; x += 1) {
          const raw = data[src + x] ?? 0;
          const above = y > 0 ? (out[dst - rowBytes + x] ?? 0) : 0;
          out[dst + x] = (raw + above) & 0xff;
        }
        break;
      case 3: // Average
        for (let x = 0; x < rowBytes; x += 1) {
          const raw = data[src + x] ?? 0;
          const left = x >= bytesPerPixel ? (out[dst + x - bytesPerPixel] ?? 0) : 0;
          const above = y > 0 ? (out[dst - rowBytes + x] ?? 0) : 0;
          out[dst + x] = (raw + Math.floor((left + above) / 2)) & 0xff;
        }
        break;
      case 4: // Paeth
        for (let x = 0; x < rowBytes; x += 1) {
          const raw = data[src + x] ?? 0;
          const left = x >= bytesPerPixel ? (out[dst + x - bytesPerPixel] ?? 0) : 0;
          const above = y > 0 ? (out[dst - rowBytes + x] ?? 0) : 0;
          const upperLeft =
            y > 0 && x >= bytesPerPixel ? (out[dst - rowBytes + x - bytesPerPixel] ?? 0) : 0;
          out[dst + x] = (raw + paethPredictor(left, above, upperLeft)) & 0xff;
        }
        break;
      default:
        throw new Error(`Predictor: unsupported PNG filter type ${filterType}`);
    }
  }

  return out;
}

export function applyPredictorDecodeParms(decoded: Uint8Array, decodeParms: PdfObject | null | undefined): Uint8Array {
  if (!decodeParms || decodeParms.type !== "dict") {return decoded;}

  const predictor = dictGetNumber(decodeParms, "Predictor") ?? 1;
  if (predictor <= 1) {return decoded;}

  const colors = dictGetNumber(decodeParms, "Colors") ?? 1;
  const columns = dictGetNumber(decodeParms, "Columns") ?? 1;
  const bpc = dictGetNumber(decodeParms, "BitsPerComponent") ?? 8;
  if (bpc !== 8) {throw new Error(`Predictor: unsupported BitsPerComponent ${bpc}`);}
  if (colors <= 0 || columns <= 0) {throw new Error("Predictor: invalid Colors/Columns");}

  const bytesPerPixel = colors;
  const rowBytes = columns * bytesPerPixel;

  if (predictor === 2) {
    return decodeTiffPredictor2(decoded, rowBytes, bytesPerPixel);
  }
  if (predictor >= 10 && predictor <= 15) {
    return decodePngPredictor(decoded, rowBytes, bytesPerPixel);
  }

  throw new Error(`Predictor: unsupported Predictor ${predictor}`);
}
