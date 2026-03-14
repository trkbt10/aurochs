/**
 * @file Unit tests for table-selection.ts
 */

import { getColumnLetter, getCellPreviewText } from "./table-selection";

describe("getColumnLetter", () => {
  it("returns A-Z for 0-25", () => {
    expect(getColumnLetter(0)).toBe("A");
    expect(getColumnLetter(1)).toBe("B");
    expect(getColumnLetter(25)).toBe("Z");
  });

  it("returns AA, AB for 26+", () => {
    expect(getColumnLetter(26)).toBe("AA");
    expect(getColumnLetter(27)).toBe("AB");
  });

  it("returns AZ for 51", () => {
    expect(getColumnLetter(51)).toBe("AZ");
  });
});

describe("getCellPreviewText", () => {
  it("returns empty for undefined", () => {
    expect(getCellPreviewText(undefined)).toBe("");
  });

  it("returns trimmed text", () => {
    expect(getCellPreviewText("  hello  ")).toBe("hello");
  });

  it("truncates long text", () => {
    expect(getCellPreviewText("This is a long text", 10)).toBe("This is a …");
  });

  it("does not truncate short text", () => {
    expect(getCellPreviewText("Short")).toBe("Short");
  });
});
