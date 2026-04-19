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
 *
 * Tests construct only the fields the function reads, via the exported
 * `StretchParent` / `StretchChild` interfaces — no casts.
 */

import { describe, it, expect } from "vitest";
import { applyCounterAxisStretch, type StretchParent, type StretchChild } from "./builder";

type Parent = StretchParent;
type Child = StretchChild & { readonly name: string };

function parent(
  size: { x: number; y: number },
  mode?: "VERTICAL" | "HORIZONTAL" | "NONE",
  stackPadding?: number | { top: number; right: number; bottom: number; left: number },
): Parent {
  return {
    size,
    autoLayout: mode
      ? { stackMode: { name: mode }, stackPadding }
      : undefined,
  };
}

function child(
  name: string,
  size: { x: number; y: number },
  stretch?: boolean,
): Child {
  return {
    name,
    size,
    layoutConstraints: stretch ? { stackChildAlignSelf: { name: "STRETCH" } } : undefined,
  };
}

describe("applyCounterAxisStretch", () => {
  it("stretches a STRETCH child's X dimension when parent stackMode=VERTICAL", () => {
    const p = parent({ x: 370, y: 52 }, "VERTICAL");
    const c = child("c", { x: 129, y: 1 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    expect(out[0].size).toEqual({ x: 370, y: 1 });
  });

  it("stretches a STRETCH child's Y dimension when parent stackMode=HORIZONTAL", () => {
    const p = parent({ x: 52, y: 370 }, "HORIZONTAL");
    const c = child("c", { x: 1, y: 129 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    expect(out[0].size).toEqual({ x: 1, y: 370 });
  });

  it("subtracts uniform stackPadding from the content area on the counter axis", () => {
    const p = parent({ x: 370, y: 52 }, "VERTICAL", 20);
    const c = child("c", { x: 129, y: 1 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    // 370 - 20*2 = 330
    expect(out[0].size).toEqual({ x: 330, y: 1 });
  });

  it("subtracts per-side stackPadding (VERTICAL uses left+right)", () => {
    const p = parent({ x: 370, y: 52 }, "VERTICAL", { top: 8, right: 15, bottom: 8, left: 5 });
    const c = child("c", { x: 129, y: 1 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    // 370 - (5 + 15) = 350
    expect(out[0].size).toEqual({ x: 350, y: 1 });
  });

  it("subtracts per-side stackPadding (HORIZONTAL uses top+bottom)", () => {
    const p = parent({ x: 52, y: 370 }, "HORIZONTAL", { top: 12, right: 8, bottom: 3, left: 8 });
    const c = child("c", { x: 1, y: 129 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    // 370 - (12 + 3) = 355
    expect(out[0].size).toEqual({ x: 1, y: 355 });
  });

  it("leaves non-STRETCH children untouched", () => {
    const p = parent({ x: 370, y: 52 }, "VERTICAL");
    const c = child("c", { x: 129, y: 1 });
    const out = applyCounterAxisStretch(p, [c]);
    expect(out[0]).toBe(c);
  });

  it("does nothing when parent has no auto-layout", () => {
    const p = parent({ x: 370, y: 52 });
    const c = child("c", { x: 129, y: 1 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    expect(out[0]).toBe(c);
  });

  it("does nothing when parent stackMode is NONE", () => {
    const p = parent({ x: 370, y: 52 }, "NONE");
    const c = child("c", { x: 129, y: 1 }, true);
    const out = applyCounterAxisStretch(p, [c]);
    expect(out[0]).toBe(c);
  });

  it("returns the original array by reference when no child changed", () => {
    const p = parent({ x: 370, y: 52 }, "VERTICAL");
    const input: readonly Child[] = [child("c1", { x: 100, y: 10 }), child("c2", { x: 100, y: 10 })];
    const out = applyCounterAxisStretch(p, input);
    expect(out).toBe(input);
  });
});
