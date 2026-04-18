/**
 * @file blob-decoder unit tests
 *
 * Pins the contract for the two command-byte semantics that differ from a
 * naive "SVG-like" reading of path commands:
 *   - 0x03 = quadratic Bézier encoded as (Q, P1), elevated to cubic
 *   - 0x00 = subpath terminator (silently consumed)
 *
 * Regression guard for: Action 3 SF Symbol glyph (reading glasses) rendering.
 * Before the 0x03=quad fix, our decoder produced cubic control points that
 * equalled the move-to point, yielding a visibly different glyph outline.
 */

import { describe, it, expect } from "vitest";
import { decodePathCommands, type FigBlob, type PathCommand } from "./blob-decoder";

function buildBlob(bytes: number[]): FigBlob {
  return { bytes };
}

function encodeFloat32LE(value: number): number[] {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, value, true);
  return Array.from(new Uint8Array(buf));
}

function encodeM(x: number, y: number): number[] {
  return [0x01, ...encodeFloat32LE(x), ...encodeFloat32LE(y)];
}

function encodeQuad(qx: number, qy: number, px: number, py: number): number[] {
  // 0x03 = quadratic Bézier, payload (Qx, Qy, P1x, P1y)
  return [0x03, ...encodeFloat32LE(qx), ...encodeFloat32LE(qy), ...encodeFloat32LE(px), ...encodeFloat32LE(py)];
}

function encodeCubic(x1: number, y1: number, x2: number, y2: number, x: number, y: number): number[] {
  return [0x04, ...encodeFloat32LE(x1), ...encodeFloat32LE(y1), ...encodeFloat32LE(x2), ...encodeFloat32LE(y2), ...encodeFloat32LE(x), ...encodeFloat32LE(y)];
}

describe("blob-decoder: 0x03 quadratic elevation", () => {
  it("elevates 0x03 (Q) after M into a cubic via the standard 2/3 formula", () => {
    // Glyph-style blob: 0x00 header, then M followed by a single 0x03.
    // P0 = (0, 0), Q = (1, 1), P1 = (2, 0)
    // Expected cubic: cp1 = P0 + 2/3·(Q-P0) = (2/3, 2/3)
    //                 cp2 = P1 + 2/3·(Q-P1) = (4/3, 2/3)
    const bytes = [0x00, ...encodeM(0, 0), ...encodeQuad(1, 1, 2, 0)];
    const commands = decodePathCommands(buildBlob(bytes));

    expect(commands).toHaveLength(2);
    expect(commands[0]).toEqual<PathCommand>({ type: "M", x: 0, y: 0 });

    const cubic = commands[1];
    if (cubic.type !== "C") throw new Error("expected C");
    expect(cubic.x1).toBeCloseTo(2 / 3, 6);
    expect(cubic.y1).toBeCloseTo(2 / 3, 6);
    expect(cubic.x2).toBeCloseTo(4 / 3, 6);
    expect(cubic.y2).toBeCloseTo(2 / 3, 6);
    expect(cubic.x).toBe(2);
    expect(cubic.y).toBe(0);
  });

  it("chains 0x03 using the previous cubic's endpoint as P0", () => {
    // M (0,0) then Q1=(1,1) P1=(2,0), then Q2=(3,-1) P2=(4,0).
    // The second quad's P0 must be the previous endpoint (2,0).
    //   cp1 = (2,0) + 2/3·((3,-1)-(2,0)) = (2 + 2/3, -2/3) = (8/3, -2/3)
    //   cp2 = (4,0) + 2/3·((3,-1)-(4,0)) = (4 - 2/3, -2/3) = (10/3, -2/3)
    const bytes = [
      0x00,
      ...encodeM(0, 0),
      ...encodeQuad(1, 1, 2, 0),
      ...encodeQuad(3, -1, 4, 0),
    ];
    const commands = decodePathCommands(buildBlob(bytes));

    expect(commands).toHaveLength(3);
    const second = commands[2];
    if (second.type !== "C") throw new Error("expected C");
    expect(second.x1).toBeCloseTo(8 / 3, 6);
    expect(second.y1).toBeCloseTo(-2 / 3, 6);
    expect(second.x2).toBeCloseTo(10 / 3, 6);
    expect(second.y2).toBeCloseTo(-2 / 3, 6);
    expect(second.x).toBe(4);
    expect(second.y).toBe(0);
  });

  it("consumes 0x00 mid-stream as a subpath close and continues parsing the next M", () => {
    // M(0,0) → quad → 0x00 (close) → M(10,10) → quad
    const bytes = [
      0x00, // header
      ...encodeM(0, 0),
      ...encodeQuad(1, 1, 2, 0),
      0x00, // subpath close
      ...encodeM(10, 10),
      ...encodeQuad(11, 11, 12, 10),
    ];
    const commands = decodePathCommands(buildBlob(bytes));

    // 2 Ms + 2 Cs = 4 commands (the 0x00 emits nothing).
    expect(commands).toHaveLength(4);
    expect(commands[0]).toMatchObject({ type: "M", x: 0, y: 0 });
    expect(commands[1].type).toBe("C");
    expect(commands[2]).toMatchObject({ type: "M", x: 10, y: 10 });
    expect(commands[3].type).toBe("C");
  });

  it("preserves full cubic (0x04) with explicit control points", () => {
    // Non-glyph (vector) blob: leading 0x01 M + 0x04 C with explicit cps.
    const bytes = [
      ...encodeM(0, 0),
      ...encodeCubic(1, 0, 2, 1, 3, 1),
    ];
    const commands = decodePathCommands(buildBlob(bytes));

    expect(commands).toHaveLength(2);
    const cubic = commands[1];
    if (cubic.type !== "C") throw new Error("expected C");
    expect(cubic.x1).toBe(1);
    expect(cubic.y1).toBe(0);
    expect(cubic.x2).toBe(2);
    expect(cubic.y2).toBe(1);
    expect(cubic.x).toBe(3);
    expect(cubic.y).toBe(1);
  });
});
