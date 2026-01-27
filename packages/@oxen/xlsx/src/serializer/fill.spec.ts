/**
 * @file Fill Serializer Tests
 *
 * Tests for serializing fill elements to XML.
 */

import { serializeElement } from "@oxen/xml";
import type { XlsxFill, XlsxPatternFill, XlsxGradientFill, XlsxColor } from "../domain/style/fill";
import {
  serializeColor,
  serializeFill,
  serializeFills,
  serializePatternFill,
  serializeGradientFill,
  serializeGradientStop,
} from "./fill";

// =============================================================================
// serializeColor Tests
// =============================================================================

describe("serializeColor", () => {
  it("should serialize RGB color", () => {
    const color: XlsxColor = { type: "rgb", value: "FFFF0000" };
    const element = serializeColor("fgColor", color);
    const xml = serializeElement(element);
    expect(xml).toBe('<fgColor rgb="FFFF0000"/>');
  });

  it("should serialize theme color without tint", () => {
    const color: XlsxColor = { type: "theme", theme: 4 };
    const element = serializeColor("bgColor", color);
    const xml = serializeElement(element);
    expect(xml).toBe('<bgColor theme="4"/>');
  });

  it("should serialize theme color with tint", () => {
    const color: XlsxColor = { type: "theme", theme: 4, tint: 0.8 };
    const element = serializeColor("fgColor", color);
    const xml = serializeElement(element);
    expect(xml).toBe('<fgColor theme="4" tint="0.8"/>');
  });

  it("should serialize theme color with negative tint", () => {
    const color: XlsxColor = { type: "theme", theme: 0, tint: -0.15 };
    const element = serializeColor("fgColor", color);
    const xml = serializeElement(element);
    expect(xml).toBe('<fgColor theme="0" tint="-0.15"/>');
  });

  it("should serialize indexed color", () => {
    const color: XlsxColor = { type: "indexed", index: 64 };
    const element = serializeColor("bgColor", color);
    const xml = serializeElement(element);
    expect(xml).toBe('<bgColor indexed="64"/>');
  });

  it("should serialize auto color", () => {
    const color: XlsxColor = { type: "auto" };
    const element = serializeColor("color", color);
    const xml = serializeElement(element);
    expect(xml).toBe('<color auto="1"/>');
  });
});

// =============================================================================
// serializePatternFill Tests
// =============================================================================

