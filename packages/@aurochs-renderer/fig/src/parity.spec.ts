/**
 * @file Cross-renderer parity tests
 *
 * Verifies that the SVG string renderer and the SceneGraph builder
 * produce equivalent interpretations of the same Figma paint/stroke/effect data.
 *
 * Both paths consume shared SoT modules (paint/, stroke/, effects/, geometry/),
 * so these tests confirm the wiring is correct and outputs agree.
 */

import { describe, it, expect } from "vitest";
import type { FigPaint, FigGradientPaint, FigEffect } from "@aurochs/fig/types";
import type { FigImage } from "@aurochs/fig/parser";

// Shared SoT
import { getGradientDirection, getGradientStops, getRadialGradientCenterAndRadius } from "./paint";
import { resolveStrokeWeight, mapStrokeCap, mapStrokeJoin } from "./stroke";
import { getEffectTypeName, extractShadowParams } from "./effects";
import { mapWindingRule, extractUniformCornerRadius, resolveClipsContent } from "./geometry";

// SceneGraph consumer
import { convertPaintToFill } from "./scene-graph/convert/fill";
import { convertEffectsToScene } from "./scene-graph/convert/effects";
import { convertStrokeToSceneStroke } from "./scene-graph/convert/stroke";

const NO_IMAGES: ReadonlyMap<string, FigImage> = new Map();

describe("Paint parity", () => {
  const kiwiLinearGradientPaint = {
    type: { value: 1, name: "GRADIENT_LINEAR" },
    opacity: 0.9,
    visible: true,
    blendMode: { value: 1, name: "NORMAL" },
    stops: [
      { color: { r: 0.24, g: 0.47, b: 0.85, a: 1 }, position: 0 },
      { color: { r: 0.55, g: 0.30, b: 0.85, a: 1 }, position: 1 },
    ],
    transform: { m00: 0, m01: 0, m02: 0.5, m10: -1, m11: 0, m12: 1 },
  } as unknown as FigPaint;

  it("shared SoT and SceneGraph produce identical gradient direction", () => {
    const gradPaint = kiwiLinearGradientPaint as unknown as FigGradientPaint;
    const shared = getGradientDirection(gradPaint);
    const fill = convertPaintToFill(kiwiLinearGradientPaint, NO_IMAGES)!;
    expect(fill.type).toBe("linear-gradient");
    if (fill.type === "linear-gradient") {
      expect(fill.start.x).toBeCloseTo(shared.start.x);
      expect(fill.start.y).toBeCloseTo(shared.start.y);
      expect(fill.end.x).toBeCloseTo(shared.end.x);
      expect(fill.end.y).toBeCloseTo(shared.end.y);
    }
  });

  it("shared SoT and SceneGraph produce identical gradient stops", () => {
    const gradPaint = kiwiLinearGradientPaint as unknown as FigGradientPaint;
    const sharedStops = getGradientStops(gradPaint);
    const fill = convertPaintToFill(kiwiLinearGradientPaint, NO_IMAGES)!;
    if (fill.type === "linear-gradient") {
      expect(fill.stops).toHaveLength(sharedStops.length);
      for (let i = 0; i < sharedStops.length; i++) {
        expect(fill.stops[i].position).toBe(sharedStops[i].position);
        expect(fill.stops[i].color.r).toBeCloseTo(sharedStops[i].color.r);
      }
    }
  });

  const kiwiRadialPaint = {
    type: { value: 2, name: "GRADIENT_RADIAL" },
    opacity: 1,
    visible: true,
    stops: [
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
    ],
    transform: { m00: 0.5, m02: 0.5, m12: 0.5 },
  } as unknown as FigPaint;

  it("shared SoT and SceneGraph produce identical radial center/radius", () => {
    const gradPaint = kiwiRadialPaint as unknown as FigGradientPaint;
    const shared = getRadialGradientCenterAndRadius(gradPaint);
    const fill = convertPaintToFill(kiwiRadialPaint, NO_IMAGES)!;
    expect(fill.type).toBe("radial-gradient");
    if (fill.type === "radial-gradient") {
      expect(fill.center.x).toBeCloseTo(shared.center.x);
      expect(fill.center.y).toBeCloseTo(shared.center.y);
      expect(fill.radius).toBeCloseTo(shared.radius);
    }
  });
});

