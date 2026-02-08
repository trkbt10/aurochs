/** @file List data parser tests */
import { parseListDefinitions, parseListOverrides } from "./list-data";

function pushUint16(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

function pushInt32(arr: number[], value: number): void {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setInt32(0, value, true);
  const bytes = new Uint8Array(buf);
  arr.push(bytes[0], bytes[1], bytes[2], bytes[3]);
}

/**
 * Build a minimal PlfLst binary fixture.
 *
 * Layout:
 *   cLst(2B) — number of list definitions
 *   LSTF[cLst] — 28 bytes each (lsid, tplc, rgistdPara[9], flags, grfhic)
 *   LVL[] — variable length, one per level per LSTF
 */
function buildPlfLst(definitions: Array<{
  lsid: number;
  simpleList: boolean;
  levels: Array<{
    start: number;
    format: number;
    text: string;
    alignment: number;
    follow: number;
  }>;
}>): Uint8Array {
  const bytes: number[] = [];

  // cLst
  pushUint16(bytes, definitions.length);

  // LSTF entries (28 bytes each)
  for (const def of definitions) {
    const lstf = new Uint8Array(28);
    const view = new DataView(lstf.buffer);
    view.setInt32(0, def.lsid, true); // lsid
    // bytes 4-25: tplc, rgistdPara, etc. (zero-filled)
    lstf[26] = def.simpleList ? 0x01 : 0x00; // flags: fSimpleList
    // byte 27: grfhic (zero)
    bytes.push(...lstf);
  }

  // LVL entries (after all LSTFs)
  for (const def of definitions) {
    for (const level of def.levels) {
      // LVLF (28 bytes)
      const lvlf = new Uint8Array(28);
      const lvlfView = new DataView(lvlf.buffer);
      lvlfView.setInt32(0, level.start, true); // iStartAt
      lvlf[4] = level.format; // nfc
      lvlf[5] = level.alignment & 0x03; // jc
      lvlf[17] = level.follow; // ixchFollow
      lvlf[26] = 0; // cbGrpprlChpx
      lvlf[27] = 0; // cbGrpprlPapx
      bytes.push(...lvlf);

      // xst: cch(2B) + UTF-16LE string
      pushUint16(bytes, level.text.length);
      for (let c = 0; c < level.text.length; c++) {
        pushUint16(bytes, level.text.charCodeAt(c));
      }
    }
  }

  return new Uint8Array(bytes);
}

function pushUint32(arr: number[], value: number): void {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, value, true);
  const bytes = new Uint8Array(buf);
  arr.push(bytes[0], bytes[1], bytes[2], bytes[3]);
}

/**
 * Build a minimal PlfLfo binary fixture.
 *
 * Layout:
 *   cLfo(4B) — number of overrides
 *   LFO[cLfo] — 16 bytes each (lsid(4B) + unused(4B) + clfolvl(4B) + ibstFltAutoNum(4B))
 *   LFOLVL[] — sequential after all LFOs
 */
function buildPlfLfo(overrides: Array<{
  lsid: number;
  clfolvl?: number;
  lfolvls?: Array<{
    ilvl: number;
    fStartAt?: boolean;
    iStartAt?: number;
  }>;
}>): Uint8Array {
  const bytes: number[] = [];

  // cLfo (4 bytes)
  pushInt32(bytes, overrides.length);

  // LFO entries (16 bytes each)
  for (const ov of overrides) {
    const lfo = new Uint8Array(16);
    const view = new DataView(lfo.buffer);
    view.setInt32(0, ov.lsid, true);
    view.setUint32(8, ov.clfolvl ?? 0, true); // clfolvl
    bytes.push(...lfo);
  }

  // LFOLVL entries (after all LFOs)
  for (const ov of overrides) {
    if (!ov.lfolvls) continue;
    for (const lfolvl of ov.lfolvls) {
      // iStartAt (4B)
      pushInt32(bytes, lfolvl.iStartAt ?? 0);
      // flags: ilvl(4bit) + fStartAt(1bit) + fFormatting(1bit) + reserved(26bit)
      const flags = (lfolvl.ilvl & 0x0f)
        | ((lfolvl.fStartAt ? 1 : 0) << 4)
        | (0 << 5); // fFormatting = 0 (no LVL follows)
      pushUint32(bytes, flags);
    }
  }

  return new Uint8Array(bytes);
}

