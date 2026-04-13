/**
 * @file Tests for rotation SoT functions
 */

import { describe, it, expect } from "vitest";
import {
  extractRotationDeg,
  computeWorldCenter,
  computePreRotationTopLeft,
  buildRotatedTransform,
} from "./rotation";
import type { FigMatrix } from "@aurochs/fig/types";

function makeTransform(x: number, y: number): FigMatrix {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function makeRotatedTransform(angleDeg: number, x: number, y: number): FigMatrix {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { m00: cos, m01: -sin, m02: x, m10: sin, m11: cos, m12: y };
}

describe("extractRotationDeg", () => {
  it("returns 0 for identity matrix", () => {
    expect(extractRotationDeg({ m00: 1, m10: 0 })).toBeCloseTo(0);
  });

  it("returns 45 for 45° rotation", () => {
    const rad = (45 * Math.PI) / 180;
    expect(extractRotationDeg({ m00: Math.cos(rad), m10: Math.sin(rad) })).toBeCloseTo(45);
  });

  it("returns -90 for -90° rotation", () => {
    const rad = (-90 * Math.PI) / 180;
    expect(extractRotationDeg({ m00: Math.cos(rad), m10: Math.sin(rad) })).toBeCloseTo(-90);
  });
});

describe("computeWorldCenter", () => {
  it("returns center for non-rotated node", () => {
    const t = makeTransform(100, 200);
    const { cx, cy } = computeWorldCenter(t, 50, 30);
    expect(cx).toBeCloseTo(125); // 100 + 50/2
    expect(cy).toBeCloseTo(215); // 200 + 30/2
  });

  it("returns correct center for rotated node", () => {
    // 90° rotation: cos=0, sin=1, -sin=-1, cos=0
    // center = (0*25 + (-1)*15 + 100, 1*25 + 0*15 + 200) = (85, 225)
    const t: FigMatrix = { m00: 0, m01: -1, m02: 100, m10: 1, m11: 0, m12: 200 };
    const { cx, cy } = computeWorldCenter(t, 50, 30);
    expect(cx).toBeCloseTo(85);
    expect(cy).toBeCloseTo(225);
  });
});

describe("computePreRotationTopLeft", () => {
  it("equals (m02, m12) for non-rotated node", () => {
    const t = makeTransform(100, 200);
    const { x, y } = computePreRotationTopLeft(t, 50, 30);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(200);
  });

  it("differs from (m02, m12) for rotated node", () => {
    const t: FigMatrix = { m00: 0, m01: -1, m02: 100, m10: 1, m11: 0, m12: 200 };
    const { x, y } = computePreRotationTopLeft(t, 50, 30);
    // center is (85, 225), pre-rotation top-left = (85-25, 225-15) = (60, 210)
    expect(x).toBeCloseTo(60);
    expect(y).toBeCloseTo(210);
  });
});

describe("buildRotatedTransform", () => {
  it("preserves center when rotating from 0 to 45 degrees", () => {
    const t = makeTransform(100, 200);
    const w = 50, h = 30;

    const centerBefore = computeWorldCenter(t, w, h);
    const newT = buildRotatedTransform(t, w, h, 45);
    const centerAfter = computeWorldCenter(newT, w, h);

    expect(centerAfter.cx).toBeCloseTo(centerBefore.cx);
    expect(centerAfter.cy).toBeCloseTo(centerBefore.cy);
  });

  it("preserves center when rotating from 30 to 120 degrees", () => {
    const initial = buildRotatedTransform(makeTransform(100, 200), 50, 30, 30);
    const w = 50, h = 30;

    const centerBefore = computeWorldCenter(initial, w, h);
    const newT = buildRotatedTransform(initial, w, h, 120);
    const centerAfter = computeWorldCenter(newT, w, h);

    expect(centerAfter.cx).toBeCloseTo(centerBefore.cx);
    expect(centerAfter.cy).toBeCloseTo(centerBefore.cy);
  });

  it("sets correct rotation angle", () => {
    const t = makeTransform(100, 200);
    const newT = buildRotatedTransform(t, 50, 30, 45);
    expect(extractRotationDeg(newT)).toBeCloseTo(45);
  });

  it("returns identity-like matrix for 0 degrees from identity", () => {
    const t = makeTransform(100, 200);
    const newT = buildRotatedTransform(t, 50, 30, 0);
    expect(newT.m00).toBeCloseTo(1);
    expect(newT.m01).toBeCloseTo(0);
    expect(newT.m10).toBeCloseTo(0);
    expect(newT.m11).toBeCloseTo(1);
    expect(newT.m02).toBeCloseTo(100);
    expect(newT.m12).toBeCloseTo(200);
  });
});
