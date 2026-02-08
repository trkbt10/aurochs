/**
 * @file Chart space builder tests
 */

import { getChild, serializeDocument } from "@aurochs/xml";
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

describe("new chart types", () => {
  it("builds areaChart with grouping", () => {
    const el = buildChartSpaceElement("areaChart", { grouping: "stacked" });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const areaChart = getChild(plotArea!, "c:areaChart");
    expect(areaChart).toBeDefined();
    const grouping = getChild(areaChart!, "c:grouping");
    expect(grouping?.attrs.val).toBe("stacked");
  });

  it("builds area3DChart", () => {
    const el = buildChartSpaceElement("area3DChart");
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const area3DChart = getChild(plotArea!, "c:area3DChart");
    expect(area3DChart).toBeDefined();
  });

  it("builds bar3DChart with options", () => {
    const el = buildChartSpaceElement("bar3DChart", { barDirection: "bar", barGrouping: "stacked" });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const bar3DChart = getChild(plotArea!, "c:bar3DChart");
    expect(bar3DChart).toBeDefined();
    const barDir = getChild(bar3DChart!, "c:barDir");
    expect(barDir?.attrs.val).toBe("bar");
    const grouping = getChild(bar3DChart!, "c:grouping");
    expect(grouping?.attrs.val).toBe("stacked");
  });

  it("builds scatterChart with style", () => {
    const el = buildChartSpaceElement("scatterChart", { scatterStyle: "smooth" });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const scatterChart = getChild(plotArea!, "c:scatterChart");
    expect(scatterChart).toBeDefined();
    const style = getChild(scatterChart!, "c:scatterStyle");
    expect(style?.attrs.val).toBe("smooth");
  });

  it("builds radarChart with style", () => {
    const el = buildChartSpaceElement("radarChart", { radarStyle: "filled" });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const radarChart = getChild(plotArea!, "c:radarChart");
    expect(radarChart).toBeDefined();
    const style = getChild(radarChart!, "c:radarStyle");
    expect(style?.attrs.val).toBe("filled");
  });

  it("builds bubbleChart with options", () => {
    const el = buildChartSpaceElement("bubbleChart", { bubbleScale: 75, sizeRepresents: "w" });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const bubbleChart = getChild(plotArea!, "c:bubbleChart");
    expect(bubbleChart).toBeDefined();
    const scale = getChild(bubbleChart!, "c:bubbleScale");
    expect(scale?.attrs.val).toBe("75");
    const sizeRep = getChild(bubbleChart!, "c:sizeRepresents");
    expect(sizeRep?.attrs.val).toBe("w");
  });

  it("builds doughnutChart with holeSize", () => {
    const el = buildChartSpaceElement("doughnutChart", { holeSize: 70 });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const doughnutChart = getChild(plotArea!, "c:doughnutChart");
    expect(doughnutChart).toBeDefined();
    const holeSize = getChild(doughnutChart!, "c:holeSize");
    expect(holeSize?.attrs.val).toBe("70");
  });

  it("builds line3DChart", () => {
    const el = buildChartSpaceElement("line3DChart");
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const line3DChart = getChild(plotArea!, "c:line3DChart");
    expect(line3DChart).toBeDefined();
  });

  it("builds pie3DChart", () => {
    const el = buildChartSpaceElement("pie3DChart");
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const pie3DChart = getChild(plotArea!, "c:pie3DChart");
    expect(pie3DChart).toBeDefined();
  });

  it("builds ofPieChart with type", () => {
    const el = buildChartSpaceElement("ofPieChart", { ofPieType: "bar" });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const ofPieChart = getChild(plotArea!, "c:ofPieChart");
    expect(ofPieChart).toBeDefined();
    const ofPieType = getChild(ofPieChart!, "c:ofPieType");
    expect(ofPieType?.attrs.val).toBe("bar");
  });

  it("builds stockChart with 4 series", () => {
    const el = buildChartSpaceElement("stockChart");
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const stockChart = getChild(plotArea!, "c:stockChart");
    expect(stockChart).toBeDefined();
    // Stock chart should have 4 series (Open, High, Low, Close)
    const series = stockChart!.children.filter((c) => typeof c === "object" && "name" in c && c.name === "c:ser");
    expect(series.length).toBe(4);
  });

  it("builds surfaceChart with wireframe", () => {
    const el = buildChartSpaceElement("surfaceChart", { wireframe: true });
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const surfaceChart = getChild(plotArea!, "c:surfaceChart");
    expect(surfaceChart).toBeDefined();
    const wireframe = getChild(surfaceChart!, "c:wireframe");
    expect(wireframe?.attrs.val).toBe("1");
  });

  it("builds surface3DChart", () => {
    const el = buildChartSpaceElement("surface3DChart");
    const chart = getChild(el, "c:chart");
    const plotArea = getChild(chart!, "c:plotArea");
    const surface3DChart = getChild(plotArea!, "c:surface3DChart");
    expect(surface3DChart).toBeDefined();
  });
});