describe("parseListDefinitions", () => {
  it("returns empty for lcb=0", () => {
    expect(parseListDefinitions(new Uint8Array(100), 0, 0)).toEqual([]);
  });

  it("returns empty when fc+lcb exceeds stream", () => {
    expect(parseListDefinitions(new Uint8Array(10), 5, 20)).toEqual([]);
  });

  it("parses single simple list (1 level)", () => {
    const data = buildPlfLst([{
      lsid: 42,
      simpleList: true,
      levels: [{
        start: 1,
        format: 0, // decimal
        text: "%1.",
        alignment: 0,
        follow: 0, // tab
      }],
    }]);

    const defs = parseListDefinitions(data, 0, data.length);
    expect(defs).toHaveLength(1);
    expect(defs[0].lsid).toBe(42);
    expect(defs[0].simpleList).toBe(true);
    expect(defs[0].levels).toHaveLength(1);
    expect(defs[0].levels[0].start).toBe(1);
    expect(defs[0].levels[0].format).toBe(0);
    expect(defs[0].levels[0].text).toBe("%1.");
    expect(defs[0].levels[0].alignment).toBe(0);
    expect(defs[0].levels[0].follow).toBe(0);
  });

  it("parses multi-level list (9 levels)", () => {
    const levels = Array.from({ length: 9 }, (_, i) => ({
      start: i + 1,
      format: i === 0 ? 0 : 4, // decimal for first, bullet for others
      text: `L${i}`,
      alignment: 0,
      follow: 0,
    }));

    const data = buildPlfLst([{
      lsid: 100,
      simpleList: false,
      levels,
    }]);

    const defs = parseListDefinitions(data, 0, data.length);
    expect(defs).toHaveLength(1);
    expect(defs[0].simpleList).toBe(false);
    expect(defs[0].levels).toHaveLength(9);
    expect(defs[0].levels[0].start).toBe(1);
    expect(defs[0].levels[8].start).toBe(9);
  });

  it("parses multiple list definitions", () => {
    const data = buildPlfLst([
      {
        lsid: 1,
        simpleList: true,
        levels: [{ start: 1, format: 0, text: "%1.", alignment: 0, follow: 0 }],
      },
      {
        lsid: 2,
        simpleList: true,
        levels: [{ start: 1, format: 23, text: "\u2022", alignment: 0, follow: 0 }],
      },
    ]);

    const defs = parseListDefinitions(data, 0, data.length);
    expect(defs).toHaveLength(2);
    expect(defs[0].lsid).toBe(1);
    expect(defs[1].lsid).toBe(2);
    expect(defs[1].levels[0].format).toBe(23); // bullet
  });

  it("preserves level properties (alignment, follow)", () => {
    const data = buildPlfLst([{
      lsid: 1,
      simpleList: true,
      levels: [{
        start: 5,
        format: 2, // lowerRoman
        text: "%1)",
        alignment: 2, // right
        follow: 1, // space
      }],
    }]);

    const defs = parseListDefinitions(data, 0, data.length);
    expect(defs[0].levels[0].start).toBe(5);
    expect(defs[0].levels[0].alignment).toBe(2);
    expect(defs[0].levels[0].follow).toBe(1);
  });

  it("parses with non-zero fc offset", () => {
    const plfLst = buildPlfLst([{
      lsid: 7,
      simpleList: true,
      levels: [{ start: 1, format: 0, text: ".", alignment: 0, follow: 0 }],
    }]);

    const padded = new Uint8Array(30 + plfLst.length);
    padded.set(plfLst, 30);

    const defs = parseListDefinitions(padded, 30, plfLst.length);
    expect(defs).toHaveLength(1);
    expect(defs[0].lsid).toBe(7);
  });
});

