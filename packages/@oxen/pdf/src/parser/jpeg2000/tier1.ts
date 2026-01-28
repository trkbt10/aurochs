/**
 * @file src/pdf/parser/jpeg2000/tier1.ts
 *
 * Minimal Tier-1 (EBCOT) decoder for a single subband, MQ-coded.
 *
 * Currently supports:
 * - single codeblock covering the whole image/tile-component
 * - orientation = 0 (LL)
 * - no VSC / codeblock style switches
 */

import { LUT_CTXNO_SC, LUT_CTXNO_ZC, LUT_SPB } from "./t1-luts";
import type { MqDecoder } from "./mq-decoder";

const T1_CTXNO_ZC = 0;
const T1_CTXNO_MAG = 14;
const T1_CTXNO_AGG = 17;
const T1_CTXNO_UNI = 18;
const T1_NUMCTXS = 19;

const TIER1_MQ_INIT_STATE: Readonly<Uint8Array> = new Uint8Array([
  // ZC contexts (0..8)
  4, 0, 0, 0, 0, 0, 0, 0, 0,
  // SC contexts (9..13)
  0, 0, 0, 0, 0,
  // MAG contexts (14..16)
  0, 0, 0,
  // AGG (17)
  0,
  // UNI (18): uniform distribution
  46,
]);

const TIER1_MQ_INIT_MPS: Readonly<Uint8Array> = new Uint8Array([
  // All Tier-1 contexts start with MPS=0.
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0,
  0,
  0,
]);

function initTier1MqContexts(mq: MqDecoder): void {
  mq.resetContexts(0, 0);
  if (TIER1_MQ_INIT_STATE.length !== T1_NUMCTXS || TIER1_MQ_INIT_MPS.length !== T1_NUMCTXS) {
    throw new Error("Tier1: MQ init tables size mismatch");
  }
  for (let ctx = 0; ctx < T1_NUMCTXS; ctx += 1) {
    mq.setContext(ctx, TIER1_MQ_INIT_STATE[ctx] ?? 0, ((TIER1_MQ_INIT_MPS[ctx] ?? 0) & 1) as 0 | 1);
  }
}

export type Tier1DecodeParams = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly numPasses: number;
  readonly startBitplane: number;
}>;

export type Tier1DecodedBlock = Readonly<{
  /** Signed decoded coefficient values, scaled by 2 (fixed-point with 1 fractional bit). */
  readonly data: Int32Array;
  readonly sign: Uint8Array;
  readonly significant: Uint8Array;
}>;

function idxOf(x: number, y: number, width: number): number {
  return y * width + x;
}

function hasSig(significant: Uint8Array, x: number, y: number, width: number, height: number): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {return false;}
  return (significant[idxOf(x, y, width)] ?? 0) !== 0;
}

function signNeg(significant: Uint8Array, sign: Uint8Array, x: number, y: number, width: number, height: number): boolean {
  if (!hasSig(significant, x, y, width, height)) {return false;}
  return (sign[idxOf(x, y, width)] ?? 0) !== 0;
}

function zcContext0(significant: Uint8Array, x: number, y: number, width: number, height: number): number {
  // LUT index uses 9-bit neighborhood (NW..SE with THIS at bit4 = 0), plus orientation offset (0 for LL).
  const sigNW = hasSig(significant, x - 1, y - 1, width, height) ? 1 : 0;
  const sigN = hasSig(significant, x, y - 1, width, height) ? 1 : 0;
  const sigNE = hasSig(significant, x + 1, y - 1, width, height) ? 1 : 0;
  const sigW = hasSig(significant, x - 1, y, width, height) ? 1 : 0;
  const sigE = hasSig(significant, x + 1, y, width, height) ? 1 : 0;
  const sigSW = hasSig(significant, x - 1, y + 1, width, height) ? 1 : 0;
  const sigS = hasSig(significant, x, y + 1, width, height) ? 1 : 0;
  const sigSE = hasSig(significant, x + 1, y + 1, width, height) ? 1 : 0;

  const pattern =
    (sigNW << 0) |
    (sigN << 1) |
    (sigNE << 2) |
    (sigW << 3) |
    // bit4 is "THIS" (always 0 here)
    (sigE << 5) |
    (sigSW << 6) |
    (sigS << 7) |
    (sigSE << 8);

  const ctx = LUT_CTXNO_ZC[pattern] ?? 0;
  return T1_CTXNO_ZC + ctx;
}

function hasAnySigNeighbor(significant: Uint8Array, x: number, y: number, width: number, height: number): boolean {
  return (
    hasSig(significant, x - 1, y - 1, width, height) ||
    hasSig(significant, x, y - 1, width, height) ||
    hasSig(significant, x + 1, y - 1, width, height) ||
    hasSig(significant, x - 1, y, width, height) ||
    hasSig(significant, x + 1, y, width, height) ||
    hasSig(significant, x - 1, y + 1, width, height) ||
    hasSig(significant, x, y + 1, width, height) ||
    hasSig(significant, x + 1, y + 1, width, height)
  );
}

