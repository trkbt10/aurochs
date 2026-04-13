/**
 * @file Tests for PDF Function evaluation (FunctionType 0 and 2).
 */

import { describe, expect, it } from "bun:test";
import { evaluatePdfFunctionType0, evaluatePdfFunction } from "./evaluate";
import type { PdfFunctionType0 } from "./types";

// =============================================================================
// evaluatePdfFunctionType0 — unit tests
// =============================================================================

describe("evaluatePdfFunctionType0", () => {
  /**
   * Helper: build a FunctionType0 with 1 input (m=1) and given output samples.
   *
   * Simulates a typical Separation tint transform:
   *   input: tint [0, 1]
   *   output: alternate color components (e.g., CMYK → 4 outputs)
   */
  function buildSampledFn(opts: {
    readonly sampleValues: readonly number[][];
    readonly n: number;
    readonly range?: readonly number[];
    readonly decode?: readonly number[];
  }): PdfFunctionType0 {
    const sampleCount = opts.sampleValues.length;
    const n = opts.n;

    // Build raw sample data (8-bit)
    const samples = new Uint8Array(sampleCount * n);
    for (let i = 0; i < sampleCount; i += 1) {
      for (let j = 0; j < n; j += 1) {
        samples[i * n + j] = Math.round((opts.sampleValues[i]![j] ?? 0) * 255);
      }
    }

    const range: number[] = opts.range
      ? [...opts.range]
      : Array.from({ length: n * 2 }, (_, i) => (i % 2 === 0 ? 0 : 1));
    const decode = opts.decode ?? [...range];

    return {
      type: "FunctionType0",
      m: 1,
      n,
      domain: [0, 1],
      range,
      size: [sampleCount],
      bitsPerSample: 8,
      encode: [0, sampleCount - 1],
      decode: [...decode],
      samples,
    };
  }

  it("should return first sample at t=0", () => {
    // Separation "Black" → CMYK: at tint=0 (no ink), expect [0,0,0,0]
    // at tint=1 (full ink), expect [0,0,0,1]
    const fn = buildSampledFn({
      sampleValues: [
        [0, 0, 0, 0], // tint=0: no ink
        [0, 0, 0, 1], // tint=1: full black
      ],
      n: 4,
    });

    const result = evaluatePdfFunctionType0(fn, [0]);
    expect(result.length).toBe(4);
    expect(result[0]).toBeCloseTo(0, 1);
    expect(result[1]).toBeCloseTo(0, 1);
    expect(result[2]).toBeCloseTo(0, 1);
    expect(result[3]).toBeCloseTo(0, 1);
  });

  it("should return last sample at t=1", () => {
    const fn = buildSampledFn({
      sampleValues: [
        [0, 0, 0, 0],
        [0, 0, 0, 1],
      ],
      n: 4,
    });

    const result = evaluatePdfFunctionType0(fn, [1]);
    expect(result.length).toBe(4);
    expect(result[0]).toBeCloseTo(0, 1);
    expect(result[1]).toBeCloseTo(0, 1);
    expect(result[2]).toBeCloseTo(0, 1);
    expect(result[3]).toBeCloseTo(1, 1);
  });

  it("should interpolate between samples at t=0.5", () => {
    const fn = buildSampledFn({
      sampleValues: [
        [0, 0, 0, 0],
        [0, 0, 0, 1],
      ],
      n: 4,
    });

    const result = evaluatePdfFunctionType0(fn, [0.5]);
    expect(result.length).toBe(4);
    expect(result[3]).toBeCloseTo(0.5, 1);
  });

  it("should handle multi-sample lookup (255 samples)", () => {
    // Typical real-world case: 255 samples for smooth tint curve
    const sampleCount = 255;
    const sampleValues: number[][] = [];
    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / (sampleCount - 1);
      // Simulate DIC spot color: C=0.8*t, M=0.2*t, Y=0.1*t, K=0.05*t
      sampleValues.push([0.8 * t, 0.2 * t, 0.1 * t, 0.05 * t]);
    }

    const fn = buildSampledFn({ sampleValues, n: 4 });

    // At t=1: expect full values
    const full = evaluatePdfFunctionType0(fn, [1]);
    expect(full[0]).toBeCloseTo(0.8, 1);
    expect(full[1]).toBeCloseTo(0.2, 1);
    expect(full[2]).toBeCloseTo(0.1, 1);
    expect(full[3]).toBeCloseTo(0.05, 1);

    // At t=0: expect zeros
    const zero = evaluatePdfFunctionType0(fn, [0]);
    expect(zero[0]).toBeCloseTo(0, 1);
    expect(zero[3]).toBeCloseTo(0, 1);
  });

  it("should handle single-output function (grayscale)", () => {
    const fn = buildSampledFn({
      sampleValues: [[0], [1]],
      n: 1,
    });

    expect(evaluatePdfFunctionType0(fn, [0])[0]).toBeCloseTo(0, 1);
    expect(evaluatePdfFunctionType0(fn, [1])[0]).toBeCloseTo(1, 1);
    expect(evaluatePdfFunctionType0(fn, [0.5])[0]).toBeCloseTo(0.5, 1);
  });

  it("should clamp input to domain", () => {
    const fn = buildSampledFn({
      sampleValues: [[0], [1]],
      n: 1,
    });

    // Input below domain should clamp to domain min
    expect(evaluatePdfFunctionType0(fn, [-0.5])[0]).toBeCloseTo(0, 1);
    // Input above domain should clamp to domain max
    expect(evaluatePdfFunctionType0(fn, [1.5])[0]).toBeCloseTo(1, 1);
  });

  it("should clamp output to range", () => {
    // Build a function where decode would produce values outside range
    const fn: PdfFunctionType0 = {
      type: "FunctionType0",
      m: 1,
      n: 1,
      domain: [0, 1],
      range: [0, 0.5], // clamp output to [0, 0.5]
      size: [2],
      bitsPerSample: 8,
      encode: [0, 1],
      decode: [0, 1], // decode range extends beyond output range
      samples: new Uint8Array([0, 255]),
    };

    const result = evaluatePdfFunctionType0(fn, [1]);
    expect(result[0]).toBe(0.5); // clamped to range max
  });

  it("should handle 16-bit samples", () => {
    // 16-bit: big-endian, two bytes per sample
    const fn: PdfFunctionType0 = {
      type: "FunctionType0",
      m: 1,
      n: 1,
      domain: [0, 1],
      range: [0, 1],
      size: [2],
      bitsPerSample: 16,
      encode: [0, 1],
      decode: [0, 1],
      samples: new Uint8Array([
        0x00, 0x00, // sample 0: 0
        0xFF, 0xFF, // sample 1: 65535
      ]),
    };

    expect(evaluatePdfFunctionType0(fn, [0])[0]).toBeCloseTo(0, 2);
    expect(evaluatePdfFunctionType0(fn, [1])[0]).toBeCloseTo(1, 2);
  });
});

