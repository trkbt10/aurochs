/**
 * @file src/pdf/parser/jpeg2000/mq-decoder.ts
 *
 * JPEG2000 MQ arithmetic decoder (ISO/IEC 15444-1).
 */

// MQ state machine (47 states) as defined by ISO/IEC 15444-1.
const MQ_QE: readonly number[] = [
  0x5601, 0x3401, 0x1801, 0x0ac1, 0x0521, 0x0221, 0x5601, 0x5401, 0x4801, 0x3801, 0x3001, 0x2401,
  0x1c01, 0x1601, 0x5601, 0x5401, 0x5101, 0x4801, 0x3801, 0x3401, 0x3001, 0x2801, 0x2401, 0x2201,
  0x1c01, 0x1801, 0x1601, 0x1401, 0x1201, 0x1101, 0x0ac1, 0x09c1, 0x08a1, 0x0521, 0x0441, 0x02a1,
  0x0221, 0x0141, 0x0111, 0x0085, 0x0049, 0x0025, 0x0015, 0x0009, 0x0005, 0x0001, 0x5601,
];

const MQ_NMPS: readonly number[] = [
  1, 2, 3, 4, 5, 38, 7, 8, 9, 10, 11, 12, 13, 29, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 45, 46,
];

const MQ_NLPS: readonly number[] = [
  1, 6, 9, 12, 29, 33, 6, 14, 14, 14, 17, 18, 20, 21, 14, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 46,
];

