/**
 * @file Tests for parser.ts
 *
 * Tests the chunk-level parser via createSyncReader.
 */

import { createParser, type PngMetadata } from "./parser";
import { createSyncReader } from "./sync-reader";
import { pack } from "./packer";

function parseChunks(png: Uint8Array): {
  metadata: PngMetadata | undefined;
  errors: Error[];
  gamma: number | undefined;
  inflateDataChunks: Uint8Array[];
  paletteData: number[][] | undefined;
  headersFinishedCalled: boolean;
} {
  const state = {
    metadata: undefined as PngMetadata | undefined,
    errors: [] as Error[],
    gamma: undefined as number | undefined,
    inflateDataChunks: [] as Uint8Array[],
    paletteData: undefined as number[][] | undefined,
    headersFinishedCalled: false,
  };

  const reader = createSyncReader(png);
  const parser = createParser({}, {
    read: reader.read,
    error: (e) => state.errors.push(e),
    metadata: (m) => { state.metadata = m; },
    gamma: (g) => { state.gamma = g; },
    palette: (p) => { state.paletteData = p; },
    transColor: () => {},
    inflateData: (d) => { state.inflateDataChunks.push(d); },
    simpleTransparency: () => {},
    headersFinished: () => { state.headersFinishedCalled = true; },
  });

  parser.start();
  reader.process();

  return state;
}

describe("createParser", () => {
  describe("valid PNG", () => {
    it("extracts metadata from IHDR", () => {
      const png = pack({ width: 3, height: 5, data: new Uint8Array(3 * 5 * 4) });
      const result = parseChunks(png);
      expect(result.errors.length).toBe(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.width).toBe(3);
      expect(result.metadata!.height).toBe(5);
      expect(result.metadata!.depth).toBe(8);
      expect(result.metadata!.colorType).toBe(6);
      expect(result.metadata!.bpp).toBe(4);
    });

    it("receives IDAT data chunks", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const result = parseChunks(png);
      expect(result.inflateDataChunks.length).toBeGreaterThan(0);
    });

    it("calls headersFinished before IDAT", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const result = parseChunks(png);
      expect(result.headersFinishedCalled).toBe(true);
    });

    it("extracts gamma when present", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4), gamma: 2.2 });
      const result = parseChunks(png);
      expect(result.gamma).toBeCloseTo(2.2, 1);
    });

    it("gamma is undefined when not present", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const result = parseChunks(png);
      expect(result.gamma).toBeUndefined();
    });
  });

  describe("invalid input", () => {
    it("reports error for invalid signature", () => {
      const bad = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const reader = createSyncReader(bad);
      const errors: Error[] = [];
      const parser = createParser({}, {
        read: reader.read,
        error: (e) => errors.push(e),
        metadata: () => {},
        gamma: () => {},
        palette: () => {},
        transColor: () => {},
        inflateData: () => {},
        simpleTransparency: () => {},
      });
      parser.start();
      // process may throw because of trailing data after error
      try { reader.process(); } catch (e: unknown) { errors.push(e instanceof Error ? e : new Error(String(e))); }
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("Invalid file signature");
    });

    it("reports error when first chunk is not IHDR", () => {
      // Valid signature followed by non-IHDR chunk
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      // Corrupt: change IHDR type to IDAT
      const corrupted = new Uint8Array(png);
      corrupted[12] = 0x49; // I
      corrupted[13] = 0x44; // D
      corrupted[14] = 0x41; // A
      corrupted[15] = 0x54; // T
      const reader = createSyncReader(corrupted);
      const errors: Error[] = [];
      const parser = createParser({ checkCRC: false }, {
        read: reader.read,
        error: (e) => errors.push(e),
        metadata: () => {},
        gamma: () => {},
        palette: () => {},
        transColor: () => {},
        inflateData: () => {},
        simpleTransparency: () => {},
      });
      parser.start();
      try { reader.process(); } catch (e: unknown) { errors.push(e instanceof Error ? e : new Error(String(e))); }
      expect(errors.some((e) => e.message.includes("Expected IHDR"))).toBe(true);
    });
  });

  describe("CRC checking", () => {
    it("reports CRC error for corrupted chunk data", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) });
      const corrupted = new Uint8Array(png);
      // Corrupt a byte in IHDR data (offset 16 = width first byte)
      corrupted[16] = corrupted[16] ^ 0xff;
      const reader = createSyncReader(corrupted);
      const errors: Error[] = [];
      const parser = createParser({ checkCRC: true }, {
        read: reader.read,
        error: (e) => errors.push(e),
        metadata: () => {},
        gamma: () => {},
        palette: () => {},
        transColor: () => {},
        inflateData: () => {},
        simpleTransparency: () => {},
      });
      parser.start();
      try { reader.process(); } catch (e: unknown) { errors.push(e instanceof Error ? e : new Error(String(e))); }
      expect(errors.some((e) => e.message.includes("Crc error"))).toBe(true);
    });

    it("skips CRC check when checkCRC: false", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const corrupted = new Uint8Array(png);
      // Corrupt CRC of IHDR (bytes at offset 29-32, after 8 sig + 4 len + 4 type + 13 data)
      corrupted[29] = 0;
      corrupted[30] = 0;
      corrupted[31] = 0;
      corrupted[32] = 0;
      const result = parseChunksWithOptions(corrupted, { checkCRC: false });
      expect(result.errors.length).toBe(0);
      expect(result.metadata).toBeDefined();
    });
  });
});

function parseChunksWithOptions(png: Uint8Array, opts: { checkCRC?: boolean }): {
  metadata: PngMetadata | undefined;
  errors: Error[];
} {
  const state = {
    metadata: undefined as PngMetadata | undefined,
    errors: [] as Error[],
  };

  const reader = createSyncReader(png);
  const parser = createParser(opts, {
    read: reader.read,
    error: (e) => state.errors.push(e),
    metadata: (m) => { state.metadata = m; },
    gamma: () => {},
    palette: () => {},
    transColor: () => {},
    inflateData: () => {},
    simpleTransparency: () => {},
  });

  parser.start();
  try { reader.process(); } catch (e: unknown) { state.errors.push(e instanceof Error ? e : new Error(String(e))); }

  return state;
}
