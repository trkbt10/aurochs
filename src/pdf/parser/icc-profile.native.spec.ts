/**
 * @file src/pdf/parser/icc-profile.native.spec.ts
 */

import { describe, it, expect } from "vitest";
import { evalIccCurve, makeBradfordAdaptationMatrix, parseIccProfile } from "./icc-profile.native";

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
});

