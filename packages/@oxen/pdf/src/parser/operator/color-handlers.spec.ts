/**
 * @file Tests for color operator handlers
 */

import { colorHandlers, COLOR_HANDLERS } from "./color-handlers";
import type { ParserContext, GraphicsStateOps } from "./types";
import { createInitialTextState } from "./text-handlers";
import { createDefaultGraphicsState, createGraphicsStateStack } from "../../domain";
import { createGfxOpsFromStack } from "./parse";
import { parseIccProfile } from "../color/icc-profile.native";
import type { ParsedNamedColorSpace } from "../color/color-space.native";

// Mock GraphicsStateOps for testing with tracking
function createMockGfxOps() {
  const calls: { method: string; args: unknown[] }[] = [];
  const state = createDefaultGraphicsState();

  return {
    calls,
    ops: {
      push: () => {},
      pop: () => {},
      get: () => state,
      concatMatrix: () => {},
      setClipBBox: () => {},
      setClipMask: () => {},
      setBlendMode: () => {},
      setSoftMaskAlpha: () => {},
      setSoftMask: () => {},
      setFillPatternName: (n: string) => calls.push({ method: "setFillPatternName", args: [n] }),
      setStrokePatternName: (n: string) => calls.push({ method: "setStrokePatternName", args: [n] }),
      setFillPatternUnderlyingColorSpace: (cs: unknown) => calls.push({ method: "setFillPatternUnderlyingColorSpace", args: [cs] }),
      setStrokePatternUnderlyingColorSpace: (cs: unknown) => calls.push({ method: "setStrokePatternUnderlyingColorSpace", args: [cs] }),
      setFillPatternColor: (c: unknown) => calls.push({ method: "setFillPatternColor", args: [c] }),
      setStrokePatternColor: (c: unknown) => calls.push({ method: "setStrokePatternColor", args: [c] }),
      setFillColorSpaceName: (n: unknown) => calls.push({ method: "setFillColorSpaceName", args: [n] }),
      setStrokeColorSpaceName: (n: unknown) => calls.push({ method: "setStrokeColorSpaceName", args: [n] }),
      setLineWidth: () => {},
      setLineCap: () => {},
      setLineJoin: () => {},
      setMiterLimit: () => {},
      setDashPattern: () => {},
      setFillGray: (g: number) => calls.push({ method: "setFillGray", args: [g] }),
      setStrokeGray: (g: number) => calls.push({ method: "setStrokeGray", args: [g] }),
      setFillRgb: (r: number, g: number, b: number) => calls.push({ method: "setFillRgb", args: [r, g, b] }),
      setStrokeRgb: (r: number, g: number, b: number) => calls.push({ method: "setStrokeRgb", args: [r, g, b] }),
      setFillCmyk: (c: number, m: number, y: number, k: number) => calls.push({ method: "setFillCmyk", args: [c, m, y, k] }),
      setStrokeCmyk: (c: number, m: number, y: number, k: number) => calls.push({ method: "setStrokeCmyk", args: [c, m, y, k] }),
      setFillAlpha: () => {},
      setStrokeAlpha: () => {},
      setCharSpacing: () => {},
      setWordSpacing: () => {},
      setHorizontalScaling: () => {},
      setTextLeading: () => {},
      setTextRenderingMode: () => {},
      setTextRise: () => {},
    } as GraphicsStateOps,
  };
}

function createContext(operandStack: (number | string | (number | string)[])[] = []): ParserContext {
  return {
    operandStack,
    currentPath: [],
    elements: [],
    inTextObject: false,
    textState: createInitialTextState(),
    fontMappings: new Map(),
    pageBBox: [0, 0, 0, 0],
    shadings: new Map(),
    shadingMaxSize: 0,
    clipPathMaxSize: 0,
    patterns: new Map(),
    colorSpaces: new Map(),
    extGState: new Map(),
  };
}

