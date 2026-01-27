/**
 * @file src/pdf/parser/icc-profile.native.ts
 */

export type IccCurve =
  | Readonly<{ kind: "gamma"; gamma: number }>
  | Readonly<{ kind: "table"; values: readonly number[] }>;

export type IccRgbProfile = Readonly<{
  kind: "rgb";
  whitePoint: readonly [number, number, number];
  rXYZ: readonly [number, number, number];
  gXYZ: readonly [number, number, number];
  bXYZ: readonly [number, number, number];
  rTRC: IccCurve;
  gTRC: IccCurve;
  bTRC: IccCurve;
}>;

export type IccGrayProfile = Readonly<{
  kind: "gray";
  whitePoint: readonly [number, number, number];
  kTRC: IccCurve;
}>;

export type IccLutTransform = Readonly<{
  readonly inChannels: number;
  readonly outChannels: number;
  readonly gridPoints: number;
  readonly matrix: readonly number[];
  readonly inputTables: readonly (readonly number[])[];
  readonly outputTables: readonly (readonly number[])[];
  readonly clutBytes: Uint8Array;
  readonly bytesPerSample: 1 | 2;
  readonly sampleMax: 255 | 65535;
}>;

export type IccLutProfile = Readonly<{
  kind: "lut";
  dataColorSpace: string;
  pcs: "XYZ " | "Lab ";
  whitePoint: readonly [number, number, number];
  a2b0: IccLutTransform;
}>;

export type ParsedIccProfile = IccRgbProfile | IccGrayProfile | IccLutProfile;

const D65_WHITE_POINT = [0.9505, 1, 1.089] as const;
const D50_WHITE_POINT = [0.9642, 1, 0.8249] as const;

function readAscii4(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset] ?? 0;
  const b = bytes[offset + 1] ?? 0;
  const c = bytes[offset + 2] ?? 0;
  const d = bytes[offset + 3] ?? 0;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset] ?? 0;
  const b = bytes[offset + 1] ?? 0;
  return ((a << 8) | b) >>> 0;
}

function readI32BE(bytes: Uint8Array, offset: number): number {
  const u = readU32BE(bytes, offset);
  return u & 0x80000000 ? -(((~u) + 1) >>> 0) : u;
}

function readS15Fixed16(bytes: Uint8Array, offset: number): number {
  return readI32BE(bytes, offset) / 65536;
}

function parseXyzTag(tag: Uint8Array): readonly [number, number, number] | null {
  if (tag.length < 20) {return null;}
  if (readAscii4(tag, 0) !== "XYZ ") {return null;}
  const x = readS15Fixed16(tag, 8);
  const y = readS15Fixed16(tag, 12);
  const z = readS15Fixed16(tag, 16);
  return [x, y, z];
}

function parseCurveTag(tag: Uint8Array): IccCurve | null {
  if (tag.length < 12) {return null;}
  const type = readAscii4(tag, 0);
  if (type === "curv") {
    const count = readU32BE(tag, 8);
    if (count === 0) {return null;}
    if (count === 1) {
      if (tag.length < 14) {return null;}
      const gammaU8Fixed8 = readU16BE(tag, 12);
      const gamma = gammaU8Fixed8 / 256;
      if (!Number.isFinite(gamma) || gamma <= 0) {return null;}
      return { kind: "gamma", gamma };
    }
    const expectedBytes = 12 + count * 2;
    if (tag.length < expectedBytes) {return null;}
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const v = readU16BE(tag, 12 + i * 2);
      values.push(v / 65535);
    }
    return { kind: "table", values };
  }

  if (type === "para") {
    if (tag.length < 16) {return null;}
    const functionType = readU16BE(tag, 8);
    // Support the most common case: y = x^g (type 0).
    if (functionType === 0) {
      const g = readS15Fixed16(tag, 12);
      if (!Number.isFinite(g) || g <= 0) {return null;}
      return { kind: "gamma", gamma: g };
    }
    return null;
  }

  return null;
}

