/**
 * @file src/pdf/parser/jpeg2000/j2k.ts
 *
 * Minimal JPEG2000 codestream parser for `/JPXDecode` in PDFs.
 */

import { readU16BE, readU32BE } from "./bytes";
import { createPacketBitReader, type PacketBitReader } from "./packet-bit-reader";
import { createTagTree } from "./tag-tree";
import { createMqDecoder } from "./mq-decoder";
import { tier1DecodeLlCodeblock, TIER1_NUM_CONTEXTS } from "./tier1";

type CodestreamHeader = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly components: number;
  readonly bitDepth: number;
  readonly isSigned: boolean;
  readonly guardBits: number;
  readonly numResolutions: number;
  readonly mct: number;
}>;

function readMarker(bytes: Uint8Array, offset: number): number {
  return readU16BE(bytes, offset);
}

function floorLog2(n: number): number {
  if (n <= 0) {return 0;}
  return Math.floor(Math.log2(n));
}

function readNPasses(br: PacketBitReader): number {
  const b0 = br.readBit();
  if (b0 === 0) {return 1;}
  const b1 = br.readBit();
  if (b1 === 0) {return 2;}
  const b2 = br.readBits(2);
  if (b2 !== 3) {return 3 + b2;}
  const b5 = br.readBits(5);
  if (b5 !== 31) {return 6 + b5;}
  const b7 = br.readBits(7);
  return 37 + b7;
}































/** Decode a JPEG 2000 codestream to RGB pixel data. */
export function decodeJ2kCodestreamToRgb(
  codestream: Uint8Array,
  options: Readonly<{ readonly expectedWidth: number; readonly expectedHeight: number }>,
): Readonly<{ width: number; height: number; components: 1 | 3; bitsPerComponent: 8; data: Uint8Array }> {
  if (!codestream) {throw new Error("codestream is required");}
  if (!options) {throw new Error("options is required");}

  const header = parseMainHeader(codestream);
  if (header.width !== options.expectedWidth || header.height !== options.expectedHeight) {
    throw new Error(`JPXDecode: size mismatch: expected ${options.expectedWidth}x${options.expectedHeight}, got ${header.width}x${header.height}`);
  }
  if (header.numResolutions !== 1) {
    throw new Error(`JPXDecode: only numResolutions=1 is supported (got ${header.numResolutions})`);
  }
  if (header.mct !== 0) {
    throw new Error(`JPXDecode: MCT is not supported (got ${header.mct})`);
  }
  if (header.bitDepth !== 8) {
    throw new Error(`JPXDecode: only 8-bit components are supported (got ${header.bitDepth})`);
  }
  if (header.components !== 1 && header.components !== 3) {
    throw new Error(`JPXDecode: only 1 or 3 components supported (got ${header.components})`);
  }

  const tileBytes = extractSingleTilePart(codestream);
  const out = new Uint8Array(header.width * header.height * header.components);

  const br = createPacketBitReader(tileBytes);
  // LRCP, 1 layer, 1 resolution: packet order is component-major.
  for (let comp = 0; comp < header.components; comp += 1) {
    // Packet present bit
    const present = br.readBit();
    if (present === 0) {
      throw new Error("JPXDecode: empty packet not supported");
    }

    // 1 codeblock: decode inclusion + imsbtree
    const incl = createTagTree(1, 1);
    const imsbt = createTagTree(1, 1);
    const inclVal = incl.decode(br, 0, 0);
    const included = inclVal <= 0;
    if (!included) {
      throw new Error("JPXDecode: codeblock not included");
    }
    const numZeroBitplanes = imsbt.decode(br, 0, 999);

    const numPasses = readNPasses(br);
    // Lblock starts at 3 and increments for each 1-bit read
    const lblockState = { value: 3 };
    while (br.readBit() === 1) {lblockState.value += 1;}
    const lenBits = lblockState.value + floorLog2(numPasses);
    const segLen = br.readBits(lenBits);

    const codeblockData = br.readBytes(segLen);

    // `numbps` (number of bit-planes) for Tier-1 is based on the component precision
    // plus guard bits, with a -1 adjustment to align with the ISO definition.
    const numBps = header.bitDepth + header.guardBits - 1;
    const startBitplane = numBps - 1 - numZeroBitplanes;
    if (startBitplane < 0) {throw new Error("JPXDecode: invalid start bitplane");}

    // Our subset only supports a single codeblock covering the whole component.
    const mq = createMqDecoder(codeblockData, { numContexts: TIER1_NUM_CONTEXTS });
    const decoded = tier1DecodeLlCodeblock(mq, {
      width: header.width,
      height: header.height,
      numPasses,
      startBitplane,
    });

    // Convert signed coefficients to unsigned samples with level shift.
    const shift = header.isSigned ? 0 : 1 << (header.bitDepth - 1);
    for (let i = 0; i < header.width * header.height; i += 1) {
      // Tier-1 produces signed coefficients stored as fixed-point (×2).
      const s = (decoded.data[i] ?? 0) >> 1;
      const v = Math.max(0, Math.min(255, s + shift));
      out[i * header.components + comp] = v & 0xff;
    }
  }

  return { width: header.width, height: header.height, components: header.components as 1 | 3, bitsPerComponent: 8, data: out };
}

