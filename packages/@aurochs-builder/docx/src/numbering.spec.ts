/**
 * @file Tests for DOCX numbering serialization
 */
import { getChild, getChildren } from "@aurochs/xml";
import type {
  DocxLevel,
  DocxAbstractNum,
  DocxLevelOverride,
  DocxNum,
  DocxNumbering,
} from "@aurochs-office/docx/domain/numbering";
import {
  serializeLevel,
  serializeAbstractNum,
  serializeLevelOverride,
  serializeNum,
  serializeNumbering,
} from "./numbering";

// =============================================================================
// serializeLevel
// =============================================================================

describe("serializeLevel", () => {
  it("serializes basic level", () => {
    const level: DocxLevel = {
      ilvl: 0,
      start: 1,
      numFmt: "decimal",
      lvlText: { val: "%1." },
      lvlJc: "left",
    };
    const el = serializeLevel(level);
    expect(el.name).toBe("w:lvl");
    expect(el.attrs["w:ilvl"]).toBe("0");
    expect(getChild(el, "w:start")?.attrs["w:val"]).toBe("1");
    expect(getChild(el, "w:numFmt")?.attrs["w:val"]).toBe("decimal");
    expect(getChild(el, "w:lvlText")?.attrs["w:val"]).toBe("%1.");
    expect(getChild(el, "w:lvlJc")?.attrs["w:val"]).toBe("left");
  });

  it("serializes bullet level", () => {
    const level: DocxLevel = {
      ilvl: 0,
      numFmt: "bullet",
      lvlText: { val: "\u2022" },
    };
    const el = serializeLevel(level);
    expect(getChild(el, "w:numFmt")?.attrs["w:val"]).toBe("bullet");
    expect(getChild(el, "w:lvlText")?.attrs["w:val"]).toBe("\u2022");
  });

  it("serializes lvlText with null attribute", () => {
    const level: DocxLevel = {
      ilvl: 0,
      lvlText: { val: "", null: true },
    };
    const el = serializeLevel(level);
    const lvlText = getChild(el, "w:lvlText")!;
    expect(lvlText.attrs["w:val"]).toBe("");
    expect(lvlText.attrs["w:null"]).toBe("1");
  });

  it("serializes lvlRestart", () => {
    const el = serializeLevel({ ilvl: 1, lvlRestart: 0 });
    expect(getChild(el, "w:lvlRestart")?.attrs["w:val"]).toBe("0");
  });

  it("serializes pStyle", () => {
    const el = serializeLevel({ ilvl: 0, pStyle: "ListBullet" });
    expect(getChild(el, "w:pStyle")?.attrs["w:val"]).toBe("ListBullet");
  });

  it("serializes isLgl as empty element", () => {
    const el = serializeLevel({ ilvl: 0, isLgl: true });
    expect(getChild(el, "w:isLgl")).toBeDefined();
  });

  it("serializes suff", () => {
    const el = serializeLevel({ ilvl: 0, suff: "tab" });
    expect(getChild(el, "w:suff")?.attrs["w:val"]).toBe("tab");
  });

  it("serializes lvlPicBulletId", () => {
    const el = serializeLevel({ ilvl: 0, lvlPicBulletId: { numPicBulletId: 0 } });
    expect(getChild(el, "w:lvlPicBulletId")?.attrs["w:val"]).toBe("0");
  });

  it("serializes legacy", () => {
    const el = serializeLevel({
      ilvl: 0,
      legacy: { legacy: true, legacySpace: 120, legacyIndent: 360 },
    });
    const legacy = getChild(el, "w:legacy")!;
    expect(legacy.attrs["w:legacy"]).toBe("1");
    expect(legacy.attrs["w:legacySpace"]).toBe("120");
    expect(legacy.attrs["w:legacyIndent"]).toBe("360");
  });

  it("serializes pPr and rPr", () => {
    const el = serializeLevel({
      ilvl: 0,
      pPr: { ind: { left: 720, hanging: 360 } },
      rPr: { rFonts: { ascii: "Symbol" } },
    });
    expect(getChild(el, "w:pPr")).toBeDefined();
    expect(getChild(el, "w:rPr")).toBeDefined();
  });
});

// =============================================================================
// serializeAbstractNum
// =============================================================================

