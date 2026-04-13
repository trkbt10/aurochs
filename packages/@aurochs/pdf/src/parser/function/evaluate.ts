/**
 * @file PDF Function evaluation (ISO 32000-1 §7.10).
 *
 * Pure functions that evaluate {@link PdfFunction} domain objects
 * produced by the parser in `./parse.ts`.
 *
 * Public API:
 *  - {@link evaluatePdfFunction}      — unified dispatcher
 *  - {@link evaluatePdfFunctionType0} — FunctionType 0 (sampled)
 *  - {@link evaluatePdfFunctionType2} — FunctionType 2 (exponential)
 */

import type { PdfFunction, PdfFunctionType0, PdfFunctionType2 } from "./types";

// =============================================================================
// FunctionType 2 — Exponential interpolation
// =============================================================================

/**
 * Evaluate a FunctionType 2 (exponential interpolation) function.
 *
 *   f(x) = C0 + x^N × (C1 − C0)
 *
 * @param fn              Parsed Type 2 function.
 * @param t               Input value (should be within the function's domain).
 * @param componentCount  Number of output components to produce.
 */
export function evaluatePdfFunctionType2(fn: PdfFunctionType2, t: number, componentCount: number): readonly number[] {
  const tt = Math.pow(t, fn.n);
  const out: number[] = [];
  for (let i = 0; i < componentCount; i += 1) {
    const c0 = fn.c0[i] ?? 0;
    const c1 = fn.c1[i] ?? 0;
    out.push(c0 + tt * (c1 - c0));
  }
  return out;
}

// =============================================================================
// FunctionType 0 — Sampled interpolation
// =============================================================================

/**
 * Read a single sample value of `bitsPerSample` bits from the sample data
 * at the given bit offset.
 */
function readSampleValue(samples: Uint8Array, bitOffset: number, bitsPerSample: number): number {
  if (bitsPerSample === 8) {
    return samples[bitOffset >>> 3] ?? 0;
  }
  if (bitsPerSample === 16) {
    const byteOffset = bitOffset >>> 3;
    return ((samples[byteOffset] ?? 0) << 8) | (samples[byteOffset + 1] ?? 0);
  }
  if (bitsPerSample === 32) {
    const byteOffset = bitOffset >>> 3;
    return (
      ((samples[byteOffset] ?? 0) << 24) |
      ((samples[byteOffset + 1] ?? 0) << 16) |
      ((samples[byteOffset + 2] ?? 0) << 8) |
      (samples[byteOffset + 3] ?? 0)
    ) >>> 0;
  }
  if (bitsPerSample === 24) {
    const byteOffset = bitOffset >>> 3;
    return (
      ((samples[byteOffset] ?? 0) << 16) |
      ((samples[byteOffset + 1] ?? 0) << 8) |
      (samples[byteOffset + 2] ?? 0)
    );
  }
  if (bitsPerSample === 12) {
    const byteOffset = bitOffset >>> 3;
    const bitInByte = bitOffset & 7;
    if (bitInByte === 0) {
      return ((samples[byteOffset] ?? 0) << 4) | ((samples[byteOffset + 1] ?? 0) >>> 4);
    }
    return (((samples[byteOffset] ?? 0) & 0x0f) << 8) | (samples[byteOffset + 1] ?? 0);
  }
  if (bitsPerSample === 4) {
    const byteOffset = bitOffset >>> 3;
    const bitInByte = bitOffset & 7;
    return bitInByte === 0 ? ((samples[byteOffset] ?? 0) >>> 4) : ((samples[byteOffset] ?? 0) & 0x0f);
  }
  if (bitsPerSample === 2) {
    const byteOffset = bitOffset >>> 3;
    const bitInByte = bitOffset & 7;
    return ((samples[byteOffset] ?? 0) >>> (6 - bitInByte)) & 0x03;
  }
  if (bitsPerSample === 1) {
    const byteOffset = bitOffset >>> 3;
    const bitInByte = bitOffset & 7;
    return ((samples[byteOffset] ?? 0) >>> (7 - bitInByte)) & 0x01;
  }
  return 0;
}

/**
 * Evaluate a FunctionType 0 (sampled) function.
 *
 * ISO 32000-1 §7.10.2 — evaluation steps per input dimension:
 * 1. Clip input x_i to Domain
 * 2. Encode to grid index range
 * 3. Clip encoded value to [0, Size[i]−1]
 * 4. Multi-linear interpolation across 2^m surrounding sample points
 * 5. Decode interpolated value to output range
 * 6. Clip to Range
 *
 * @param fn      Parsed Type 0 function.
 * @param inputs  Input values (length should equal fn.m).
 */
