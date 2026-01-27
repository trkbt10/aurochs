/**
 * @file Fill Parser Tests
 *
 * Tests for parsing fill elements from styles.xml.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import {
  parseColor,
  parsePatternFill,
  parseGradientFill,
  parseFill,
  parseFills,
} from "./fill";

/**
 * Helper to parse XML string and get the root element.
 */
function parseRoot(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

// =============================================================================
// parseColor Tests
// =============================================================================

describe("parseColor", () => {
  it("should parse RGB color", () => {
    const xml = `<color rgb="FFFF0000"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "rgb", value: "FFFF0000" });
  });

  it("should parse RGB color with 6-digit hex", () => {
    const xml = `<color rgb="FF0000"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "rgb", value: "FF0000" });
  });

  it("should parse theme color", () => {
    const xml = `<color theme="1"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "theme", theme: 1, tint: undefined });
  });

  it("should parse theme color with tint", () => {
    const xml = `<color theme="4" tint="0.79998168889431442"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({
      type: "theme",
      theme: 4,
      tint: 0.79998168889431442,
    });
  });

  it("should parse theme color with negative tint", () => {
    const xml = `<color theme="0" tint="-0.14999847407452621"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({
      type: "theme",
      theme: 0,
      tint: -0.14999847407452621,
    });
  });

  it("should parse indexed color", () => {
    const xml = `<color indexed="64"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "indexed", index: 64 });
  });

  it("should parse auto color with value 1", () => {
    const xml = `<color auto="1"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "auto" });
  });

  it("should parse auto color with value true", () => {
    const xml = `<color auto="true"/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toEqual({ type: "auto" });
  });

  it("should return undefined for empty color element", () => {
    const xml = `<color/>`;
    const result = parseColor(parseRoot(xml));
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parsePatternFill Tests
// =============================================================================

describe("parsePatternFill", () => {
  it("should parse none pattern type", () => {
    const xml = `<patternFill patternType="none"/>`;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "none",
      fgColor: undefined,
      bgColor: undefined,
    });
  });

  it("should parse solid pattern type", () => {
    const xml = `<patternFill patternType="solid"/>`;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "solid",
      fgColor: undefined,
      bgColor: undefined,
    });
  });

  it("should parse gray125 pattern type", () => {
    const xml = `<patternFill patternType="gray125"/>`;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "gray125",
      fgColor: undefined,
      bgColor: undefined,
    });
  });

  it("should parse solid fill with foreground color", () => {
    const xml = `
      <patternFill patternType="solid">
        <fgColor rgb="FF00FF00"/>
      </patternFill>
    `;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "solid",
      fgColor: { type: "rgb", value: "FF00FF00" },
      bgColor: undefined,
    });
  });

  it("should parse solid fill with background color", () => {
    const xml = `
      <patternFill patternType="solid">
        <bgColor indexed="64"/>
      </patternFill>
    `;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "solid",
      fgColor: undefined,
      bgColor: { type: "indexed", index: 64 },
    });
  });

  it("should parse solid fill with both foreground and background colors", () => {
    const xml = `
      <patternFill patternType="solid">
        <fgColor theme="4" tint="0.59999389629810485"/>
        <bgColor indexed="64"/>
      </patternFill>
    `;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "solid",
      fgColor: { type: "theme", theme: 4, tint: 0.59999389629810485 },
      bgColor: { type: "indexed", index: 64 },
    });
  });

  it("should default to none when patternType is missing", () => {
    const xml = `<patternFill/>`;
    const result = parsePatternFill(parseRoot(xml));
    expect(result).toEqual({
      patternType: "none",
      fgColor: undefined,
      bgColor: undefined,
    });
  });

  it("should parse various pattern types", () => {
    const patternTypes = [
      "darkGray",
      "mediumGray",
      "lightGray",
      "darkHorizontal",
      "darkVertical",
      "darkDown",
      "darkUp",
      "darkGrid",
      "darkTrellis",
      "lightHorizontal",
      "lightVertical",
      "lightDown",
      "lightUp",
      "lightGrid",
      "lightTrellis",
    ] as const;

    for (const patternType of patternTypes) {
      const xml = `<patternFill patternType="${patternType}"/>`;
      const result = parsePatternFill(parseRoot(xml));
      expect(result.patternType).toBe(patternType);
    }
  });
});