function magContext(hasSigNeighbor0: boolean, refinedBefore: boolean): number {
  if (!hasSigNeighbor0) {return T1_CTXNO_MAG;}
  return T1_CTXNO_MAG + (refinedBefore ? 2 : 1);
}

function scIndex(significant: Uint8Array, sign: Uint8Array, x: number, y: number, width: number, height: number): number {
  // Bits follow T1_LUT_* from ISO/IEC 15444-1 (OpenJPEG naming):
  // 0: SGN_W, 1: SIG_N, 2: SGN_E, 3: SIG_W, 4: SGN_N, 5: SIG_E, 6: SGN_S, 7: SIG_S
  let idx = 0;

  const sigW = hasSig(significant, x - 1, y, width, height);
  if (sigW) {
    idx |= 1 << 3;
    if (signNeg(significant, sign, x - 1, y, width, height)) {idx |= 1 << 0;}
  }

  const sigN = hasSig(significant, x, y - 1, width, height);
  if (sigN) {
    idx |= 1 << 1;
    if (signNeg(significant, sign, x, y - 1, width, height)) {idx |= 1 << 4;}
  }

  const sigE = hasSig(significant, x + 1, y, width, height);
  if (sigE) {
    idx |= 1 << 5;
    if (signNeg(significant, sign, x + 1, y, width, height)) {idx |= 1 << 2;}
  }

  const sigS = hasSig(significant, x, y + 1, width, height);
  if (sigS) {
    idx |= 1 << 7;
    if (signNeg(significant, sign, x, y + 1, width, height)) {idx |= 1 << 6;}
  }

  return idx >>> 0;
}






export function tier1DecodeLlCodeblock(mq: MqDecoder, params: Tier1DecodeParams): Tier1DecodedBlock {
  if (!mq) {throw new Error("mq is required");}
  if (!params) {throw new Error("params is required");}
  const { width, height } = params;
  if (!Number.isFinite(width) || width <= 0) {throw new Error(`width must be > 0 (got ${width})`);}
  if (!Number.isFinite(height) || height <= 0) {throw new Error(`height must be > 0 (got ${height})`);}
  if (!Number.isFinite(params.numPasses) || params.numPasses <= 0) {
    throw new Error(`numPasses must be > 0 (got ${params.numPasses})`);
  }
  if (!Number.isFinite(params.startBitplane) || params.startBitplane < 0) {
    throw new Error(`startBitplane must be >= 0 (got ${params.startBitplane})`);
  }

  initTier1MqContexts(mq);

  const sampleCount = width * height;
  const significant = new Uint8Array(sampleCount);
  const sign = new Uint8Array(sampleCount);
  const data = new Int32Array(sampleCount);
  const pi = new Uint8Array(sampleCount);
  const refined = new Uint8Array(sampleCount);

  // MSB bitplane: cleanup pass only.
  let pass = 0;
  let bp = params.startBitplane;
  decodeCleanupPass(mq, width, height, bp, significant, sign, data, pi);
  pass += 1;
  bp -= 1;

  while (pass < params.numPasses) {
    if (bp < 0) {throw new Error("Tier1: ran out of bitplanes");}
    pi.fill(0);
    decodeSigPropPass(mq, width, height, bp, significant, sign, data, pi);
    pass += 1;
    if (pass >= params.numPasses) {break;}

    decodeMagRefPass(mq, width, height, bp, significant, data, pi, refined);
    pass += 1;
    if (pass >= params.numPasses) {break;}

    decodeCleanupPass(mq, width, height, bp, significant, sign, data, pi);
    pass += 1;
    bp -= 1;
  }

  return { data, sign, significant };
}

function decodeSigPropPass(
  mq: MqDecoder,
  width: number,
  height: number,
  bp: number,
  significant: Uint8Array,
  sign: Uint8Array,
  data: Int32Array,
  pi: Uint8Array,
): void {
  const poshalf = 1 << bp;
  const oneplushalf = (poshalf << 1) + poshalf;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = idxOf(x, y, width);
      if ((significant[idx] ?? 0) !== 0) {continue;}
      if ((pi[idx] ?? 0) !== 0) {continue;}
      if (!hasAnySigNeighbor(significant, x, y, width, height)) {continue;}

      const ctx1 = zcContext0(significant, x, y, width, height);
      const v = mq.decodeBit(ctx1);
      if (v) {
        const lu = scIndex(significant, sign, x, y, width, height);
        const ctx2 = LUT_CTXNO_SC[lu] ?? 9;
        const spb = LUT_SPB[lu] ?? 0;
        const s = mq.decodeBit(ctx2) ^ (spb & 1);
        significant[idx] = 1;
        sign[idx] = s & 1;
        data[idx] = s ? -oneplushalf : oneplushalf;
      }
      pi[idx] = 1;
    }
  }
}

