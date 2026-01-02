/**
 * @file Tests for chart data reference parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2 - Chart Elements
 */

import type { XmlElement } from "../../../xml";
import {
  parseNumericPoint,
  parseNumericCache,
  parseNumericReference,
  parseStringPoint,
  parseStringCache,
  parseStringReference,
  parseMultiLevelStringReference,
  parseDataReference,
  parseSeriesText,
} from "./data-reference";

// Helper to create mock XmlElement
function el(
  name: string,
  attrs: Record<string, string> = {},
  children: (XmlElement | { type: "text"; value: string })[] = [],
): XmlElement {
  return { type: "element", name, attrs, children };
}

// Helper to create text element
function text(value: string): { type: "text"; value: string } {
  return { type: "text", value };
}

// =============================================================================
// parseNumericPoint (ECMA-376 Section 21.2.2.129)
// =============================================================================

describe("parseNumericPoint - c:pt (ECMA-376 Section 21.2.2.129)", () => {
  it("parses numeric point with value", () => {
    const pt = el("c:pt", { idx: "0" }, [el("c:v", {}, [text("42.5")])]);
    const result = parseNumericPoint(pt);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
    expect(result?.value).toBe(42.5);
  });

  it("returns undefined when idx is missing", () => {
    const pt = el("c:pt", {}, [el("c:v", {}, [text("42.5")])]);
    const result = parseNumericPoint(pt);

    expect(result).toBeUndefined();
  });

  it("defaults value to 0 when c:v is missing", () => {
    const pt = el("c:pt", { idx: "0" }, []);
    const result = parseNumericPoint(pt);

    expect(result?.value).toBe(0);
  });

  it("parses format code", () => {
    const pt = el("c:pt", { idx: "0", formatCode: "0.00%" }, [el("c:v", {}, [text("0.5")])]);
    const result = parseNumericPoint(pt);

    expect(result?.formatCode).toBe("0.00%");
  });

  it("returns undefined for invalid numeric value", () => {
    const pt = el("c:pt", { idx: "0" }, [el("c:v", {}, [text("not a number")])]);
    const result = parseNumericPoint(pt);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseNumericCache (ECMA-376 Section 21.2.2.111)
// =============================================================================

describe("parseNumericCache - c:numCache (ECMA-376 Section 21.2.2.111)", () => {
  it("parses numeric cache with format code and points", () => {
    const numCache = el("c:numCache", {}, [
      el("c:formatCode", {}, [text("General")]),
      el("c:ptCount", { val: "3" }),
      el("c:pt", { idx: "0" }, [el("c:v", {}, [text("1")])]),
      el("c:pt", { idx: "1" }, [el("c:v", {}, [text("2")])]),
      el("c:pt", { idx: "2" }, [el("c:v", {}, [text("3")])]),
    ]);
    const result = parseNumericCache(numCache);

    expect(result).toBeDefined();
    expect(result?.formatCode).toBe("General");
    expect(result?.count).toBe(3);
    expect(result?.points).toHaveLength(3);
    expect(result?.points[0].value).toBe(1);
    expect(result?.points[1].value).toBe(2);
    expect(result?.points[2].value).toBe(3);
  });

  it("handles empty cache", () => {
    const numCache = el("c:numCache", {}, []);
    const result = parseNumericCache(numCache);

    expect(result?.formatCode).toBeUndefined();
    expect(result?.count).toBe(0);
    expect(result?.points).toHaveLength(0);
  });
});

// =============================================================================
// parseNumericReference (ECMA-376 Section 21.2.2.112)
// =============================================================================

describe("parseNumericReference - c:numRef (ECMA-376 Section 21.2.2.112)", () => {
  it("parses numeric reference with formula and cache", () => {
    const numRef = el("c:numRef", {}, [
      el("c:f", {}, [text("Sheet1!$A$1:$A$3")]),
      el("c:numCache", {}, [
        el("c:ptCount", { val: "3" }),
        el("c:pt", { idx: "0" }, [el("c:v", {}, [text("10")])]),
        el("c:pt", { idx: "1" }, [el("c:v", {}, [text("20")])]),
        el("c:pt", { idx: "2" }, [el("c:v", {}, [text("30")])]),
      ]),
    ]);
    const result = parseNumericReference(numRef);

    expect(result).toBeDefined();
    expect(result?.formula).toBe("Sheet1!$A$1:$A$3");
    expect(result?.cache?.count).toBe(3);
  });

  it("handles reference without cache", () => {
    const numRef = el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$B$1:$B$5")])]);
    const result = parseNumericReference(numRef);

    expect(result?.formula).toBe("Sheet1!$B$1:$B$5");
    expect(result?.cache).toBeUndefined();
  });
});

// =============================================================================
// parseStringPoint (ECMA-376 Section 21.2.2.129)
// =============================================================================

describe("parseStringPoint - c:pt (ECMA-376 Section 21.2.2.129)", () => {
  it("parses string point", () => {
    const pt = el("c:pt", { idx: "0" }, [el("c:v", {}, [text("Category A")])]);
    const result = parseStringPoint(pt);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
    expect(result?.value).toBe("Category A");
  });

  it("returns undefined when idx is missing", () => {
    const pt = el("c:pt", {}, [el("c:v", {}, [text("Category A")])]);
    const result = parseStringPoint(pt);

    expect(result).toBeUndefined();
  });

  it("defaults value to empty string when c:v is missing", () => {
    const pt = el("c:pt", { idx: "0" }, []);
    const result = parseStringPoint(pt);

    expect(result?.value).toBe("");
  });
});

// =============================================================================
// parseStringCache (ECMA-376 Section 21.2.2.170)
// =============================================================================

describe("parseStringCache - c:strCache (ECMA-376 Section 21.2.2.170)", () => {
  it("parses string cache with points", () => {
    const strCache = el("c:strCache", {}, [
      el("c:ptCount", { val: "3" }),
      el("c:pt", { idx: "0" }, [el("c:v", {}, [text("A")])]),
      el("c:pt", { idx: "1" }, [el("c:v", {}, [text("B")])]),
      el("c:pt", { idx: "2" }, [el("c:v", {}, [text("C")])]),
    ]);
    const result = parseStringCache(strCache);

    expect(result).toBeDefined();
    expect(result?.count).toBe(3);
    expect(result?.points).toHaveLength(3);
    expect(result?.points[0].value).toBe("A");
    expect(result?.points[1].value).toBe("B");
    expect(result?.points[2].value).toBe("C");
  });
});

// =============================================================================
// parseStringReference (ECMA-376 Section 21.2.2.171)
// =============================================================================

describe("parseStringReference - c:strRef (ECMA-376 Section 21.2.2.171)", () => {
  it("parses string reference with formula and cache", () => {
    const strRef = el("c:strRef", {}, [
      el("c:f", {}, [text("Sheet1!$A$1:$A$3")]),
      el("c:strCache", {}, [
        el("c:ptCount", { val: "3" }),
        el("c:pt", { idx: "0" }, [el("c:v", {}, [text("X")])]),
        el("c:pt", { idx: "1" }, [el("c:v", {}, [text("Y")])]),
        el("c:pt", { idx: "2" }, [el("c:v", {}, [text("Z")])]),
      ]),
    ]);
    const result = parseStringReference(strRef);

    expect(result).toBeDefined();
    expect(result?.formula).toBe("Sheet1!$A$1:$A$3");
    expect(result?.cache?.count).toBe(3);
  });
});

// =============================================================================
// parseMultiLevelStringReference (ECMA-376 Section 21.2.2.102)
// =============================================================================

describe("parseMultiLevelStringReference - c:multiLvlStrRef (ECMA-376 Section 21.2.2.102)", () => {
  it("parses multi-level string reference", () => {
    const multiLvlStrRef = el("c:multiLvlStrRef", {}, [
      el("c:f", {}, [text("Sheet1!$A$1:$B$4")]),
      el("c:multiLvlStrCache", {}, [
        el("c:ptCount", { val: "4" }),
        el("c:lvl", {}, [
          el("c:pt", { idx: "0" }, [el("c:v", {}, [text("Q1")])]),
          el("c:pt", { idx: "1" }, [el("c:v", {}, [text("Q2")])]),
          el("c:pt", { idx: "2" }, [el("c:v", {}, [text("Q3")])]),
          el("c:pt", { idx: "3" }, [el("c:v", {}, [text("Q4")])]),
        ]),
        el("c:lvl", {}, [
          el("c:pt", { idx: "0" }, [el("c:v", {}, [text("2023")])]),
          el("c:pt", { idx: "1" }, [el("c:v", {}, [text("2023")])]),
          el("c:pt", { idx: "2" }, [el("c:v", {}, [text("2024")])]),
          el("c:pt", { idx: "3" }, [el("c:v", {}, [text("2024")])]),
        ]),
      ]),
    ]);
    const result = parseMultiLevelStringReference(multiLvlStrRef);

    expect(result).toBeDefined();
    expect(result.formula).toBe("Sheet1!$A$1:$B$4");
    expect(result.cache?.count).toBe(4);
    expect(result.cache?.levels).toHaveLength(2);
    expect(result.cache?.levels[0].points[0].value).toBe("Q1");
    expect(result.cache?.levels[1].points[0].value).toBe("2023");
  });
});

// =============================================================================
// parseDataReference (ECMA-376 Section 21.2.2.24, 21.2.2.229)
// =============================================================================

describe("parseDataReference - c:cat/c:val (ECMA-376 Section 21.2.2.24/229)", () => {
  it("returns empty object for undefined input", () => {
    const result = parseDataReference(undefined);

    expect(result).toEqual({});
  });

  it("parses numRef", () => {
    const cat = el("c:cat", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$A$1:$A$3")])])]);
    const result = parseDataReference(cat);

    expect(result.numRef).toBeDefined();
    expect(result.numRef?.formula).toBe("Sheet1!$A$1:$A$3");
  });

  it("parses strRef", () => {
    const cat = el("c:cat", {}, [el("c:strRef", {}, [el("c:f", {}, [text("Sheet1!$B$1:$B$3")])])]);
    const result = parseDataReference(cat);

    expect(result.strRef).toBeDefined();
    expect(result.strRef?.formula).toBe("Sheet1!$B$1:$B$3");
  });

  it("parses multiLvlStrRef", () => {
    const cat = el("c:cat", {}, [el("c:multiLvlStrRef", {}, [el("c:f", {}, [text("Sheet1!$C$1:$D$3")])])]);
    const result = parseDataReference(cat);

    expect(result.multiLvlStrRef).toBeDefined();
    expect(result.multiLvlStrRef?.formula).toBe("Sheet1!$C$1:$D$3");
  });
});

// =============================================================================
// parseSeriesText (ECMA-376 Section 21.2.2.209)
// =============================================================================

describe("parseSeriesText - c:tx (ECMA-376 Section 21.2.2.209)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseSeriesText(undefined)).toBeUndefined();
  });

  it("parses series text from strRef", () => {
    const tx = el("c:tx", {}, [
      el("c:strRef", {}, [
        el("c:f", {}, [text("Sheet1!$A$1")]),
        el("c:strCache", {}, [
          el("c:ptCount", { val: "1" }),
          el("c:pt", { idx: "0" }, [el("c:v", {}, [text("Series 1")])]),
        ]),
      ]),
    ]);
    const result = parseSeriesText(tx);

    expect(result).toBeDefined();
    expect(result?.value).toBe("Series 1");
    expect(result?.reference).toBe("Sheet1!$A$1");
  });

  it("parses series text from c:v", () => {
    const tx = el("c:tx", {}, [el("c:v", {}, [text("Inline Series Name")])]);
    const result = parseSeriesText(tx);

    expect(result?.value).toBe("Inline Series Name");
  });

  it("returns undefined for empty tx", () => {
    const tx = el("c:tx", {}, []);
    const result = parseSeriesText(tx);

    expect(result).toBeUndefined();
  });
});
