/**
 * @file Debug test to investigate exact font metrics
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { parse as parseFont } from "opentype.js";
import { createNodeFontLoaderWithFontsource } from "../src/font-drivers/node";
import { CachingFontLoader } from "../src/font";

describe("Font metrics investigation", () => {
  let fontLoader: CachingFontLoader;

  beforeAll(async () => {
    const baseLoader = createNodeFontLoaderWithFontsource();
    fontLoader = new CachingFontLoader(baseLoader);
  });

  it("analyzes Inter font metrics in detail", async () => {
    const loadedFont = await fontLoader.loadFont({
      family: "Inter",
      weight: 400,
    });

    if (!loadedFont) {
      console.log("Inter font not found");
      return;
    }

    const font = loadedFont.font;

    console.log("\n=== Inter Font Metrics ===");
    console.log(`unitsPerEm: ${font.unitsPerEm}`);
    console.log(`ascender: ${font.ascender}`);
    console.log(`descender: ${font.descender}`);

    // OS/2 table metrics
    const os2 = font.tables.os2 as Record<string, number> | undefined;
    if (os2) {
      console.log("\n=== OS/2 Table ===");
      console.log(`sTypoAscender: ${os2.sTypoAscender}`);
      console.log(`sTypoDescender: ${os2.sTypoDescender}`);
      console.log(`sTypoLineGap: ${os2.sTypoLineGap}`);
      console.log(`usWinAscent: ${os2.usWinAscent}`);
      console.log(`usWinDescent: ${os2.usWinDescent}`);
      console.log(`sxHeight: ${os2.sxHeight}`);
      console.log(`sCapHeight: ${os2.sCapHeight}`);
    }

    // hhea table metrics
    const hhea = font.tables.hhea as Record<string, number> | undefined;
    if (hhea) {
      console.log("\n=== hhea Table ===");
      console.log(`ascender: ${hhea.ascender}`);
      console.log(`descender: ${hhea.descender}`);
      console.log(`lineGap: ${hhea.lineGap}`);
    }

    // Calculate different line height approaches
    const fontSize = 64;
    const upm = font.unitsPerEm;

    console.log("\n=== Line Height Calculations at 64px ===");

    // Method 1: ascender + |descender|
    const lh1 = fontSize * (font.ascender + Math.abs(font.descender)) / upm;
    console.log(`1. (ascender + |descender|) / upm: ${lh1.toFixed(4)}`);

    // Method 2: Using OS/2 typo metrics
    if (os2) {
      const lh2 = fontSize * (os2.sTypoAscender - os2.sTypoDescender + os2.sTypoLineGap) / upm;
      console.log(`2. OS/2 typo metrics with lineGap: ${lh2.toFixed(4)}`);

      const lh2b = fontSize * (os2.sTypoAscender - os2.sTypoDescender) / upm;
      console.log(`2b. OS/2 typo metrics without lineGap: ${lh2b.toFixed(4)}`);
    }

    // Method 3: Using Win metrics
    if (os2) {
      const lh3 = fontSize * (os2.usWinAscent + os2.usWinDescent) / upm;
      console.log(`3. Win metrics: ${lh3.toFixed(4)}`);
    }

    // Method 4: Using hhea metrics
    if (hhea) {
      const lh4 = fontSize * (hhea.ascender - hhea.descender + hhea.lineGap) / upm;
      console.log(`4. hhea metrics with lineGap: ${lh4.toFixed(4)}`);

      const lh4b = fontSize * (hhea.ascender - hhea.descender) / upm;
      console.log(`4b. hhea metrics without lineGap: ${lh4b.toFixed(4)}`);
    }

    // Target: actual Figma line height
    const actualLineHeight = 77.636;
    console.log(`\nTarget (from Figma): ${actualLineHeight}`);
    console.log(`Target ratio: ${(actualLineHeight / fontSize).toFixed(5)}`);

    // What metrics would give us 77.636?
    const targetUnits = actualLineHeight * upm / fontSize;
    console.log(`\nUnits needed for target: ${targetUnits.toFixed(2)}`);
    console.log(`Current ascender + |descender|: ${font.ascender + Math.abs(font.descender)}`);
    console.log(`Difference: ${(targetUnits - (font.ascender + Math.abs(font.descender))).toFixed(2)} units`);

    // Check glyph-specific metrics
    console.log("\n=== Glyph Analysis ===");

    // Check 'F' glyph metrics
    const glyphF = font.charToGlyph("F");
    console.log(`'F' advanceWidth: ${glyphF.advanceWidth}`);
    console.log(`'F' leftSideBearing: ${glyphF.leftSideBearing}`);

    // Check '6' glyph metrics
    const glyph6 = font.charToGlyph("6");
    console.log(`'6' advanceWidth: ${glyph6.advanceWidth}`);
    console.log(`'6' leftSideBearing: ${glyph6.leftSideBearing}`);

    // Calculate starting x positions at 64px
    const scale = fontSize / upm;
    console.log(`\n'F' x offset at 64px: ${((glyphF.leftSideBearing ?? 0) * scale).toFixed(2)}`);
    console.log(`'6' x offset at 64px: ${((glyph6.leftSideBearing ?? 0) * scale).toFixed(2)}`);

    expect(font).toBeDefined();
  });

  it("compares different line height formulas", async () => {
    const loadedFont = await fontLoader.loadFont({
      family: "Inter",
      weight: 400,
    });

    if (!loadedFont) return;

    const font = loadedFont.font;
    const os2 = font.tables.os2 as Record<string, number> | undefined;
    const hhea = font.tables.hhea as Record<string, number> | undefined;
    const upm = font.unitsPerEm;

    // Test at multiple font sizes
    const testSizes = [10, 12, 14, 16, 24, 32, 48, 64];

    console.log("\n=== Line Height Comparison Table ===");
    console.log("Size\tAsc+Desc\tOS/2\t\thhea\t\twin");

    for (const fontSize of testSizes) {
      const lh1 = fontSize * (font.ascender + Math.abs(font.descender)) / upm;
      const lh2 = os2 ? fontSize * (os2.sTypoAscender - os2.sTypoDescender) / upm : 0;
      const lh3 = hhea ? fontSize * (hhea.ascender - hhea.descender) / upm : 0;
      const lh4 = os2 ? fontSize * (os2.usWinAscent + os2.usWinDescent) / upm : 0;

      console.log(`${fontSize}\t${lh1.toFixed(2)}\t\t${lh2.toFixed(2)}\t\t${lh3.toFixed(2)}\t\t${lh4.toFixed(2)}`);
    }

    // Check what formula gives us 77.636 for 64px
    // Target ratio: 77.636 / 64 = 1.21306
    // Let's see if rounding is involved
    console.log("\n=== Checking possible formulas ===");
    const targetRatio = 77.636 / 64;
    console.log(`Target ratio: ${targetRatio}`);

    // Maybe Figma rounds to 3 decimal places?
    const ascRatio = font.ascender / upm;
    const descRatio = Math.abs(font.descender) / upm;
    console.log(`ascenderRatio: ${ascRatio.toFixed(5)}`);
    console.log(`descenderRatio: ${descRatio.toFixed(5)}`);
    console.log(`Sum: ${(ascRatio + descRatio).toFixed(5)}`);

    // Try with OS/2 metrics
    if (os2) {
      const os2AscRatio = os2.sTypoAscender / upm;
      const os2DescRatio = -os2.sTypoDescender / upm;
      console.log(`OS/2 ascenderRatio: ${os2AscRatio.toFixed(5)}`);
      console.log(`OS/2 descenderRatio: ${os2DescRatio.toFixed(5)}`);
      console.log(`OS/2 Sum: ${(os2AscRatio + os2DescRatio).toFixed(5)}`);
    }

    expect(loadedFont).toBeDefined();
  });
});