describe("color-handlers", () => {
  describe("handleFillGray", () => {
    it("sets fill gray color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.5]);
      colorHandlers.handleFillGray(ctx, ops);

      expect(calls).toEqual([
        { method: "setFillColorSpaceName", args: ["DeviceGray"] },
        { method: "setFillGray", args: [0.5] },
      ]);
    });
  });

  describe("handleStrokeGray", () => {
    it("sets stroke gray color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.8]);
      colorHandlers.handleStrokeGray(ctx, ops);

      expect(calls).toEqual([
        { method: "setStrokeColorSpaceName", args: ["DeviceGray"] },
        { method: "setStrokeGray", args: [0.8] },
      ]);
    });
  });

  describe("handleFillRgb", () => {
    it("sets fill RGB color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0]);
      colorHandlers.handleFillRgb(ctx, ops);

      expect(calls).toEqual([
        { method: "setFillColorSpaceName", args: ["DeviceRGB"] },
        { method: "setFillRgb", args: [1, 0, 0] },
      ]);
    });
  });

  describe("handleStrokeRgb", () => {
    it("sets stroke RGB color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, 0, 1]);
      colorHandlers.handleStrokeRgb(ctx, ops);

      expect(calls).toEqual([
        { method: "setStrokeColorSpaceName", args: ["DeviceRGB"] },
        { method: "setStrokeRgb", args: [0, 0, 1] },
      ]);
    });
  });

  describe("handleFillCmyk", () => {
    it("sets fill CMYK color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0, 0]);
      colorHandlers.handleFillCmyk(ctx, ops);

      expect(calls).toEqual([
        { method: "setFillColorSpaceName", args: ["DeviceCMYK"] },
        { method: "setFillCmyk", args: [1, 0, 0, 0] },
      ]);
    });
  });

  describe("handleStrokeCmyk", () => {
    it("sets stroke CMYK color", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, 1, 0, 0]);
      colorHandlers.handleStrokeCmyk(ctx, ops);

      expect(calls).toEqual([
        { method: "setStrokeColorSpaceName", args: ["DeviceCMYK"] },
        { method: "setStrokeCmyk", args: [0, 1, 0, 0] },
      ]);
    });
  });

  describe("handleFillColorSpace", () => {
    it("consumes top operand and stores Pattern base color space when provided as array", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([["Pattern", "DeviceRGB"]]);
      const update = colorHandlers.handleFillColorSpace(ctx, ops);

      expect(update.operandStack).toEqual([]);
      expect(calls).toEqual([
        { method: "setFillPatternUnderlyingColorSpace", args: ["DeviceRGB"] },
        { method: "setFillColorSpaceName", args: [undefined] },
      ]);
    });
  });

  describe("handleStrokeColorSpace", () => {
    it("consumes top operand and stores Pattern base color space when provided as array", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([["Pattern", "DeviceCMYK"]]);
      const update = colorHandlers.handleStrokeColorSpace(ctx, ops);

      expect(update.operandStack).toEqual([]);
      expect(calls).toEqual([
        { method: "setStrokePatternUnderlyingColorSpace", args: ["DeviceCMYK"] },
        { method: "setStrokeColorSpaceName", args: [undefined] },
      ]);
    });
  });

  describe("handleFillColorN", () => {
    it("infers gray from 1 component", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.5]);
      colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillGray", args: [0.5] }]);
    });

    it("infers RGB from 3 components", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0.5, 0]);
      colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [1, 0.5, 0] }]);
    });

    it("infers CMYK from 4 components", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.1, 0.2, 0.3, 0.4]);
      colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillCmyk", args: [0.1, 0.2, 0.3, 0.4] }]);
    });

    it("stops at non-numeric values", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/CS", 1, 0, 0]);
      const update = colorHandlers.handleFillColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [1, 0, 0] }]);
      expect(update.operandStack).toEqual(["/CS"]);
    });
  });

  describe("ICCBased fill/stroke (sc/SC)", () => {
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
        for (let c = 0; c < inChannels; c += 1) {
          bytes[cursor++] = 0;
          bytes[cursor++] = 255;
        }

        const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
        const toByte = (v01: number): number => Math.floor(clamp01(v01) * 255);
        const rgbToXyzD65 = (r: number, g: number, b: number): readonly [number, number, number] => {
          const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
          const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
          return [X, Y, Z] as const;
        };

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

      writeU32BE(view, 0, totalSize);
      writeAscii4(out, 16, "CMYK");
      writeAscii4(out, 20, "XYZ ");
      writeAscii4(out, 36, "acsp");

      writeU32BE(view, 128, tags.length);
      let tpos = 132;
      for (const r of records) {
        writeAscii4(out, tpos, r.sig);
        writeU32BE(view, tpos + 4, r.off);
        writeU32BE(view, tpos + 8, r.size);
        tpos += 12;
      }

      let dpos = pad4(headerSize + tagTableSize);
      for (const part of tagDataParts) {
        out.set(part, dpos);
        dpos += part.length;
      }

      return out;
    }

    it("converts ICCBased sc components to DeviceRGB using the parsed ICC profile", () => {
      const profile = parseIccProfile(makeMinimalRgbIccProfileBytes());
      expect(profile?.kind).toBe("rgb");

      const colorSpaces: ReadonlyMap<string, ParsedNamedColorSpace> = new Map([
        [
          "CS1",
          {
            kind: "iccBased",
            n: 3,
            alternate: "DeviceRGB",
            profile,
          },
        ],
      ]);

      const stack = createGraphicsStateStack();
      const ops = createGfxOpsFromStack(stack);

      let ctx: ParserContext = { ...createContext(["CS1"]), colorSpaces };
      ctx = { ...ctx, ...colorHandlers.handleFillColorSpace(ctx, ops) };

      ctx = { ...ctx, operandStack: [0.5, 0, 0] };
      ctx = { ...ctx, ...colorHandlers.handleFillColorN(ctx, ops) };

      const gs = stack.get();
      expect(gs.fillColor.colorSpace).toBe("DeviceRGB");
      expect(gs.fillColor.components[0]).toBeCloseTo(137 / 255, 3);
      expect(gs.fillColor.components[1]).toBeCloseTo(0, 6);
      expect(gs.fillColor.components[2]).toBeCloseTo(0, 6);
      expect(gs.fillColorSpaceName).toBe("CS1");
    });

    it("converts ICCBased CMYK sc components via LUT A2B0 to DeviceRGB", () => {
      const profile = parseIccProfile(makeMinimalCmykLutIccProfileBytes());
      expect(profile?.kind).toBe("lut");

      const colorSpaces: ReadonlyMap<string, ParsedNamedColorSpace> = new Map([
        [
          "CS2",
          {
            kind: "iccBased",
            n: 4,
            alternate: "DeviceCMYK",
            profile,
          },
        ],
      ]);

      const stack = createGraphicsStateStack();
      const ops = createGfxOpsFromStack(stack);

      let ctx: ParserContext = { ...createContext(["CS2"]), colorSpaces };
      ctx = { ...ctx, ...colorHandlers.handleFillColorSpace(ctx, ops) };

      ctx = { ...ctx, operandStack: [0, 1, 1, 0] };
      ctx = { ...ctx, ...colorHandlers.handleFillColorN(ctx, ops) };

      const gs = stack.get();
      expect(gs.fillColor.colorSpace).toBe("DeviceRGB");
      expect(gs.fillColor.components[0]).toBeCloseTo(1, 3);
      expect(gs.fillColor.components[1]).toBeCloseTo(0, 3);
      expect(gs.fillColor.components[2]).toBeCloseTo(0, 3);
      expect(gs.fillColorSpaceName).toBe("CS2");
    });

    it("resets current fill color space name when using rg", () => {
      const stack = createGraphicsStateStack();
      const ops = createGfxOpsFromStack(stack);

      let ctx: ParserContext = createContext(["CS1"]);
      ctx = { ...ctx, ...colorHandlers.handleFillColorSpace(ctx, ops) };
      expect(stack.get().fillColorSpaceName).toBe("CS1");

      ctx = { ...ctx, operandStack: [1, 0, 0] };
      ctx = { ...ctx, ...colorHandlers.handleFillRgb(ctx, ops) };
      expect(stack.get().fillColorSpaceName).toBe("DeviceRGB");
    });
  });

  describe("handleFillColorNWithOptionalName (scn)", () => {
    it("falls back to black when pattern is not injected", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0.25, "/P1"]);
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("sets fill pattern when supported pattern is injected", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx: ParserContext = {
        ...createContext(["/P1"]),
        patterns: new Map([
          [
            "P1",
            {
              patternType: 2,
              matrix: [1, 0, 0, 1, 0, 0],
              shading: {
                shadingType: 2,
                colorSpace: "DeviceRGB",
                coords: [0, 0, 1, 0],
                extend: [true, true],
                fn: { type: "FunctionType2", c0: [0, 0, 0], c1: [1, 1, 1], n: 1, domain: [0, 1] },
              },
            },
          ],
        ]),
      };
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillPatternName", args: ["/P1"] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("consumes name even when there are no numeric components (unsupported -> black)", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/P1"]);
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("consumes numeric components when pattern is not injected (falls back to black)", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0, "/P1"]);
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setFillRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("stores base color for PaintType 2 tiling patterns (uncolored)", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx: ParserContext = {
        ...createContext([0, 1, 0, "/P1"]),
        patterns: new Map([
          [
            "P1",
            {
              patternType: 1,
              paintType: 2,
              tilingType: 1,
              bbox: [0, 0, 1, 1],
              xStep: 2,
              yStep: 2,
              matrix: [1, 0, 0, 1, 0, 0],
              content: "0 0 1 1 re f",
            },
          ],
        ]),
      };
      const update = colorHandlers.handleFillColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([
        { method: "setFillPatternName", args: ["/P1"] },
        { method: "setFillPatternColor", args: [{ colorSpace: "DeviceRGB", components: [0, 1, 0] }] },
      ]);
      expect(update.operandStack).toEqual([]);
    });
  });

  describe("handleStrokeColorNWithOptionalName (SCN)", () => {
    it("falls back to black when pattern is not injected", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([1, 0, 0, "/P1"]);
      const update = colorHandlers.handleStrokeColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("sets stroke pattern when supported pattern is injected", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx: ParserContext = {
        ...createContext(["/P1"]),
        patterns: new Map([
          [
            "P1",
            {
              patternType: 2,
              matrix: [1, 0, 0, 1, 0, 0],
              shading: {
                shadingType: 2,
                colorSpace: "DeviceRGB",
                coords: [0, 0, 1, 0],
                extend: [true, true],
                fn: { type: "FunctionType2", c0: [0, 0, 0], c1: [1, 1, 1], n: 1, domain: [0, 1] },
              },
            },
          ],
        ]),
      };
      const update = colorHandlers.handleStrokeColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokePatternName", args: ["/P1"] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("consumes name even when there are no numeric components (unsupported -> black)", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext(["/P1"]);
      const update = colorHandlers.handleStrokeColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 0, 0] }]);
      expect(update.operandStack).toEqual([]);
    });

    it("stores base color for PaintType 2 tiling patterns (uncolored)", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx: ParserContext = {
        ...createContext([0.25, "/P1"]),
        patterns: new Map([
          [
            "P1",
            {
              patternType: 1,
              paintType: 2,
              tilingType: 1,
              bbox: [0, 0, 1, 1],
              xStep: 2,
              yStep: 2,
              matrix: [1, 0, 0, 1, 0, 0],
              content: "0 0 1 1 re f",
            },
          ],
        ]),
      };
      const update = colorHandlers.handleStrokeColorNWithOptionalName(ctx, ops);

      expect(calls).toEqual([
        { method: "setStrokePatternName", args: ["/P1"] },
        { method: "setStrokePatternColor", args: [{ colorSpace: "DeviceGray", components: [0.25] }] },
      ]);
      expect(update.operandStack).toEqual([]);
    });
  });

  describe("handleStrokeColorN", () => {
    it("infers color space from component count", () => {
      const { calls, ops } = createMockGfxOps();
      const ctx = createContext([0, 1, 0]);
      colorHandlers.handleStrokeColorN(ctx, ops);

      expect(calls).toEqual([{ method: "setStrokeRgb", args: [0, 1, 0] }]);
    });
  });

  describe("COLOR_HANDLERS registry", () => {
    it("contains all expected operators", () => {
      expect(COLOR_HANDLERS.has("g")).toBe(true);
      expect(COLOR_HANDLERS.has("G")).toBe(true);
      expect(COLOR_HANDLERS.has("rg")).toBe(true);
      expect(COLOR_HANDLERS.has("RG")).toBe(true);
      expect(COLOR_HANDLERS.has("k")).toBe(true);
      expect(COLOR_HANDLERS.has("K")).toBe(true);
      expect(COLOR_HANDLERS.has("cs")).toBe(true);
      expect(COLOR_HANDLERS.has("CS")).toBe(true);
      expect(COLOR_HANDLERS.has("sc")).toBe(true);
      expect(COLOR_HANDLERS.has("scn")).toBe(true);
      expect(COLOR_HANDLERS.has("SC")).toBe(true);
      expect(COLOR_HANDLERS.has("SCN")).toBe(true);
    });

    it("all handlers have correct category", () => {
      for (const [, entry] of COLOR_HANDLERS) {
        expect(entry.category).toBe("color");
      }
    });
  });
});
