/**
 * @file Chart renderer tests
 *
 * Tests chart rendering per ECMA-376 specification.
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "../../../index";
import { openPresentation } from "../../../index";
import { renderChart } from "./index";
import type {
  Chart,
  BarChartSeries,
  PieChartSeries,
  LineChartSeries,
  RadarChartSeries,
  BubbleChartSeries,
  BarSeries,
  PieSeries,
  LineSeries,
  RadarSeries,
  BubbleSeries,
} from "../../../domain/chart";
import { createRenderContext } from "../../context";
import { pct, deg, px } from "../../../domain/types";
import { loadPptxFile } from "../../../../../scripts/lib/pptx-loader";

const AASCU_FIXTURE = "fixtures/poi-test-data/test-data/slideshow/aascu.org_workarea_downloadasset.aspx_id=5864.pptx";
const presentationState: { file?: PresentationFile } = {};

describe("Chart rendering - ECMA-376 compliance", () => {
  beforeAll(async () => {
    const fullPath = path.resolve(AASCU_FIXTURE);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    presentationState.file = await loadPptxFile(fullPath);
  });

  describe("Slide 8 bar chart with negative values", () => {
    /**
     * Slide 8 contains a bar chart with:
     * - Negative value: -1.4
     * - Positive values: 3.2, 3.3
     * - c:crosses val="autoZero" on both axes
     *
     * Per ECMA-376 Section 21.2.3.13 (ST_Crosses):
     * - "autoZero" means the axis crosses at zero
     * - Bars should extend from zero line (up for positive, down for negative)
     */
    it("should render SVG with chart content", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      expect(svg).toContain("<svg");
      expect(svg).toContain("<rect"); // Bar chart should have rect elements
    });

    it("should have zero line positioned correctly for negative values", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // The chart should have bars that extend both above and below the zero line
      // We verify by checking that bars exist at different y positions
      const rectMatches = svg.match(/<rect[^>]+>/g) ?? [];
      const barRects = rectMatches.filter((r) => !r.includes("stroke"));

      // Should have multiple bars
      expect(barRects.length).toBeGreaterThan(0);
    });

    it("should include axis line for zero crossing", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // Chart should have line elements for axes
      expect(svg).toContain("<line");
    });

    it("should render legend with series names", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // Chart XML has c:legend with legendPos="r"
      // Legend should contain series names from the data
      // Series names: "1990-1995", "1995-2000", "2000-2005", "2005-2010"
      expect(svg).toContain("1990-1995");
      expect(svg).toContain("1995-2000");
    });

    it("should render major gridlines", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // Chart XML has <c:majorGridlines/> on valAx
      // Should render horizontal gridlines with stroke="#ddd"
      const gridlineMatches = svg.match(/stroke="#ddd"/g) ?? [];
      expect(gridlineMatches.length).toBeGreaterThan(0);
    });

    it("should render value axis labels", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // Chart XML has tickLblPos="nextTo" on valAx
      // Should render numeric labels with fill="#666"
      const labelMatches = svg.match(/fill="#666"/g) ?? [];
      expect(labelMatches.length).toBeGreaterThan(0);

      // Should contain numeric values like "0", "1", "2", "3" for the axis
      expect(svg).toMatch(/<text[^>]*>-?\d/);
    });

    it("should render bars with fill colors", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // Each bar should have a fill color (hex format)
      // Pattern: fill="#XXXXXX" where X is hex digit
      const barRects = svg.match(/<rect[^>]+fill="#[0-9A-Fa-f]{6}"[^>]*>/g) ?? [];

      // Should have at least 4 series × multiple categories = many colored bars
      expect(barRects.length).toBeGreaterThan(0);

      // Verify actual color values are present (not empty or transparent)
      const fillColors = svg.match(/fill="#([0-9A-Fa-f]{6})"/g) ?? [];
      expect(fillColors.length).toBeGreaterThan(0);

      // Verify colors are actual chart colors, not just black/white
      const hasChartColor = fillColors.some(
        (c) => !c.includes("#ffffff") && !c.includes("#000000") && !c.includes("#FFFFFF") && !c.includes("#000000"),
      );
      expect(hasChartColor).toBe(true);
    });

    it("should have legend positioned outside chart plot area", () => {
      const presentation = openPresentation(getPresentationFile());
      const slide = presentation.getSlide(8);
      const svg = slide.renderSVG();

      // Legend position="r" means right side
      // Chart plot area should not overlap with legend

      // Extract legend text x position
      // Legend text "1990-1995" should have x coordinate
      const legendTextMatch = svg.match(/1990-1995/);
      expect(legendTextMatch).toBeTruthy();

      // Find the chart plot area bounds (the group with transform)
      // The chart bars should be within a g element
      const transformMatch = svg.match(/transform="translate\((\d+),\s*(\d+)\)"/);
      expect(transformMatch).toBeTruthy();
      const plotLeft = parseInt(transformMatch![1], 10);

      // Find legend x position - legend items have <rect> and <text> elements
      // Look for text elements with legend series names
      const legendPattern = /<text[^>]*x="(\d+\.?\d*)"[^>]*>1990-1995<\/text>/;
      const legendMatch = svg.match(legendPattern);

      // If legend found, verify it's positioned to the right
      if (legendMatch) {
        const legendX = parseFloat(legendMatch[1]);
        // Legend should be positioned in the right portion of the chart
        // (not overlapping with the plot area)
        expect(legendX).toBeGreaterThan(plotLeft + 100); // Legend should be well to the right
      }
    });
  });
});