export function evaluatePdfFunctionType0(fn: PdfFunctionType0, inputs: readonly number[]): readonly number[] {
  const { m, n, domain, range, size, bitsPerSample, encode, decode, samples } = fn;
  const maxSampleValue = (1 << Math.min(bitsPerSample, 24)) - 1;

  // Step 1-3: For each input dimension, compute encoded index and fraction.
  const indices0: number[] = []; // lower grid index per dimension
  const fractions: number[] = []; // interpolation fraction per dimension

  for (let i = 0; i < m; i += 1) {
    const dMin = domain[i * 2] ?? 0;
    const dMax = domain[i * 2 + 1] ?? 1;
    // Clip input to domain
    const x = Math.min(dMax, Math.max(dMin, inputs[i] ?? 0));

    // Encode: map domain to grid index range
    const eMin = encode[i * 2] ?? 0;
    const eMax = encode[i * 2 + 1] ?? ((size[i] ?? 1) - 1);
    const sizeI = size[i] ?? 1;

    // Linear interpolation: domain → encode range, then clip to valid sample index range
    const e = Math.min(
      sizeI - 1,
      Math.max(0, dMax === dMin ? eMin : eMin + ((x - dMin) / (dMax - dMin)) * (eMax - eMin)),
    );

    const e0 = Math.min(sizeI - 2, Math.max(0, Math.floor(e)));
    const frac = e - e0;
    indices0.push(e0);
    fractions.push(frac);
  }

  // Step 4-5: Multi-linear interpolation across 2^m corners.
  // Samples are in row-major order: last dimension varies fastest.
  const strides: number[] = new Array(m);
  {
    // eslint-disable-next-line no-restricted-syntax -- mutable stride accumulator: computes row-major strides in reverse dimension order
    let stride = n;
    for (let i = m - 1; i >= 0; i -= 1) {
      strides[i] = stride;
      stride *= size[i] ?? 1;
    }
  }

  const cornerCount = 1 << m;
  const result: number[] = new Array(n);

  for (let j = 0; j < n; j += 1) {
    // eslint-disable-next-line no-restricted-syntax -- mutable accumulator: multi-linear interpolation across 2^m corners
    let interpolated = 0;
    for (let corner = 0; corner < cornerCount; corner += 1) {
      // eslint-disable-next-line no-restricted-syntax -- mutable accumulator: accumulates sample array index across dimensions
      let sampleIndex = 0;
      // eslint-disable-next-line no-restricted-syntax -- mutable accumulator: accumulates interpolation weight across dimensions
      let weight = 1;
      for (let i = 0; i < m; i += 1) {
        const bit = (corner >>> (m - 1 - i)) & 1;
        const idx = indices0[i]! + bit;
        sampleIndex += idx * strides[i]!;
        weight *= bit === 1 ? fractions[i]! : (1 - fractions[i]!);
      }

      const bitOffset = (sampleIndex + j) * bitsPerSample;
      const rawSample = readSampleValue(samples, bitOffset, bitsPerSample);
      interpolated += weight * rawSample;
    }

    // Step 6: Decode
    const decMin = decode[j * 2] ?? 0;
    const decMax = decode[j * 2 + 1] ?? 1;
    const y = maxSampleValue === 0 ? decMin : decMin + (interpolated / maxSampleValue) * (decMax - decMin);

    // Step 7: Clip to Range
    const rMin = range[j * 2] ?? 0;
    const rMax = range[j * 2 + 1] ?? 1;
    result[j] = Math.min(rMax, Math.max(rMin, y));
  }

  return result;
}

// =============================================================================
// Unified dispatcher
// =============================================================================

/**
 * Evaluate a PDF Function with a single scalar input.
 *
 * This is the primary entry point for color resolution (Separation/DeviceN
 * tint transforms) and shading rasterization.
 *
 * @param fn              Parsed function (any supported type).
 * @param t               Scalar input value.
 * @param componentCount  Expected number of output components (used by Type 2
 *                        which doesn't carry output-count metadata; Type 0
 *                        determines output count from its own `n` field).
 */
export function evaluatePdfFunction(fn: PdfFunction, t: number, componentCount: number): readonly number[] {
  if (fn.type === "FunctionType2") {
    return evaluatePdfFunctionType2(fn, t, componentCount);
  }
  if (fn.type === "FunctionType0") {
    return evaluatePdfFunctionType0(fn, [t]);
  }
  // Exhaustive — future function types will cause a compile error here
  // if the PdfFunction union is extended without updating this function.
  const _exhaustive: never = fn;
  return new Array(componentCount).fill(0) as readonly number[];
}