describe("serializeAbstractNum", () => {
  it("serializes abstract numbering with levels", () => {
    const abstractNum: DocxAbstractNum = {
      abstractNumId: 0,
      nsid: "FFFFFF89",
      multiLevelType: "hybridMultilevel",
      tmpl: "12345678",
      lvl: [
        { ilvl: 0, start: 1, numFmt: "decimal", lvlText: { val: "%1." } },
        { ilvl: 1, start: 1, numFmt: "lowerLetter", lvlText: { val: "%2." } },
      ],
    };
    const el = serializeAbstractNum(abstractNum);
    expect(el.name).toBe("w:abstractNum");
    expect(el.attrs["w:abstractNumId"]).toBe("0");
    expect(getChild(el, "w:nsid")?.attrs["w:val"]).toBe("FFFFFF89");
    expect(getChild(el, "w:multiLevelType")?.attrs["w:val"]).toBe("hybridMultilevel");
    expect(getChild(el, "w:tmpl")?.attrs["w:val"]).toBe("12345678");
    expect(getChildren(el, "w:lvl")).toHaveLength(2);
  });

  it("serializes styleLink and numStyleLink", () => {
    const abstractNum: DocxAbstractNum = {
      abstractNumId: 1,
      styleLink: "ListNumber",
      numStyleLink: "ListBullet",
      lvl: [],
    };
    const el = serializeAbstractNum(abstractNum);
    expect(getChild(el, "w:styleLink")?.attrs["w:val"]).toBe("ListNumber");
    expect(getChild(el, "w:numStyleLink")?.attrs["w:val"]).toBe("ListBullet");
  });
});

// =============================================================================
// serializeLevelOverride
// =============================================================================

describe("serializeLevelOverride", () => {
  it("serializes with startOverride", () => {
    const override: DocxLevelOverride = { ilvl: 0, startOverride: 5 };
    const el = serializeLevelOverride(override);
    expect(el.name).toBe("w:lvlOverride");
    expect(el.attrs["w:ilvl"]).toBe("0");
    expect(getChild(el, "w:startOverride")?.attrs["w:val"]).toBe("5");
  });

  it("serializes with level replacement", () => {
    const override: DocxLevelOverride = {
      ilvl: 0,
      lvl: { ilvl: 0, numFmt: "upperRoman", lvlText: { val: "%1." } },
    };
    const el = serializeLevelOverride(override);
    expect(getChild(el, "w:lvl")).toBeDefined();
  });

  it("serializes with both startOverride and lvl", () => {
    const override: DocxLevelOverride = {
      ilvl: 1,
      startOverride: 10,
      lvl: { ilvl: 1, numFmt: "decimal" },
    };
    const el = serializeLevelOverride(override);
    expect(getChild(el, "w:startOverride")).toBeDefined();
    expect(getChild(el, "w:lvl")).toBeDefined();
  });
});

// =============================================================================
// serializeNum
// =============================================================================

describe("serializeNum", () => {
  it("serializes numbering instance", () => {
    const num: DocxNum = { numId: 1, abstractNumId: 0 };
    const el = serializeNum(num);
    expect(el.name).toBe("w:num");
    expect(el.attrs["w:numId"]).toBe("1");
    expect(getChild(el, "w:abstractNumId")?.attrs["w:val"]).toBe("0");
  });

  it("serializes with level overrides", () => {
    const num: DocxNum = {
      numId: 2,
      abstractNumId: 0,
      lvlOverride: [
        { ilvl: 0, startOverride: 1 },
        { ilvl: 1, startOverride: 1 },
      ],
    };
    const el = serializeNum(num);
    expect(getChildren(el, "w:lvlOverride")).toHaveLength(2);
  });
});

// =============================================================================
// serializeNumbering
// =============================================================================

describe("serializeNumbering", () => {
  it("serializes numbering document with namespaces", () => {
    const numbering: DocxNumbering = {
      abstractNum: [{ abstractNumId: 0, lvl: [{ ilvl: 0, numFmt: "bullet" }] }],
      num: [{ numId: 1, abstractNumId: 0 }],
    };
    const el = serializeNumbering(numbering);
    expect(el.name).toBe("w:numbering");
    expect(el.attrs["xmlns:w"]).toBeDefined();
    expect(el.attrs["xmlns:r"]).toBeDefined();
    expect(getChildren(el, "w:abstractNum")).toHaveLength(1);
    expect(getChildren(el, "w:num")).toHaveLength(1);
  });

  it("serializes empty numbering", () => {
    const el = serializeNumbering({});
    expect(el.name).toBe("w:numbering");
    expect(el.children).toHaveLength(0);
  });
});