// =============================================================================
// parseGradientFill Tests
// =============================================================================

describe("parseGradientFill", () => {
  it("should parse linear gradient with no stops", () => {
    const xml = `<gradientFill type="linear"/>`;
    const result = parseGradientFill(parseRoot(xml));
    expect(result).toEqual({
      gradientType: "linear",
      degree: undefined,
      stops: [],
    });
  });

  it("should parse path gradient", () => {
    const xml = `<gradientFill type="path"/>`;
    const result = parseGradientFill(parseRoot(xml));
    expect(result).toEqual({
      gradientType: "path",
      degree: undefined,
      stops: [],
    });
  });

  it("should default to linear gradient type", () => {
    const xml = `<gradientFill/>`;
    const result = parseGradientFill(parseRoot(xml));
    expect(result.gradientType).toBe("linear");
  });

  it("should parse gradient with degree", () => {
    const xml = `<gradientFill type="linear" degree="90"/>`;
    const result = parseGradientFill(parseRoot(xml));
    expect(result).toEqual({
      gradientType: "linear",
      degree: 90,
      stops: [],
    });
  });

  it("should parse gradient with fractional degree", () => {
    const xml = `<gradientFill type="linear" degree="45.5"/>`;
    const result = parseGradientFill(parseRoot(xml));
    expect(result.degree).toBe(45.5);
  });

  it("should parse gradient with stops", () => {
    const xml = `
      <gradientFill type="linear" degree="90">
        <stop position="0">
          <color rgb="FFFF0000"/>
        </stop>
        <stop position="1">
          <color rgb="FF0000FF"/>
        </stop>
      </gradientFill>
    `;
    const result = parseGradientFill(parseRoot(xml));
    expect(result).toEqual({
      gradientType: "linear",
      degree: 90,
      stops: [
        { position: 0, color: { type: "rgb", value: "FFFF0000" } },
        { position: 1, color: { type: "rgb", value: "FF0000FF" } },
      ],
    });
  });

  it("should parse gradient with fractional stop positions", () => {
    const xml = `
      <gradientFill type="linear">
        <stop position="0.25">
          <color theme="0"/>
        </stop>
        <stop position="0.75">
          <color theme="1"/>
        </stop>
      </gradientFill>
    `;
    const result = parseGradientFill(parseRoot(xml));
    expect(result.stops).toEqual([
      { position: 0.25, color: { type: "theme", theme: 0, tint: undefined } },
      { position: 0.75, color: { type: "theme", theme: 1, tint: undefined } },
    ]);
  });

  it("should skip stops without color element", () => {
    const xml = `
      <gradientFill type="linear">
        <stop position="0"/>
        <stop position="1">
          <color rgb="FFFF0000"/>
        </stop>
      </gradientFill>
    `;
    const result = parseGradientFill(parseRoot(xml));
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].position).toBe(1);
  });

  it("should skip stops with empty color element", () => {
    const xml = `
      <gradientFill type="linear">
        <stop position="0">
          <color/>
        </stop>
        <stop position="1">
          <color rgb="FF0000FF"/>
        </stop>
      </gradientFill>
    `;
    const result = parseGradientFill(parseRoot(xml));
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].position).toBe(1);
  });

  it("should default stop position to 0", () => {
    const xml = `
      <gradientFill type="linear">
        <stop>
          <color rgb="FFFF0000"/>
        </stop>
      </gradientFill>
    `;
    const result = parseGradientFill(parseRoot(xml));
    expect(result.stops[0].position).toBe(0);
  });
});

// =============================================================================
// parseFill Tests
// =============================================================================