function decodeMagRefPass(
  mq: MqDecoder,
  width: number,
  height: number,
  bp: number,
  significant: Uint8Array,
  data: Int32Array,
  pi: Uint8Array,
  refined: Uint8Array,
): void {
  const poshalf = 1 << bp;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = idxOf(x, y, width);
      if ((significant[idx] ?? 0) === 0) {continue;}
      if ((pi[idx] ?? 0) !== 0) {continue;}

      const neigh = hasAnySigNeighbor(significant, x, y, width, height);
      const ctx = magContext(neigh, (refined[idx] ?? 0) !== 0);
      const v = mq.decodeBit(ctx);
      const d = data[idx] ?? 0;
      data[idx] = (v ^ (d < 0 ? 1 : 0)) ? d + poshalf : d - poshalf;
      refined[idx] = 1;
    }
  }
}

function decodeCleanupPass(
  mq: MqDecoder,
  width: number,
  height: number,
  bp: number,
  significant: Uint8Array,
  sign: Uint8Array,
  data: Int32Array,
  pi: Uint8Array,
): void {
  const poshalf = 1 << bp;
  const oneplushalf = (poshalf << 1) + poshalf;
  for (let stripeY = 0; stripeY < height; stripeY += 4) {
    for (let x = 0; x < width; x += 1) {
      // Try run-length coding when we have 4 full rows.
      if (stripeY + 3 < height && canUseRlc(significant, pi, width, height, x, stripeY)) {
        const agg = mq.decodeBit(T1_CTXNO_AGG);
        if (agg === 0) {continue;}
        const r1 = mq.decodeBit(T1_CTXNO_UNI);
        const r2 = mq.decodeBit(T1_CTXNO_UNI);
        const run = ((r1 << 1) | r2) >>> 0;
        if (run > 3) {throw new Error(`Tier1: invalid run=${run}`);}

        for (let dy = 0; dy < 4; dy += 1) {
          const y = stripeY + dy;
          const idx = idxOf(x, y, width);
          if (dy < run) {continue;}
          if ((significant[idx] ?? 0) !== 0 || (pi[idx] ?? 0) !== 0) {continue;}
          if (dy === run) {
            const lu = scIndex(significant, sign, x, y, width, height);
            const ctx2 = LUT_CTXNO_SC[lu] ?? 9;
            const spb = LUT_SPB[lu] ?? 0;
            const s = mq.decodeBit(ctx2) ^ (spb & 1);
            significant[idx] = 1;
            sign[idx] = s & 1;
            data[idx] = s ? -oneplushalf : oneplushalf;
            continue;
          }
          // After the first significant sample, decode remaining normally.
          const ctx1 = zcContext0(significant, x, y, width, height);
          const v = mq.decodeBit(ctx1);
          if (!v) {continue;}
          const lu = scIndex(significant, sign, x, y, width, height);
          const ctx2 = LUT_CTXNO_SC[lu] ?? 9;
          const spb = LUT_SPB[lu] ?? 0;
          const s = mq.decodeBit(ctx2) ^ (spb & 1);
          significant[idx] = 1;
          sign[idx] = s & 1;
          data[idx] = s ? -oneplushalf : oneplushalf;
        }
        continue;
      }

      // Non-RLC path: decode each coefficient in the stripe.
      for (let dy = 0; dy < 4; dy += 1) {
        const y = stripeY + dy;
        if (y >= height) {break;}
        const idx = idxOf(x, y, width);
        if ((significant[idx] ?? 0) !== 0) {continue;}
        if ((pi[idx] ?? 0) !== 0) {continue;}

        const ctx1 = zcContext0(significant, x, y, width, height);
        const v = mq.decodeBit(ctx1);
        if (!v) {continue;}
        const lu = scIndex(significant, sign, x, y, width, height);
        const ctx2 = LUT_CTXNO_SC[lu] ?? 9;
        const spb = LUT_SPB[lu] ?? 0;
        const s = mq.decodeBit(ctx2) ^ (spb & 1);
        significant[idx] = 1;
        sign[idx] = s & 1;
        data[idx] = s ? -oneplushalf : oneplushalf;
      }
    }
  }
}

function canUseRlc(
  significant: Uint8Array,
  pi: Uint8Array,
  width: number,
  height: number,
  x: number,
  stripeY: number,
): boolean {
  for (let dy = 0; dy < 4; dy += 1) {
    const y = stripeY + dy;
    const idx = idxOf(x, y, width);
    if ((significant[idx] ?? 0) !== 0) {return false;}
    if ((pi[idx] ?? 0) !== 0) {return false;}
    if (hasAnySigNeighbor(significant, x, y, width, height)) {return false;}
  }
  return true;
}

export const TIER1_NUM_CONTEXTS = T1_NUMCTXS;
