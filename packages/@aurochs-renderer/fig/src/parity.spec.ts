/**
 * @file Cross-renderer parity tests
 *
 * Verifies that the SVG string renderer and the SceneGraph builder
 * produce equivalent interpretations of the same Figma paint/stroke/effect data.
 *
 * Both paths consume shared SoT modules (paint/, stroke/, effects/, geometry/),
 * so these tests confirm the wiring is correct and outputs agree.
 *
 * Test data uses the SSoT domain shape (FigPaintType strings, FigStroke*
 * strings) as emitted by the parser after kiwi→domain normalisation.
 */

import type {
  FigImage,
} from "@aurochs/fig/parser";
import type {
  FigGradientPaint,
  FigSolidPaint,
  FigEffect,
} from "@aurochs/fig/types";

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
  const linearGradient: FigGradientPaint = {
    type: "GRADIENT_LINEAR",
    opacity: 0.9,
    visible: true,
    blendMode: "NORMAL",
    stops: [
      { color: { r: 0.24, g: 0.47, b: 0.85, a: 1 }, position: 0 },
      { color: { r: 0.55, g: 0.30, b: 0.85, a: 1 }, position: 1 },
    ],
    // 90° rotation — matches the Flighty World-map paint. det = +1.
    transform: { m00: 6.123234e-17, m01: 1, m02: 0, m10: -1, m11: 6.123234e-17, m12: 1 },
  };

  it("shared SoT and SceneGraph produce identical gradient direction", () => {
    const shared = getGradientDirection(linearGradient);
    const fill = convertPaintToFill(linearGradient, NO_IMAGES)!;
    expect(fill.type).toBe("linear-gradient");
    if (fill.type === "linear-gradient") {
      expect(fill.start.x).toBeCloseTo(shared.start.x);
      expect(fill.start.y).toBeCloseTo(shared.start.y);
      expect(fill.end.x).toBeCloseTo(shared.end.x);
      expect(fill.end.y).toBeCloseTo(shared.end.y);
    }
  });

  it("shared SoT and SceneGraph produce identical gradient stops", () => {
    const sharedStops = getGradientStops(linearGradient);
    const fill = convertPaintToFill(linearGradient, NO_IMAGES)!;
    if (fill.type === "linear-gradient") {
      expect(fill.stops).toHaveLength(sharedStops.length);
      for (let i = 0; i < sharedStops.length; i++) {
        expect(fill.stops[i].position).toBe(sharedStops[i].position);
        expect(fill.stops[i].color.r).toBeCloseTo(sharedStops[i].color.r);
      }
    }
  });

  const radialGradient: FigGradientPaint = {
    type: "GRADIENT_RADIAL",
    opacity: 1,
    visible: true,
    stops: [
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
    ],
    transform: { m00: 0.5, m02: 0.5, m12: 0.5 },
  };

  it("shared SoT and SceneGraph produce identical radial center/radius", () => {
    const shared = getRadialGradientCenterAndRadius(radialGradient);
    const fill = convertPaintToFill(radialGradient, NO_IMAGES)!;
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
    const solidPaint: FigSolidPaint = {
      type: "SOLID",
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: 0.8,
      visible: true,
    };
    const paints = [solidPaint];
    const weight = { top: 1, right: 3, bottom: 2, left: 0 };
    const stroke = convertStrokeToSceneStroke(paints, weight, {
      strokeCap: "ROUND",
      strokeJoin: "BEVEL",
    });
    expect(stroke).toBeDefined();
    expect(stroke!.width).toBe(resolveStrokeWeight(weight));
    expect(stroke!.linecap).toBe(mapStrokeCap("ROUND"));
    expect(stroke!.linejoin).toBe(mapStrokeJoin("BEVEL"));
  });
});

describe("Effects parity", () => {
  it("SceneGraph effects use shared type detection and shadow extraction", () => {
    const dropShadow: FigEffect = {
      type: "DROP_SHADOW",
      visible: true,
      offset: { x: 2, y: 4 },
      radius: 8,
      color: { r: 0, g: 0, b: 0, a: 0.3 },
    };
    const innerShadow: FigEffect = {
      type: "INNER_SHADOW",
      visible: true,
      offset: { x: 0, y: 2 },
      radius: 4,
      color: { r: 0, g: 0, b: 0, a: 0.5 },
    };

    const effects = [dropShadow, innerShadow];
    const sceneEffects = convertEffectsToScene(effects);
    expect(sceneEffects).toHaveLength(2);

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
    expect(mapWindingRule("EVENODD")).toBe("evenodd");
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
