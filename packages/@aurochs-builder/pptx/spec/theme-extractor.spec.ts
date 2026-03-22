/**
 * @file Theme extractor tests
 *
 * Verifies that extractThemeFromBuffer extracts complete theme data
 * from real PPTX files using the proper OPC relationship chain.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractThemeFromBuffer } from "@aurochs-office/pptx/app/theme-extractor";
import { exportThemeAsPotx } from "../src/builders";

const FIXTURES = resolve(__dirname, "../../../../fixtures");

function loadFixture(relativePath: string): Uint8Array {
  return readFileSync(resolve(FIXTURES, relativePath));
}

describe("extractThemeFromBuffer", () => {
  it("extracts complete theme from a real PPTX file", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const result = await extractThemeFromBuffer(buffer);

    expect(result.success).toBe(true);
    if (!result.success) {return;}

    const { theme, colorMap } = result.data;

    // Color scheme should have standard 12 slots
    expect(theme.colorScheme).toBeDefined();
    expect(typeof theme.colorScheme.dk1).toBe("string");
    expect(typeof theme.colorScheme.lt1).toBe("string");
    expect(typeof theme.colorScheme.accent1).toBe("string");

    // Font scheme should have major/minor
    expect(theme.fontScheme.majorFont).toBeDefined();
    expect(theme.fontScheme.minorFont).toBeDefined();

    // Format scheme should have style lists
    expect(theme.formatScheme.fillStyles.length).toBeGreaterThan(0);
    expect(theme.formatScheme.lineStyles.length).toBeGreaterThan(0);
    expect(theme.formatScheme.effectStyles.length).toBeGreaterThan(0);
    expect(theme.formatScheme.bgFillStyles.length).toBeGreaterThan(0);

    // Color map should be populated
    expect(Object.keys(colorMap).length).toBeGreaterThan(0);
  });

  it("extracts theme name", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const result = await extractThemeFromBuffer(buffer);

    expect(result.success).toBe(true);
    if (!result.success) {return;}

    expect(typeof result.data.themeName).toBe("string");
    expect(result.data.themeName.length).toBeGreaterThan(0);
  });

  it("round-trips through export → extract", async () => {
    const colorScheme = {
      dk1: "000000", lt1: "FFFFFF", dk2: "1F497D", lt2: "EEECE1",
      accent1: "4F81BD", accent2: "C0504D", accent3: "9BBB59",
      accent4: "8064A2", accent5: "4BACC6", accent6: "F79646",
      hlink: "0000FF", folHlink: "800080",
    };
    const fontScheme = {
      majorFont: { latin: "Arial Black" },
      minorFont: { latin: "Georgia", eastAsian: "MS Gothic" },
    };

    // Export
    const blob = await exportThemeAsPotx({
      name: "RoundTrip Test",
      colorScheme,
      fontScheme,
    });
    const buffer = await blob.arrayBuffer();

    // Extract
    const result = await extractThemeFromBuffer(buffer);
    expect(result.success).toBe(true);
    if (!result.success) {return;}

    const { theme, themeName } = result.data;
    expect(themeName).toBe("RoundTrip Test");
    expect(theme.colorScheme.dk1).toBe("000000");
    expect(theme.colorScheme.accent1).toBe("4F81BD");
    expect(theme.colorScheme.hlink).toBe("0000FF");
    expect(theme.fontScheme.majorFont.latin).toBe("Arial Black");
    expect(theme.fontScheme.minorFont.latin).toBe("Georgia");
    expect(theme.fontScheme.minorFont.eastAsian).toBe("MS Gothic");
  });

  it("returns error for invalid buffer", async () => {
    const result = await extractThemeFromBuffer(new Uint8Array([1, 2, 3]));
    expect(result.success).toBe(false);
  });
});
