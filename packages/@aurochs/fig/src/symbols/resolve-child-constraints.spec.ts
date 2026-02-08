import { describe, it, expect } from "vitest";
import { getConstraintValue, resolveChildConstraints } from "./resolve-child-constraints";
import { CONSTRAINT_TYPE_VALUES } from "../constants/layout";

describe("getConstraintValue", () => {
  it("returns MIN for undefined", () => {
    expect(getConstraintValue(undefined)).toBe(CONSTRAINT_TYPE_VALUES.MIN);
  });

  it("returns MIN for null", () => {
    expect(getConstraintValue(null)).toBe(CONSTRAINT_TYPE_VALUES.MIN);
  });

  it("returns MIN for non-object", () => {
    expect(getConstraintValue("string")).toBe(CONSTRAINT_TYPE_VALUES.MIN);
    expect(getConstraintValue(42)).toBe(CONSTRAINT_TYPE_VALUES.MIN);
  });

  it("returns MIN for object without value", () => {
    expect(getConstraintValue({})).toBe(CONSTRAINT_TYPE_VALUES.MIN);
  });

  it("extracts value from constraint object", () => {
    expect(getConstraintValue({ value: CONSTRAINT_TYPE_VALUES.STRETCH })).toBe(
      CONSTRAINT_TYPE_VALUES.STRETCH,
    );
    expect(getConstraintValue({ value: CONSTRAINT_TYPE_VALUES.SCALE })).toBe(
      CONSTRAINT_TYPE_VALUES.SCALE,
    );
  });
});

describe("resolveChildConstraints", () => {
  const parentOrig = { x: 200, y: 200 };
  const parentNew = { x: 300, y: 400 };

  function makeChild(overrides: Record<string, unknown> = {}) {
    return {
      transform: { m00: 1, m01: 0, m02: 20, m10: 0, m11: 1, m12: 30 },
      size: { x: 60, y: 80 },
      ...overrides,
    };
  }

  it("returns null when no transform", () => {
    const child = makeChild({ transform: undefined });
    expect(resolveChildConstraints(child, parentOrig, parentNew)).toBeNull();
  });

  it("returns null when no size", () => {
    const child = makeChild({ size: undefined });
    expect(resolveChildConstraints(child, parentOrig, parentNew)).toBeNull();
  });

  it("MIN constraint — no change", () => {
    const child = makeChild();
    const result = resolveChildConstraints(child, parentOrig, parentOrig);
    expect(result).toEqual({
      posX: 20,
      posY: 30,
      dimX: 60,
      dimY: 80,
      posChanged: false,
      sizeChanged: false,
    });
  });

  it("CENTER constraint — shifts position", () => {
    const child = makeChild({
      horizontalConstraint: { value: CONSTRAINT_TYPE_VALUES.CENTER },
      verticalConstraint: { value: CONSTRAINT_TYPE_VALUES.CENTER },
    });
    const result = resolveChildConstraints(child, parentOrig, parentNew)!;
    // hDelta=100, vDelta=200
    expect(result.posX).toBe(70); // 20 + 100/2
    expect(result.posY).toBe(130); // 30 + 200/2
    expect(result.dimX).toBe(60);
    expect(result.dimY).toBe(80);
    expect(result.posChanged).toBe(true);
    expect(result.sizeChanged).toBe(false);
  });

  it("STRETCH constraint — adjusts size, preserves margins", () => {
    const child = makeChild({
      horizontalConstraint: { value: CONSTRAINT_TYPE_VALUES.STRETCH },
      verticalConstraint: { value: CONSTRAINT_TYPE_VALUES.STRETCH },
    });
    const result = resolveChildConstraints(child, parentOrig, parentNew)!;
    // H: leftMargin=20, rightMargin=200-(20+60)=120, newW=300-20-120=160
    // V: topMargin=30, bottomMargin=200-(30+80)=90, newH=400-30-90=280
    expect(result.posX).toBe(20);
    expect(result.posY).toBe(30);
    expect(result.dimX).toBe(160);
    expect(result.dimY).toBe(280);
    expect(result.posChanged).toBe(false);
    expect(result.sizeChanged).toBe(true);
  });

  it("SCALE constraint — scales proportionally", () => {
    const child = makeChild({
      horizontalConstraint: { value: CONSTRAINT_TYPE_VALUES.SCALE },
      verticalConstraint: { value: CONSTRAINT_TYPE_VALUES.SCALE },
    });
    const result = resolveChildConstraints(child, parentOrig, parentNew)!;
    // H ratio=300/200=1.5, V ratio=400/200=2.0
    expect(result.posX).toBe(30); // 20*1.5
    expect(result.posY).toBe(60); // 30*2.0
    expect(result.dimX).toBe(90); // 60*1.5
    expect(result.dimY).toBe(160); // 80*2.0
    expect(result.posChanged).toBe(true);
    expect(result.sizeChanged).toBe(true);
  });

  it("MAX constraint — shifts position by full delta", () => {
    const child = makeChild({
      horizontalConstraint: { value: CONSTRAINT_TYPE_VALUES.MAX },
      verticalConstraint: { value: CONSTRAINT_TYPE_VALUES.MIN },
    });
    const result = resolveChildConstraints(child, parentOrig, parentNew)!;
    expect(result.posX).toBe(120); // 20 + 100
    expect(result.posY).toBe(30); // unchanged (MIN)
    expect(result.dimX).toBe(60);
    expect(result.dimY).toBe(80);
    expect(result.posChanged).toBe(true);
    expect(result.sizeChanged).toBe(false);
  });

  it("mixed constraints — H=STRETCH, V=CENTER", () => {
    const child = makeChild({
      horizontalConstraint: { value: CONSTRAINT_TYPE_VALUES.STRETCH },
      verticalConstraint: { value: CONSTRAINT_TYPE_VALUES.CENTER },
    });
    const result = resolveChildConstraints(child, parentOrig, parentNew)!;
    expect(result.posX).toBe(20); // STRETCH keeps pos
    expect(result.dimX).toBe(160); // STRETCH adjusts size
    expect(result.posY).toBe(130); // CENTER shifts pos
    expect(result.dimY).toBe(80); // CENTER keeps size
    expect(result.posChanged).toBe(true);
    expect(result.sizeChanged).toBe(true);
  });

  it("no constraint fields — defaults to MIN", () => {
    const child = makeChild();
    const result = resolveChildConstraints(child, parentOrig, parentNew)!;
    expect(result.posX).toBe(20);
    expect(result.posY).toBe(30);
    expect(result.dimX).toBe(60);
    expect(result.dimY).toBe(80);
    expect(result.posChanged).toBe(false);
    expect(result.sizeChanged).toBe(false);
  });

  it("same parent size — no change regardless of constraint", () => {
    const child = makeChild({
      horizontalConstraint: { value: CONSTRAINT_TYPE_VALUES.STRETCH },
      verticalConstraint: { value: CONSTRAINT_TYPE_VALUES.SCALE },
    });
    const result = resolveChildConstraints(child, parentOrig, parentOrig)!;
    expect(result.posChanged).toBe(false);
    expect(result.sizeChanged).toBe(false);
  });
});