export function evalIccCurve(curve: IccCurve, x01: number): number {
  const x = Math.min(1, Math.max(0, x01));
  if (curve.kind === "gamma") {
    return Math.pow(x, curve.gamma);
  }

  const table = curve.values;
  if (table.length === 0) {return x;}
  if (table.length === 1) {return table[0] ?? x;}
  const t = x * (table.length - 1);
  const i0 = Math.floor(t);
  const i1 = Math.min(table.length - 1, i0 + 1);
  const frac = t - i0;
  const v0 = table[i0] ?? 0;
  const v1 = table[i1] ?? v0;
  return v0 + (v1 - v0) * frac;
}

function mulMat3Vec3(m: readonly number[], v: readonly [number, number, number]): readonly [number, number, number] {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  return [
    (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * z,
    (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * z,
    (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * z,
  ] as const;
}

function invertMat3(m: readonly number[]): readonly number[] | null {
  const a00 = m[0] ?? 0;
  const a01 = m[1] ?? 0;
  const a02 = m[2] ?? 0;
  const a10 = m[3] ?? 0;
  const a11 = m[4] ?? 0;
  const a12 = m[5] ?? 0;
  const a20 = m[6] ?? 0;
  const a21 = m[7] ?? 0;
  const a22 = m[8] ?? 0;

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  const det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) {return null;}
  const invDet = 1 / det;

  return [
    b01 * invDet,
    (-a22 * a01 + a02 * a21) * invDet,
    (a12 * a01 - a02 * a11) * invDet,
    b11 * invDet,
    (a22 * a00 - a02 * a20) * invDet,
    (-a12 * a00 + a02 * a10) * invDet,
    b21 * invDet,
    (-a21 * a00 + a01 * a20) * invDet,
    (a11 * a00 - a01 * a10) * invDet,
  ];
}

export function makeBradfordAdaptationMatrix(args: {
  readonly srcWhitePoint: readonly [number, number, number];
  readonly dstWhitePoint?: readonly [number, number, number];
}): readonly number[] {
  const src = args.srcWhitePoint;
  const dst = args.dstWhitePoint ?? D65_WHITE_POINT;

  // Bradford matrix.
  const Mb = [
    0.8951, 0.2664, -0.1614,
    -0.7502, 1.7135, 0.0367,
    0.0389, -0.0685, 1.0296,
  ] as const;
  const MbInv =
    invertMat3(Mb) ??
    ([
      0.9869929, -0.1470543, 0.1599627,
      0.4323053, 0.5183603, 0.0492912,
      -0.0085287, 0.0400428, 0.9684867,
    ] as const);

  const srcLms = mulMat3Vec3(Mb, src);
  const dstLms = mulMat3Vec3(Mb, dst);
  const s0 = (srcLms[0] ?? 1) !== 0 ? (dstLms[0] ?? 1) / (srcLms[0] ?? 1) : 1;
  const s1 = (srcLms[1] ?? 1) !== 0 ? (dstLms[1] ?? 1) / (srcLms[1] ?? 1) : 1;
  const s2 = (srcLms[2] ?? 1) !== 0 ? (dstLms[2] ?? 1) / (srcLms[2] ?? 1) : 1;

  // MbInv * diag(s) * Mb
  const dMb = [
    (Mb[0] ?? 0) * s0, (Mb[1] ?? 0) * s0, (Mb[2] ?? 0) * s0,
    (Mb[3] ?? 0) * s1, (Mb[4] ?? 0) * s1, (Mb[5] ?? 0) * s1,
    (Mb[6] ?? 0) * s2, (Mb[7] ?? 0) * s2, (Mb[8] ?? 0) * s2,
  ];

  const m = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      m[r * 3 + c] =
        (MbInv[r * 3 + 0] ?? 0) * (dMb[0 * 3 + c] ?? 0) +
        (MbInv[r * 3 + 1] ?? 0) * (dMb[1 * 3 + c] ?? 0) +
        (MbInv[r * 3 + 2] ?? 0) * (dMb[2 * 3 + c] ?? 0);
    }
  }
  return m;
}

