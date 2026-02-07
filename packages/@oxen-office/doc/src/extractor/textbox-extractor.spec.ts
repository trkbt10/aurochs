/** @file Textbox extractor tests */
import { parsePlcfTxbxTxt, extractTextboxes } from "./textbox-extractor";

describe("parsePlcfTxbxTxt", () => {
  it("returns empty for lcb=0", () => {
    expect(parsePlcfTxbxTxt(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("returns empty for invalid size", () => {
    // lcb = 10 → (10-4)/26 not integer
    expect(parsePlcfTxbxTxt(new Uint8Array(100), 0, 10)).toEqual([]);
  });

  it("parses one textbox CP pair", () => {
    // n=1: 2 CPs (8B) + 1 FTXBXS (22B) = 30
    const data = new Uint8Array(30);
    const view = new DataView(data.buffer);
    view.setInt32(0, 0, true);    // cp[0] = 0
    view.setInt32(4, 50, true);   // cp[1] = 50
    // FTXBXS (22B) at offset 8, content doesn't matter for CP parsing

    const cps = parsePlcfTxbxTxt(data, 0, 30);
    expect(cps).toEqual([0, 50]);
  });

  it("parses multiple textbox CPs", () => {
    // n=2: 3 CPs (12B) + 2 FTXBXS (44B) = 56
    const data = new Uint8Array(56);
    const view = new DataView(data.buffer);
    view.setInt32(0, 0, true);
    view.setInt32(4, 25, true);
    view.setInt32(8, 60, true);

    const cps = parsePlcfTxbxTxt(data, 0, 56);
    expect(cps).toEqual([0, 25, 60]);
  });
});

describe("extractTextboxes", () => {
  it("returns empty for fewer than 2 CPs", () => {
    expect(extractTextboxes([0], "hello", 0)).toEqual([]);
  });

  it("extracts textbox content from text ranges", () => {
    // "main text\r" = 10 chars, then "Textbox 1 content\r" = 18 chars, "Textbox 2 here\r" = 15 chars
    const text = "main text\rTextbox 1 content\rTextbox 2 here\r";
    // Textbox text starts at offset 10 (after "main text\r")
    // CP 0..18 → chars 10..28 = "Textbox 1 content\r"
    // CP 18..33 → chars 28..43 = "Textbox 2 here\r"
    const textboxes = extractTextboxes([0, 18, 33], text, 10);
    expect(textboxes).toHaveLength(2);
    expect(textboxes[0].index).toBe(0);
    expect(textboxes[0].content[0].runs[0].text).toBe("Textbox 1 content");
    expect(textboxes[1].index).toBe(1);
    expect(textboxes[1].content[0].runs[0].text).toBe("Textbox 2 here");
  });

  it("skips empty textbox ranges", () => {
    const text = "Content\rNext\r";
    const textboxes = extractTextboxes([0, 0, 8], text, 0);
    // First range 0..0 is empty, second range 0..8 has content
    expect(textboxes).toHaveLength(1);
    expect(textboxes[0].index).toBe(1);
  });

  it("uses custom paragraph builder", () => {
    const builder = (s: number, e: number) => [{ runs: [{ text: `[${s}-${e}]` }] }];
    const textboxes = extractTextboxes([0, 10], "x".repeat(20), 5, builder);
    expect(textboxes).toHaveLength(1);
    expect(textboxes[0].content[0].runs[0].text).toBe("[5-15]");
  });
});
