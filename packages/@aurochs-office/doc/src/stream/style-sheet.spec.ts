/** @file Style sheet parser tests */
import { parseStyleSheet } from "./style-sheet";

/**
 * Build a minimal STSH binary fixture.
 *
 * Layout:
 *   cbStshi(2B) = headerSize (at least 4 for cstd + cbSTDBaseInFile)
 *   STSHI header:
 *     cstd(2B) — number of styles
 *     cbSTDBaseInFile(2B) — base size of each STD body before style name
 *   STD[] array:
 *     For each: cbStd(2B) + STD body
 *     STD body: word0(2B sti+flags) + word1(2B sgc+istdBase) + [word2(2B cupx+istdNext)]
 *               + padding to cbSTDBaseInFile + xstzName(cch(2B) + UTF-16LE + null(2B))
 *               + UPX[] (if cupx > 0)
 */
function buildStsh(options: {
  cbSTDBaseInFile: number;
  styles: Array<{
    sgc: number;
    istdBase?: number;
    istdNext?: number;
    cupx?: number;
    name?: string;
    empty?: boolean;
    /** Raw UPX bytes to append after the name. */
    upxBytes?: number[];
  }>;
}): Uint8Array {
  const { cbSTDBaseInFile, styles } = options;

  // STSHI header: cbStshi(2B) + cstd(2B) + cbSTDBaseInFile(2B)
  const headerContentSize = 4; // cstd(2) + cbSTDBaseInFile(2)
  const headerBytes: number[] = [];
  // cbStshi = header content size
  pushUint16(headerBytes, headerContentSize);
  // cstd
  pushUint16(headerBytes, styles.length);
  // cbSTDBaseInFile
  pushUint16(headerBytes, cbSTDBaseInFile);

  // STD entries
  const stdEntries: number[] = [];
  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    if (s.empty) {
      // Empty slot: cbStd = 0
      pushUint16(stdEntries, 0);
      continue;
    }

    // Build STD body
    const body: number[] = [];
    // word 0: sti(12bit) = 0, flags(4bit) = 0
    pushUint16(body, 0);
    // word 1: sgc(4bit) + istdBase(12bit)
    const istdBase = s.istdBase ?? 0x0fff;
    pushUint16(body, (s.sgc & 0x0f) | ((istdBase & 0x0fff) << 4));
    // word 2: cupx(4bit) + istdNext(12bit)
    const cupx = s.cupx ?? 0;
    const istdNext = s.istdNext ?? 0x0fff;
    pushUint16(body, (cupx & 0x000f) | ((istdNext & 0x0fff) << 4));

    // Pad to cbSTDBaseInFile
    while (body.length < cbSTDBaseInFile) {
      body.push(0);
    }

    // xstzName: cch(2B) + UTF-16LE + null(2B)
    if (s.name) {
      pushUint16(body, s.name.length);
      for (let c = 0; c < s.name.length; c++) {
        pushUint16(body, s.name.charCodeAt(c));
      }
      // null terminator
      pushUint16(body, 0);
    } else {
      // Empty name: cch=0 + null
      pushUint16(body, 0);
      pushUint16(body, 0);
    }

    // UPX bytes
    if (s.upxBytes) {
      body.push(...s.upxBytes);
    }

    pushUint16(stdEntries, body.length);
    stdEntries.push(...body);
  }

  const result = new Uint8Array(headerBytes.length + stdEntries.length);
  result.set(headerBytes, 0);
  result.set(stdEntries, headerBytes.length);
  return result;
}

function pushUint16(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

describe("parseStyleSheet", () => {
  it("returns empty for lcb=0", () => {
    const result = parseStyleSheet(new Uint8Array(100), 0, 0);
    expect(result.styles).toEqual([]);
    expect(result.upxMap.size).toBe(0);
  });

  it("returns empty when fc+lcb exceeds stream", () => {
    const result = parseStyleSheet(new Uint8Array(10), 5, 20);
    expect(result.styles).toEqual([]);
  });

  it("parses single paragraph style with name", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 1, name: "Normal" }],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles).toHaveLength(1);
    expect(styles[0].index).toBe(0);
    expect(styles[0].type).toBe("paragraph");
    expect(styles[0].name).toBe("Normal");
    expect(styles[0].basedOn).toBeUndefined();
    expect(styles[0].next).toBeUndefined();
  });

  it("parses character style", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 2, name: "Bold" }],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles[0].type).toBe("character");
  });

  it("parses table style", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 3, name: "TableGrid" }],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles[0].type).toBe("table");
  });

  it("parses list style", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 4, name: "ListBullet" }],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles[0].type).toBe("list");
  });

  it("handles empty style slot (cbStd=0)", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [
        { sgc: 1, name: "Normal" },
        { sgc: 0, empty: true },
        { sgc: 2, name: "Bold" },
      ],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles).toHaveLength(3);
    expect(styles[0].name).toBe("Normal");
    expect(styles[1].type).toBe("paragraph"); // empty slot defaults to paragraph
    expect(styles[1].name).toBeUndefined();
    expect(styles[2].name).toBe("Bold");
    expect(styles[2].type).toBe("character");
  });

  it("parses basedOn and next style references", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [
        { sgc: 1, name: "Normal" },
        { sgc: 1, name: "Heading1", istdBase: 0, istdNext: 0 },
      ],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles[1].basedOn).toBe(0);
    expect(styles[1].next).toBe(0);
  });

  it("treats istdBase=0xFFF as no parent", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 1, name: "Normal", istdBase: 0x0fff }],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles[0].basedOn).toBeUndefined();
  });

  it("parses multiple styles with correct indices", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [
        { sgc: 1, name: "Normal" },
        { sgc: 1, name: "Heading1", istdBase: 0 },
        { sgc: 2, name: "Strong", istdBase: 0 },
      ],
    });

    const { styles } = parseStyleSheet(data, 0, data.length);
    expect(styles).toHaveLength(3);
    expect(styles[0].index).toBe(0);
    expect(styles[1].index).toBe(1);
    expect(styles[2].index).toBe(2);
  });

  it("parses with non-zero fc offset", () => {
    const stsh = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 1, name: "Normal" }],
    });

    // Prepend 20 bytes of padding
    const padded = new Uint8Array(20 + stsh.length);
    padded.set(stsh, 20);

    const { styles } = parseStyleSheet(padded, 20, stsh.length);
    expect(styles).toHaveLength(1);
    expect(styles[0].name).toBe("Normal");
  });
});

