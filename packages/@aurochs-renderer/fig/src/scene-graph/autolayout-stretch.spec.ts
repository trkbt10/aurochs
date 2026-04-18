/**
 * @file applyCounterAxisStretch unit tests
 *
 * Pins the narrow auto-layout rule implemented in builder.ts: when a
 * FRAME is an auto-layout container (stackMode VERTICAL or HORIZONTAL)
 * and a child carries `stackChildAlignSelf=STRETCH`, the child's
 * counter-axis dimension resolves to the parent's content area on that
 * axis. No other auto-layout rules (primary-axis grow, SPACE_BETWEEN,
 * padding distribution) are implemented here — those remain part of
 * Task #39's full auto-layout scope.
 *
 * Regression guard for: Activity View list-row `_Separator` rendering.
 * The separator's stored size is 129×1 but its parent FRAME is 370×52
 * with stackMode=VERTICAL and stackChildAlignSelf=STRETCH; without
 * this rule the separator renders at 129 wide instead of stretching
 * across the full row.
 */

import { describe, it, expect } from "vitest";
import { applyCounterAxisStretch } from "./builder";
import type { FigDesignNode } from "@aurochs/fig/domain";

function frame(overrides: Partial<FigDesignNode>): FigDesignNode {
  return {
    id: overrides.id ?? "frame",
    kind: "FRAME",
    name: overrides.name ?? "frame",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: overrides.size ?? { x: 100, y: 100 },
    children: overrides.children ?? [],
    ...overrides,
  } as FigDesignNode;
}

function child(size: { x: number; y: number }, stackChildAlignSelf?: "STRETCH"): FigDesignNode {
  return {
    id: "child",
    kind: "FRAME",
    name: "child",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size,
    children: [],
    layoutConstraints: stackChildAlignSelf
      ? { stackChildAlignSelf: { value: 3, name: stackChildAlignSelf } }
      : undefined,
  } as FigDesignNode;
}

describe("applyCounterAxisStretch", () => {
  it("stretches a STRETCH child's X dimension when parent stackMode=VERTICAL", () => {
    const parent = frame({
      size: { x: 370, y: 52 },
      autoLayout: { stackMode: { value: 1, name: "VERTICAL" } },
    });
    const c = child({ x: 129, y: 1 }, "STRETCH");
    const out = applyCounterAxisStretch(parent, [c]);
    expect(out[0].size).toEqual({ x: 370, y: 1 });
  });

  it("stretches a STRETCH child's Y dimension when parent stackMode=HORIZONTAL", () => {
    const parent = frame({
      size: { x: 52, y: 370 },
      autoLayout: { stackMode: { value: 2, name: "HORIZONTAL" } },
    });
    const c = child({ x: 1, y: 129 }, "STRETCH");
    const out = applyCounterAxisStretch(parent, [c]);
    expect(out[0].size).toEqual({ x: 1, y: 370 });
  });

  it("subtracts stackPadding from the content area on the counter axis", () => {
    const parent = frame({
      size: { x: 370, y: 52 },
      autoLayout: {
        stackMode: { value: 1, name: "VERTICAL" },
        stackPadding: 20, // uniform padding
      },
    });
    const c = child({ x: 129, y: 1 }, "STRETCH");
    const out = applyCounterAxisStretch(parent, [c]);
    // 370 - 20*2 = 330
    expect(out[0].size).toEqual({ x: 330, y: 1 });
  });

  it("leaves non-STRETCH children untouched", () => {
    const parent = frame({
      size: { x: 370, y: 52 },
      autoLayout: { stackMode: { value: 1, name: "VERTICAL" } },
    });
    const c = child({ x: 129, y: 1 }); // no stackChildAlignSelf
    const out = applyCounterAxisStretch(parent, [c]);
    // Reference-equal when nothing changes (small perf / GC win).
    expect(out).toBe([c].length === out.length && out[0] === c ? out : out);
    expect(out[0]).toBe(c);
  });

  it("does nothing when parent has no auto-layout", () => {
    const parent = frame({ size: { x: 370, y: 52 } });
    const c = child({ x: 129, y: 1 }, "STRETCH");
    const out = applyCounterAxisStretch(parent, [c]);
    expect(out[0]).toBe(c);
  });

  it("does nothing when parent stackMode is NONE", () => {
    const parent = frame({
      size: { x: 370, y: 52 },
      autoLayout: { stackMode: { value: 0, name: "NONE" } },
    });
    const c = child({ x: 129, y: 1 }, "STRETCH");
    const out = applyCounterAxisStretch(parent, [c]);
    expect(out[0]).toBe(c);
  });

  it("returns the original array by reference when no child changed", () => {
    const parent = frame({
      size: { x: 370, y: 52 },
      autoLayout: { stackMode: { value: 1, name: "VERTICAL" } },
    });
    const c1 = child({ x: 100, y: 10 });
    const c2 = child({ x: 100, y: 10 });
    const input = [c1, c2];
    const out = applyCounterAxisStretch(parent, input);
    expect(out).toBe(input);
  });
});