function evalIccTable(table: readonly number[], x01: number): number {
  const x = Math.min(1, Math.max(0, x01));
  if (table.length === 0) {return x;}
  if (table.length === 1) {return table[0] ?? x;}
  const t = x * (table.length - 1);
  const i0 = Math.floor(t);
  const i1 = Math.min(table.length - 1, i0 + 1);
  const frac = t - i0;
  const v0 = table[i0] ?? 0;
  const v1 = table[i1] ?? v0;
  return v0 + (v1 - v0) * frac;
}

function readU8(bytes: Uint8Array, offset: number): number {
  return bytes[offset] ?? 0;
}

function isProbablyIdentityMat3(m: readonly number[]): boolean {
  if (m.length !== 9) {return false;}
  return (
    Math.abs((m[0] ?? 0) - 1) < 1e-6 &&
    Math.abs((m[4] ?? 0) - 1) < 1e-6 &&
    Math.abs((m[8] ?? 0) - 1) < 1e-6 &&
    Math.abs(m[1] ?? 0) < 1e-6 &&
    Math.abs(m[2] ?? 0) < 1e-6 &&
    Math.abs(m[3] ?? 0) < 1e-6 &&
    Math.abs(m[5] ?? 0) < 1e-6 &&
    Math.abs(m[6] ?? 0) < 1e-6 &&
    Math.abs(m[7] ?? 0) < 1e-6
  );
}

function safePowInt(base: number, exp: number, limit: number): number | null {
  if (!Number.isFinite(base) || !Number.isFinite(exp)) {return null;}
  if (base <= 0 || exp < 0) {return null;}
  let out = 1;
  for (let i = 0; i < exp; i += 1) {
    out *= base;
    if (!Number.isFinite(out) || out > limit) {return null;}
  }
  return out;
}

function parseLutTag(tag: Uint8Array): IccLutTransform | null {
  if (tag.length < 52) {return null;}
  const type = readAscii4(tag, 0);
  const isMft1 = type === "mft1";
  const isMft2 = type === "mft2";
  if (!isMft1 && !isMft2) {return null;}

  const inChannels = readU8(tag, 8);
  const outChannels = readU8(tag, 9);
  const gridPoints = readU8(tag, 10);
  if (inChannels <= 0 || inChannels > 16) {return null;}
  if (outChannels <= 0 || outChannels > 16) {return null;}
  if (gridPoints <= 1 || gridPoints > 64) {return null;}

  const matrix: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    matrix.push(readS15Fixed16(tag, 12 + i * 4));
  }

  const inputEntries = readU16BE(tag, 48);
  const outputEntries = readU16BE(tag, 50);
  if (inputEntries <= 1 || outputEntries <= 1) {return null;}
  if (inputEntries > 4096 || outputEntries > 4096) {return null;}

  const bytesPerSample: 1 | 2 = isMft1 ? 1 : 2;
  const sampleMax: 255 | 65535 = isMft1 ? 255 : 65535;

  const inputTableBytes = inChannels * inputEntries * bytesPerSample;
  const clutPoints = safePowInt(gridPoints, inChannels, 16 * 1024 * 1024);
  if (clutPoints == null) {return null;}
  const clutBytes = clutPoints * outChannels * bytesPerSample;
  const outputTableBytes = outChannels * outputEntries * bytesPerSample;

  const total = 52 + inputTableBytes + clutBytes + outputTableBytes;
  if (total > tag.length) {return null;}

  let cursor = 52;
  const inputTablesBytes = tag.slice(cursor, cursor + inputTableBytes);
  cursor += inputTableBytes;
  const clutBytesArr = tag.slice(cursor, cursor + clutBytes);
  cursor += clutBytes;
  const outputTablesBytes = tag.slice(cursor, cursor + outputTableBytes);

  const inputTables: number[][] = [];
  for (let c = 0; c < inChannels; c += 1) {
    const table: number[] = [];
    for (let i = 0; i < inputEntries; i += 1) {
      if (isMft1) {
        table.push((inputTablesBytes[c * inputEntries + i] ?? 0) / 255);
      } else {
        const off = (c * inputEntries + i) * 2;
        table.push(readU16BE(inputTablesBytes, off) / 65535);
      }
    }
    inputTables.push(table);
  }

  const outputTables: number[][] = [];
  for (let c = 0; c < outChannels; c += 1) {
    const table: number[] = [];
    for (let i = 0; i < outputEntries; i += 1) {
      if (isMft1) {
        table.push((outputTablesBytes[c * outputEntries + i] ?? 0) / 255);
      } else {
        const off = (c * outputEntries + i) * 2;
        table.push(readU16BE(outputTablesBytes, off) / 65535);
      }
    }
    outputTables.push(table);
  }

  return {
    inChannels,
    outChannels,
    gridPoints,
    matrix,
    inputTables,
    outputTables,
    clutBytes: clutBytesArr,
    bytesPerSample,
    sampleMax,
  };
}

