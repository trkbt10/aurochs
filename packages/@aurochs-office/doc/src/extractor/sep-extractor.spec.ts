/** @file SEP extractor tests */
import { parseSepx, sepPropsToSection, parsePlcfSed } from "./sep-extractor";

describe("parseSepx", () => {
  it("returns empty for invalid offset", () => {
    expect(parseSepx(new Uint8Array(10), -1)).toEqual({});
  });

  it("parses page width and height", () => {
    // SEPX: cb(2B) + sprmSXaPage(0xB01F)=12240 + sprmSYaPage(0xB020)=15840
    const data = new Uint8Array(100);
    const view = new DataView(data.buffer);
    view.setUint16(0, 8, true); // cb = 8 bytes of grpprl
    // sprmSXaPage
    view.setUint16(2, 0xb01f, true);
    view.setUint16(4, 12240, true);
    // sprmSYaPage
    view.setUint16(6, 0xb020, true);
    view.setUint16(8, 15840, true);

    const props = parseSepx(data, 0);
    expect(props.pageWidth).toBe(12240);
    expect(props.pageHeight).toBe(15840);
  });

  it("parses orientation", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true); // cb = 3
    view.setUint16(2, 0x301d, true); // sprmSBOrientation
    data[4] = 1; // landscape

    const props = parseSepx(data, 0);
    expect(props.orientation).toBe("landscape");
  });

  it("parses margins", () => {
    const data = new Uint8Array(20);
    const view = new DataView(data.buffer);
    view.setUint16(0, 8, true); // cb = 8
    // sprmSDxaLeft
    view.setUint16(2, 0xb021, true);
    view.setUint16(4, 1440, true);
    // sprmSDxaRight
    view.setUint16(6, 0xb022, true);
    view.setUint16(8, 1440, true);

    const props = parseSepx(data, 0);
    expect(props.marginLeft).toBe(1440);
    expect(props.marginRight).toBe(1440);
  });

  it("parses section break type", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true);
    view.setUint16(2, 0x3009, true); // sprmSBkc
    data[4] = 0; // continuous

    const props = parseSepx(data, 0);
    expect(props.breakType).toBe("continuous");
  });
});

describe("sepPropsToSection", () => {
  it("converts section props to DocSection shape", () => {
    const result = sepPropsToSection({
      pageWidth: 12240,
      pageHeight: 15840,
      orientation: "portrait",
      marginLeft: 1440,
      marginRight: 1440,
    });
    expect(result.pageWidth).toBe(12240);
    expect(result.pageHeight).toBe(15840);
    expect(result.orientation).toBe("portrait");
  });

  it("omits undefined values", () => {
    const result = sepPropsToSection({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("parseSepx — line numbering", () => {
  it("parses line number restart mode (perSection)", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true); // cb
    view.setUint16(2, 0x3013, true); // SLnc
    data[4] = 1; // perSection
    expect(parseSepx(data, 0).lineNumbering).toEqual({ restart: "perSection" });
  });

  it("parses line number countBy and start", () => {
    const data = new Uint8Array(20);
    const view = new DataView(data.buffer);
    view.setUint16(0, 8, true); // cb
    // SNLnnMod = countBy 5
    view.setUint16(2, 0x5009, true);
    view.setUint16(4, 5, true);
    // SLnnMin = start 1
    view.setUint16(6, 0x501b, true);
    view.setUint16(8, 1, true);
    const props = parseSepx(data, 0);
    expect(props.lineNumbering).toEqual({ countBy: 5, start: 1 });
  });

  it("parses line number distance", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 4, true);
    view.setUint16(2, 0x9010, true); // SDxaLnn
    view.setInt16(4, 360, true);
    expect(parseSepx(data, 0).lineNumbering).toEqual({ distance: 360 });
  });
});

describe("parseSepx — page numbering", () => {
  it("parses page number format (lowerRoman)", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true);
    view.setUint16(2, 0x300e, true); // SNfcPgn
    data[4] = 2; // lowerRoman
    expect(parseSepx(data, 0).pageNumberFormat).toBe("lowerRoman");
  });

  it("parses page number start and restart", () => {
    const data = new Uint8Array(20);
    const view = new DataView(data.buffer);
    view.setUint16(0, 7, true); // cb
    // SPgnStart97 = 5
    view.setUint16(2, 0x501c, true);
    view.setUint16(4, 5, true);
    // SFPgnRestart = 1
    view.setUint16(6, 0x3011, true);
    data[8] = 1;
    const props = parseSepx(data, 0);
    expect(props.pageNumberStart).toBe(5);
    expect(props.pageNumberRestart).toBe(true);
  });
});

describe("parseSepx — vertical alignment", () => {
  it("parses vertical align center", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true);
    view.setUint16(2, 0x301a, true); // SVjc
    data[4] = 1; // center
    expect(parseSepx(data, 0).verticalAlign).toBe("center");
  });

  it("parses vertical align justified", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true);
    view.setUint16(2, 0x301a, true);
    data[4] = 3; // justified
    expect(parseSepx(data, 0).verticalAlign).toBe("justified");
  });
});

describe("sepPropsToSection — extended fields", () => {
  it("includes line numbering and page numbering", () => {
    const result = sepPropsToSection({
      lineNumbering: { countBy: 5, restart: "perPage" },
      pageNumberFormat: "upperRoman",
      pageNumberStart: 3,
      pageNumberRestart: true,
      verticalAlign: "bottom",
    });
    expect(result.lineNumbering).toEqual({ countBy: 5, restart: "perPage" });
    expect(result.pageNumberFormat).toBe("upperRoman");
    expect(result.pageNumberStart).toBe(3);
    expect(result.pageNumberRestart).toBe(true);
    expect(result.verticalAlign).toBe("bottom");
  });
});

describe("parsePlcfSed", () => {
  it("returns empty for lcb=0", () => {
    expect(parsePlcfSed(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("parses section descriptors", () => {
    // 1 section: 2 CPs (4B each) + 1 Sed (12B) = 8 + 12 = 20
    const data = new Uint8Array(24);
    const view = new DataView(data.buffer);
    // CPs
    view.setInt32(0, 0, true);   // cp[0] = 0
    view.setInt32(4, 100, true); // cp[1] = 100
    // Sed[0]: fn(2B) + fcSepx(4B) + fnMpr(2B) + fcMpr(4B)
    view.setUint16(8, 0, true);    // fn
    view.setInt32(10, 512, true);  // fcSepx
    view.setUint16(14, 0, true);   // fnMpr
    view.setInt32(16, 0, true);    // fcMpr

    const seds = parsePlcfSed(data, 0, 20);
    expect(seds).toHaveLength(1);
    expect(seds[0].cpEnd).toBe(100);
    expect(seds[0].fcSepx).toBe(512);
  });
});
