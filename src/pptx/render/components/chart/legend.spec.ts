/**
 * @file Legend renderer tests
 *
 * Tests for rendering chart legends according to ECMA-376 specification.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 */

import { renderLegendAtPosition, calculateLegendPosition } from "./legend";
import type { Legend } from "../../../domain/chart";
import type { SeriesData } from "./types";
import type { TextBody, BodyProperties, ParagraphProperties } from "../../../domain/text";
import { pt, px } from "../../../domain/types";

// Mock series data for testing
const mockSeriesData: readonly SeriesData[] = [
  { key: "Series 1", values: [{ x: "1", y: 10 }] },
  { key: "Series 2", values: [{ x: "1", y: 20 }] },
  { key: "Series 3", values: [{ x: "1", y: 30 }] },
];

const mockColors = ["#ff0000", "#00ff00", "#0000ff"];
const mockPosition = { x: 10, y: 10 };

function createBodyProperties(): BodyProperties {
  return {
    verticalType: "horz",
    wrapping: "none",
    anchor: "top",
    anchorCenter: false,
    overflow: "overflow",
    verticalOverflow: "overflow",
    autoFit: { type: "none" },
    insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
  };
}

function createParagraphProperties(): ParagraphProperties {
  return {
    level: 0,
    alignment: "left",
  };
}

describe("Legend Rendering (ECMA-376 21.2.2.94)", () => {
  describe("Basic legend rendering", () => {
    test("renders legend with series names", () => {
      const legend: Legend = {
        position: "r",
      };

      const svg = renderLegendAtPosition(legend, mockSeriesData, mockColors, mockPosition);

      expect(svg).toContain("Series 1");
      expect(svg).toContain("Series 2");
      expect(svg).toContain("Series 3");
    });

    test("returns empty string when legend is undefined", () => {
      const svg = renderLegendAtPosition(undefined, mockSeriesData, mockColors, mockPosition);
      expect(svg).toBe("");
    });

    test("returns empty string when no series data", () => {
      const legend: Legend = { position: "r" };
      const svg = renderLegendAtPosition(legend, [], mockColors, mockPosition);
      expect(svg).toBe("");
    });
  });

  describe("calculateLegendPosition - ST_LegendPos (21.2.3.24)", () => {
    test("positions legend on right", () => {
      const pos = calculateLegendPosition("r", 400, 300, 100, 80);
      expect(pos.x).toBe(290); // chartWidth - legendWidth - 10
    });

    test("positions legend on left", () => {
      const pos = calculateLegendPosition("l", 400, 300, 100, 80);
      expect(pos.x).toBe(10);
    });

    test("positions legend on top", () => {
      const pos = calculateLegendPosition("t", 400, 300, 100, 80);
      expect(pos.y).toBe(10);
    });

    test("positions legend on bottom", () => {
      const pos = calculateLegendPosition("b", 400, 300, 100, 80);
      expect(pos.y).toBe(210); // chartHeight - legendHeight - 10
    });

    test("positions legend top-right", () => {
      const pos = calculateLegendPosition("tr", 400, 300, 100, 80);
      expect(pos.x).toBe(290);
      expect(pos.y).toBe(10);
    });
  });

  describe("Legend entry - c:legendEntry (21.2.2.92)", () => {
    test("hides deleted legend entries", () => {
      const legend: Legend = {
        position: "r",
        entries: [{ idx: 1, delete: true }],
      };

      const svg = renderLegendAtPosition(legend, mockSeriesData, mockColors, mockPosition);

      expect(svg).toContain("Series 1");
      expect(svg).not.toContain("Series 2"); // Deleted
      expect(svg).toContain("Series 3");
    });

    test("hides multiple deleted entries", () => {
      const legend: Legend = {
        position: "r",
        entries: [
          { idx: 0, delete: true },
          { idx: 2, delete: true },
        ],
      };

      const svg = renderLegendAtPosition(legend, mockSeriesData, mockColors, mockPosition);

      expect(svg).not.toContain("Series 1"); // Deleted
      expect(svg).toContain("Series 2");
      expect(svg).not.toContain("Series 3"); // Deleted
    });

    test("returns empty when all entries deleted", () => {
      const legend: Legend = {
        position: "r",
        entries: [
          { idx: 0, delete: true },
          { idx: 1, delete: true },
          { idx: 2, delete: true },
        ],
      };

      const svg = renderLegendAtPosition(legend, mockSeriesData, mockColors, mockPosition);
      expect(svg).toBe("");
    });

    test("applies entry-specific text properties", () => {
      const entryTextProps: TextBody = {
        bodyProperties: createBodyProperties(),
        paragraphs: [
          {
            properties: {
              ...createParagraphProperties(),
              defaultRunProperties: {
                fontSize: pt(14),
                bold: true,
              },
            },
            runs: [],
          },
        ],
      };

      const legend: Legend = {
        position: "r",
        entries: [{ idx: 1, textProperties: entryTextProps }],
      };

      const svg = renderLegendAtPosition(legend, mockSeriesData, mockColors, mockPosition);

      // Series 1 should use default font size (9)
      // Series 2 should use entry-specific font size (14) and bold
      expect(svg).toContain('font-size="14"');
      expect(svg).toContain('font-weight="bold"');
    });

    test("uses legend default when entry has no textProperties", () => {
      const legendTextProps: TextBody = {
        bodyProperties: createBodyProperties(),
        paragraphs: [
          {
            properties: {
              ...createParagraphProperties(),
              defaultRunProperties: {
                fontSize: pt(12),
              },
            },
            runs: [],
          },
        ],
      };

      const legend: Legend = {
        position: "r",
        textProperties: legendTextProps,
        entries: [
          { idx: 1, delete: false }, // Entry exists but no textProperties
        ],
      };

      const svg = renderLegendAtPosition(legend, mockSeriesData, mockColors, mockPosition);

      // All series should use legend default font size (12)
      expect(svg).toContain('font-size="12"');
    });
  });
});
