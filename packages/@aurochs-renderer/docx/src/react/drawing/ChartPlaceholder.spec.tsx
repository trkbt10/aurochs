/**
 * @file ChartPlaceholder Component Tests
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartPlaceholder } from "./ChartPlaceholder";
import type { DocxChart } from "@aurochs-office/docx/domain/drawing";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockChart(rId: string = "rId1"): DocxChart {
  return {
    type: "chart",
    rId,
  };
}

function renderChartPlaceholder(props: {
  chart?: DocxChart;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}): string {
  const element = createElement(ChartPlaceholder, {
    chart: props.chart ?? createMockChart(),
    width: props.width ?? 300,
    height: props.height ?? 200,
    x: props.x,
    y: props.y,
  });
  return renderToStaticMarkup(element);
}

// =============================================================================
// Tests
// =============================================================================

describe("ChartPlaceholder", () => {
  describe("basic rendering", () => {
    it("renders a placeholder group", () => {
      const html = renderChartPlaceholder({});

      expect(html).toContain("<g");
      expect(html).toContain('data-element-type="chart-placeholder"');
    });

    it("includes chart relationship ID as data attribute", () => {
      const html = renderChartPlaceholder({
        chart: createMockChart("rId5"),
      });

      expect(html).toContain('data-chart-rid="rId5"');
    });

    it("renders background rectangle", () => {
      const html = renderChartPlaceholder({ width: 300, height: 200 });

      expect(html).toContain("<rect");
      expect(html).toContain('width="300"');
      expect(html).toContain('height="200"');
    });

    it("renders Chart label", () => {
      const html = renderChartPlaceholder({});

      expect(html).toContain(">Chart</text>");
    });

    it("displays relationship ID", () => {
      const html = renderChartPlaceholder({
        chart: createMockChart("rId42"),
      });

      expect(html).toContain(">rId42</text>");
    });
  });

  describe("positioning", () => {
    it("applies transform for x and y position", () => {
      const html = renderChartPlaceholder({ x: 50, y: 100 });

      expect(html).toContain('transform="translate(50, 100)"');
    });

    it("uses default position of 0,0", () => {
      const html = renderChartPlaceholder({});

      expect(html).toContain('transform="translate(0, 0)"');
    });
  });

  describe("visual elements", () => {
    it("renders chart icon bars", () => {
      const html = renderChartPlaceholder({});

      // Should contain multiple rectangles for the bar chart icon
      const rectMatches = html.match(/<rect/g);
      expect(rectMatches).not.toBeNull();
      expect(rectMatches!.length).toBeGreaterThanOrEqual(4); // Background + 3 bars
    });

    it("renders baseline", () => {
      const html = renderChartPlaceholder({});

      expect(html).toContain("<line");
    });
  });
});