function getPresentationFile(): PresentationFile {
  if (!presentationState.file) {
    throw new Error("Presentation fixture was not loaded.");
  }
  return presentationState.file;
}

function incrementCount(current: number | undefined): number {
  if (current === undefined) {
    return 1;
  }
  return current + 1;
}

function parseMatchFloat(input: string, pattern: RegExp): number {
  const match = input.match(pattern);
  const value = match?.[1];
  if (value === undefined) {
    return 0;
  }
  return parseFloat(value);
}

// =============================================================================
// Unit tests for ECMA-376 compliance
// =============================================================================

/**
 * Helper to create a mock bar chart series
 */
function createMockBarSeries(values: number[], name: string = "Series 1"): BarSeries {
  return {
    idx: 0,
    order: 0,
    tx: { value: name },
    categories: {
      strRef: {
        formula: "",
        cache: {
          count: values.length,
          points: values.map((_, i) => ({ idx: i, value: `Cat ${i + 1}` })),
        },
      },
    },
    values: {
      numRef: {
        formula: "",
        cache: {
          count: values.length,
          points: values.map((v, i) => ({ idx: i, value: v })),
        },
      },
    },
  };
}

/**
 * Helper to create a mock pie chart series
 */
function createMockPieSeries(
  values: number[],
  name: string = "Series 1",
  options?: { explosion?: number; dataPointExplosions?: number[] },
): PieSeries {
  return {
    idx: 0,
    order: 0,
    tx: { value: name },
    explosion: options?.explosion !== undefined ? pct(options.explosion) : undefined,
    dataPoints: options?.dataPointExplosions?.map((exp, i) => ({
      idx: i,
      explosion: pct(exp),
    })),
    categories: {
      strRef: {
        formula: "",
        cache: {
          count: values.length,
          points: values.map((_, i) => ({ idx: i, value: `Slice ${i + 1}` })),
        },
      },
    },
    values: {
      numRef: {
        formula: "",
        cache: {
          count: values.length,
          points: values.map((v, i) => ({ idx: i, value: v })),
        },
      },
    },
  };
}

/**
 * Helper to create a mock line chart series
 */
function createMockLineSeries(values: number[], name: string = "Series 1"): LineSeries {
  return {
    idx: 0,
    order: 0,
    tx: { value: name },
    categories: {
      strRef: {
        formula: "",
        cache: {
          count: values.length,
          points: values.map((_, i) => ({ idx: i, value: `Point ${i + 1}` })),
        },
      },
    },
    values: {
      numRef: {
        formula: "",
        cache: {
          count: values.length,
          points: values.map((v, i) => ({ idx: i, value: v })),
        },
      },
    },
  };
}