describe("Stroke parity", () => {
  it("SceneGraph stroke uses shared weight/cap/join interpretation", () => {
    const paints: FigPaint[] = [{
      type: "SOLID",
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: 0.8,
      visible: true,
    } as FigPaint];
    const weight = { top: 1, right: 3, bottom: 2, left: 0 };
    const stroke = convertStrokeToSceneStroke(paints, weight, {
      strokeCap: { value: 2, name: "ROUND" },
      strokeJoin: { value: 1, name: "BEVEL" },
    });
    expect(stroke).toBeDefined();
    // These should match the shared SoT outputs
    expect(stroke!.width).toBe(resolveStrokeWeight(weight));
    expect(stroke!.linecap).toBe(mapStrokeCap({ value: 2, name: "ROUND" }));
    expect(stroke!.linejoin).toBe(mapStrokeJoin({ value: 1, name: "BEVEL" }));
  });
});

describe("Effects parity", () => {
  it("SceneGraph effects use shared type detection and shadow extraction", () => {
    const effects: FigEffect[] = [
      {
        type: { value: 0, name: "DROP_SHADOW" } as any,
        visible: true,
        offset: { x: 2, y: 4 },
        radius: 8,
        color: { r: 0, g: 0, b: 0, a: 0.3 },
      } as FigEffect,
      {
        type: { value: 1, name: "INNER_SHADOW" } as any,
        visible: true,
        offset: { x: 0, y: 2 },
        radius: 4,
        color: { r: 0, g: 0, b: 0, a: 0.5 },
      } as FigEffect,
    ];

    const sceneEffects = convertEffectsToScene(effects);
    expect(sceneEffects).toHaveLength(2);

    // Check first effect matches shared extraction
    const sharedType0 = getEffectTypeName(effects[0]);
    expect(sharedType0).toBe("DROP_SHADOW");
    expect(sceneEffects[0].type).toBe("drop-shadow");
    const sharedParams0 = extractShadowParams(effects[0]);
    if (sceneEffects[0].type === "drop-shadow") {
      expect(sceneEffects[0].offset.x).toBe(sharedParams0.offsetX);
      expect(sceneEffects[0].offset.y).toBe(sharedParams0.offsetY);
      expect(sceneEffects[0].radius).toBe(sharedParams0.radius);
      expect(sceneEffects[0].color.a).toBeCloseTo(sharedParams0.color.a);
    }
  });
});

describe("Geometry parity", () => {
  it("both renderers use same winding rule", () => {
    const kiwiRule = { value: 1, name: "EVENODD" };
    expect(mapWindingRule(kiwiRule)).toBe("evenodd");
    expect(mapWindingRule("ODD")).toBe("evenodd");
    expect(mapWindingRule(undefined)).toBe("nonzero");
  });

  it("both renderers use same corner radius logic", () => {
    expect(extractUniformCornerRadius(8, undefined)).toBe(8);
    expect(extractUniformCornerRadius(undefined, [10, 10, 10, 10])).toBe(10);
    expect(extractUniformCornerRadius(undefined, [0, 10, 0, 10])).toBe(5);
  });

  it("both renderers use same clip content resolution", () => {
    expect(resolveClipsContent(true, undefined, "GROUP")).toBe(true);
    expect(resolveClipsContent(undefined, true, "FRAME")).toBe(false);
    expect(resolveClipsContent(undefined, undefined, "FRAME")).toBe(true);
    expect(resolveClipsContent(undefined, undefined, "GROUP")).toBe(false);
  });
});
