/**
 * @file Tests for paragraph-adapters
 */

import {
  mixedParagraphToTextJustify,
  textJustifyToParagraphUpdate,
  mixedParagraphToSpacing,
  mixedParagraphToIndent,
  indentToParagraphUpdate,
  mixedParagraphToList,
  listToParagraphUpdate,
} from "./paragraph-adapters";
import type { MixedParagraphProperties } from "../../editors/text/mixed-properties";

function same<T>(value: T) {
  return { type: "same" as const, value };
}

const na = { type: "notApplicable" as const };

function createMixedParagraph(overrides: Partial<MixedParagraphProperties> = {}): MixedParagraphProperties {
  return {
    level: na, alignment: na, marginLeft: na, marginRight: na,
    indent: na, defaultTabSize: na, lineSpacing: na,
    spaceBefore: na, spaceAfter: na, bulletStyle: na,
    rtl: na, fontAlignment: na, eaLineBreak: na,
    latinLineBreak: na, hangingPunctuation: na,
    ...overrides,
  };
}

describe("TextJustify adapter", () => {
  it("converts PPTX alignment to react-editor-ui align", () => {
    const para = createMixedParagraph({ alignment: same("ctr" as never) });
    expect(mixedParagraphToTextJustify(para).align).toBe("center");
  });

  it("converts back to ParagraphProperties", () => {
    const update = textJustifyToParagraphUpdate({ align: "right" });
    expect((update as Record<string, unknown>).alignment).toBe("r");
  });

  it("defaults to left", () => {
    const para = createMixedParagraph();
    expect(mixedParagraphToTextJustify(para).align).toBe("left");
  });
});

describe("ParagraphSpacing adapter", () => {
  it("converts line spacing to strings", () => {
    const para = createMixedParagraph({
      spaceBefore: same({ type: "points", value: 1200 as never } as never),
      spaceAfter: same({ type: "percent", value: 100000 as never } as never),
    });
    const result = mixedParagraphToSpacing(para);
    expect(result.before).toBe("12 pt");
    expect(result.after).toBe("100%");
  });
});

describe("Indent adapter", () => {
  it("converts margins to strings", () => {
    const para = createMixedParagraph({
      marginLeft: same(36 as never),
      marginRight: same(0 as never),
      indent: same(18 as never),
    });
    const result = mixedParagraphToIndent(para);
    expect(result.left).toBe("36 pt");
    expect(result.firstLine).toBe("18 pt");
  });

  it("converts back", () => {
    const update = indentToParagraphUpdate({ left: "24 pt", right: "0 pt", firstLine: "12 pt" });
    expect(update).toBeDefined();
  });
});

describe("List adapter", () => {
  it("detects bulleted list", () => {
    const para = createMixedParagraph({
      bulletStyle: same({
        bullet: { type: "char", char: "\u2022" },
        colorFollowText: true, sizeFollowText: true, fontFollowText: true,
      } as never),
    });
    const result = mixedParagraphToList(para);
    expect(result.type).toBe("bulleted");
  });

  it("converts back to none", () => {
    const update = listToParagraphUpdate({ type: "none", style: "" });
    const bs = (update as Record<string, unknown>).bulletStyle as Record<string, unknown>;
    expect(bs.bullet).toEqual({ type: "none" });
  });
});