describe("parseFill", () => {
  it("should parse fill with patternFill none as type none", () => {
    const xml = `
      <fill>
        <patternFill patternType="none"/>
      </fill>
    `;
    const result = parseFill(parseRoot(xml));
    expect(result).toEqual({ type: "none" });
  });

  it("should parse fill with solid patternFill", () => {
    const xml = `
      <fill>
        <patternFill patternType="solid">
          <fgColor rgb="FFFFFF00"/>
        </patternFill>
      </fill>
    `;
    const result = parseFill(parseRoot(xml));
    expect(result).toEqual({
      type: "pattern",
      pattern: {
        patternType: "solid",
        fgColor: { type: "rgb", value: "FFFFFF00" },
        bgColor: undefined,
      },
    });
  });

  it("should parse fill with gray125 patternFill", () => {
    const xml = `
      <fill>
        <patternFill patternType="gray125"/>
      </fill>
    `;
    const result = parseFill(parseRoot(xml));
    expect(result).toEqual({
      type: "pattern",
      pattern: {
        patternType: "gray125",
        fgColor: undefined,
        bgColor: undefined,
      },
    });
  });

  it("should parse fill with gradientFill", () => {
    const xml = `
      <fill>
        <gradientFill type="linear" degree="90">
          <stop position="0">
            <color theme="0"/>
          </stop>
          <stop position="1">
            <color theme="4"/>
          </stop>
        </gradientFill>
      </fill>
    `;
    const result = parseFill(parseRoot(xml));
    expect(result).toEqual({
      type: "gradient",
      gradient: {
        gradientType: "linear",
        degree: 90,
        stops: [
          { position: 0, color: { type: "theme", theme: 0, tint: undefined } },
          { position: 1, color: { type: "theme", theme: 4, tint: undefined } },
        ],
      },
    });
  });

  it("should return none for empty fill element", () => {
    const xml = `<fill/>`;
    const result = parseFill(parseRoot(xml));
    expect(result).toEqual({ type: "none" });
  });

  it("should prioritize patternFill over gradientFill", () => {
    // This is an unusual case but tests priority
    const xml = `
      <fill>
        <patternFill patternType="solid">
          <fgColor rgb="FFFF0000"/>
        </patternFill>
        <gradientFill type="linear"/>
      </fill>
    `;
    const result = parseFill(parseRoot(xml));
    expect(result.type).toBe("pattern");
  });
});

// =============================================================================
// parseFills Tests
// =============================================================================

describe("parseFills", () => {
  it("should parse empty fills collection", () => {
    const xml = `<fills count="0"/>`;
    const result = parseFills(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse standard Excel default fills", () => {
    const xml = `
      <fills count="2">
        <fill>
          <patternFill patternType="none"/>
        </fill>
        <fill>
          <patternFill patternType="gray125"/>
        </fill>
      </fills>
    `;
    const result = parseFills(parseRoot(xml));
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "none" });
    expect(result[1]).toEqual({
      type: "pattern",
      pattern: {
        patternType: "gray125",
        fgColor: undefined,
        bgColor: undefined,
      },
    });
  });

  it("should parse fills with various fill types", () => {
    const xml = `
      <fills count="4">
        <fill>
          <patternFill patternType="none"/>
        </fill>
        <fill>
          <patternFill patternType="gray125"/>
        </fill>
        <fill>
          <patternFill patternType="solid">
            <fgColor theme="4" tint="0.79998168889431442"/>
            <bgColor indexed="64"/>
          </patternFill>
        </fill>
        <fill>
          <gradientFill type="linear" degree="90">
            <stop position="0">
              <color theme="0"/>
            </stop>
            <stop position="1">
              <color theme="4"/>
            </stop>
          </gradientFill>
        </fill>
      </fills>
    `;
    const result = parseFills(parseRoot(xml));
    expect(result).toHaveLength(4);
    expect(result[0].type).toBe("none");
    expect(result[1].type).toBe("pattern");
    expect(result[2].type).toBe("pattern");
    expect(result[3].type).toBe("gradient");
  });

  it("should preserve fill order for index-based referencing", () => {
    const xml = `
      <fills count="3">
        <fill>
          <patternFill patternType="none"/>
        </fill>
        <fill>
          <patternFill patternType="solid">
            <fgColor rgb="FFFF0000"/>
          </patternFill>
        </fill>
        <fill>
          <patternFill patternType="solid">
            <fgColor rgb="FF00FF00"/>
          </patternFill>
        </fill>
      </fills>
    `;
    const result = parseFills(parseRoot(xml));
    expect(result).toHaveLength(3);
    // Verify that fills are in correct order for index referencing
    expect(result[0].type).toBe("none");
    expect(result[1].type).toBe("pattern");
    if (result[1].type === "pattern") {
      expect(result[1].pattern.fgColor).toEqual({
        type: "rgb",
        value: "FFFF0000",
      });
    }
    expect(result[2].type).toBe("pattern");
    if (result[2].type === "pattern") {
      expect(result[2].pattern.fgColor).toEqual({
        type: "rgb",
        value: "FF00FF00",
      });
    }
  });
});