export function evalIccLutToPcs01(profile: IccLutProfile, inputs01: readonly number[]): readonly [number, number, number] | null {
  const lut = profile.a2b0;
  if (lut.outChannels !== 3) {return null;}
  if (inputs01.length < lut.inChannels) {return null;}

  const inMapped: number[] = [];
  for (let c = 0; c < lut.inChannels; c += 1) {
    const table = lut.inputTables[c] ?? [];
    inMapped.push(evalIccTable(table, inputs01[c] ?? 0));
  }

  // Apply matrix for 3-channel inputs when it looks non-identity.
  if (lut.inChannels === 3 && !isProbablyIdentityMat3(lut.matrix)) {
    const x = inMapped[0] ?? 0;
    const y = inMapped[1] ?? 0;
    const z = inMapped[2] ?? 0;
    inMapped[0] = (lut.matrix[0] ?? 0) * x + (lut.matrix[1] ?? 0) * y + (lut.matrix[2] ?? 0) * z;
    inMapped[1] = (lut.matrix[3] ?? 0) * x + (lut.matrix[4] ?? 0) * y + (lut.matrix[5] ?? 0) * z;
    inMapped[2] = (lut.matrix[6] ?? 0) * x + (lut.matrix[7] ?? 0) * y + (lut.matrix[8] ?? 0) * z;
  }

  const g = lut.gridPoints;
  const idx0: number[] = [];
  const idx1: number[] = [];
  const t: number[] = [];
  for (let c = 0; c < lut.inChannels; c += 1) {
    const v = Math.min(1, Math.max(0, inMapped[c] ?? 0));
    const p = v * (g - 1);
    const i0 = Math.floor(p);
    const i1 = Math.min(g - 1, i0 + 1);
    idx0.push(i0);
    idx1.push(i1);
    t.push(p - i0);
  }

  const clut = lut.clutBytes;
  const clutStride = lut.outChannels;
  const getClut01 = (index: number, ch: number): number => {
    const sampleIndex = index * clutStride + ch;
    if (lut.bytesPerSample === 1) {
      const raw = clut[sampleIndex] ?? 0;
      return raw / lut.sampleMax;
    }
    const off = sampleIndex * 2;
    const raw = readU16BE(clut, off);
    return raw / lut.sampleMax;
  };

  const getIndex = (coords: readonly number[]): number => {
    // First input channel varies fastest.
    let mul = 1;
    let index = 0;
    for (let c = 0; c < lut.inChannels; c += 1) {
      index += (coords[c] ?? 0) * mul;
      mul *= g;
    }
    return index;
  };

  const out = [0, 0, 0];
  const corners = 1 << lut.inChannels;
  const coords = new Array<number>(lut.inChannels).fill(0);
  for (let mask = 0; mask < corners; mask += 1) {
    let w = 1;
    for (let c = 0; c < lut.inChannels; c += 1) {
      const use1 = ((mask >> c) & 1) === 1;
      coords[c] = use1 ? (idx1[c] ?? 0) : (idx0[c] ?? 0);
      w *= use1 ? (t[c] ?? 0) : (1 - (t[c] ?? 0));
    }
    if (w === 0) {continue;}
    const index = getIndex(coords);
    out[0] += w * getClut01(index, 0);
    out[1] += w * getClut01(index, 1);
    out[2] += w * getClut01(index, 2);
  }

  const o0 = evalIccTable(lut.outputTables[0] ?? [], out[0]);
  const o1 = evalIccTable(lut.outputTables[1] ?? [], out[1]);
  const o2 = evalIccTable(lut.outputTables[2] ?? [], out[2]);
  return [o0, o1, o2] as const;
}