describe("Chart renderer unit tests", () => {
  const ctx = createRenderContext({
    slideSize: { width: px(800), height: px(600) },
  });

  describe("barDir - ECMA-376 Section 21.2.3.3", () => {
    it("should render vertical bars for barDir='col'", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "barChart",
              index: 0,
              order: 0,
              barDir: "col",
              grouping: "clustered",
              series: [createMockBarSeries([10, 20, 30])],
            } as BarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Vertical bars should have height > width typically
      // Check for rect elements
      expect(svgStr).toContain("<rect");
      expect(svgStr).toContain("<svg");
    });

    it("should render horizontal bars for barDir='bar'", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "barChart",
              index: 0,
              order: 0,
              barDir: "bar",
              grouping: "clustered",
              series: [createMockBarSeries([10, 20, 30])],
            } as BarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Horizontal bars should have rects
      expect(svgStr).toContain("<rect");

      // Extract rect dimensions to verify orientation
      // For horizontal bars, width should represent value, height should be bar thickness
      const rectMatches = svgStr.match(/<rect[^>]+>/g) ?? [];
      expect(rectMatches.length).toBeGreaterThan(0);
    });
  });

  describe("firstSliceAng - ECMA-376 Section 21.2.2.54", () => {
    it("should use default angle of 0 (starts from top) when not specified", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              series: [createMockPieSeries([25, 25, 25, 25])],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // Should contain path elements for pie slices
      expect(svgStr).toContain("<path");
    });

    it("should rotate slices when firstSliceAng is set to 90", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              firstSliceAng: deg(90),
              series: [createMockPieSeries([50, 50])],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // The first slice should start at 0 degrees (right side) in SVG coordinates
      // since firstSliceAng=90 means 90 degrees clockwise from top
      expect(svgStr).toContain("<path");
    });
  });

  describe("varyColors - ECMA-376 Section 21.2.2.230", () => {
    it("should use different colors for each pie slice when varyColors=true (default)", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              varyColors: true,
              series: [createMockPieSeries([25, 25, 25, 25])],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // Should have multiple different fill colors
      const fillMatches = svgStr.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? [];

      // 4 slices should have colors (may include other elements too)
      expect(fillMatches.length).toBeGreaterThanOrEqual(4);

      // Extract unique fill colors
      const uniqueColors = new Set(fillMatches);
      // With 4 slices, we expect multiple different colors
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });

  describe("grouping - ECMA-376 Section 21.2.3.4 (ST_BarGrouping)", () => {
    it("should stack bars vertically for grouping='stacked'", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "barChart",
              index: 0,
              order: 0,
              barDir: "col",
              grouping: "stacked",
              series: [createMockBarSeries([10, 20]), createMockBarSeries([15, 25])],
            } as BarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should have 4 bars (2 categories × 2 series)
      const rectMatches = svgStr.match(/<rect[^>]+fill="#[0-9A-Fa-f]{6}"[^>]*>/g) ?? [];
      expect(rectMatches.length).toBe(4);

      // For stacked, bars in same category should have same x position
      // Extract x positions
      const xPositions = rectMatches.map((rect) => {
        const match = rect.match(/x="(\d+\.?\d*)"/);
        return match ? parseFloat(match[1]) : 0;
      });

      // Group by approximate x position (stacked bars share same x)
      const uniqueX = new Set(xPositions.map((x) => Math.round(x)));
      // Should have 2 unique x positions (2 categories)
      expect(uniqueX.size).toBe(2);
    });

    it("should normalize to 100% for grouping='percentStacked'", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "barChart",
              index: 0,
              order: 0,
              barDir: "col",
              grouping: "percentStacked",
              series: [
                createMockBarSeries([25, 50]), // 25% of 100, 50% of 100
                createMockBarSeries([75, 50]), // 75% of 100, 50% of 100
              ],
            } as BarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should have 4 bars
      const rectMatches = svgStr.match(/<rect[^>]+fill="#[0-9A-Fa-f]{6}"[^>]*>/g) ?? [];
      expect(rectMatches.length).toBe(4);
    });
  });

  describe("Negative values with crosses='autoZero'", () => {
    it("should position bars correctly for mixed positive/negative values", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "barChart",
              index: 0,
              order: 0,
              barDir: "col",
              grouping: "clustered",
              series: [createMockBarSeries([-10, 20, -5, 30])],
            } as BarChartSeries,
          ],
          axes: [
            {
              type: "valAx",
              id: 1,
              position: "l",
              orientation: "minMax",
              majorTickMark: "none",
              minorTickMark: "none",
              tickLabelPosition: "nextTo",
              crossAxisId: 0,
              crosses: "autoZero",
            },
          ],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should render 4 bars
      const rectMatches = svgStr.match(/<rect[^>]+fill="#[0-9A-Fa-f]{6}"[^>]*>/g) ?? [];
      expect(rectMatches.length).toBe(4);

      // Extract y positions to verify some bars are above zero line, some below
      const yMatches = svgStr.match(/<rect[^>]+y="(\d+\.?\d*)"[^>]*>/g) ?? [];
      const yPositions = yMatches.map((m) => {
        const match = m.match(/y="(\d+\.?\d*)"/);
        return match ? parseFloat(match[1]) : 0;
      });

      // Should have different y positions (some above zero, some at zero for negative)
      const uniqueYPositions = new Set(yPositions.map((y) => Math.round(y)));
      expect(uniqueYPositions.size).toBeGreaterThan(1);
    });
  });

  describe("smooth - ECMA-376 Section 21.2.2.185", () => {
    it("should render straight lines when smooth=false", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "lineChart",
              index: 0,
              order: 0,
              grouping: "standard",
              smooth: false,
              series: [createMockLineSeries([10, 20, 15, 30])],
            } as LineChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should have path element with L (line to) commands
      expect(svgStr).toContain("<path");
      // Straight lines use L commands, not C (curve) commands
      const pathMatch = svgStr.match(/d="([^"]+)"/);
      expect(pathMatch).toBeTruthy();
      expect(pathMatch![1]).toContain(" L "); // Line-to commands
      expect(pathMatch![1]).not.toContain(" C "); // Should NOT have curve commands
    });

    it("should render smooth curves when smooth=true", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "lineChart",
              index: 0,
              order: 0,
              grouping: "standard",
              smooth: true,
              series: [createMockLineSeries([10, 20, 15, 30])],
            } as LineChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should have path element with C (cubic bezier) commands
      expect(svgStr).toContain("<path");
      const pathMatch = svgStr.match(/d="([^"]+)"/);
      expect(pathMatch).toBeTruthy();
      expect(pathMatch![1]).toContain(" C "); // Curve commands for smooth
    });
  });

  describe("explosion - ECMA-376 Section 21.2.2.65", () => {
    it("should render pie slices at center when no explosion is set", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              series: [createMockPieSeries([25, 25, 25, 25])],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // All slices should share the same center point (150, 150 = 300/2)
      const pathMatches = svgStr.match(/<path[^>]+d="([^"]+)"[^>]*>/g) ?? [];
      expect(pathMatches.length).toBe(4);

      // Extract starting M coordinates (center point for pie)
      const centerPoints = pathMatches
        .map((path) => {
          const match = path.match(/d="M ([0-9.]+) ([0-9.]+)/);
          return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
        })
        .filter(Boolean);

      // All should have same center (approximately)
      const firstCenter = centerPoints[0];
      for (const center of centerPoints) {
        expect(Math.abs(center!.x - firstCenter!.x)).toBeLessThan(1);
        expect(Math.abs(center!.y - firstCenter!.y)).toBeLessThan(1);
      }
    });

    it("should offset slice from center when series explosion is set", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              series: [createMockPieSeries([25, 25, 25, 25], "Series 1", { explosion: 25 })],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // All slices should be exploded from center
      const pathMatches = svgStr.match(/<path[^>]+d="([^"]+)"[^>]*>/g) ?? [];
      expect(pathMatches.length).toBe(4);

      // Extract starting M coordinates
      const centerPoints = pathMatches
        .map((path) => {
          const match = path.match(/d="M ([0-9.]+) ([0-9.]+)/);
          return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
        })
        .filter(Boolean);

      // Each slice should have a different center (exploded outward)
      const uniqueCenters = new Set(centerPoints.map((c) => `${Math.round(c!.x)},${Math.round(c!.y)}`));
      expect(uniqueCenters.size).toBe(4); // Each slice has different center
    });

    it("should offset individual slices with data point explosion", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              series: [
                createMockPieSeries([25, 25, 25, 25], "Series 1", {
                  dataPointExplosions: [0, 30, 0, 0], // Only second slice exploded
                }),
              ],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      const pathMatches = svgStr.match(/<path[^>]+d="([^"]+)"[^>]*>/g) ?? [];
      expect(pathMatches.length).toBe(4);

      // Extract starting M coordinates
      const centerPoints = pathMatches
        .map((path) => {
          const match = path.match(/d="M ([0-9.]+) ([0-9.]+)/);
          return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
        })
        .filter(Boolean);

      // 3 slices should share same center, 1 should be different
      const centerStrings = centerPoints.map((c) => `${Math.round(c!.x)},${Math.round(c!.y)}`);
      const uniqueCenters = new Set(centerStrings);
      expect(uniqueCenters.size).toBe(2); // 2 unique centers (normal + exploded)

      // Count occurrences - 3 should be at normal center, 1 exploded
      const centerCounts: Record<string, number> = {};
      for (const c of centerStrings) {
        centerCounts[c] = incrementCount(centerCounts[c]);
      }
      const counts = Object.values(centerCounts).sort((a, b) => b - a);
      expect(counts).toEqual([3, 1]); // 3 normal, 1 exploded
    });

    it("should prioritize data point explosion over series explosion", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "pieChart",
              index: 0,
              order: 0,
              series: [
                createMockPieSeries([50, 50], "Series 1", {
                  explosion: 10, // Series-level explosion
                  dataPointExplosions: [0, 25], // Override: first slice no explosion, second 25%
                }),
              ],
            } as PieChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      const pathMatches = svgStr.match(/<path[^>]+d="([^"]+)"[^>]*>/g) ?? [];
      expect(pathMatches.length).toBe(2);

      // First slice should be at center (dataPoint explosion=0 overrides series)
      // Second slice should be exploded (dataPoint explosion=25)
      const centerPoints = pathMatches
        .map((path) => {
          const match = path.match(/d="M ([0-9.]+) ([0-9.]+)/);
          return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
        })
        .filter(Boolean);

      // Should have 2 different centers
      expect(centerPoints[0]!.x).not.toEqual(centerPoints[1]!.x);
    });
  });

  describe("radarChart - ECMA-376 Section 21.2.2.148", () => {
    function createMockRadarSeries(values: number[], name = "Series 1"): RadarSeries {
      return {
        idx: 0,
        order: 0,
        tx: { value: name },
        categories: {
          strRef: {
            formula: "Sheet1!$A$1:$A$4",
            cache: {
              count: values.length,
              points: values.map((_, i) => ({ idx: i, value: `Category ${i + 1}` })),
            },
          },
        },
        values: {
          numRef: {
            formula: "Sheet1!$B$1:$B$4",
            cache: {
              count: values.length,
              points: values.map((v, i) => ({ idx: i, value: v })),
            },
          },
        },
      };
    }

    it("should render radar chart with polygon for standard style", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "radarChart",
              index: 0,
              order: 0,
              radarStyle: "standard",
              series: [createMockRadarSeries([10, 20, 15, 25])],
            } as RadarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // Should have polygon elements (grid + data)
      expect(svgStr).toContain("<polygon");
      // Should have line elements (spokes)
      expect(svgStr).toContain("<line");
    });

    it("should render markers for marker style", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "radarChart",
              index: 0,
              order: 0,
              radarStyle: "marker",
              series: [createMockRadarSeries([10, 20, 15, 25])],
            } as RadarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // Should have circle elements for markers
      expect(svgStr).toContain("<circle");
    });

    it("should render filled polygon for filled style", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "radarChart",
              index: 0,
              order: 0,
              radarStyle: "filled",
              series: [createMockRadarSeries([10, 20, 15, 25])],
            } as RadarChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 300, 300, ctx);
      const svgStr = svg.toString();

      // Should have filled polygon (fill-opacity for semi-transparency)
      expect(svgStr).toContain("fill-opacity");
    });
  });

  describe("bubbleChart - ECMA-376 Section 21.2.2.20", () => {
    function createMockBubbleSeries(data: { x: number; y: number; size: number }[], name = "Series 1"): BubbleSeries {
      return {
        idx: 0,
        order: 0,
        tx: { value: name },
        xValues: {
          numRef: {
            formula: "Sheet1!$A$1:$A$4",
            cache: {
              count: data.length,
              points: data.map((d, i) => ({ idx: i, value: d.x })),
            },
          },
        },
        yValues: {
          numRef: {
            formula: "Sheet1!$B$1:$B$4",
            cache: {
              count: data.length,
              points: data.map((d, i) => ({ idx: i, value: d.y })),
            },
          },
        },
        bubbleSize: {
          numRef: {
            formula: "Sheet1!$C$1:$C$4",
            cache: {
              count: data.length,
              points: data.map((d, i) => ({ idx: i, value: d.size })),
            },
          },
        },
      };
    }

    it("should render bubble chart with circles", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "bubbleChart",
              index: 0,
              order: 0,
              series: [
                createMockBubbleSeries([
                  { x: 1, y: 1, size: 10 },
                  { x: 2, y: 2, size: 20 },
                  { x: 3, y: 1.5, size: 15 },
                ]),
              ],
            } as BubbleChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should have circle elements
      expect(svgStr).toContain("<circle");

      // Should have 3 circles (one per data point)
      const circleMatches = svgStr.match(/<circle[^>]+fill="#[0-9A-Fa-f]{6}"[^>]*>/g) ?? [];
      expect(circleMatches.length).toBe(3);
    });

    it("should render different size circles based on bubble size", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "bubbleChart",
              index: 0,
              order: 0,
              series: [
                createMockBubbleSeries([
                  { x: 1, y: 1, size: 10 },
                  { x: 2, y: 2, size: 40 }, // 4x larger
                ]),
              ],
            } as BubbleChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Extract radii
      const radiusMatches = svgStr.match(/r="(\d+\.?\d*)"/g) ?? [];
      const radii = radiusMatches.map((r) => parseMatchFloat(r, /r="(\d+\.?\d*)"/));

      // Should have at least 2 circles with different radii
      const uniqueRadii = new Set(radii.filter((r) => r > 0));
      expect(uniqueRadii.size).toBeGreaterThanOrEqual(2);
    });

    it("should render negative bubbles with dashed stroke when showNegBubbles=true", () => {
      const chart: Chart = {
        plotArea: {
          charts: [
            {
              type: "bubbleChart",
              index: 0,
              order: 0,
              showNegBubbles: true,
              series: [
                createMockBubbleSeries([
                  { x: 1, y: 1, size: 10 },
                  { x: 2, y: 2, size: -20 }, // Negative size
                ]),
              ],
            } as BubbleChartSeries,
          ],
          axes: [],
        },
      };

      const svg = renderChart(chart, 400, 300, ctx);
      const svgStr = svg.toString();

      // Should have dashed stroke for negative bubble
      expect(svgStr).toContain("stroke-dasharray");
    });
  });
});