function parseMainHeader(bytes: Uint8Array): CodestreamHeader {
  if (bytes.length < 2) {throw new Error("J2K: truncated");}
  const soc = readMarker(bytes, 0);
  if (soc !== 0xff4f) {throw new Error("J2K: missing SOC");}

  // Parser state for main header traversal
  const parserState = {
    pos: 2,
    siz: null as { width: number; height: number; components: number; bitDepth: number; isSigned: boolean } | null,
    cod: null as { numResolutions: number; mct: number } | null,
    qcdGuardBits: 2,
  };

  while (parserState.pos + 2 <= bytes.length) {
    const marker = readMarker(bytes, parserState.pos);
    parserState.pos += 2;
    if (marker === 0xff90 /* SOT */) {break;}
    if (marker === 0xff93 /* SOD */) {throw new Error("J2K: unexpected SOD in main header");}
    if (marker === 0xffd9 /* EOC */) {break;}

    if (parserState.pos + 2 > bytes.length) {throw new Error("J2K: truncated marker segment");}
    const length = readU16BE(bytes, parserState.pos);
    parserState.pos += 2;
    if (length < 2) {throw new Error("J2K: invalid marker segment length");}
    const segStart = parserState.pos;
    const segEnd = parserState.pos + (length - 2);
    if (segEnd > bytes.length) {throw new Error("J2K: truncated marker segment");}

    if (marker === 0xff51 /* SIZ */) {
      // Skip Rsiz (2)
      const xsiz = readU32BE(bytes, segStart + 2);
      const ysiz = readU32BE(bytes, segStart + 6);
      const xosiz = readU32BE(bytes, segStart + 10);
      const yosiz = readU32BE(bytes, segStart + 14);
      const csiz = readU16BE(bytes, segStart + 34);

      const width = xsiz - xosiz;
      const height = ysiz - yosiz;

      if (csiz < 1) {throw new Error("J2K: invalid Csiz");}
      const ssiz = bytes[segStart + 36] ?? 0;
      const bitDepth = (ssiz & 0x7f) + 1;
      const isSigned = (ssiz & 0x80) !== 0;
      parserState.siz = { width, height, components: csiz, bitDepth, isSigned };
    } else if (marker === 0xff52 /* COD */) {
      const scod = bytes[segStart] ?? 0;
      if ((scod & 0x01) !== 0) {throw new Error("J2K: precincts not supported");}
      const progression = bytes[segStart + 1] ?? 0;
      if (progression !== 0) {throw new Error(`J2K: progression order not supported (${progression})`);}
      const nlayers = readU16BE(bytes, segStart + 2);
      if (nlayers !== 1) {throw new Error(`J2K: nlayers not supported (${nlayers})`);}
      const mct = bytes[segStart + 4] ?? 0;
      const numDecompLevels = bytes[segStart + 5] ?? 0;
      const numResolutions = numDecompLevels + 1;
      parserState.cod = { numResolutions, mct };
    } else if (marker === 0xff5c /* QCD */) {
      const sqcd = bytes[segStart] ?? 0;
      parserState.qcdGuardBits = sqcd >>> 5;
    }

    parserState.pos = segEnd;
  }

  if (!parserState.siz) {throw new Error("J2K: missing SIZ");}
  if (!parserState.cod) {throw new Error("J2K: missing COD");}

  return {
    width: parserState.siz.width,
    height: parserState.siz.height,
    components: parserState.siz.components,
    bitDepth: parserState.siz.bitDepth,
    isSigned: parserState.siz.isSigned,
    guardBits: parserState.qcdGuardBits,
    numResolutions: parserState.cod.numResolutions,
    mct: parserState.cod.mct,
  };
}

function extractSingleTilePart(bytes: Uint8Array): Uint8Array {
  // Find first SOT.
  const parserState = { pos: 2 };
  while (parserState.pos + 2 <= bytes.length) {
    const marker = readMarker(bytes, parserState.pos);
    parserState.pos += 2;
    if (marker === 0xff90 /* SOT */) {break;}
    if (marker === 0xffd9 /* EOC */) {throw new Error("J2K: missing SOT");}
    if (parserState.pos + 2 > bytes.length) {throw new Error("J2K: truncated");}
    const length = readU16BE(bytes, parserState.pos);
    parserState.pos += 2 + (length - 2);
  }
  if (parserState.pos + 10 > bytes.length) {throw new Error("J2K: truncated SOT");}

  const lsot = readU16BE(bytes, parserState.pos);
  if (lsot !== 10) {throw new Error(`J2K: unsupported Lsot=${lsot}`);}
  const sotPos = parserState.pos - 2;
  const psot = readU32BE(bytes, parserState.pos + 4);
  const tpsot = bytes[parserState.pos + 8] ?? 0;
  const tnsot = bytes[parserState.pos + 9] ?? 0;
  if (tpsot !== 0 || tnsot !== 1) {
    throw new Error("J2K: only single tile-part supported");
  }

  const tilePartEnd = sotPos + psot;
  if (tilePartEnd > bytes.length) {throw new Error("J2K: truncated tile-part");}

  // Seek to SOD.
  parserState.pos += 10;
  const sod = readMarker(bytes, parserState.pos);
  if (sod !== 0xff93) {throw new Error("J2K: missing SOD");}
  parserState.pos += 2;
  return bytes.slice(parserState.pos, tilePartEnd);
}
