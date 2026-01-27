/**
 * @file Tests for chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2 - Chart Elements
 */

import type { XmlElement } from "@oxen/xml";
import { parseBarSeries, parseBarChart } from "./bar";
import { parseLineSeries, parseLineChart } from "./line";
import { parsePieSeries, parsePieChart } from "./pie";
import { parseScatterSeries, parseScatterChart } from "./scatter";
import { parseAreaSeries, parseAreaChart } from "./area";
import { parseRadarSeries, parseRadarChart } from "./radar";
import { parseBubbleSeries, parseBubbleChart } from "./bubble";
import { parseStockChart } from "./stock";
import { parseSurfaceSeries, parseSurfaceChart } from "./surface";

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

// Helper to create a basic series element
function createSeries(idx: number, order: number, additionalChildren: XmlElement[] = []): XmlElement {
  return el("c:ser", {}, [
    el("c:idx", { val: String(idx) }),
    el("c:order", { val: String(order) }),
    ...additionalChildren,
  ]);
}

// =============================================================================
// parseBarSeries / parseBarChart (ECMA-376 Section 21.2.2.16)
// =============================================================================

describe("parseBarSeries - c:ser in c:barChart (ECMA-376 Section 21.2.2.163)", () => {
  it("parses basic bar series", () => {
    const ser = createSeries(0, 0);
    const result = parseBarSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
    expect(result?.order).toBe(0);
  });

  it("parses bar series with invertIfNegative", () => {
    const ser = createSeries(0, 0, [el("c:invertIfNegative", { val: "1" })]);
    const result = parseBarSeries(ser);

    expect(result?.invertIfNegative).toBe(true);
  });

  it("parses bar series with category and value references", () => {
    const ser = createSeries(0, 0, [
      el("c:cat", {}, [el("c:strRef", {}, [el("c:f", {}, [text("Sheet1!$A$1:$A$5")])])]),
      el("c:val", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$B$1:$B$5")])])]),
    ]);
    const result = parseBarSeries(ser);

    expect(result?.categories?.strRef?.formula).toBe("Sheet1!$A$1:$A$5");
    expect(result?.values?.numRef?.formula).toBe("Sheet1!$B$1:$B$5");
  });
});

describe("parseBarChart - c:barChart (ECMA-376 Section 21.2.2.16)", () => {
  it("parses bar chart with default direction (column)", () => {
    const barChart = el("c:barChart", {}, []);
    const result = parseBarChart(barChart, 0);

    expect(result.type).toBe("barChart");
    expect(result.barDir).toBe("col");
  });

  it("parses bar chart with bar direction", () => {
    const barChart = el("c:barChart", {}, [el("c:barDir", { val: "bar" })]);
    const result = parseBarChart(barChart, 0);

    expect(result.barDir).toBe("bar");
  });

  it("parses bar chart grouping", () => {
    const clustered = el("c:barChart", {}, [el("c:grouping", { val: "clustered" })]);
    const stacked = el("c:barChart", {}, [el("c:grouping", { val: "stacked" })]);
    const percentStacked = el("c:barChart", {}, [el("c:grouping", { val: "percentStacked" })]);

    expect(parseBarChart(clustered, 0).grouping).toBe("clustered");
    expect(parseBarChart(stacked, 0).grouping).toBe("stacked");
    expect(parseBarChart(percentStacked, 0).grouping).toBe("percentStacked");
  });

  it("parses bar chart with gap width", () => {
    const barChart = el("c:barChart", {}, [el("c:gapWidth", { val: "150" })]);
    const result = parseBarChart(barChart, 0);

    expect(result.gapWidth).toBe(150); // Percent branded type
  });

  it("parses bar chart with gap depth", () => {
    const barChart = el("c:barChart", {}, [el("c:gapDepth", { val: "200" })]);
    const result = parseBarChart(barChart, 0);

    expect(result.gapDepth).toBe(200);
  });

  it("parses bar chart with overlap", () => {
    const barChart = el("c:barChart", {}, [el("c:overlap", { val: "-25" })]);
    const result = parseBarChart(barChart, 0);

    expect(result.overlap).toBe(-25);
  });

  it("parses bar chart 3D shape", () => {
    const barChart = el("c:barChart", {}, [el("c:shape", { val: "cylinder" })]);
    const result = parseBarChart(barChart, 0);

    expect(result.shape).toBe("cylinder");
  });

  it("parses bar chart with series", () => {
    const barChart = el("c:barChart", {}, [createSeries(0, 0), createSeries(1, 1)]);
    const result = parseBarChart(barChart, 0);

    expect(result.series.length).toBe(2);
    expect(result.series[0].idx).toBe(0);
    expect(result.series[1].idx).toBe(1);
  });
});

// =============================================================================
// parseLineSeries / parseLineChart (ECMA-376 Section 21.2.2.97)
// =============================================================================

describe("parseLineSeries - c:ser in c:lineChart", () => {
  it("parses basic line series", () => {
    const ser = createSeries(0, 0);
    const result = parseLineSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });

  it("parses line series with marker", () => {
    const ser = createSeries(0, 0, [el("c:marker", {}, [el("c:symbol", { val: "circle" })])]);
    const result = parseLineSeries(ser);

    expect(result?.marker?.symbol).toBe("circle");
  });

  it("parses line series with smooth flag", () => {
    const ser = createSeries(0, 0, [el("c:smooth", { val: "1" })]);
    const result = parseLineSeries(ser);

    expect(result?.smooth).toBe(true);
  });
});

describe("parseLineChart - c:lineChart (ECMA-376 Section 21.2.2.97)", () => {
  it("parses line chart type", () => {
    const lineChart = el("c:lineChart", {}, []);
    const result = parseLineChart(lineChart, 0);

    expect(result.type).toBe("lineChart");
  });

  it("parses line chart grouping", () => {
    const standard = el("c:lineChart", {}, [el("c:grouping", { val: "standard" })]);
    const stacked = el("c:lineChart", {}, [el("c:grouping", { val: "stacked" })]);

    expect(parseLineChart(standard, 0).grouping).toBe("standard");
    expect(parseLineChart(stacked, 0).grouping).toBe("stacked");
  });

  it("parses line chart gap depth", () => {
    const lineChart = el("c:lineChart", {}, [el("c:gapDepth", { val: "250" })]);
    const result = parseLineChart(lineChart, 0);

    expect(result.gapDepth).toBe(250);
  });
});

// =============================================================================
// parsePieSeries / parsePieChart (ECMA-376 Section 21.2.2.139)
// =============================================================================

describe("parsePieSeries - c:ser in c:pieChart", () => {
  it("parses basic pie series", () => {
    const ser = createSeries(0, 0);
    const result = parsePieSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });

  it("parses pie series with explosion", () => {
    const ser = createSeries(0, 0, [el("c:explosion", { val: "25" })]);
    const result = parsePieSeries(ser);

    expect(result?.explosion).toBe(25); // Percent branded type
  });
});

describe("parsePieChart - c:pieChart (ECMA-376 Section 21.2.2.139)", () => {
  it("parses pie chart type", () => {
    const pieChart = el("c:pieChart", {}, []);
    const result = parsePieChart(pieChart, 0, "pieChart");

    expect(result.type).toBe("pieChart");
  });

  it("parses pie3D chart type", () => {
    const pieChart = el("c:pie3DChart", {}, []);
    const result = parsePieChart(pieChart, 0, "pie3DChart");

    expect(result.type).toBe("pie3DChart");
  });

  it("parses doughnut chart type", () => {
    const doughnutChart = el("c:doughnutChart", {}, []);
    const result = parsePieChart(doughnutChart, 0, "doughnutChart");

    expect(result.type).toBe("doughnutChart");
  });

  it("parses pie chart with varyColors", () => {
    const pieChart = el("c:pieChart", {}, [el("c:varyColors", { val: "1" })]);
    const result = parsePieChart(pieChart, 0, "pieChart");

    expect(result.varyColors).toBe(true);
  });

  it("parses pie chart with first slice angle", () => {
    const pieChart = el("c:pieChart", {}, [el("c:firstSliceAng", { val: "45" })]);
    const result = parsePieChart(pieChart, 0, "pieChart");

    expect(result.firstSliceAng).toBe(45); // Degrees branded type
  });

  it("parses doughnut chart with hole size", () => {
    const doughnutChart = el("c:doughnutChart", {}, [el("c:holeSize", { val: "50" })]);
    const result = parsePieChart(doughnutChart, 0, "doughnutChart");

    expect(result.holeSize).toBe(50); // Percent branded type
  });
});

// =============================================================================
// parseScatterSeries / parseScatterChart (ECMA-376 Section 21.2.2.159)
// =============================================================================

describe("parseScatterSeries - c:ser in c:scatterChart", () => {
  it("parses basic scatter series", () => {
    const ser = createSeries(0, 0);
    const result = parseScatterSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });

  it("parses scatter series with x and y values", () => {
    const ser = createSeries(0, 0, [
      el("c:xVal", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$A$1:$A$5")])])]),
      el("c:yVal", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$B$1:$B$5")])])]),
    ]);
    const result = parseScatterSeries(ser);

    expect(result?.xValues?.numRef?.formula).toBe("Sheet1!$A$1:$A$5");
    expect(result?.yValues?.numRef?.formula).toBe("Sheet1!$B$1:$B$5");
  });
});

describe("parseScatterChart - c:scatterChart (ECMA-376 Section 21.2.2.159)", () => {
  it("parses scatter chart type", () => {
    const scatterChart = el("c:scatterChart", {}, []);
    const result = parseScatterChart(scatterChart, 0);

    expect(result.type).toBe("scatterChart");
  });

  it("parses scatter chart style", () => {
    const lineMarker = el("c:scatterChart", {}, [el("c:scatterStyle", { val: "lineMarker" })]);
    const smoothMarker = el("c:scatterChart", {}, [el("c:scatterStyle", { val: "smoothMarker" })]);

    expect(parseScatterChart(lineMarker, 0).scatterStyle).toBe("lineMarker");
    expect(parseScatterChart(smoothMarker, 0).scatterStyle).toBe("smoothMarker");
  });
});

// =============================================================================
// parseAreaSeries / parseAreaChart (ECMA-376 Section 21.2.2.4)
// =============================================================================

describe("parseAreaSeries - c:ser in c:areaChart", () => {
  it("parses basic area series", () => {
    const ser = createSeries(0, 0);
    const result = parseAreaSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });
});

describe("parseAreaChart - c:areaChart (ECMA-376 Section 21.2.2.4)", () => {
  it("parses area chart type", () => {
    const areaChart = el("c:areaChart", {}, []);
    const result = parseAreaChart(areaChart, 0);

    expect(result.type).toBe("areaChart");
  });

  it("parses area chart grouping", () => {
    const standard = el("c:areaChart", {}, [el("c:grouping", { val: "standard" })]);
    const stacked = el("c:areaChart", {}, [el("c:grouping", { val: "stacked" })]);
    const percentStacked = el("c:areaChart", {}, [el("c:grouping", { val: "percentStacked" })]);

    expect(parseAreaChart(standard, 0).grouping).toBe("standard");
    expect(parseAreaChart(stacked, 0).grouping).toBe("stacked");
    expect(parseAreaChart(percentStacked, 0).grouping).toBe("percentStacked");
  });

  it("parses area chart gap depth", () => {
    const areaChart = el("c:areaChart", {}, [el("c:gapDepth", { val: "75" })]);
    const result = parseAreaChart(areaChart, 0);

    expect(result.gapDepth).toBe(75);
  });
});

// =============================================================================
// parseRadarSeries / parseRadarChart (ECMA-376 Section 21.2.2.148)
// =============================================================================

describe("parseRadarSeries - c:ser in c:radarChart", () => {
  it("parses basic radar series", () => {
    const ser = createSeries(0, 0);
    const result = parseRadarSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });

  it("parses radar series with marker", () => {
    const ser = createSeries(0, 0, [el("c:marker", {}, [el("c:symbol", { val: "triangle" })])]);
    const result = parseRadarSeries(ser);

    expect(result?.marker?.symbol).toBe("triangle");
  });
});

describe("parseRadarChart - c:radarChart (ECMA-376 Section 21.2.2.148)", () => {
  it("parses radar chart type", () => {
    const radarChart = el("c:radarChart", {}, []);
    const result = parseRadarChart(radarChart, 0);

    expect(result.type).toBe("radarChart");
  });

  it("parses radar chart style", () => {
    const standard = el("c:radarChart", {}, [el("c:radarStyle", { val: "standard" })]);
    const filled = el("c:radarChart", {}, [el("c:radarStyle", { val: "filled" })]);

    expect(parseRadarChart(standard, 0).radarStyle).toBe("standard");
    expect(parseRadarChart(filled, 0).radarStyle).toBe("filled");
  });
});

// =============================================================================
// parseBubbleSeries / parseBubbleChart (ECMA-376 Section 21.2.2.20)
// =============================================================================

describe("parseBubbleSeries - c:ser in c:bubbleChart", () => {
  it("parses basic bubble series", () => {
    const ser = createSeries(0, 0);
    const result = parseBubbleSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });

  it("parses bubble series with x, y, and bubble size", () => {
    const ser = createSeries(0, 0, [
      el("c:xVal", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$A$1:$A$5")])])]),
      el("c:yVal", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$B$1:$B$5")])])]),
      el("c:bubbleSize", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$C$1:$C$5")])])]),
    ]);
    const result = parseBubbleSeries(ser);

    expect(result?.xValues?.numRef?.formula).toBe("Sheet1!$A$1:$A$5");
    expect(result?.yValues?.numRef?.formula).toBe("Sheet1!$B$1:$B$5");
    expect(result?.bubbleSize?.numRef?.formula).toBe("Sheet1!$C$1:$C$5");
  });

  it("parses bubble series with bubble3D", () => {
    const ser = createSeries(0, 0, [el("c:bubble3D", { val: "1" })]);
    const result = parseBubbleSeries(ser);

    expect(result?.bubble3D).toBe(true);
  });
});

describe("parseBubbleChart - c:bubbleChart (ECMA-376 Section 21.2.2.20)", () => {
  it("parses bubble chart type", () => {
    const bubbleChart = el("c:bubbleChart", {}, []);
    const result = parseBubbleChart(bubbleChart, 0);

    expect(result.type).toBe("bubbleChart");
  });

  it("parses bubble chart scale", () => {
    const bubbleChart = el("c:bubbleChart", {}, [el("c:bubbleScale", { val: "200" })]);
    const result = parseBubbleChart(bubbleChart, 0);

    expect(result.bubbleScale).toBe(200); // Percent branded type
  });

  it("parses bubble chart sizeRepresents", () => {
    const area = el("c:bubbleChart", {}, [el("c:sizeRepresents", { val: "area" })]);
    const width = el("c:bubbleChart", {}, [el("c:sizeRepresents", { val: "w" })]);

    expect(parseBubbleChart(area, 0).sizeRepresents).toBe("area");
    expect(parseBubbleChart(width, 0).sizeRepresents).toBe("w");
  });

  it("parses bubble chart showNegBubbles", () => {
    const bubbleChart = el("c:bubbleChart", {}, [el("c:showNegBubbles", { val: "1" })]);
    const result = parseBubbleChart(bubbleChart, 0);

    expect(result.showNegBubbles).toBe(true);
  });
});

// =============================================================================
// parseStockChart (ECMA-376 Section 21.2.2.169)
// =============================================================================

describe("parseStockChart - c:stockChart (ECMA-376 Section 21.2.2.169)", () => {
  it("parses stock chart type", () => {
    const stockChart = el("c:stockChart", {}, []);
    const result = parseStockChart(stockChart, 0);

    expect(result.type).toBe("stockChart");
  });

  it("parses stock chart with hi-low lines", () => {
    const stockChart = el("c:stockChart", {}, [el("c:hiLowLines", {}, [])]);
    const result = parseStockChart(stockChart, 0);

    expect(result.hiLowLines).toBeDefined();
  });

  it("parses stock chart with up-down bars", () => {
    const stockChart = el("c:stockChart", {}, [el("c:upDownBars", {}, [el("c:gapWidth", { val: "150" })])]);
    const result = parseStockChart(stockChart, 0);

    expect(result.upDownBars).toBeDefined();
    expect(result.upDownBars?.gapWidth).toBe(150);
  });
});

// =============================================================================
// parseSurfaceSeries / parseSurfaceChart (ECMA-376 Section 21.2.2.176)
// =============================================================================

describe("parseSurfaceSeries - c:ser in c:surfaceChart", () => {
  it("parses basic surface series", () => {
    const ser = createSeries(0, 0);
    const result = parseSurfaceSeries(ser);

    expect(result).toBeDefined();
    expect(result?.idx).toBe(0);
  });
});

describe("parseSurfaceChart - c:surfaceChart (ECMA-376 Section 21.2.2.176)", () => {
  it("parses surface chart type", () => {
    const surfaceChart = el("c:surfaceChart", {}, []);
    const result = parseSurfaceChart(surfaceChart, 0, "surfaceChart");

    expect(result.type).toBe("surfaceChart");
  });

  it("parses surface3D chart type", () => {
    const surfaceChart = el("c:surface3DChart", {}, []);
    const result = parseSurfaceChart(surfaceChart, 0, "surface3DChart");

    expect(result.type).toBe("surface3DChart");
  });

  it("parses surface chart wireframe flag", () => {
    const surfaceChart = el("c:surfaceChart", {}, [el("c:wireframe", { val: "1" })]);
    const result = parseSurfaceChart(surfaceChart, 0, "surfaceChart");

    expect(result.wireframe).toBe(true);
  });

  it("parses surface chart band formats", () => {
    const bandFmts = el("c:bandFmts", {}, [
      el("c:bandFmt", {}, [el("c:idx", { val: "0" })]),
      el("c:bandFmt", {}, [el("c:idx", { val: "1" })]),
    ]);
    const surfaceChart = el("c:surfaceChart", {}, [bandFmts]);
    const result = parseSurfaceChart(surfaceChart, 0, "surfaceChart");

    expect(result.bandFormats?.length).toBe(2);
    expect(result.bandFormats?.[0].idx).toBe(0);
    expect(result.bandFormats?.[1].idx).toBe(1);
  });
});
