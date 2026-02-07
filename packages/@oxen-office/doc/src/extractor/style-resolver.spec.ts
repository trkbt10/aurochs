/** @file Style resolver tests */
import { createStyleResolver } from "./style-resolver";
import type { DocStyle } from "../domain/types";
import { parseGrpprl } from "../sprm/sprm-decoder";
import type { StyleUpxEntry } from "../stream/style-sheet";

function pushUint16(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

/** Build a Sprm array from raw SPRM bytes. */
function buildSprms(bytes: number[]): ReturnType<typeof parseGrpprl> {
  return parseGrpprl(new Uint8Array(bytes));
}

describe("createStyleResolver", () => {
  it("returns empty SPRMs for unknown style index", () => {
    const styles: DocStyle[] = [];
    const upxMap = new Map<number, StyleUpxEntry>();
    const resolver = createStyleResolver(styles, upxMap);

    expect(resolver.getParagraphSprms(99)).toEqual([]);
    expect(resolver.getCharacterSprms(99)).toEqual([]);
  });

  it("returns own SPRMs for style without basedOn", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "paragraph", name: "Normal" },
    ];

    // Build SPRMs: sprmPJc(0x2461) = center(1)
    const papxBytes: number[] = [];
    pushUint16(papxBytes, 0x2461);
    papxBytes.push(1);

    const upxMap = new Map<number, StyleUpxEntry>([
      [0, { paragraphSprms: buildSprms(papxBytes), characterSprms: [] }],
    ]);

    const resolver = createStyleResolver(styles, upxMap);
    const sprms = resolver.getParagraphSprms(0);
    expect(sprms.length).toBe(1);
    expect(sprms[0].opcode.raw).toBe(0x2461);
  });

  it("resolves single-level inheritance (child basedOn parent)", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "paragraph", name: "Normal" },
      { index: 1, type: "paragraph", name: "Heading1", basedOn: 0 },
    ];

    // Normal: sprmPJc(0x2461) = left(0)
    const normalPap: number[] = [];
    pushUint16(normalPap, 0x2461);
    normalPap.push(0);

    // Heading1: sprmPFKeep(0x2405) = 1
    const headingPap: number[] = [];
    pushUint16(headingPap, 0x2405);
    headingPap.push(1);

    const upxMap = new Map<number, StyleUpxEntry>([
      [0, { paragraphSprms: buildSprms(normalPap), characterSprms: [] }],
      [1, { paragraphSprms: buildSprms(headingPap), characterSprms: [] }],
    ]);

    const resolver = createStyleResolver(styles, upxMap);

    // Heading1 should have Normal's SPRMs first, then its own
    const sprms = resolver.getParagraphSprms(1);
    expect(sprms.length).toBe(2);
    expect(sprms[0].opcode.raw).toBe(0x2461); // from Normal
    expect(sprms[1].opcode.raw).toBe(0x2405); // from Heading1
  });

  it("resolves multi-level inheritance (grandchild → child → parent)", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "paragraph", name: "Normal" },
      { index: 1, type: "paragraph", name: "Body", basedOn: 0 },
      { index: 2, type: "paragraph", name: "BodySpecial", basedOn: 1 },
    ];

    // Normal: bold
    const normalChp: number[] = [];
    pushUint16(normalChp, 0x0835);
    normalChp.push(1);

    // Body: italic
    const bodyChp: number[] = [];
    pushUint16(bodyChp, 0x0836);
    bodyChp.push(1);

    // BodySpecial: strike
    const specialChp: number[] = [];
    pushUint16(specialChp, 0x0837);
    specialChp.push(1);

    const upxMap = new Map<number, StyleUpxEntry>([
      [0, { paragraphSprms: [], characterSprms: buildSprms(normalChp) }],
      [1, { paragraphSprms: [], characterSprms: buildSprms(bodyChp) }],
      [2, { paragraphSprms: [], characterSprms: buildSprms(specialChp) }],
    ]);

    const resolver = createStyleResolver(styles, upxMap);

    // BodySpecial: Normal → Body → BodySpecial
    const sprms = resolver.getCharacterSprms(2);
    expect(sprms.length).toBe(3);
    expect(sprms[0].opcode.raw).toBe(0x0835); // bold from Normal
    expect(sprms[1].opcode.raw).toBe(0x0836); // italic from Body
    expect(sprms[2].opcode.raw).toBe(0x0837); // strike from BodySpecial
  });

  it("handles circular basedOn references without infinite loop", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "paragraph", name: "A", basedOn: 1 },
      { index: 1, type: "paragraph", name: "B", basedOn: 0 },
    ];

    const papA: number[] = [];
    pushUint16(papA, 0x2461);
    papA.push(0);

    const papB: number[] = [];
    pushUint16(papB, 0x2405);
    papB.push(1);

    const upxMap = new Map<number, StyleUpxEntry>([
      [0, { paragraphSprms: buildSprms(papA), characterSprms: [] }],
      [1, { paragraphSprms: buildSprms(papB), characterSprms: [] }],
    ]);

    const resolver = createStyleResolver(styles, upxMap);

    // Should not hang — visited set prevents infinite loop
    const sprmsA = resolver.getParagraphSprms(0);
    expect(sprmsA.length).toBeGreaterThan(0);

    const sprmsB = resolver.getParagraphSprms(1);
    expect(sprmsB.length).toBeGreaterThan(0);
  });

  it("caches resolved SPRMs", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "paragraph", name: "Normal" },
    ];

    const papBytes: number[] = [];
    pushUint16(papBytes, 0x2461);
    papBytes.push(1);

    const upxMap = new Map<number, StyleUpxEntry>([
      [0, { paragraphSprms: buildSprms(papBytes), characterSprms: [] }],
    ]);

    const resolver = createStyleResolver(styles, upxMap);

    // Same reference should be returned (cached)
    const first = resolver.getParagraphSprms(0);
    const second = resolver.getParagraphSprms(0);
    expect(first).toBe(second);
  });

  it("resolves character SPRMs through basedOn chain", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "character", name: "DefaultFont" },
      { index: 1, type: "character", name: "Strong", basedOn: 0 },
    ];

    // DefaultFont: fontSize(0x4A43) = 24 (half-points)
    const baseChp: number[] = [];
    pushUint16(baseChp, 0x4a43);
    pushUint16(baseChp, 24);

    // Strong: bold(0x0835) = 1
    const strongChp: number[] = [];
    pushUint16(strongChp, 0x0835);
    strongChp.push(1);

    const upxMap = new Map<number, StyleUpxEntry>([
      [0, { paragraphSprms: [], characterSprms: buildSprms(baseChp) }],
      [1, { paragraphSprms: [], characterSprms: buildSprms(strongChp) }],
    ]);

    const resolver = createStyleResolver(styles, upxMap);
    const sprms = resolver.getCharacterSprms(1);
    expect(sprms.length).toBe(2);
    expect(sprms[0].opcode.raw).toBe(0x4a43); // fontSize from base
    expect(sprms[1].opcode.raw).toBe(0x0835); // bold from Strong
  });

  it("returns empty for style with no UPX data", () => {
    const styles: DocStyle[] = [
      { index: 0, type: "paragraph", name: "Normal" },
    ];
    const upxMap = new Map<number, StyleUpxEntry>();
    const resolver = createStyleResolver(styles, upxMap);

    expect(resolver.getParagraphSprms(0)).toEqual([]);
    expect(resolver.getCharacterSprms(0)).toEqual([]);
  });
});
