/**
 * @file src/pdf/parser/icc-profile.native.spec.ts
 */

import { describe, it, expect } from "vitest";
import { evalIccCurve, evalIccLutToPcs01, makeBradfordAdaptationMatrix, parseIccProfile } from "./icc-profile.native";

function writeAscii4(dst: Uint8Array, offset: number, s: string): void {
  for (let i = 0; i < 4; i += 1) {dst[offset + i] = s.charCodeAt(i) & 0xff;}
}

function writeU32BE(view: DataView, offset: number, v: number): void {
  view.setUint32(offset, v >>> 0, false);
}

function writeU16BE(view: DataView, offset: number, v: number): void {
  view.setUint16(offset, v & 0xffff, false);
}

function writeS15Fixed16(view: DataView, offset: number, v: number): void {
  const i32 = Math.trunc(v * 65536);
  view.setInt32(offset, i32, false);
}

function makeXyzTag(x: number, y: number, z: number): Uint8Array {
  const bytes = new Uint8Array(20);
  writeAscii4(bytes, 0, "XYZ ");
  const view = new DataView(bytes.buffer);
  writeS15Fixed16(view, 8, x);
  writeS15Fixed16(view, 12, y);
  writeS15Fixed16(view, 16, z);
  return bytes;
}

function makeParaGammaTag(gamma: number): Uint8Array {
  const bytes = new Uint8Array(16);
  writeAscii4(bytes, 0, "para");
  const view = new DataView(bytes.buffer);
  writeU16BE(view, 8, 0); // functionType 0: y = x^g
  writeS15Fixed16(view, 12, gamma);
  return bytes;
}

function pad4(n: number): number {
  return (n + 3) & ~3;
}

function makeMinimalRgbIccProfileBytes(): Uint8Array {
  const tags: Array<{ sig: string; data: Uint8Array }> = [
    { sig: "wtpt", data: makeXyzTag(0.9505, 1, 1.089) },
    { sig: "rXYZ", data: makeXyzTag(0.4124, 0.2126, 0.0193) },
    { sig: "gXYZ", data: makeXyzTag(0.3576, 0.7152, 0.1192) },
    { sig: "bXYZ", data: makeXyzTag(0.1805, 0.0722, 0.9505) },
    { sig: "rTRC", data: makeParaGammaTag(2) },
    { sig: "gTRC", data: makeParaGammaTag(2) },
    { sig: "bTRC", data: makeParaGammaTag(2) },
  ];

  const headerSize = 128;
  const tagTableSize = 4 + tags.length * 12;
  let cursor = pad4(headerSize + tagTableSize);

  const records: Array<{ sig: string; off: number; size: number }> = [];
  const tagDataParts: Uint8Array[] = [];
  for (const t of tags) {
    const off = cursor;
    const size = t.data.length;
    records.push({ sig: t.sig, off, size });
    tagDataParts.push(t.data);
    cursor = pad4(cursor + size);
    if (cursor > off + size) {
      tagDataParts.push(new Uint8Array(cursor - (off + size)));
    }
  }

  const totalSize = cursor;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  // Header.
  writeU32BE(view, 0, totalSize);
  writeAscii4(out, 16, "RGB ");
  writeAscii4(out, 20, "XYZ ");
  writeAscii4(out, 36, "acsp");

  // Tag table.
  writeU32BE(view, 128, tags.length);
  let tpos = 132;
  for (const r of records) {
    writeAscii4(out, tpos, r.sig);
    writeU32BE(view, tpos + 4, r.off);
    writeU32BE(view, tpos + 8, r.size);
    tpos += 12;
  }

  // Tag data.
  let dpos = pad4(headerSize + tagTableSize);
  for (const part of tagDataParts) {
    out.set(part, dpos);
    dpos += part.length;
  }

  return out;
}