describe("parseListOverrides", () => {
  it("returns empty for lcb=0", () => {
    expect(parseListOverrides(new Uint8Array(100), 0, 0)).toEqual([]);
  });

  it("returns empty when fc+lcb exceeds stream", () => {
    expect(parseListOverrides(new Uint8Array(10), 5, 20)).toEqual([]);
  });

  it("parses single override", () => {
    const data = buildPlfLfo([{ lsid: 42 }]);

    const overrides = parseListOverrides(data, 0, data.length);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].lsid).toBe(42);
  });

  it("parses multiple overrides", () => {
    const data = buildPlfLfo([
      { lsid: 1 },
      { lsid: 2 },
      { lsid: 3 },
    ]);

    const overrides = parseListOverrides(data, 0, data.length);
    expect(overrides).toHaveLength(3);
    expect(overrides[0].lsid).toBe(1);
    expect(overrides[1].lsid).toBe(2);
    expect(overrides[2].lsid).toBe(3);
  });

  it("parses with non-zero fc offset", () => {
    const plfLfo = buildPlfLfo([{ lsid: 99 }]);
    const padded = new Uint8Array(10 + plfLfo.length);
    padded.set(plfLfo, 10);

    const overrides = parseListOverrides(padded, 10, plfLfo.length);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].lsid).toBe(99);
  });

  it("parses LFOLVL with startOverride", () => {
    const data = buildPlfLfo([{
      lsid: 42,
      clfolvl: 1,
      lfolvls: [{ ilvl: 0, fStartAt: true, iStartAt: 5 }],
    }]);

    const overrides = parseListOverrides(data, 0, data.length);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].lsid).toBe(42);
    expect(overrides[0].levelOverrides).toBeDefined();
    expect(overrides[0].levelOverrides).toHaveLength(1);
    expect(overrides[0].levelOverrides![0].level).toBe(0);
    expect(overrides[0].levelOverrides![0].startOverride).toBe(5);
  });

  it("parses LFOLVL without startOverride (fStartAt=0)", () => {
    const data = buildPlfLfo([{
      lsid: 42,
      clfolvl: 1,
      lfolvls: [{ ilvl: 2, fStartAt: false }],
    }]);

    const overrides = parseListOverrides(data, 0, data.length);
    expect(overrides[0].levelOverrides).toHaveLength(1);
    expect(overrides[0].levelOverrides![0].level).toBe(2);
    expect(overrides[0].levelOverrides![0].startOverride).toBeUndefined();
  });

  it("parses multiple LFOLVL entries for single LFO", () => {
    const data = buildPlfLfo([{
      lsid: 10,
      clfolvl: 3,
      lfolvls: [
        { ilvl: 0, fStartAt: true, iStartAt: 1 },
        { ilvl: 1, fStartAt: true, iStartAt: 10 },
        { ilvl: 2, fStartAt: false },
      ],
    }]);

    const overrides = parseListOverrides(data, 0, data.length);
    expect(overrides[0].levelOverrides).toHaveLength(3);
    expect(overrides[0].levelOverrides![0]).toEqual({ level: 0, startOverride: 1 });
    expect(overrides[0].levelOverrides![1]).toEqual({ level: 1, startOverride: 10 });
    expect(overrides[0].levelOverrides![2]).toEqual({ level: 2 });
  });

  it("mixes LFOs with and without LFOLVL", () => {
    const data = buildPlfLfo([
      { lsid: 1, clfolvl: 0 },
      { lsid: 2, clfolvl: 1, lfolvls: [{ ilvl: 0, fStartAt: true, iStartAt: 3 }] },
      { lsid: 3, clfolvl: 0 },
    ]);

    const overrides = parseListOverrides(data, 0, data.length);
    expect(overrides).toHaveLength(3);
    expect(overrides[0].levelOverrides).toBeUndefined();
    expect(overrides[1].levelOverrides).toHaveLength(1);
    expect(overrides[1].levelOverrides![0].startOverride).toBe(3);
    expect(overrides[2].levelOverrides).toBeUndefined();
  });
});
