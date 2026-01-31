import { describe, expect, it } from "vitest";
import { getChild, serializeDocument } from "@oxen/xml";
import { buildChartSpaceDocument, buildChartSpaceElement } from "./chart-space-builder";

describe("buildChartSpaceElement", () => {
  it("builds a bar chart with default col direction", () => {
    const el = buildChartSpaceElement("barChart");

    expect(el.name).toBe("c:chartSpace");
    expect(el.attrs["xmlns:c"]).toBe("http://schemas.openxmlformats.org/drawingml/2006/chart");
    expect(el.attrs["xmlns:a"]).toBe("http://schemas.openxmlformats.org/drawingml/2006/main");

    const chart = getChild(el, "c:chart");
    expect(chart).toBeDefined();

    const plotArea = getChild(chart!, "c:plotArea");
    expect(plotArea).toBeDefined();

    const barChart = getChild(plotArea!, "c:barChart");
    expect(barChart).toBeDefined();

    const barDir = getChild(barChart!, "c:barDir");
    expect(barDir?.attrs.val).toBe("col");
  });

  it("builds a bar chart with bar direction", () => {
    const el = buildChartSpaceElement("barChart", { barDirection: "bar" });

    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const barChart = getChild(plotArea!, "c:barChart");
    const barDir = getChild(barChart!, "c:barDir");

    expect(barDir?.attrs.val).toBe("bar");
  });

  it("builds a line chart", () => {
    const el = buildChartSpaceElement("lineChart");

    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const lineChart = getChild(plotArea!, "c:lineChart");

    expect(lineChart).toBeDefined();
  });

  it("builds a pie chart", () => {
    const el = buildChartSpaceElement("pieChart");

    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const pieChart = getChild(plotArea!, "c:pieChart");

    expect(pieChart).toBeDefined();
  });

  it("includes default series with placeholder data", () => {
    const el = buildChartSpaceElement("barChart");

    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const barChart = getChild(plotArea!, "c:barChart");
    const ser = getChild(barChart!, "c:ser");

    expect(ser).toBeDefined();

    const idx = getChild(ser!, "c:idx");
    expect(idx?.attrs.val).toBe("0");

    const order = getChild(ser!, "c:order");
    expect(order?.attrs.val).toBe("0");

    const cat = getChild(ser!, "c:cat");
    expect(cat).toBeDefined();

    const val = getChild(ser!, "c:val");
    expect(val).toBeDefined();
  });
});

describe("buildChartSpaceDocument", () => {
  it("builds a complete document", () => {
    const doc = buildChartSpaceDocument("barChart");

    expect(doc.children.length).toBe(1);
    const root = doc.children[0];
    expect(root).toHaveProperty("name", "c:chartSpace");
  });

  it("produces valid XML when serialized", () => {
    const doc = buildChartSpaceDocument("lineChart");
    const xml = serializeDocument(doc, { declaration: true, standalone: true });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    expect(xml).toContain("<c:chartSpace");
    expect(xml).toContain("<c:lineChart");
    expect(xml).toContain("</c:chartSpace>");
  });
});