describe("serializePatternFill", () => {
  it("should serialize none pattern type", () => {
    const patternFill: XlsxPatternFill = { patternType: "none" };
    const element = serializePatternFill(patternFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<patternFill patternType="none"/>');
  });

  it("should serialize solid pattern type without colors", () => {
    const patternFill: XlsxPatternFill = { patternType: "solid" };
    const element = serializePatternFill(patternFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<patternFill patternType="solid"/>');
  });

  it("should serialize gray125 pattern type", () => {
    const patternFill: XlsxPatternFill = { patternType: "gray125" };
    const element = serializePatternFill(patternFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<patternFill patternType="gray125"/>');
  });

  it("should serialize solid pattern with foreground color", () => {
    const patternFill: XlsxPatternFill = {
      patternType: "solid",
      fgColor: { type: "rgb", value: "FF00FF00" },
    };
    const element = serializePatternFill(patternFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<patternFill patternType="solid"><fgColor rgb="FF00FF00"/></patternFill>');
  });

  it("should serialize solid pattern with background color", () => {
    const patternFill: XlsxPatternFill = {
      patternType: "solid",
      bgColor: { type: "indexed", index: 64 },
    };
    const element = serializePatternFill(patternFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<patternFill patternType="solid"><bgColor indexed="64"/></patternFill>');
  });

  it("should serialize solid pattern with both colors in correct order", () => {
    const patternFill: XlsxPatternFill = {
      patternType: "solid",
      fgColor: { type: "theme", theme: 4, tint: 0.59999389629810485 },
      bgColor: { type: "indexed", index: 64 },
    };
    const element = serializePatternFill(patternFill);
    const xml = serializeElement(element);
    // Verify fgColor comes before bgColor
    expect(xml).toContain("fgColor");
    expect(xml).toContain("bgColor");
    expect(xml.indexOf("fgColor")).toBeLessThan(xml.indexOf("bgColor"));
  });

  it("should serialize various pattern types", () => {
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
      const patternFill: XlsxPatternFill = { patternType };
      const element = serializePatternFill(patternFill);
      const xml = serializeElement(element);
      expect(xml).toBe(`<patternFill patternType="${patternType}"/>`);
    }
  });
});

// =============================================================================
// serializeGradientStop Tests
// =============================================================================

describe("serializeGradientStop", () => {
  it("should serialize gradient stop with RGB color", () => {
    const stop = { position: 0, color: { type: "rgb" as const, value: "FFFF0000" } };
    const element = serializeGradientStop(stop);
    const xml = serializeElement(element);
    expect(xml).toBe('<stop position="0"><color rgb="FFFF0000"/></stop>');
  });

  it("should serialize gradient stop with fractional position", () => {
    const stop = { position: 0.5, color: { type: "theme" as const, theme: 1 } };
    const element = serializeGradientStop(stop);
    const xml = serializeElement(element);
    expect(xml).toBe('<stop position="0.5"><color theme="1"/></stop>');
  });
});

// =============================================================================
// serializeGradientFill Tests
// =============================================================================

describe("serializeGradientFill", () => {
  it("should serialize linear gradient without stops", () => {
    const gradientFill: XlsxGradientFill = {
      gradientType: "linear",
      stops: [],
    };
    const element = serializeGradientFill(gradientFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<gradientFill type="linear"/>');
  });

  it("should serialize path gradient", () => {
    const gradientFill: XlsxGradientFill = {
      gradientType: "path",
      stops: [],
    };
    const element = serializeGradientFill(gradientFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<gradientFill type="path"/>');
  });

  it("should serialize gradient with degree", () => {
    const gradientFill: XlsxGradientFill = {
      gradientType: "linear",
      degree: 90,
      stops: [],
    };
    const element = serializeGradientFill(gradientFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<gradientFill type="linear" degree="90"/>');
  });

  it("should serialize gradient with fractional degree", () => {
    const gradientFill: XlsxGradientFill = {
      gradientType: "linear",
      degree: 45.5,
      stops: [],
    };
    const element = serializeGradientFill(gradientFill);
    const xml = serializeElement(element);
    expect(xml).toBe('<gradientFill type="linear" degree="45.5"/>');
  });

  it("should serialize gradient with stops", () => {
    const gradientFill: XlsxGradientFill = {
      gradientType: "linear",
      degree: 90,
      stops: [
        { position: 0, color: { type: "rgb", value: "FFFF0000" } },
        { position: 1, color: { type: "rgb", value: "FF0000FF" } },
      ],
    };
    const element = serializeGradientFill(gradientFill);
    const xml = serializeElement(element);
    expect(xml).toContain('<stop position="0"><color rgb="FFFF0000"/></stop>');
    expect(xml).toContain('<stop position="1"><color rgb="FF0000FF"/></stop>');
  });

  it("should serialize gradient with theme color stops", () => {
    const gradientFill: XlsxGradientFill = {
      gradientType: "linear",
      stops: [
        { position: 0.25, color: { type: "theme", theme: 0 } },
        { position: 0.75, color: { type: "theme", theme: 1, tint: 0.5 } },
      ],
    };
    const element = serializeGradientFill(gradientFill);
    const xml = serializeElement(element);
    expect(xml).toContain('<stop position="0.25"><color theme="0"/></stop>');
    expect(xml).toContain('<stop position="0.75"><color theme="1" tint="0.5"/></stop>');
  });
});

// =============================================================================
// serializeFill Tests
// =============================================================================

describe("serializeFill", () => {
  it("should serialize none fill type", () => {
    const fill: XlsxFill = { type: "none" };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    expect(xml).toBe('<fill><patternFill patternType="none"/></fill>');
  });

  it("should serialize pattern fill", () => {
    const fill: XlsxFill = {
      type: "pattern",
      pattern: {
        patternType: "solid",
        fgColor: { type: "rgb", value: "FFFFFF00" },
      },
    };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    expect(xml).toBe('<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill>');
  });

  it("should serialize gray125 pattern fill", () => {
    const fill: XlsxFill = {
      type: "pattern",
      pattern: { patternType: "gray125" },
    };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    expect(xml).toBe('<fill><patternFill patternType="gray125"/></fill>');
  });

  it("should serialize gradient fill", () => {
    const fill: XlsxFill = {
      type: "gradient",
      gradient: {
        gradientType: "linear",
        degree: 90,
        stops: [
          { position: 0, color: { type: "theme", theme: 0 } },
          { position: 1, color: { type: "theme", theme: 4 } },
        ],
      },
    };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    expect(xml).toContain("<fill>");
    expect(xml).toContain('<gradientFill type="linear" degree="90">');
    expect(xml).toContain("</fill>");
  });
});

// =============================================================================
// serializeFills Tests
// =============================================================================

describe("serializeFills", () => {
  it("should serialize empty fills collection", () => {
    const fills: XlsxFill[] = [];
    const element = serializeFills(fills);
    const xml = serializeElement(element);
    expect(xml).toBe('<fills count="0"/>');
  });

  it("should serialize standard Excel default fills", () => {
    const fills: XlsxFill[] = [
      { type: "none" },
      { type: "pattern", pattern: { patternType: "gray125" } },
    ];
    const element = serializeFills(fills);
    const xml = serializeElement(element);
    expect(xml).toContain('<fills count="2">');
    expect(xml).toContain('<patternFill patternType="none"/>');
    expect(xml).toContain('<patternFill patternType="gray125"/>');
    expect(xml).toContain("</fills>");
  });

  it("should serialize fills with various fill types", () => {
    const fills: XlsxFill[] = [
      { type: "none" },
      { type: "pattern", pattern: { patternType: "gray125" } },
      {
        type: "pattern",
        pattern: {
          patternType: "solid",
          fgColor: { type: "theme", theme: 4, tint: 0.79998168889431442 },
          bgColor: { type: "indexed", index: 64 },
        },
      },
      {
        type: "gradient",
        gradient: {
          gradientType: "linear",
          degree: 90,
          stops: [
            { position: 0, color: { type: "theme", theme: 0 } },
            { position: 1, color: { type: "theme", theme: 4 } },
          ],
        },
      },
    ];
    const element = serializeFills(fills);
    const xml = serializeElement(element);
    expect(xml).toContain('<fills count="4">');
    // Verify all fill types are present
    expect(xml).toContain('<patternFill patternType="none"/>');
    expect(xml).toContain('<patternFill patternType="gray125"/>');
    expect(xml).toContain('<patternFill patternType="solid">');
    expect(xml).toContain('<gradientFill type="linear"');
  });

  it("should preserve fill order for index-based referencing", () => {
    const fills: XlsxFill[] = [
      { type: "none" },
      {
        type: "pattern",
        pattern: {
          patternType: "solid",
          fgColor: { type: "rgb", value: "FFFF0000" },
        },
      },
      {
        type: "pattern",
        pattern: {
          patternType: "solid",
          fgColor: { type: "rgb", value: "FF00FF00" },
        },
      },
    ];
    const element = serializeFills(fills);
    const xml = serializeElement(element);

    // Verify the order by checking positions
    const nonePos = xml.indexOf('patternType="none"');
    const redPos = xml.indexOf("FFFF0000");
    const greenPos = xml.indexOf("FF00FF00");

    expect(nonePos).toBeLessThan(redPos);
    expect(redPos).toBeLessThan(greenPos);
  });
});

// =============================================================================
// Round-trip Tests (Parse -> Serialize)
// =============================================================================

describe("Round-trip compatibility", () => {
  it("should produce XML compatible with parser for none fill", () => {
    const fill: XlsxFill = { type: "none" };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    // Verify it matches expected parser input format
    expect(xml).toBe('<fill><patternFill patternType="none"/></fill>');
  });

  it("should produce XML compatible with parser for solid fill with colors", () => {
    const fill: XlsxFill = {
      type: "pattern",
      pattern: {
        patternType: "solid",
        fgColor: { type: "rgb", value: "FFFF0000" },
        bgColor: { type: "indexed", index: 64 },
      },
    };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    // Verify structure matches expected format
    expect(xml).toContain("<fill>");
    expect(xml).toContain('<patternFill patternType="solid">');
    expect(xml).toContain('<fgColor rgb="FFFF0000"/>');
    expect(xml).toContain('<bgColor indexed="64"/>');
    expect(xml).toContain("</patternFill>");
    expect(xml).toContain("</fill>");
  });

  it("should produce XML compatible with parser for gradient fill", () => {
    const fill: XlsxFill = {
      type: "gradient",
      gradient: {
        gradientType: "linear",
        degree: 90,
        stops: [
          { position: 0, color: { type: "rgb", value: "FFFF0000" } },
          { position: 1, color: { type: "rgb", value: "FF0000FF" } },
        ],
      },
    };
    const element = serializeFill(fill);
    const xml = serializeElement(element);
    // Verify structure matches expected format
    expect(xml).toContain("<fill>");
    expect(xml).toContain('<gradientFill type="linear" degree="90">');
    expect(xml).toContain('<stop position="0"><color rgb="FFFF0000"/></stop>');
    expect(xml).toContain('<stop position="1"><color rgb="FF0000FF"/></stop>');
    expect(xml).toContain("</gradientFill>");
    expect(xml).toContain("</fill>");
  });
});
