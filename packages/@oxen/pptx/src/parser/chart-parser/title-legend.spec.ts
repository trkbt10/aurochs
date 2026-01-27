/**
 * @file Tests for title and legend parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.201 (title)
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 */

import type { XmlElement } from "@oxen/xml";
import { parseChartTitle, parseLegendEntry, parseLegend } from "./title-legend";

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
// parseChartTitle (ECMA-376 Section 21.2.2.201)
// =============================================================================

describe("parseChartTitle - c:title (ECMA-376 Section 21.2.2.201)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseChartTitle(undefined)).toBeUndefined();
  });

  it("parses empty title element", () => {
    const title = el("c:title", {}, []);
    const result = parseChartTitle(title);

    expect(result).toBeDefined();
  });

  it("parses overlay attribute", () => {
    const title = el("c:title", {}, [el("c:overlay", { val: "1" })]);
    const result = parseChartTitle(title);

    expect(result?.overlay).toBe(true);
  });

  it("parses title with layout", () => {
    const title = el("c:title", {}, [
      el("c:layout", {}, [el("c:manualLayout", {}, [el("c:x", { val: "0.5" }), el("c:y", { val: "0.1" })])]),
    ]);
    const result = parseChartTitle(title);

    expect(result?.layout).toBeDefined();
    expect(result?.layout?.manualLayout?.x).toBe(0.5);
    expect(result?.layout?.manualLayout?.y).toBe(0.1);
  });

  it("parses title with shape properties", () => {
    const title = el("c:title", {}, [el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FFFFFF" })])])]);
    const result = parseChartTitle(title);

    expect(result?.shapeProperties).toBeDefined();
  });

  it("parses title with text body from c:tx/c:rich", () => {
    const title = el("c:title", {}, [
      el("c:tx", {}, [el("c:rich", {}, [el("a:p", {}, [el("a:r", {}, [el("a:t", {}, [text("Chart Title")])])])])]),
    ]);
    const result = parseChartTitle(title);

    expect(result?.textBody).toBeDefined();
  });
});

// =============================================================================
// parseLegendEntry (ECMA-376 Section 21.2.2.92)
// =============================================================================

describe("parseLegendEntry - c:legendEntry (ECMA-376 Section 21.2.2.92)", () => {
  it("parses legend entry index", () => {
    const entry = el("c:legendEntry", {}, [el("c:idx", { val: "0" })]);
    const result = parseLegendEntry(entry);

    expect(result.idx).toBe(0);
  });

  it("parses legend entry with delete flag", () => {
    const entry = el("c:legendEntry", {}, [el("c:idx", { val: "1" }), el("c:delete", { val: "1" })]);
    const result = parseLegendEntry(entry);

    expect(result.idx).toBe(1);
    expect(result.delete).toBe(true);
  });

  it("parses legend entry with text properties", () => {
    const entry = el("c:legendEntry", {}, [
      el("c:idx", { val: "2" }),
      el("c:txPr", {}, [el("a:bodyPr", {}, []), el("a:p", {}, [])]),
    ]);
    const result = parseLegendEntry(entry);

    expect(result.idx).toBe(2);
    expect(result.textProperties).toBeDefined();
  });

  it("defaults idx to 0 when missing", () => {
    const entry = el("c:legendEntry", {}, []);
    const result = parseLegendEntry(entry);

    expect(result.idx).toBe(0);
  });
});

// =============================================================================
// parseLegend (ECMA-376 Section 21.2.2.94)
// =============================================================================

