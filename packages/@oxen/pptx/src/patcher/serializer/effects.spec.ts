/**
 * @file Effects serializer tests
 */

import { createElement, getChild } from "@oxen/xml";
import { deg, pct, px } from "@oxen/ooxml/domain/units";
import type { Effects } from "../../domain";
import { parseEffects } from "../../parser/graphics/effects-parser";
import { serializeEffects } from "./effects";

describe("serializeEffects", () => {
  it("serializes outer shadow", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
        blurRadius: px(8),
        distance: px(6),
        direction: deg(45),
        alignment: "tl",
        rotateWithShape: true,
      },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const shdw = getChild(el!, "a:outerShdw");
    expect(shdw?.attrs.blurRad).toBe("76200");
    expect(shdw?.attrs.dist).toBe("57150");
    expect(shdw?.attrs.dir).toBe("2700000");
    expect(getChild(shdw!, "a:srgbClr")).toBeDefined();
  });

  it("serializes inner shadow", () => {
    const effects: Effects = {
      shadow: {
        type: "inner",
        color: { spec: { type: "srgb", value: "000000" } },
        blurRadius: px(4),
        distance: px(2),
        direction: deg(90),
      },
    };

    const el = serializeEffects(effects);
    const shdw = getChild(el!, "a:innerShdw");
    expect(shdw?.attrs.blurRad).toBe("38100");
    expect(shdw?.attrs.dist).toBe("19050");
    expect(shdw?.attrs.dir).toBe("5400000");
  });

  it("serializes glow", () => {
    const effects: Effects = {
      glow: {
        color: { spec: { type: "srgb", value: "00FF00" } },
        radius: px(5),
      },
    };

    const el = serializeEffects(effects);
    const glow = getChild(el!, "a:glow");
    expect(glow?.attrs.rad).toBe("47625");
    expect(getChild(glow!, "a:srgbClr")?.attrs.val).toBe("00FF00");
  });

  it("serializes reflection", () => {
    const effects: Effects = {
      reflection: {
        blurRadius: px(2),
        startOpacity: pct(100),
        startPosition: pct(0),
        endOpacity: pct(0),
        endPosition: pct(100),
        distance: px(10),
        direction: deg(0),
        fadeDirection: deg(90),
        scaleX: pct(100),
        scaleY: pct(100),
      },
    };

    const el = serializeEffects(effects);
    const refl = getChild(el!, "a:reflection");
    expect(refl?.attrs.blurRad).toBe("19050");
    expect(refl?.attrs.dist).toBe("95250");
    expect(refl?.attrs.fadeDir).toBe("5400000");
  });

  it("serializes preset shadow", () => {
    const effects: Effects = {
      presetShadow: {
        type: "preset",
        preset: "shdw10",
        color: { spec: { type: "srgb", value: "112233" } },
        direction: deg(180),
        distance: px(3),
      },
    };

    const el = serializeEffects(effects);
    const prst = getChild(el!, "a:prstShdw");
    expect(prst?.attrs.prst).toBe("shdw10");
    expect(prst?.attrs.dir).toBe("10800000");
    expect(prst?.attrs.dist).toBe("28575");
  });

  it("serializes multiple effects", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" } },
        blurRadius: px(1),
        distance: px(1),
        direction: deg(0),
      },
      glow: {
        color: { spec: { type: "srgb", value: "FF0000" } },
        radius: px(2),
      },
    };

    const el = serializeEffects(effects);
    expect(getChild(el!, "a:outerShdw")).toBeDefined();
    expect(getChild(el!, "a:glow")).toBeDefined();
  });

  it("round-trips through parser", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
        blurRadius: px(8),
        distance: px(6),
        direction: deg(45),
        scaleX: pct(100),
        scaleY: pct(100),
        alignment: "tl",
        rotateWithShape: true,
      },
      glow: {
        color: { spec: { type: "srgb", value: "00FF00" } },
        radius: px(5),
      },
    };

    const effectLst = serializeEffects(effects);
    expect(effectLst).not.toBeNull();

    const spPr = createElement("p:spPr", {}, [effectLst!]);
    const parsed = parseEffects(spPr);
    // Parser adds containerKind and some optional fields with undefined values
    // Use toMatchObject for the core effect properties
    expect(parsed).toMatchObject({
      shadow: effects.shadow,
      glow: expect.objectContaining({
        radius: effects.glow!.radius,
        color: expect.objectContaining({
          spec: effects.glow!.color.spec,
        }),
      }),
    });
    expect(parsed?.containerKind).toBe("effectLst");
  });
});