// =============================================================================
// evaluatePdfFunction — integration with FunctionType dispatch
// =============================================================================

describe("evaluatePdfFunction", () => {
  it("should dispatch to FunctionType0 for sampled functions", () => {
    const fn: PdfFunctionType0 = {
      type: "FunctionType0",
      m: 1,
      n: 4,
      domain: [0, 1],
      range: [0, 1, 0, 1, 0, 1, 0, 1],
      size: [2],
      bitsPerSample: 8,
      encode: [0, 1],
      decode: [0, 1, 0, 1, 0, 1, 0, 1],
      samples: new Uint8Array([
        0, 0, 0, 0,       // tint=0
        0, 0, 0, 255,     // tint=1: K=1
      ]),
    };

    const result = evaluatePdfFunction(fn, 1, 4);
    expect(result.length).toBe(4);
    expect(result[3]).toBeCloseTo(1, 1);
  });

  it("should dispatch to FunctionType2 for exponential functions", () => {
    const fn = {
      type: "FunctionType2" as const,
      c0: [0, 0, 0, 0],
      c1: [0, 0, 0, 1],
      n: 1,
    };

    const result = evaluatePdfFunction(fn, 1, 4);
    expect(result.length).toBe(4);
    expect(result[3]).toBeCloseTo(1, 5);
  });
});