describe("UPX parsing", () => {
  it("parses paragraph style UPX with PAPX and CHPX SPRMs", () => {
    // Build UPX for paragraph style (sgc=1, cupx=2):
    //   UPX[0] = PAPX: cbUpx(2B) + istd(2B) + grpprl
    //   UPX[1] = CHPX: cbUpx(2B) + grpprl
    const upxBytes: number[] = [];

    // UPX[0]: PAPX with sprmPJc(0x2461) = center(1) → istd(2B) + sprm(2B) + operand(1B)
    const papxLen = 2 + 3; // istd(2) + sprm(2B opcode) + operand(1B)
    pushUint16(upxBytes, papxLen); // cbUpx
    pushUint16(upxBytes, 0); // istd
    pushUint16(upxBytes, 0x2461); // sprmPJc
    upxBytes.push(1); // center
    // Pad to even (papxLen=5 is odd)
    upxBytes.push(0);

    // UPX[1]: CHPX with sprmCFBold(0x0835) = on(1)
    const chpxLen = 3; // sprm(2B) + operand(1B)
    pushUint16(upxBytes, chpxLen); // cbUpx
    pushUint16(upxBytes, 0x0835); // sprmCFBold
    upxBytes.push(1); // on
    // Pad to even (chpxLen=3 is odd)
    upxBytes.push(0);

    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 1, cupx: 2, name: "Normal", upxBytes }],
    });

    const { upxMap } = parseStyleSheet(data, 0, data.length);
    expect(upxMap.size).toBe(1);

    const upx = upxMap.get(0);
    expect(upx).toBeDefined();
    // PAPX should have the PJc SPRM
    expect(upx!.paragraphSprms.length).toBe(1);
    expect(upx!.paragraphSprms[0].opcode.raw).toBe(0x2461);
    // CHPX should have the Bold SPRM
    expect(upx!.characterSprms.length).toBe(1);
    expect(upx!.characterSprms[0].opcode.raw).toBe(0x0835);
  });

  it("parses character style UPX with CHPX SPRMs", () => {
    const upxBytes: number[] = [];

    // UPX[0]: CHPX with sprmCFItalic(0x0836) = on(1)
    const chpxLen = 3; // sprm(2B) + operand(1B)
    pushUint16(upxBytes, chpxLen);
    pushUint16(upxBytes, 0x0836); // sprmCFItalic
    upxBytes.push(1); // on
    upxBytes.push(0); // pad to even

    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 2, cupx: 1, name: "Emphasis", upxBytes }],
    });

    const { upxMap } = parseStyleSheet(data, 0, data.length);
    const upx = upxMap.get(0);
    expect(upx).toBeDefined();
    expect(upx!.paragraphSprms.length).toBe(0);
    expect(upx!.characterSprms.length).toBe(1);
    expect(upx!.characterSprms[0].opcode.raw).toBe(0x0836);
  });

  it("returns no UPX for styles with cupx=0", () => {
    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 1, cupx: 0, name: "Normal" }],
    });

    const { upxMap } = parseStyleSheet(data, 0, data.length);
    expect(upxMap.size).toBe(0);
  });

  it("parses multiple SPRMs in a single UPX", () => {
    const upxBytes: number[] = [];

    // UPX[0]: PAPX with 2 SPRMs: PJc(0x2461)=right(2) + PFKeep(0x2405)=1
    const papxContent: number[] = [];
    pushUint16(papxContent, 0); // istd
    pushUint16(papxContent, 0x2461); // PJc
    papxContent.push(2); // right
    pushUint16(papxContent, 0x2405); // PFKeep
    papxContent.push(1); // keepTogether
    pushUint16(upxBytes, papxContent.length); // cbUpx
    upxBytes.push(...papxContent);
    // Pad to even (10 bytes, already even)

    // UPX[1]: empty CHPX
    pushUint16(upxBytes, 0); // cbUpx = 0

    const data = buildStsh({
      cbSTDBaseInFile: 10,
      styles: [{ sgc: 1, cupx: 2, name: "Heading", upxBytes }],
    });

    const { upxMap } = parseStyleSheet(data, 0, data.length);
    const upx = upxMap.get(0);
    expect(upx).toBeDefined();
    expect(upx!.paragraphSprms.length).toBe(2);
    expect(upx!.paragraphSprms[0].opcode.raw).toBe(0x2461);
    expect(upx!.paragraphSprms[1].opcode.raw).toBe(0x2405);
  });
});
