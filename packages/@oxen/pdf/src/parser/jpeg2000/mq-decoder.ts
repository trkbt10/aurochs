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






export class MqDecoder {
  private readonly data: Uint8Array;
  private bp: number;
  private a: number;
  private c: number;
  private ct: number;

  private readonly ctxState: Uint8Array;
  private readonly ctxMps: Uint8Array;

  constructor(encoded: Uint8Array, options: Readonly<{ readonly numContexts: number }>) {
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
    this.data = padded;

    this.bp = 0;
    this.a = 0x8000;
    this.c = ((this.data[0] ?? 0) << 16) >>> 0;
    this.ct = 0;
    this.byteIn();
    this.c = (this.c << 7) >>> 0;
    this.ct -= 7;

    this.ctxState = new Uint8Array(options.numContexts);
    this.ctxMps = new Uint8Array(options.numContexts);
  }

  resetContexts(stateIndex: number = 0, mps: 0 | 1 = 0): void {
    if (!Number.isFinite(stateIndex) || stateIndex < 0 || stateIndex >= MQ_QE.length) {
      throw new Error(`Invalid MQ stateIndex=${stateIndex}`);
    }
    this.ctxState.fill(stateIndex);
    this.ctxMps.fill(mps);
  }

  setContext(ctx: number, stateIndex: number, mps: 0 | 1): void {
    if (!Number.isFinite(ctx) || ctx < 0 || ctx >= this.ctxState.length) {
      throw new Error(`Invalid MQ context=${ctx}`);
    }
    if (!Number.isFinite(stateIndex) || stateIndex < 0 || stateIndex >= MQ_QE.length) {
      throw new Error(`Invalid MQ stateIndex=${stateIndex}`);
    }
    this.ctxState[ctx] = stateIndex;
    this.ctxMps[ctx] = mps;
  }

  decodeBit(ctx: number): 0 | 1 {
    const state = this.ctxState[ctx] ?? 0;
    const qeval = MQ_QE[state] ?? 0;
    const mps = (this.ctxMps[ctx] ?? 0) & 1;

    let a = this.a - qeval;
    let c = this.c;
    let ct = this.ct;

    let d: number;
    let nextState = state;
    let nextMps = mps;

    if ((c >>> 16) < qeval) {
      // LPS exchange
      if (a < qeval) {
        a = qeval;
        d = mps;
        nextState = MQ_NMPS[state] ?? state;
      } else {
        a = qeval;
        d = 1 - mps;
        if (MQ_SWITCH[state]) {nextMps = 1 - mps;}
        nextState = MQ_NLPS[state] ?? state;
      }
      ({ a, c, ct } = this.renorm(a, c, ct));
    } else {
      c = (c - ((qeval << 16) >>> 0)) >>> 0;
      if ((a & 0x8000) === 0) {
        // MPS exchange
        if (a < qeval) {
          d = 1 - mps;
          if (MQ_SWITCH[state]) {nextMps = 1 - mps;}
          nextState = MQ_NLPS[state] ?? state;
        } else {
          d = mps;
          nextState = MQ_NMPS[state] ?? state;
        }
        ({ a, c, ct } = this.renorm(a, c, ct));
      } else {
        d = mps;
      }
    }

    this.a = a;
    this.c = c;
    this.ct = ct;
    this.ctxState[ctx] = nextState;
    this.ctxMps[ctx] = nextMps;
    return (d & 1) as 0 | 1;
  }

  private renorm(a0: number, c0: number, ct0: number): { a: number; c: number; ct: number } {
    let a = a0 >>> 0;
    let c = c0 >>> 0;
    let ct = ct0;
    while (a < 0x8000) {
      if (ct === 0) {
        this.c = c;
        this.ct = ct;
        this.byteIn();
        c = this.c;
        ct = this.ct;
      }
      a = (a << 1) & 0xffff;
      c = (c << 1) >>> 0;
      ct -= 1;
    }
    return { a, c, ct };
  }

  private byteIn(): void {
    const l_c = this.data[this.bp + 1] ?? 0;
    const cur = this.data[this.bp] ?? 0;
    if (cur === 0xff) {
      if (l_c > 0x8f) {
        this.c = (this.c + 0xff00) >>> 0;
        this.ct = 8;
      } else {
        this.bp += 1;
        this.c = (this.c + (l_c << 9)) >>> 0;
        this.ct = 7;
      }
      return;
    }
    this.bp += 1;
    this.c = (this.c + (l_c << 8)) >>> 0;
    this.ct = 8;
  }
}
