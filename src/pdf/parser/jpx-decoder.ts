/**
 * @file src/pdf/parser/jpx-decoder.ts
 */

export type JpxDecodedImage = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly components: 1 | 3 | 4;
  readonly bitsPerComponent: 8 | 16;
  /** Interleaved component bytes (8bpc) or big-endian samples (16bpc). */
  readonly data: Uint8Array;
}>;

export type JpxDecodeFn = (
  jpxBytes: Uint8Array,
  options: Readonly<{ readonly expectedWidth: number; readonly expectedHeight: number }>,
) => JpxDecodedImage;

export function downsampleJpxTo8Bit(decoded: JpxDecodedImage): Readonly<{ data: Uint8Array; bitsPerComponent: 8 }> {
  if (!decoded) {throw new Error("decoded is required");}
  if (!decoded.data) {throw new Error("decoded.data is required");}
  if (decoded.bitsPerComponent === 8) {
    return { data: decoded.data, bitsPerComponent: 8 };
  }
  if (decoded.bitsPerComponent !== 16) {
    throw new Error(`JPXDecode: unsupported bitsPerComponent=${decoded.bitsPerComponent}`);
  }

  const samples = decoded.width * decoded.height * decoded.components;
  if (decoded.data.length !== samples * 2) {
    throw new Error(`JPXDecode: 16bpc length mismatch: expected ${samples * 2}, got ${decoded.data.length}`);
  }
  const out = new Uint8Array(samples);
  for (let i = 0; i < samples; i += 1) {
    out[i] = decoded.data[i * 2] ?? 0;
  }
  return { data: out, bitsPerComponent: 8 };
}