const MQ_SWITCH: readonly number[] = [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

/** MQ arithmetic decoder for JPEG 2000 entropy coding. */
export type MqDecoder = Readonly<{
  resetContexts(stateIndex?: number, mps?: 0 | 1): void;
  setContext(ctx: number, stateIndex: number, mps: 0 | 1): void;
  decodeBit(ctx: number): 0 | 1;
}>;

/**
 * Creates an MQ arithmetic decoder for JPEG 2000 entropy coding.
 *
 * The decoder implements the MQ coder state machine as defined in ISO/IEC 15444-1,
 * using 47 states for probability estimation.
 */
export function createMqDecoder(
  encoded: Uint8Array,
  options: Readonly<{ readonly numContexts: number }>,
): MqDecoder {
  if (!encoded) {throw new Error("encoded is required");}
  if (!options) {throw new Error("options is required");}
  if (!Number.isFinite(options.numContexts) || options.numContexts <= 0) {
    throw new Error(`options.numContexts must be > 0 (got ${options.numContexts})`);
  }

  // Add a small artificial marker at the end (matches common decoder implementations).
  const padded = new Uint8Array(encoded.length + 2);
  padded.set(encoded);
  padded[padded.length - 2] = 0xff;
  padded[padded.length - 1] = 0xff;
  const data = padded;

  // MQ decoder internal state: byte position (bp), interval (a), code register (c), bit count (ct)
  const mqState = {
    bp: 0,
    a: 0x8000,
    c: ((data[0] ?? 0) << 16) >>> 0,
    ct: 0,
  };

  const ctxState = new Uint8Array(options.numContexts);
  const ctxMps = new Uint8Array(options.numContexts);

  function byteIn(): void {
    const l_c = data[mqState.bp + 1] ?? 0;
    const cur = data[mqState.bp] ?? 0;
    if (cur === 0xff) {
      if (l_c > 0x8f) {
        mqState.c = (mqState.c + 0xff00) >>> 0;
        mqState.ct = 8;
      } else {
        mqState.bp += 1;
        mqState.c = (mqState.c + (l_c << 9)) >>> 0;
        mqState.ct = 7;
      }
      return;
    }
    mqState.bp += 1;
    mqState.c = (mqState.c + (l_c << 8)) >>> 0;
    mqState.ct = 8;
  }

  function renorm(a0: number, c0: number, ct0: number): { a: number; c: number; ct: number } {
    // Renormalization state for MQ decoder interval and code register
    const renormState = { aVal: a0 >>> 0, cVal: c0 >>> 0, ctVal: ct0 };
    while (renormState.aVal < 0x8000) {
      if (renormState.ctVal === 0) {
        mqState.c = renormState.cVal;
        mqState.ct = renormState.ctVal;
        byteIn();
        renormState.cVal = mqState.c;
        renormState.ctVal = mqState.ct;
      }
      renormState.aVal = (renormState.aVal << 1) & 0xffff;
      renormState.cVal = (renormState.cVal << 1) >>> 0;
      renormState.ctVal -= 1;
    }
    return { a: renormState.aVal, c: renormState.cVal, ct: renormState.ctVal };
  }

  // Initialize
  byteIn();
  mqState.c = (mqState.c << 7) >>> 0;
  mqState.ct -= 7;

  function resetContexts(stateIndex: number = 0, mps: 0 | 1 = 0): void {
    if (!Number.isFinite(stateIndex) || stateIndex < 0 || stateIndex >= MQ_QE.length) {
      throw new Error(`Invalid MQ stateIndex=${stateIndex}`);
    }
    ctxState.fill(stateIndex);
    ctxMps.fill(mps);
  }

  function setContext(ctx: number, stateIndex: number, mps: 0 | 1): void {
    if (!Number.isFinite(ctx) || ctx < 0 || ctx >= ctxState.length) {
      throw new Error(`Invalid MQ context=${ctx}`);
    }
    if (!Number.isFinite(stateIndex) || stateIndex < 0 || stateIndex >= MQ_QE.length) {
      throw new Error(`Invalid MQ stateIndex=${stateIndex}`);
    }
    ctxState[ctx] = stateIndex;
    ctxMps[ctx] = mps;
  }

  function decodeBit(ctx: number): 0 | 1 {
    const state = ctxState[ctx] ?? 0;
    const qeval = MQ_QE[state] ?? 0;
    const mps = (ctxMps[ctx] ?? 0) & 1;

    // MQ decode state: interval (a), code register (c), bit count (ct), decoded bit (d), next state/mps
    const decodeState = {
      aVal: mqState.a - qeval,
      cVal: mqState.c,
      ctVal: mqState.ct,
      d: 0,
      nextState: state,
      nextMps: mps,
    };

    if ((decodeState.cVal >>> 16) < qeval) {
      // LPS exchange
      if (decodeState.aVal < qeval) {
        decodeState.aVal = qeval;
        decodeState.d = mps;
        decodeState.nextState = MQ_NMPS[state] ?? state;
      } else {
        decodeState.aVal = qeval;
        decodeState.d = 1 - mps;
        if (MQ_SWITCH[state]) {decodeState.nextMps = 1 - mps;}
        decodeState.nextState = MQ_NLPS[state] ?? state;
      }
      const renormed = renorm(decodeState.aVal, decodeState.cVal, decodeState.ctVal);
      decodeState.aVal = renormed.a;
      decodeState.cVal = renormed.c;
      decodeState.ctVal = renormed.ct;
    } else {
      decodeState.cVal = (decodeState.cVal - ((qeval << 16) >>> 0)) >>> 0;
      if ((decodeState.aVal & 0x8000) === 0) {
        // MPS exchange
        if (decodeState.aVal < qeval) {
          decodeState.d = 1 - mps;
          if (MQ_SWITCH[state]) {decodeState.nextMps = 1 - mps;}
          decodeState.nextState = MQ_NLPS[state] ?? state;
        } else {
          decodeState.d = mps;
          decodeState.nextState = MQ_NMPS[state] ?? state;
        }
        const renormed = renorm(decodeState.aVal, decodeState.cVal, decodeState.ctVal);
        decodeState.aVal = renormed.a;
        decodeState.cVal = renormed.c;
        decodeState.ctVal = renormed.ct;
      } else {
        decodeState.d = mps;
      }
    }

    mqState.a = decodeState.aVal;
    mqState.c = decodeState.cVal;
    mqState.ct = decodeState.ctVal;
    ctxState[ctx] = decodeState.nextState;
    ctxMps[ctx] = decodeState.nextMps;
    return (decodeState.d & 1) as 0 | 1;
  }

  return {
    resetContexts,
    setContext,
    decodeBit,
  };
}
