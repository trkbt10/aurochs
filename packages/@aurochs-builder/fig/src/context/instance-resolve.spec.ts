/**
 * @file Verify INSTANCE symbolId resolution against components map
 */

import { describe, it, expect } from "vitest";
import { createDemoFigDesignDocument } from "./demo-document";
import type { FigDesignNode } from "../types/document";
import { getPaintType } from "@aurochs/fig/color";
import type { FigColor } from "@aurochs/fig/types";

function findAllNodes(nodes: readonly FigDesignNode[]): FigDesignNode[] {
  const result: FigDesignNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) {
      result.push(...findAllNodes(node.children));
    }
  }
  return result;
}

/**
 * Extract color from a FigPaint using the SoT getPaintType() for type narrowing.
 * FigPaint.type can be a string literal or KiwiEnumValue, so direct
 * discriminated union narrowing doesn't work. We use getPaintType() to
 * normalize the type, then access the color field which exists on solid paints.
 */
function extractSolidColor(paint: { readonly type: unknown; readonly color?: FigColor }): FigColor | undefined {
  const paintType = getPaintType(paint as Parameters<typeof getPaintType>[0]);
  if (paintType === "SOLID") {
    return paint.color;
  }
  return undefined;
}

describe("INSTANCE symbolId resolution", () => {
  it("all INSTANCE nodes resolve to a component in the components map", async () => {
    const doc = await createDemoFigDesignDocument();

    const allNodes: FigDesignNode[] = [];
    for (const page of doc.pages) {
      allNodes.push(...findAllNodes(page.children));
    }

    const instances = allNodes.filter((n) => n.type === "INSTANCE");
    expect(instances.length).toBeGreaterThan(0);

    for (const inst of instances) {
      expect(inst.symbolId).toBeDefined();
      const resolved = doc.components.get(inst.symbolId!);
      expect(resolved, `INSTANCE "${inst.name}" with symbolId="${inst.symbolId}" should resolve`).toBeDefined();
    }
  }, 30_000);

  it("overrideBackground INSTANCE has its own fills", async () => {
    const doc = await createDemoFigDesignDocument();

    const allNodes: FigDesignNode[] = [];
    for (const page of doc.pages) {
      allNodes.push(...findAllNodes(page.children));
    }

    const danger = allNodes.find((n) => n.name === "Danger" && n.type === "INSTANCE");
    expect(danger).toBeDefined();
    // overrideBackground(RED) should set fillPaints on the INSTANCE
    expect(danger!.fills.length).toBeGreaterThan(0);
    // The fill should be red-ish (r = 0.9 in demo RED constant)
    const color = extractSolidColor(danger!.fills[0]);
    expect(color, "First fill should be a solid paint with color").toBeDefined();
    expect(color!.r).toBeCloseTo(0.9, 1);
  }, 30_000);
});
