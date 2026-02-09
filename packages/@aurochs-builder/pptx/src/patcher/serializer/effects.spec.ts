/**
 * @file Effects serializer tests
 */

import { createElement, getChild } from "@aurochs/xml";
import { deg, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Effects } from "@aurochs-office/pptx/domain";
import { parseEffects } from "@aurochs-office/pptx/parser/graphics/effects-parser";
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

  it("returns null for empty effects", () => {
    const effects: Effects = {};
    const el = serializeEffects(effects);
    expect(el).toBeNull();
  });

  it("serializes alpha bi-level with threshold", () => {
    const effects: Effects = {
      alphaBiLevel: { threshold: pct(50) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaBiLevel");
    expect(child).toBeDefined();
    expect(child?.attrs.thresh).toBe("50000");
  });

  it("serializes alpha ceiling", () => {
    const effects: Effects = {
      alphaCeiling: { type: "alphaCeiling" },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaCeiling");
    expect(child).toBeDefined();
  });

  it("serializes alpha floor", () => {
    const effects: Effects = {
      alphaFloor: { type: "alphaFloor" },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaFloor");
    expect(child).toBeDefined();
  });

  it("serializes alpha inverse", () => {
    const effects: Effects = {
      alphaInv: { type: "alphaInv" },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaInv");
    expect(child).toBeDefined();
  });

  it("serializes alpha modulate fixed with amount", () => {
    const effects: Effects = {
      alphaModFix: { amount: pct(75) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaModFix");
    expect(child).toBeDefined();
    expect(child?.attrs.amt).toBe("75000");
  });

  it("serializes alpha outset with radius", () => {
    const effects: Effects = {
      alphaOutset: { radius: px(5) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaOutset");
    expect(child).toBeDefined();
    expect(child?.attrs.rad).toBe("47625");
  });

  it("serializes alpha replace with alpha", () => {
    const effects: Effects = {
      alphaRepl: { alpha: pct(50) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaRepl");
    expect(child).toBeDefined();
    expect(child?.attrs.a).toBe("50000");
  });

  it("serializes bi-level with threshold", () => {
    const effects: Effects = {
      biLevel: { threshold: pct(30) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:biLevel");
    expect(child).toBeDefined();
    expect(child?.attrs.thresh).toBe("30000");
  });

  it("serializes color change with useAlpha true", () => {
    const effects: Effects = {
      colorChange: {
        from: { spec: { type: "srgb", value: "FF0000" } },
        to: { spec: { type: "srgb", value: "0000FF" } },
        useAlpha: true,
      },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:clrChange");
    expect(child).toBeDefined();
    expect(child?.attrs.useA).toBe("1");
    expect(getChild(child!, "a:clrFrom")).toBeDefined();
    expect(getChild(child!, "a:clrTo")).toBeDefined();
  });

  it("serializes color replace", () => {
    const effects: Effects = {
      colorReplace: {
        color: { spec: { type: "srgb", value: "00FF00" } },
      },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:clrRepl");
    expect(child).toBeDefined();
    expect(getChild(child!, "a:srgbClr")?.attrs.val).toBe("00FF00");
  });

  it("serializes duotone with 2 colors", () => {
    const effects: Effects = {
      duotone: {
        colors: [
          { spec: { type: "srgb", value: "000000" } },
          { spec: { type: "srgb", value: "FFFFFF" } },
        ],
      },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:duotone");
    expect(child).toBeDefined();
    expect(child?.children.length).toBe(2);
  });

  it("serializes grayscale", () => {
    const effects: Effects = {
      grayscale: { type: "grayscl" },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:grayscl");
    expect(child).toBeDefined();
  });

  it("serializes relative offset with offsetX/offsetY", () => {
    const effects: Effects = {
      relativeOffset: { offsetX: pct(10), offsetY: pct(20) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:relOff");
    expect(child).toBeDefined();
    expect(child?.attrs.tx).toBe("10000");
    expect(child?.attrs.ty).toBe("20000");
  });

  it("serializes fill overlay with fillType solidFill (no fill property)", () => {
    const effects: Effects = {
      fillOverlay: { blend: "over", fillType: "solidFill" },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:fillOverlay");
    expect(child).toBeDefined();
    expect(child?.attrs.blend).toBe("over");
    expect(getChild(child!, "a:solidFill")).toBeDefined();
  });

  it("serializes effectDag container kind", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" } },
        blurRadius: px(4),
        distance: px(2),
        direction: deg(0),
      },
      containerKind: "effectDag",
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectDag");
    expect(getChild(el!, "a:outerShdw")).toBeDefined();
  });

  it("serializes outer shadow with optional fields (scaleX, scaleY, skewX, skewY)", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" } },
        blurRadius: px(4),
        distance: px(2),
        direction: deg(0),
        scaleX: pct(120),
        scaleY: pct(80),
        skewX: deg(10),
        skewY: deg(20),
      },
    };

    const el = serializeEffects(effects);
    const shdw = getChild(el!, "a:outerShdw");
    expect(shdw).toBeDefined();
    expect(shdw?.attrs.sx).toBe("120000");
    expect(shdw?.attrs.sy).toBe("80000");
    expect(shdw?.attrs.kx).toBe("600000");
    expect(shdw?.attrs.ky).toBe("1200000");
  });

  it("serializes blend effect with container", () => {
    const effects: Effects = {
      blend: {
        type: "blend",
        blend: "mult",
        container: { type: "sib", name: "test" },
      },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:blend");
    expect(child).toBeDefined();
    expect(child?.attrs.blend).toBe("mult");
    const cont = getChild(child!, "a:cont");
    expect(cont).toBeDefined();
    expect(cont?.attrs.type).toBe("sib");
    expect(cont?.attrs.name).toBe("test");
  });

  it("serializes soft edge effect", () => {
    const effects: Effects = {
      softEdge: { radius: px(10) },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:softEdge");
    expect(child).toBeDefined();
    expect(child?.attrs.rad).toBe("95250");
  });

  it("serializes alpha modulate effect with container", () => {
    const effects: Effects = {
      alphaMod: {
        type: "alphaMod",
        container: { type: "tree", name: "alpha" },
      },
    };

    const el = serializeEffects(effects);
    expect(el?.name).toBe("a:effectLst");
    const child = getChild(el!, "a:alphaMod");
    expect(child).toBeDefined();
    const cont = getChild(child!, "a:cont");
    expect(cont).toBeDefined();
    expect(cont?.attrs.type).toBe("tree");
    expect(cont?.attrs.name).toBe("alpha");
  });

  it("serializes alpha modulate effect without container (uses fallback)", () => {
    const effects: Effects = {
      alphaMod: {
        type: "alphaMod",
        containerType: "sib",
        name: "fallbackName",
      },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:alphaMod");
    expect(child).toBeDefined();
    const cont = getChild(child!, "a:cont");
    expect(cont).toBeDefined();
    expect(cont?.attrs.type).toBe("sib");
    expect(cont?.attrs.name).toBe("fallbackName");
  });

  it("serializes reflection with skewX, skewY, alignment, and rotateWithShape", () => {
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
        skewX: deg(15),
        skewY: deg(25),
        alignment: "br",
        rotateWithShape: false,
      },
    };

    const el = serializeEffects(effects);
    const refl = getChild(el!, "a:reflection");
    expect(refl).toBeDefined();
    expect(refl?.attrs.kx).toBe("900000");
    expect(refl?.attrs.ky).toBe("1500000");
    expect(refl?.attrs.algn).toBe("br");
    expect(refl?.attrs.rotWithShape).toBe("0");
  });

  it("serializes fill overlay with fillType gradFill (no fill property)", () => {
    const effects: Effects = {
      fillOverlay: { blend: "mult", fillType: "gradFill" },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:fillOverlay");
    expect(child).toBeDefined();
    expect(getChild(child!, "a:gradFill")).toBeDefined();
  });

  it("serializes fill overlay with fillType blipFill (no fill property)", () => {
    const effects: Effects = {
      fillOverlay: { blend: "over", fillType: "blipFill" },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:fillOverlay");
    expect(child).toBeDefined();
    expect(getChild(child!, "a:blipFill")).toBeDefined();
  });

  it("serializes fill overlay with fillType pattFill (no fill property)", () => {
    const effects: Effects = {
      fillOverlay: { blend: "screen", fillType: "pattFill" },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:fillOverlay");
    expect(child).toBeDefined();
    expect(getChild(child!, "a:pattFill")).toBeDefined();
  });

  it("serializes fill overlay with fillType grpFill (no fill property)", () => {
    const effects: Effects = {
      fillOverlay: { blend: "darken", fillType: "grpFill" },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:fillOverlay");
    expect(child).toBeDefined();
    expect(getChild(child!, "a:grpFill")).toBeDefined();
  });

  it("serializes fill overlay with fill property (uses serializeFill)", () => {
    const effects: Effects = {
      fillOverlay: {
        blend: "over",
        fillType: "solidFill",
        fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
      },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:fillOverlay");
    expect(child).toBeDefined();
    expect(getChild(child!, "a:solidFill")).toBeDefined();
  });

  it("serializes blend effect without container (uses fallback)", () => {
    const effects: Effects = {
      blend: {
        type: "blend",
        blend: "over",
        containerType: "tree",
        name: "blendFallback",
      },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:blend");
    expect(child).toBeDefined();
    const cont = getChild(child!, "a:cont");
    expect(cont).toBeDefined();
    expect(cont?.attrs.type).toBe("tree");
    expect(cont?.attrs.name).toBe("blendFallback");
  });

  it("serializes effect container with no type or name", () => {
    const effects: Effects = {
      alphaMod: {
        type: "alphaMod",
      },
    };

    const el = serializeEffects(effects);
    const child = getChild(el!, "a:alphaMod");
    expect(child).toBeDefined();
    const cont = getChild(child!, "a:cont");
    expect(cont).toBeDefined();
    expect(cont?.attrs.type).toBeUndefined();
    expect(cont?.attrs.name).toBeUndefined();
  });
});