export function parseIccProfile(bytes: Uint8Array): ParsedIccProfile | null {
  if (!bytes) {throw new Error("bytes is required");}
  if (bytes.length < 132) {return null;}
  if (readAscii4(bytes, 36) !== "acsp") {return null;}

  const dataColorSpace = readAscii4(bytes, 16);
  const pcs = readAscii4(bytes, 20);
  const tagCount = readU32BE(bytes, 128);
  if (tagCount <= 0 || tagCount > 1024) {return null;}

  const tagTableStart = 132;
  const tagTableBytes = tagCount * 12;
  if (tagTableStart + tagTableBytes > bytes.length) {return null;}

  const tags = new Map<string, Uint8Array>();
  for (let i = 0; i < tagCount; i += 1) {
    const entry = tagTableStart + i * 12;
    const sig = readAscii4(bytes, entry);
    const off = readU32BE(bytes, entry + 4);
    const size = readU32BE(bytes, entry + 8);
    if (off + size > bytes.length) {continue;}
    tags.set(sig, bytes.slice(off, off + size));
  }

  const whitePoint = parseXyzTag(tags.get("wtpt") ?? new Uint8Array()) ?? D65_WHITE_POINT;

  if (dataColorSpace === "RGB ") {
    const rXYZ = parseXyzTag(tags.get("rXYZ") ?? new Uint8Array());
    const gXYZ = parseXyzTag(tags.get("gXYZ") ?? new Uint8Array());
    const bXYZ = parseXyzTag(tags.get("bXYZ") ?? new Uint8Array());
    const rTRC = parseCurveTag(tags.get("rTRC") ?? new Uint8Array());
    const gTRC = parseCurveTag(tags.get("gTRC") ?? new Uint8Array());
    const bTRC = parseCurveTag(tags.get("bTRC") ?? new Uint8Array());
    if (!rXYZ || !gXYZ || !bXYZ || !rTRC || !gTRC || !bTRC) {return null;}
    return { kind: "rgb", whitePoint, rXYZ, gXYZ, bXYZ, rTRC, gTRC, bTRC };
  }

  if (dataColorSpace === "GRAY") {
    const kTRC = parseCurveTag(tags.get("kTRC") ?? new Uint8Array());
    if (!kTRC) {return null;}
    return { kind: "gray", whitePoint, kTRC };
  }

  const a2b0 = parseLutTag(tags.get("A2B0") ?? tags.get("AToB0") ?? new Uint8Array());
  if (a2b0) {
    const pcsName: "XYZ " | "Lab " = pcs === "Lab " ? "Lab " : "XYZ ";
    return { kind: "lut", dataColorSpace, pcs: pcsName, whitePoint: whitePoint ?? D50_WHITE_POINT, a2b0 };
  }

  return null;
}