function makeMinimalCmykLutIccProfileBytes(): Uint8Array {
  const makeMft1CmykToXyzTag = (): Uint8Array => {
    const inChannels = 4;
    const outChannels = 3;
    const gridPoints = 2;
    const inputEntries = 2;
    const outputEntries = 2;

    const clutPoints = gridPoints ** inChannels; // 16
    const headerBytes = 52;
    const inputTableBytes = inChannels * inputEntries; // u8
    const clutBytes = clutPoints * outChannels; // u8
    const outputTableBytes = outChannels * outputEntries; // u8
    const total = headerBytes + inputTableBytes + clutBytes + outputTableBytes;
    const bytes = new Uint8Array(total);
    const view = new DataView(bytes.buffer);

    writeAscii4(bytes, 0, "mft1");
    bytes[8] = inChannels;
    bytes[9] = outChannels;
    bytes[10] = gridPoints;

    // Identity matrix (s15Fixed16).
    const mat = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
    for (let i = 0; i < 9; i += 1) {
      writeS15Fixed16(view, 12 + i * 4, mat[i] ?? 0);
    }

    writeU16BE(view, 48, inputEntries);
    writeU16BE(view, 50, outputEntries);

    let cursor = 52;
    // Input tables: identity [0,255] for each channel.
    for (let c = 0; c < inChannels; c += 1) {
      bytes[cursor++] = 0;
      bytes[cursor++] = 255;
    }

    const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
    const toByte = (v01: number): number => Math.floor(clamp01(v01) * 255);
    const rgbToXyzD65 = (r: number, g: number, b: number): readonly [number, number, number] => {
      // Inputs are linear (0 or 1 for this fixture).
      const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
      const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
      return [X, Y, Z] as const;
    };

    // CLUT: first input channel varies fastest (C, then M, then Y, then K).
    for (let k = 0; k <= 1; k += 1) {
      for (let y = 0; y <= 1; y += 1) {
        for (let m = 0; m <= 1; m += 1) {
          for (let c = 0; c <= 1; c += 1) {
            const r = 1 - c;
            const gg = 1 - m;
            const bb = 1 - y;
            const [X, Y, Z] = rgbToXyzD65(r, gg, bb);
            bytes[cursor++] = toByte(X);
            bytes[cursor++] = toByte(Y);
            bytes[cursor++] = toByte(Z);
          }
        }
      }
    }

    // Output tables: identity [0,255] for each channel.
    for (let c = 0; c < outChannels; c += 1) {
      bytes[cursor++] = 0;
      bytes[cursor++] = 255;
    }

    return bytes;
  };

  const tags: Array<{ sig: string; data: Uint8Array }> = [
    { sig: "wtpt", data: makeXyzTag(0.9505, 1, 1.089) },
    { sig: "A2B0", data: makeMft1CmykToXyzTag() },
  ];

  const headerSize = 128;
  const tagTableSize = 4 + tags.length * 12;
  let cursor = pad4(headerSize + tagTableSize);

  const records: Array<{ sig: string; off: number; size: number }> = [];
  const tagDataParts: Uint8Array[] = [];
  for (const t of tags) {
    const off = cursor;
    const size = t.data.length;
    records.push({ sig: t.sig, off, size });
    tagDataParts.push(t.data);
    cursor = pad4(cursor + size);
    if (cursor > off + size) {
      tagDataParts.push(new Uint8Array(cursor - (off + size)));
    }
  }

  const totalSize = cursor;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  // Header.
  writeU32BE(view, 0, totalSize);
  writeAscii4(out, 16, "CMYK");
  writeAscii4(out, 20, "XYZ ");
  writeAscii4(out, 36, "acsp");

  // Tag table.
  writeU32BE(view, 128, tags.length);
  let tpos = 132;
  for (const r of records) {
    writeAscii4(out, tpos, r.sig);
    writeU32BE(view, tpos + 4, r.off);
    writeU32BE(view, tpos + 8, r.size);
    tpos += 12;
  }

  // Tag data.
  let dpos = pad4(headerSize + tagTableSize);
  for (const part of tagDataParts) {
    out.set(part, dpos);
    dpos += part.length;
  }

  return out;
}

describe("icc-profile (native)", () => {
  it("parses a minimal RGB profile (matrix + para gamma TRCs)", () => {
    const profileBytes = makeMinimalRgbIccProfileBytes();
    const parsed = parseIccProfile(profileBytes);
    expect(parsed?.kind).toBe("rgb");
    if (parsed?.kind !== "rgb") {return;}

    expect(parsed.whitePoint[1]).toBeCloseTo(1, 4);
    expect(parsed.rTRC.kind).toBe("gamma");
    expect(evalIccCurve(parsed.rTRC, 0.5)).toBeCloseTo(0.25, 4);
    expect(parsed.rXYZ[0]).toBeCloseTo(0.4124, 3);
    expect(parsed.gXYZ[1]).toBeCloseTo(0.7152, 3);
    expect(parsed.bXYZ[2]).toBeCloseTo(0.9505, 3);
  });

  it("builds a Bradford adaptation matrix (identity when src==dst)", () => {
    const m = makeBradfordAdaptationMatrix({ srcWhitePoint: [0.9505, 1, 1.089], dstWhitePoint: [0.9505, 1, 1.089] });
    expect(m).toHaveLength(9);
    expect(m[0]).toBeCloseTo(1, 6);
    expect(m[4]).toBeCloseTo(1, 6);
    expect(m[8]).toBeCloseTo(1, 6);
  });

  it("parses a minimal CMYK LUT profile (mft1 A2B0) and evaluates corner colors", () => {
    const profileBytes = makeMinimalCmykLutIccProfileBytes();
    const parsed = parseIccProfile(profileBytes);
    expect(parsed?.kind).toBe("lut");
    if (parsed?.kind !== "lut") {return;}

    expect(parsed.dataColorSpace).toBe("CMYK");
    expect(parsed.pcs).toBe("XYZ ");
    expect(parsed.a2b0.inChannels).toBe(4);
    expect(parsed.a2b0.outChannels).toBe(3);

    // Corner: C=0, M=1, Y=1, K=0 => RGB red => XYZ≈(0.4124, 0.2126, 0.0193).
    const pcs = evalIccLutToPcs01(parsed, [0, 1, 1, 0]);
    expect(pcs).not.toBeNull();
    if (!pcs) {return;}
    expect(pcs[0]).toBeCloseTo(0.4124, 2);
    expect(pcs[1]).toBeCloseTo(0.2126, 2);
    expect(pcs[2]).toBeCloseTo(0.0193, 2);
  });
});
