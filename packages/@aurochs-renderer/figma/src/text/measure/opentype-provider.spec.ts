/**
 * @file OpenType measurement provider tests
 */

import * as path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { parse as parseFont } from "opentype.js";
import * as fs from "node:fs";
import { OpentypeMeasurementProvider, getAscenderRatioAsync } from "./opentype-provider";
import type { FontLoader, LoadedFont, FontLoadOptions } from "../../font/index";

// Path to Inter font from @fontsource/inter
const INTER_FONT_PATH = path.resolve(
  process.cwd(),
  "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"
);

/**
 * Simple font loader that loads from a fixed path
 */
class TestFontLoader implements FontLoader {
  private font: LoadedFont | null = null;

  constructor(private fontPath: string) {}

  async loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    if (!fs.existsSync(this.fontPath)) {
      return undefined;
    }

    if (!this.font) {
      const data = fs.readFileSync(this.fontPath);
      const font = parseFont(data.buffer as ArrayBuffer);

      this.font = {
        font,
        family: "Inter",
        weight: 400,
        style: "normal",
      };
    }

    return this.font;
  }

  async isFontAvailable(family: string): Promise<boolean> {
    return family.toLowerCase() === "inter" && fs.existsSync(this.fontPath);
  }
}

describe("OpentypeMeasurementProvider", () => {
  let provider: OpentypeMeasurementProvider;
  let fontAvailable: boolean;

  beforeAll(async () => {
    const loader = new TestFontLoader(INTER_FONT_PATH);
    provider = new OpentypeMeasurementProvider(loader);
    fontAvailable = await loader.isFontAvailable("Inter");

    if (fontAvailable) {
      // Preload the font
      await provider.preloadFont({ fontFamily: "Inter", fontSize: 16 });
    }
  });

  it("loads Inter font from @fontsource/inter", () => {
    console.log(`Inter font available: ${fontAvailable}`);
    console.log(`Font path: ${INTER_FONT_PATH}`);
    console.log(`File exists: ${fs.existsSync(INTER_FONT_PATH)}`);
    expect(fontAvailable || !fs.existsSync(INTER_FONT_PATH)).toBe(true);
  });

  it("gets accurate font metrics", async function() {
    if (!fontAvailable) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const metrics = provider.getFontMetrics({ fontFamily: "Inter", fontSize: 16 });

    console.log("Inter font metrics:", {
      unitsPerEm: metrics.unitsPerEm,
      ascender: metrics.ascender,
      descender: metrics.descender,
      ascenderRatio: metrics.ascender / metrics.unitsPerEm,
    });

    expect(metrics.unitsPerEm).toBeGreaterThan(0);
    expect(metrics.ascender).toBeGreaterThan(0);
    expect(metrics.descender).toBeLessThan(0);
  });

  it("calculates correct ascender ratio", async function() {
    if (!fontAvailable) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const ratio = provider.getAscenderRatio({ fontFamily: "Inter", fontSize: 16 });

    console.log(`Inter ascender ratio: ${ratio}`);

    // Inter has a high ascender ratio (around 0.93-0.97)
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.0);
  });

  it("measures text width accurately", async function() {
    if (!fontAvailable) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const measurement = provider.measureText("Hello", {
      fontFamily: "Inter",
      fontSize: 16,
    });

    console.log("Text measurement for 'Hello' at 16px:", measurement);

    expect(measurement.width).toBeGreaterThan(0);
    expect(measurement.height).toBeGreaterThan(0);
    expect(measurement.ascent).toBeGreaterThan(0);
    expect(measurement.descent).toBeGreaterThan(0);
  });

  it("measures character widths", async function() {
    if (!fontAvailable) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const widths = provider.measureCharWidths("ABC", {
      fontFamily: "Inter",
      fontSize: 16,
    });

    console.log("Character widths for 'ABC':", widths);

    expect(widths).toHaveLength(3);
    widths.forEach((w) => expect(w).toBeGreaterThan(0));
  });
});
