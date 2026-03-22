/**
 * @file OpenType measurement provider tests
 */

import * as path from "node:path";
import { parse as parseFont } from "opentype.js";
import * as fs from "node:fs";
import { createOpentypeMeasurementProvider, type OpentypeMeasurementProviderInstance } from "./opentype-provider";
import type { FontLoader, LoadedFont, FontLoadOptions } from "../../font/index";

// Path to Inter font from @fontsource/inter
const INTER_FONT_PATH = path.resolve(
  process.cwd(),
  "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"
);

/**
 * Simple font loader that loads from a fixed path
 */
function createTestFontLoader(fontPath: string): FontLoader {
  const fontRef = { value: null as LoadedFont | null };

  return {
    async loadFont(_options: FontLoadOptions): Promise<LoadedFont | undefined> {
      if (!fs.existsSync(fontPath)) {
        return undefined;
      }

      if (!fontRef.value) {
        const data = fs.readFileSync(fontPath);
        const parsed = parseFont(data.buffer as ArrayBuffer);

        fontRef.value = {
          font: parsed,
          family: "Inter",
          weight: 400,
          style: "normal",
        };
      }

      return fontRef.value;
    },

    async isFontAvailable(family: string): Promise<boolean> {
      return family.toLowerCase() === "inter" && fs.existsSync(fontPath);
    },
  };
}

describe("OpentypeMeasurementProvider", () => {
  const providerRef = { value: undefined as OpentypeMeasurementProviderInstance | undefined };
  const fontAvailableRef = { value: undefined as boolean | undefined };

  beforeAll(async () => {
    const loader = createTestFontLoader(INTER_FONT_PATH);
    providerRef.value = createOpentypeMeasurementProvider(loader);
    fontAvailableRef.value = await loader.isFontAvailable("Inter");

    if (fontAvailableRef.value) {
      // Preload the font
      await providerRef.value.preloadFont({ fontFamily: "Inter", fontSize: 16 });
    }
  });

  it("loads Inter font from @fontsource/inter", () => {
    console.log(`Inter font available: ${fontAvailableRef.value}`);
    console.log(`Font path: ${INTER_FONT_PATH}`);
    console.log(`File exists: ${fs.existsSync(INTER_FONT_PATH)}`);
    expect(fontAvailableRef.value || !fs.existsSync(INTER_FONT_PATH)).toBe(true);
  });

  it("gets accurate font metrics", async function() {
    if (!fontAvailableRef.value) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const metrics = providerRef.value.getFontMetrics({ fontFamily: "Inter", fontSize: 16 });

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
    if (!fontAvailableRef.value) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const ratio = providerRef.value.getAscenderRatio({ fontFamily: "Inter", fontSize: 16 });

    console.log(`Inter ascender ratio: ${ratio}`);

    // Inter has a high ascender ratio (around 0.93-0.97)
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.0);
  });

  it("measures text width accurately", async function() {
    if (!fontAvailableRef.value) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const measurement = providerRef.value.measureText("Hello", {
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
    if (!fontAvailableRef.value) {
      console.log("Skipping: Inter font not available");
      return;
    }

    const widths = providerRef.value.measureCharWidths("ABC", {
      fontFamily: "Inter",
      fontSize: 16,
    });

    console.log("Character widths for 'ABC':", widths);

    expect(widths).toHaveLength(3);
    widths.forEach((w) => expect(w).toBeGreaterThan(0));
  });
});