describe("parseLegend - c:legend (ECMA-376 Section 21.2.2.94)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseLegend(undefined)).toBeUndefined();
  });

  it("parses legend position - bottom", () => {
    const legend = el("c:legend", {}, [el("c:legendPos", { val: "b" })]);
    const result = parseLegend(legend);

    expect(result?.position).toBe("b");
  });

  it("parses legend position - top", () => {
    const legend = el("c:legend", {}, [el("c:legendPos", { val: "t" })]);
    const result = parseLegend(legend);

    expect(result?.position).toBe("t");
  });

  it("parses legend position - left", () => {
    const legend = el("c:legend", {}, [el("c:legendPos", { val: "l" })]);
    const result = parseLegend(legend);

    expect(result?.position).toBe("l");
  });

  it("parses legend position - right (default)", () => {
    const legend = el("c:legend", {}, [el("c:legendPos", { val: "r" })]);
    const result = parseLegend(legend);

    expect(result?.position).toBe("r");
  });

  it("parses legend position - top-right", () => {
    const legend = el("c:legend", {}, [el("c:legendPos", { val: "tr" })]);
    const result = parseLegend(legend);

    expect(result?.position).toBe("tr");
  });

  it("defaults position to right when not specified", () => {
    const legend = el("c:legend", {}, []);
    const result = parseLegend(legend);

    expect(result?.position).toBe("r");
  });

  it("parses overlay attribute", () => {
    const legend = el("c:legend", {}, [el("c:overlay", { val: "1" })]);
    const result = parseLegend(legend);

    expect(result?.overlay).toBe(true);
  });

  it("parses legend with layout", () => {
    const legend = el("c:legend", {}, [
      el("c:layout", {}, [
        el("c:manualLayout", {}, [
          el("c:x", { val: "0.8" }),
          el("c:y", { val: "0.2" }),
          el("c:w", { val: "0.15" }),
          el("c:h", { val: "0.6" }),
        ]),
      ]),
    ]);
    const result = parseLegend(legend);

    expect(result?.layout).toBeDefined();
    expect(result?.layout?.manualLayout?.x).toBe(0.8);
    expect(result?.layout?.manualLayout?.y).toBe(0.2);
    expect(result?.layout?.manualLayout?.w).toBe(0.15);
    expect(result?.layout?.manualLayout?.h).toBe(0.6);
  });

  it("parses legend with shape properties", () => {
    const legend = el("c:legend", {}, [
      el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FFFFFF" })])]),
    ]);
    const result = parseLegend(legend);

    expect(result?.shapeProperties).toBeDefined();
  });

  it("parses legend with text properties", () => {
    const legend = el("c:legend", {}, [el("c:txPr", {}, [el("a:bodyPr", {}, []), el("a:p", {}, [])])]);
    const result = parseLegend(legend);

    expect(result?.textProperties).toBeDefined();
  });

  it("parses legend entries", () => {
    const legend = el("c:legend", {}, [
      el("c:legendEntry", {}, [el("c:idx", { val: "0" })]),
      el("c:legendEntry", {}, [el("c:idx", { val: "1" }), el("c:delete", { val: "1" })]),
    ]);
    const result = parseLegend(legend);

    expect(result?.entries).toBeDefined();
    expect(result?.entries?.length).toBe(2);
    expect(result?.entries?.[0].idx).toBe(0);
    expect(result?.entries?.[1].idx).toBe(1);
    expect(result?.entries?.[1].delete).toBe(true);
  });

  it("returns undefined entries when no legend entries exist", () => {
    const legend = el("c:legend", {}, []);
    const result = parseLegend(legend);

    expect(result?.entries).toBeUndefined();
  });

  it("parses complete legend configuration", () => {
    const legend = el("c:legend", {}, [
      el("c:legendPos", { val: "b" }),
      el("c:overlay", { val: "0" }),
      el("c:layout", {}, [el("c:manualLayout", {}, [el("c:x", { val: "0.1" }), el("c:y", { val: "0.9" })])]),
      el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FFFFFF" })])]),
      el("c:txPr", {}, []),
      el("c:legendEntry", {}, [el("c:idx", { val: "0" })]),
    ]);
    const result = parseLegend(legend);

    expect(result?.position).toBe("b");
    expect(result?.overlay).toBe(false);
    expect(result?.layout).toBeDefined();
    expect(result?.shapeProperties).toBeDefined();
    expect(result?.textProperties).toBeDefined();
    expect(result?.entries).toBeDefined();
  });
});
