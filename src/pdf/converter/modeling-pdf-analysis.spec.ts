/**
 * @file Analysis tests for modeling.pdf
 *
 * WHY THIS FILE EXISTS:
 * This file documents the reasoning behind text grouping, font extraction,
 * and shape conversion decisions. Unlike unit tests that verify WHAT works,
 * these tests explain WHY certain approaches were chosen.
 *
 * Key insights documented:
 * - Shape positioning and grouping behavior for inline references
 * - Bold/italic detection via FontDescriptor flags (not just font names)
 * - CID font width handling for CJK text
 * - Blocking zone impact on text grouping
 * - Table cell detection via filled rectangles
 *
 * Run with: npx vitest run modeling-pdf-analysis.spec.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePdf } from "../parser/core/pdf-parser";
import type { PdfText, PdfPath, PdfImage, PdfElement } from "../domain";
import { spatialGrouping } from "./text-grouping/spatial-grouping";
import { extractFontInfo, extractFontMappings } from "../parser/font/font-decoder";
import { computePathBBox } from "../parser/path/path-builder";
import { px } from "../../ooxml/domain/units";
import { convertPageToShapes } from "./pdf-to-shapes";
import { loadNativePdfDocument } from "../native";
import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfObject } from "../native";
import type { Shape, SpShape } from "../../pptx/domain/shape";

const PDF_PATH = join(process.cwd(), "fixtures/samples/modeling.pdf");

// ============================================================================
// Helper Functions for PDF Analysis
// ============================================================================

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}
function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}
function asString(obj: PdfObject | undefined): string | null {
  if (!obj) {return null;}
  if (obj.type === "string") {return obj.text;}
  if (obj.type === "name") {return `/${obj.value}`;}
  return null;
}
function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  return obj ? page.lookup(obj) : undefined;
}
function resolveDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  return asDict(resolve(page, obj));
}
function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function getSpShapesWithTextBody(shapes: readonly Shape[]): readonly SpShape[] {
  const out: SpShape[] = [];
  for (const shape of shapes) {
    if (shape.type === "sp" && shape.textBody) {
      out.push(shape);
    }
  }
  return out;
}

/**
 * Helper to print element info
 */
function printElement(elem: PdfElement, index: number): void {
  if (elem.type === "text") {
    const text = elem as PdfText;
    const preview = text.text.length > 50 ? text.text.slice(0, 50) + "..." : text.text;
    console.log(
      `  [${index}] TEXT: "${preview}" @ (${text.x.toFixed(1)}, ${text.y.toFixed(1)}) ` +
      `font=${text.fontName} size=${text.fontSize.toFixed(1)}`
    );
  } else if (elem.type === "path") {
    const path = elem as PdfPath;
    const fill = path.graphicsState.fillColor;
    const stroke = path.graphicsState.strokeColor;
    console.log(
      `  [${index}] PATH: ops=${path.operations.length} paint=${path.paintOp} ` +
      `fill=${fill.colorSpace}[${fill.components.join(",")}] ` +
      `stroke=${stroke.colorSpace}[${stroke.components.join(",")}]`
    );
  } else if (elem.type === "image") {
    const img = elem as PdfImage;
    // Image position is in the CTM (transformation matrix)
    const ctm = img.graphicsState.ctm;
    const x = ctm[4];  // CTM e component = x translation
    const y = ctm[5];  // CTM f component = y translation
    console.log(
      `  [${index}] IMAGE: ${img.width}x${img.height} @ (${x.toFixed(1)}, ${y.toFixed(1)})`
    );
  }
}

describe("modeling.pdf analysis", () => {
  const pagesState: { pages: Awaited<ReturnType<typeof parsePdf>>["pages"] | null } = { pages: null };
  const requirePages = (): Awaited<ReturnType<typeof parsePdf>>["pages"] => {
    if (!pagesState.pages) {
      throw new Error("Pages are not loaded yet");
    }
    return pagesState.pages;
  };

  beforeAll(async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    pagesState.pages = pdfDoc.pages;
    console.log(`\n=== Loaded ${pdfDoc.pages.length} pages ===\n`);
  });

  it("should analyze page 1 structure", () => {
    const pages = requirePages();
    const page = pages[0];
    console.log(`\n=== Page 1: ${page.width}x${page.height} ===`);
    console.log(`Elements: ${page.elements.length}`);

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");
    const images = page.elements.filter((e): e is PdfImage => e.type === "image");

    console.log(`  Texts: ${texts.length}, Paths: ${paths.length}, Images: ${images.length}`);

    // Find text containing "uniquely"
    const uniquelyText = texts.find((t) => t.text.includes("uniquely"));
    if (uniquelyText) {
      console.log(`\nFound "uniquely" text:`);
      console.log(`  Text: "${uniquelyText.text}"`);
      console.log(`  Position: (${uniquelyText.x.toFixed(1)}, ${uniquelyText.y.toFixed(1)})`);
      console.log(`  Font: ${uniquelyText.fontName}, Size: ${uniquelyText.fontSize}`);

      // Find nearby elements (shapes that might be inline references)
      const nearbyElements = page.elements.filter((e) => {
        if (e.type === "text") {
          const t = e as PdfText;
          return Math.abs(t.y - uniquelyText.y) < 20 && t.x > uniquelyText.x - 50;
        }
        if (e.type === "path") {
          // Check path bounding box
          return true; // We'll analyze all paths
        }
        return false;
      });

      console.log(`\nNearby elements on same line:`);
      nearbyElements.slice(0, 20).forEach((e, i) => printElement(e, i));
    }

    expect(page.elements.length).toBeGreaterThan(0);
  });

  it("should identify bold/italic fonts", () => {
    const pages = requirePages();
    const page = pages[0];
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    // Group fonts by name
    const fontNames = new Set(texts.map((t) => t.fontName));
    console.log(`\n=== Font names used ===`);
    fontNames.forEach((name) => {
      const count = texts.filter((t) => t.fontName === name).length;
      console.log(`  ${name}: ${count} occurrences`);
    });

    // Look for bold/italic from font names
    const boldFonts = [...fontNames].filter((n) =>
      n.toLowerCase().includes("bold") ||
      n.toLowerCase().includes("bd") ||
      n.includes("-B")
    );
    const italicFonts = [...fontNames].filter((n) =>
      n.toLowerCase().includes("italic") ||
      n.toLowerCase().includes("it") ||
      n.toLowerCase().includes("oblique") ||
      n.includes("-I")
    );

    console.log(`\nBold fonts (from name): ${boldFonts.join(", ") || "none detected"}`);
    console.log(`Italic fonts (from name): ${italicFonts.join(", ") || "none detected"}`);

    // Check isBold/isItalic properties from FontInfo
    const boldTexts = texts.filter((t) => t.isBold);
    const italicTexts = texts.filter((t) => t.isItalic);

    console.log(`\n=== Bold/Italic from FontDescriptor ===`);
    console.log(`  Bold texts: ${boldTexts.length}`);
    if (boldTexts.length > 0) {
      const boldSample = boldTexts.slice(0, 3);
      boldSample.forEach((t) => {
        console.log(`    "${t.text.slice(0, 30)}..." (font: ${t.fontName})`);
      });
    }

    console.log(`  Italic texts: ${italicTexts.length}`);
    if (italicTexts.length > 0) {
      const italicSample = italicTexts.slice(0, 3);
      italicSample.forEach((t) => {
        console.log(`    "${t.text.slice(0, 30)}..." (font: ${t.fontName})`);
      });
    }

    expect(fontNames.size).toBeGreaterThan(0);
  });

  it("should analyze path paint operations", () => {
    const pages = requirePages();
    const page = pages[0];
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");

    // Group by paint operation
    const byPaintOp = new Map<string, PdfPath[]>();
    for (const path of paths) {
      const key = path.paintOp;
      if (!byPaintOp.has(key)) {
        byPaintOp.set(key, []);
      }
      byPaintOp.get(key)!.push(path);
    }

    console.log(`\n=== Path paint operations ===`);
    byPaintOp.forEach((paths, op) => {
      console.log(`  ${op}: ${paths.length} paths`);
      // Show first few examples
      paths.slice(0, 3).forEach((p, i) => {
        const fill = p.graphicsState.fillColor;
        const stroke = p.graphicsState.strokeColor;
        console.log(
          `    [${i}] fill=${fill.colorSpace}[${fill.components.map((c) => c.toFixed(2)).join(",")}] ` +
          `stroke=${stroke.colorSpace}[${stroke.components.map((c) => c.toFixed(2)).join(",")}] ` +
          `lineWidth=${p.graphicsState.lineWidth.toFixed(2)}`
        );
      });
    });

    expect(paths.length).toBeGreaterThan(0);
  });

  it("should find shapes near text (potential inline references)", () => {
    const pages = requirePages();
    const page = pages[0];
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");

    // Find small shapes that might be inline references (circles, numbers)
    const smallPaths = paths.filter((p) => {
      // Simple paths with few operations might be reference markers
      return p.operations.length < 20 && p.paintOp !== "none";
    });

    console.log(`\n=== Small paths (potential inline shapes) ===`);
    console.log(`Found ${smallPaths.length} small paths`);

    // Look for numbered references in text
    const refTexts = texts.filter((t) =>
      /\(\d+\)/.test(t.text) || /^\d+$/.test(t.text.trim())
    );

    console.log(`\n=== Reference-like texts ===`);
    refTexts.slice(0, 10).forEach((t, i) => {
      console.log(`  [${i}] "${t.text}" @ (${t.x.toFixed(1)}, ${t.y.toFixed(1)})`);
    });

    expect(page.elements.length).toBeGreaterThan(0);
  });

  it("should analyze images and nearby shapes", () => {
    const pages = requirePages();
    const page = pages[0];
    const images = page.elements.filter((e): e is PdfImage => e.type === "image");
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");

    console.log(`\n=== Images on page 1 ===`);
    if (images.length === 0) {
      console.log("  No images found on page 1");
    }
    images.forEach((img, i) => {
      const ctm = img.graphicsState.ctm;
      // CTM: [a, b, c, d, e, f] where e,f are translation, a,d are scale
      const x = ctm[4];  // CTM e component = x translation
      const y = ctm[5];  // CTM f component = y translation
      const scaleX = ctm[0];  // CTM a component = x scale (rendered width)
      const scaleY = ctm[3];  // CTM d component = y scale (rendered height)
      console.log(`  [${i}] ${img.width}x${img.height} pixels`);
      console.log(`      CTM position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
      console.log(`      CTM scale: ${scaleX.toFixed(1)}x${scaleY.toFixed(1)} (rendered size in pts)`);
    });

    // Analyze paths to see if any are "outlines" around images
    console.log(`\n=== Paths on page 1 (${paths.length} total) ===`);
    paths.forEach((p, i) => {
      const fill = p.graphicsState.fillColor;
      const stroke = p.graphicsState.strokeColor;
      const lineWidth = p.graphicsState.lineWidth;

      // Get approx bounds
      const boundsInfoParts: string[] = [];
      if (p.operations.length > 0) {
        const firstOp = p.operations[0];
        if (firstOp.type === "rect") {
          boundsInfoParts.push(
            ` rect=(${firstOp.x.toFixed(0)},${firstOp.y.toFixed(0)},${firstOp.width.toFixed(0)}x${firstOp.height.toFixed(0)})`
          );
        }
      }
      const boundsInfo = boundsInfoParts.join("");

      console.log(
        `  [${i}] paintOp=${p.paintOp} ops=${p.operations.length} ` +
        `fill=${fill.colorSpace}[${fill.components.map((c) => c.toFixed(2)).join(",")}] ` +
        `stroke=${stroke.colorSpace}[${stroke.components.map((c) => c.toFixed(2)).join(",")}] ` +
        `lineWidth=${lineWidth.toFixed(2)}${boundsInfo}`
      );
    });

    expect(images.length).toBeGreaterThanOrEqual(0);
  });

  it("should check all pages for structure", () => {
    const pages = requirePages();
    console.log(`\n=== All pages summary ===`);
    pages.forEach((page, i) => {
      const texts = page.elements.filter((e) => e.type === "text").length;
      const paths = page.elements.filter((e) => e.type === "path").length;
      const images = page.elements.filter((e) => e.type === "image").length;
      console.log(`  Page ${i + 1}: ${page.width}x${page.height}, texts=${texts}, paths=${paths}, images=${images}`);
    });

    expect(pages.length).toBeGreaterThan(0);
  });

  it("should analyze text widths for debugging", () => {
    const pages = requirePages();
    const page = pages[0];
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log(`\n=== Text width analysis (Page 1) ===`);
    console.log(`Note: Width is calculated from endX - x in the PDF parser.`);
    console.log(`The issue might be in glyph width calculation, not font metrics.`);
    console.log(`Format: "text" x -> endX (width) fontSize avgCharWidth widthRatio`);

    // Sample 20 texts with more than 1 character
    const sampleTexts = texts.filter((t) => t.text.length > 1).slice(0, 20);

    sampleTexts.forEach((t) => {
      const avgCharWidth = t.width / t.text.length;
      const widthRatio = avgCharWidth / t.fontSize;
      const displayText = t.text.length > 15 ? t.text.slice(0, 15) + "..." : t.text;
      console.log(
        `  "${displayText.padEnd(18)}" ` +
        `x=${t.x.toFixed(1).padStart(6)} -> ${(t.x + t.width).toFixed(1).padStart(6)} ` +
        `(w=${t.width.toFixed(1).padStart(5)}) ` +
        `fs=${t.fontSize.toFixed(1).padStart(4)} ` +
        `avgCW=${avgCharWidth.toFixed(2).padStart(5)} ` +
        `ratio=${widthRatio.toFixed(2)}`
      );
    });

    // Check: width = endX - x, where endX is calculated from text displacement
    // Text displacement uses glyph widths from font metrics
    // If ratio is ~1.0, glyph widths might be 1000/1000 em (full width)
    console.log(`\nExpected ratio for Latin text: ~0.4-0.6 (proportional fonts)`);
    console.log(`Observed ratio: ${(sampleTexts[0]?.width ?? 0) / (sampleTexts[0]?.text.length ?? 1) / (sampleTexts[0]?.fontSize ?? 1)}`);

    expect(texts.length).toBeGreaterThan(0);
  });

  it("should analyze page 7 paths in detail (most shapes)", () => {
    const pages = requirePages();
    const page = pages[6]; // Page 7 (0-indexed)
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log(`\n=== Page 7 paths detail (${paths.length} paths) ===`);

    // Group by paint operation and fill/stroke
    const strokePaths = paths.filter((p) => p.paintOp === "stroke" || p.paintOp === "fillStroke");
    const fillOnlyPaths = paths.filter((p) => p.paintOp === "fill");

    console.log(`  Stroke paths: ${strokePaths.length}`);
    console.log(`  Fill-only paths: ${fillOnlyPaths.length}`);

    // Show details of fill-only paths (potential stroke-should-be paths)
    console.log(`\n  Fill-only paths details:`);
    fillOnlyPaths.slice(0, 10).forEach((p, i) => {
      const fill = p.graphicsState.fillColor;
      const stroke = p.graphicsState.strokeColor;
      const lineWidth = p.graphicsState.lineWidth;
      // Calculate approximate bounds from first few operations
      const boundsParts: string[] = [];
      if (p.operations.length > 0) {
        const firstOp = p.operations[0];
        if (firstOp.type === "rect") {
          boundsParts.push(
            ` rect=(${firstOp.x.toFixed(0)},${firstOp.y.toFixed(0)},${firstOp.width.toFixed(0)}x${firstOp.height.toFixed(0)})`
          );
        } else if (firstOp.type === "moveTo") {
          boundsParts.push(` start=(${firstOp.point.x.toFixed(0)},${firstOp.point.y.toFixed(0)})`);
        }
      }
      const bounds = boundsParts.join("");
      console.log(
        `    [${i}] ops=${p.operations.length} fill=${fill.colorSpace}[${fill.components.map((c) => c.toFixed(2)).join(",")}] ` +
        `stroke=${stroke.colorSpace}[${stroke.components.map((c) => c.toFixed(2)).join(",")}] ` +
        `lineWidth=${lineWidth.toFixed(2)}${bounds}`
      );
    });

    // Analyze fill colors to see if they're borders or fills
    const uniqueFillColors = new Set<string>();
    for (const p of fillOnlyPaths) {
      const fill = p.graphicsState.fillColor;
      uniqueFillColors.add(`${fill.colorSpace}[${fill.components.map((c) => c.toFixed(2)).join(",")}]`);
    }
    console.log(`\n  Unique fill colors in fill-only paths:`);
    uniqueFillColors.forEach((c) => console.log(`    ${c}`));

    // Look for texts that might be inside shapes
    console.log(`\n=== Texts on page 7 ===`);
    const uniqueTexts = new Set(texts.map((t) => t.text));
    console.log(`  Unique text strings: ${uniqueTexts.size}`);

    // Find small texts (potential shape labels)
    const shortTexts = texts.filter((t) => t.text.length <= 5);
    console.log(`  Short texts (<=5 chars): ${shortTexts.length}`);
    shortTexts.slice(0, 20).forEach((t, i) => {
      console.log(`    [${i}] "${t.text}" @ (${t.x.toFixed(1)}, ${t.y.toFixed(1)}) font=${t.fontName}`);
    });

    expect(paths.length).toBeGreaterThan(0);
  });

  it("should analyze font descriptors for bold/italic flags", async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = loadNativePdfDocument(pdfBytes, { encryption: { mode: "ignore" } });
    const page = pdfDoc.getPages()[0];
    if (!page) {return;}

    const resourcesDict = page.getResourcesDict();
    if (!resourcesDict) {
      console.log("No resources found");
      return;
    }

    const fontsDict = resolveDict(page, dictGet(resourcesDict, "Font"));
    if (!fontsDict) {
      console.log("No Font entry in resources");
      return;
    }

    console.log("\n=== Font Descriptor Analysis ===");

    for (const [fontName, ref] of fontsDict.map.entries()) {
      const fontDict = resolveDict(page, ref);
      if (!fontDict) {continue;}

      // Get font subtype
      const subtype = asName(resolve(page, dictGet(fontDict, "Subtype")))?.value ?? "unknown";
      console.log(`  ${fontName}: Subtype=/${subtype}`);

      // For Type0 fonts, look in DescendantFonts
      if (subtype === "Type0") {
        const descendants = asArray(resolve(page, dictGet(fontDict, "DescendantFonts")));
        if (!descendants || descendants.items.length === 0) {continue;}

        const cidFont = asDict(resolve(page, descendants.items[0]));
        if (!cidFont) {continue;}

        const cidDescriptor = resolveDict(page, dictGet(cidFont, "FontDescriptor"));
        if (!cidDescriptor) {continue;}

        const flags = asNumber(resolve(page, dictGet(cidDescriptor, "Flags")));
        const cidFontName = asString(resolve(page, dictGet(cidDescriptor, "FontName"))) ?? "unknown";
        const isItalic = flags !== null && (flags & 64) !== 0;
        const isForceBold = flags !== null && (flags & 262144) !== 0;

        console.log(
          `    -> CID FontDescriptor: name=${cidFontName} flags=${flags ?? "null"} ` +
            `italic=${isItalic} forceBold=${isForceBold}`,
        );

        const italicAngle = asNumber(resolve(page, dictGet(cidDescriptor, "ItalicAngle")));
        if (italicAngle !== null && italicAngle !== 0) {
          console.log(`    -> ItalicAngle: ${italicAngle}`);
        }
        continue;
      }

      // Get FontDescriptor for non-Type0 fonts
      const descriptor = resolveDict(page, dictGet(fontDict, "FontDescriptor"));
      if (!descriptor) {continue;}

      // Get Flags
      const flags = asNumber(resolve(page, dictGet(descriptor, "Flags")));

      // Get FontName from descriptor
      const fontNameStr = asString(resolve(page, dictGet(descriptor, "FontName"))) ?? "unknown";

      // Parse flags (PDF Reference Table 5.20)
      // Bit 1 (1): FixedPitch
      // Bit 2 (2): Serif
      // Bit 3 (4): Symbolic
      // Bit 4 (8): Script
      // Bit 6 (32): Nonsymbolic
      // Bit 7 (64): Italic
      // Bit 17 (65536): AllCap
      // Bit 18 (131072): SmallCap
      // Bit 19 (262144): ForceBold
      const isItalic = flags !== null && (flags & 64) !== 0;
      const isForceBold = flags !== null && (flags & 262144) !== 0;
      const isFixedPitch = flags !== null && (flags & 1) !== 0;
      const isSerif = flags !== null && (flags & 2) !== 0;

      console.log(
        `  ${fontName}: name=${fontNameStr} flags=${flags} ` +
        `italic=${isItalic} forceBold=${isForceBold} fixed=${isFixedPitch} serif=${isSerif}`
      );

      // Also check FontWeight if available
      const weight = asNumber(resolve(page, dictGet(descriptor, "FontWeight")));

      if (weight !== null) {
        console.log(`    FontWeight: ${weight}`);
      }

      // Check ItalicAngle
      const italicAngle = asNumber(resolve(page, dictGet(descriptor, "ItalicAngle")));

      if (italicAngle !== null && italicAngle !== 0) {
        console.log(`    ItalicAngle: ${italicAngle}`);
      }
    }

    expect(true).toBe(true);
  });

  it("should analyze inline reference positions", () => {
    const pages = requirePages();
    const page = pages[0];
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    // Find the "uniquely" text and nearby references
    const uniquelyTexts = texts.filter((t) => t.text.includes("uniquely"));

    console.log(`\n=== "uniquely" text and nearby references ===`);
    uniquelyTexts.forEach((ut) => {
      console.log(`Found: "${ut.text}" @ (${ut.x.toFixed(1)}, ${ut.y.toFixed(1)})`);

      // Find texts at similar Y position (same line) within reasonable X range
      const sameLine = texts.filter((t) => {
        const yDiff = Math.abs(t.y - ut.y);
        return yDiff < 5 && t.x >= ut.x - 10 && t.x <= ut.x + 200;
      }).sort((a, b) => a.x - b.x);

      console.log(`  Same line texts (sorted by X):`);
      sameLine.forEach((t) => {
        console.log(`    "${t.text}" @ x=${t.x.toFixed(1)}, y=${t.y.toFixed(1)}`);
      });
    });

    // Find superscript-like numbers (small Y offset)
    const possibleSuperscripts = texts.filter((t) => /^\d+$/.test(t.text.trim()));
    console.log(`\n=== Possible superscript numbers ===`);
    possibleSuperscripts.slice(0, 15).forEach((t) => {
      console.log(`  "${t.text}" @ (${t.x.toFixed(1)}, ${t.y.toFixed(1)}) size=${t.fontSize.toFixed(1)}`);
    });

    expect(texts.length).toBeGreaterThan(0);
  });
});

// Additional test for Japanese PDF
describe("Japanese PDF width analysis", () => {
  const JP_PDF_PATH = join(process.cwd(), "fixtures/samples/k-resource-dl.pdf");
  const jpPagesState: { pages: Awaited<ReturnType<typeof parsePdf>>["pages"] } = { pages: [] };

  beforeAll(async () => {
    try {
      const pdfBytes = readFileSync(JP_PDF_PATH);
      const pdfDoc = await parsePdf(pdfBytes);
      jpPagesState.pages = pdfDoc.pages;
      console.log(`\n=== Loaded Japanese PDF: ${pdfDoc.pages.length} pages ===\n`);
    } catch (e) {
      console.log(`Failed to load Japanese PDF: ${e}`);
      jpPagesState.pages = [];
    }
  });

  it("should analyze CJK vs Latin character widths", () => {
    const jpPages = jpPagesState.pages;
    if (jpPages.length === 0) {
      console.log("Skipping: Japanese PDF not loaded");
      return;
    }

    const page = jpPages[0];
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log(`\n=== CJK vs Latin width analysis ===`);
    console.log(`Total texts: ${texts.length}`);

    // Helper to detect CJK characters
    const hasCJK = (str: string) => /[\u3000-\u9FFF\uFF00-\uFFEF]/.test(str);

    // Separate CJK and Latin texts
    const cjkTexts = texts.filter((t) => hasCJK(t.text));
    const latinTexts = texts.filter((t) => !hasCJK(t.text) && t.text.length > 0);

    console.log(`\nCJK texts: ${cjkTexts.length}`);
    console.log(`Latin texts: ${latinTexts.length}`);

    // Analyze CJK texts
    console.log(`\n--- CJK Text Samples (expected ratio ~1.0 for full-width) ---`);
    cjkTexts.slice(0, 15).forEach((t) => {
      const avgCharWidth = t.width / t.text.length;
      const widthRatio = avgCharWidth / t.fontSize;
      const preview = t.text.length > 10 ? t.text.slice(0, 10) + "..." : t.text;
      console.log(
        `  "${preview.padEnd(13)}" ` +
        `w=${t.width.toFixed(1).padStart(6)} ` +
        `fs=${t.fontSize.toFixed(1).padStart(5)} ` +
        `ratio=${widthRatio.toFixed(2)} ` +
        `font=${t.fontName.slice(0, 15)}`
      );
    });

    // Analyze Latin texts
    console.log(`\n--- Latin Text Samples (expected ratio ~0.4-0.6) ---`);
    latinTexts.filter((t) => t.text.length > 1).slice(0, 15).forEach((t) => {
      const avgCharWidth = t.width / t.text.length;
      const widthRatio = avgCharWidth / t.fontSize;
      const preview = t.text.length > 15 ? t.text.slice(0, 15) + "..." : t.text;
      console.log(
        `  "${preview.padEnd(18)}" ` +
        `w=${t.width.toFixed(1).padStart(6)} ` +
        `fs=${t.fontSize.toFixed(1).padStart(5)} ` +
        `ratio=${widthRatio.toFixed(2)} ` +
        `font=${t.fontName.slice(0, 15)}`
      );
    });

    expect(texts.length).toBeGreaterThan(0);
  });

  it("should verify font W array and DW values", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = loadNativePdfDocument(pdfBytes, { encryption: { mode: "ignore" } });
    const page = pdfDoc.getPages()[0];
    if (!page) {return;}

    const resourcesDict = page.getResourcesDict();
    if (!resourcesDict) {return;}

    const fontsDict = resolveDict(page, dictGet(resourcesDict, "Font"));
    if (!fontsDict) {return;}

    console.log("\n=== Font W/DW Analysis for Japanese PDF ===");

    for (const [fontName, ref] of fontsDict.map.entries()) {
      const fontDict = resolveDict(page, ref);
      if (!fontDict) {continue;}

      const subtype = asName(resolve(page, dictGet(fontDict, "Subtype")))?.value ?? "unknown";
      console.log(`\nFont ${fontName}: Subtype=/${subtype}`);

      if (subtype !== "Type0") {continue;}

      const descendants = asArray(resolve(page, dictGet(fontDict, "DescendantFonts")));
      if (!descendants || descendants.items.length === 0) {continue;}

      const cidFont = asDict(resolve(page, descendants.items[0]));
      if (!cidFont) {continue;}

      const dw = asNumber(resolve(page, dictGet(cidFont, "DW")));
      console.log(`  DW: ${dw ?? "NOT SET (should default to 1000)"}`);

      const wArr = asArray(resolve(page, dictGet(cidFont, "W")));
      if (!wArr) {
        console.log("  W array: NOT PRESENT (all glyphs use DW)");
        continue;
      }

      console.log(`  W array size: ${wArr.items.length} entries`);

      // W array format: [cFirst [w1 w2 ...] cFirst2 cLast2 w ...]
      for (let i = 0, sampleCount = 0; i < wArr.items.length && sampleCount < 5; ) {
        const first = asNumber(resolve(page, wArr.items[i]));
        if (first === null) {
          i += 1;
          continue;
        }

        const second = resolve(page, wArr.items[i + 1]);
        if (!second) {break;}

        if (second.type === "array") {
          const widths: number[] = [];
          for (let j = 0; j < Math.min(5, second.items.length); j += 1) {
            const w = asNumber(resolve(page, second.items[j]));
            if (w !== null) {widths.push(w);}
          }
          const suffix = second.items.length > 5 ? "..." : "";
          console.log(`    CID ${first}: [${widths.join(", ")}${suffix}] (${second.items.length} widths)`);
          i += 2;
        } else {
          const last = asNumber(second);
          const w = asNumber(resolve(page, wArr.items[i + 2]));
          if (last !== null && w !== null) {
            console.log(`    CID ${first}-${last}: width=${w}`);
          }
          i += 3;
        }
        sampleCount += 1;
      }
    }

    expect(true).toBe(true);
  });

  it("should debug CID lookup by extracting font metrics", async () => {
    const jpPages = jpPagesState.pages;
    if (jpPages.length === 0) {
      console.log("Skipping: Japanese PDF not loaded");
      return;
    }

    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = loadNativePdfDocument(pdfBytes, { encryption: { mode: "ignore" } });
    const page = pdfDoc.getPages()[0];
    if (!page) {return;}

    const fontMappings = extractFontMappings(page);
    const fontInfo = extractFontInfo(page, "F0");
    console.log("\n=== Font Extraction Errors for F0 ===");
    console.log(`  Errors: ${fontInfo.errors.join("; ") || "none"}`);
    console.log(`  ToUnicode: ${fontInfo.toUnicode ? `${fontInfo.toUnicode.mapping.size} entries` : "null"}`);
    console.log(`  Metrics: ${fontInfo.metrics ? `defaultWidth=${fontInfo.metrics.defaultWidth}` : "null"}`);

    console.log("\n=== Font Metrics Debug ===");
    for (const [fontName, fontInfo] of fontMappings.entries()) {
      console.log(`\nFont: ${fontName}`);
      console.log(`  codeByteWidth: ${fontInfo.codeByteWidth}`);
      console.log(`  defaultWidth: ${fontInfo.metrics.defaultWidth}`);
      console.log(`  widths map size: ${fontInfo.metrics.widths.size}`);

      if (fontInfo.metrics.widths.size > 0) {
        const widthEntries = [...fontInfo.metrics.widths.entries()].slice(0, 10);
        console.log(`  Sample widths (CID -> width):`);
        widthEntries.forEach(([cid, w]) => {
          console.log(`    CID ${cid}: ${w}`);
        });

        // Statistics
        const allWidths = [...fontInfo.metrics.widths.values()];
        const avgWidth = allWidths.reduce((a, b) => a + b, 0) / allWidths.length;
        const minWidth = Math.min(...allWidths);
        const maxWidth = Math.max(...allWidths);
        console.log(`  Width stats: min=${minWidth}, max=${maxWidth}, avg=${avgWidth.toFixed(0)}`);
      }

      if (fontInfo.mapping.size > 0) {
        const mappingEntries = [...fontInfo.mapping.entries()].slice(0, 10);
        console.log(`  Sample ToUnicode mappings (CID -> Unicode):`);
        mappingEntries.forEach(([cid, unicode]) => {
          const charCode = unicode.charCodeAt(0);
          console.log(`    CID ${cid}: "${unicode}" (U+${charCode.toString(16).toUpperCase().padStart(4, "0")})`);
        });
      }
    }

    expect(fontMappings.size).toBeGreaterThan(0);
  });
});

// Grouping analysis test
describe("Text Grouping analysis", () => {
  const JP_PDF_PATH = join(process.cwd(), "fixtures/samples/k-resource-dl.pdf");

  it("should analyze grouping behavior on Japanese PDF", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log("\n=== Grouping Analysis ===");
    console.log(`Total individual text elements: ${texts.length}`);

    const groups = spatialGrouping(texts);

    console.log(`Groups after spatial grouping: ${groups.length}`);
    console.log(`Compression ratio: ${(texts.length / groups.length).toFixed(2)}x`);

    // Analyze each group
    console.log("\n--- Group Details (first 10) ---");
    groups.slice(0, 10).forEach((group, i) => {
      const paragraphs = group.paragraphs;
      const totalRuns = paragraphs.reduce((sum, p) => sum + p.runs.length, 0);
      const texts = paragraphs.flatMap(p => p.runs.map(r => r.text));
      const preview = texts.join(" ").slice(0, 50);

      console.log(
        `  [${i}] ${paragraphs.length} para(s), ${totalRuns} run(s): "${preview}${preview.length >= 50 ? "..." : ""}"`
      );
      console.log(
        `       bounds: (${group.bounds.x.toFixed(1)}, ${group.bounds.y.toFixed(1)}) ` +
        `${group.bounds.width.toFixed(1)}x${group.bounds.height.toFixed(1)}`
      );
    });

    // Check for single-run groups (ungrouped texts)
    const singleRunGroups = groups.filter(g => g.paragraphs.length === 1 && g.paragraphs[0].runs.length === 1);
    console.log(`\nSingle-run groups (potential ungrouped): ${singleRunGroups.length} (${(singleRunGroups.length / groups.length * 100).toFixed(1)}%)`);

    // Analyze multi-paragraph groups
    const multiParaGroups = groups.filter(g => g.paragraphs.length > 1);
    console.log(`Multi-paragraph groups: ${multiParaGroups.length}`);

    if (multiParaGroups.length > 0) {
      console.log("\n--- Multi-paragraph groups (first 5) ---");
      multiParaGroups.slice(0, 5).forEach((group, i) => {
        console.log(`  [${i}] ${group.paragraphs.length} paragraphs:`);
        group.paragraphs.forEach((para, j) => {
          const texts = para.runs.map(r => r.text).join("");
          const preview = texts.slice(0, 40);
          console.log(`    para[${j}] baselineY=${para.baselineY.toFixed(1)}: "${preview}"`);
        });
      });
    }

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.length).toBeLessThan(texts.length); // Should have some compression
  });

  it("should analyze grouping behavior on modeling.pdf", async () => {
    const PDF_PATH = "/Users/terukichi/Workspaces/trkbt10/web-pptx/fixtures/samples/modeling.pdf";
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log("\n=== Grouping Analysis for modeling.pdf ===");
    console.log(`Total individual text elements: ${texts.length}`);

    const groups = spatialGrouping(texts);

    console.log(`Groups after spatialGrouping: ${groups.length}`);
    console.log(`Compression ratio: ${(texts.length / groups.length).toFixed(2)}x`);

    // Check single-run groups
    const singleRunGroups = groups.filter(g => g.paragraphs.length === 1 && g.paragraphs[0].runs.length === 1);
    console.log(`Single-run groups: ${singleRunGroups.length} (${(singleRunGroups.length / groups.length * 100).toFixed(1)}%)`);

    // Analyze multi-paragraph groups
    const multiParaGroups = groups.filter(g => g.paragraphs.length > 1);
    console.log(`Multi-paragraph groups: ${multiParaGroups.length}`);

    // Multi-run single-paragraph groups
    const multiRunGroups = groups.filter(g => g.paragraphs.length === 1 && g.paragraphs[0].runs.length > 1);
    console.log(`Multi-run single-paragraph groups: ${multiRunGroups.length}`);

    console.log("\n--- Multi-run groups (first 5) ---");
    multiRunGroups.slice(0, 5).forEach((group, i) => {
      const runs = group.paragraphs[0].runs;
      const text = runs.map(r => r.text).join("");
      console.log(`  [${i}] ${runs.length} runs: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`);
    });

    expect(groups.length).toBeGreaterThan(0);
  });

  it("should verify end-to-end conversion with convertPageToShapes", async () => {
    // Use page 3 which has more text content for wrapping test
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[2] ?? pdfDoc.pages[0]; // Try page 3, fallback to page 1

    const shapes: Shape[] = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
      fit: "contain",
    });

    console.log("\n=== End-to-end Conversion Result ===");
    console.log(`Total shapes: ${shapes.length}`);

    // Count shape types
    const textBoxes: readonly SpShape[] = getSpShapesWithTextBody(shapes);
    console.log(`TextBoxes: ${textBoxes.length}`);

    // Analyze textboxes
    console.log("\n--- TextBox Details ---");
    textBoxes.slice(0, 5).forEach((shape, i) => {
      const tb = shape.textBody;
      if (!tb) {return;}
      const paras = tb.paragraphs.length;
      const runs = tb.paragraphs.reduce((sum, p) => sum + p.runs.length, 0);
      const allText = tb.paragraphs.flatMap(p => p.runs.filter(r => r.type === "text").map(r => r.text)).join("");

      const transform = shape.properties.transform;
      if (!transform) {return;}
      console.log(
        `  [${i}] ${paras} para(s), ${runs} run(s): "${allText.slice(0, 50)}${allText.length > 50 ? "..." : ""}"`
      );
      console.log(
        `       pos: (${(transform.x as number).toFixed(1)}, ${(transform.y as number).toFixed(1)}) ` +
        `size: ${(transform.width as number).toFixed(1)}x${(transform.height as number).toFixed(1)}`
      );

      // Check spaceBefore on paragraphs and font sizes
      tb.paragraphs.forEach((p, j) => {
        const sb = p.properties?.spaceBefore;
        const firstRun = p.runs.find(r => r.type === "text");
        const fontSize = firstRun?.properties?.fontSize;
        console.log(
          `       para[${j}]: fontSize=${fontSize ? (fontSize as number).toFixed(1) : "?"} ` +
          `spaceBefore=${sb?.type === "points" ? `${(sb.value as number).toFixed(1)}pt` : "none"}`
        );
      });
    });

    expect(textBoxes.length).toBeGreaterThan(0);
  });

  it("should analyze text run structure for wrapping issues", async () => {
    const JP_PDF_PATH = "/Users/terukichi/Workspaces/trkbt10/web-pptx/fixtures/samples/k-resource-dl.pdf";
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);

    // Find a page with substantial text content
    const page = pdfDoc.pages[2] ?? pdfDoc.pages[0];
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log("\n=== Text Run Structure Analysis ===");
    console.log(`Page has ${texts.length} text elements`);

    const groups = spatialGrouping(texts);

    console.log(`Grouped into ${groups.length} TextBoxes`);

    // Find the largest group (most paragraphs)
    const largestGroup = groups.reduce((max, g) =>
      g.paragraphs.length > max.paragraphs.length ? g : max
    );

    console.log(`\n--- Largest Group: ${largestGroup.paragraphs.length} paragraphs ---`);
    console.log(`Bounds: x=${largestGroup.bounds.x.toFixed(1)} y=${largestGroup.bounds.y.toFixed(1)} ` +
      `w=${largestGroup.bounds.width.toFixed(1)} h=${largestGroup.bounds.height.toFixed(1)}`);

    largestGroup.paragraphs.slice(0, 5).forEach((para, i) => {
      console.log(`\n  Para[${i}] (${para.runs.length} runs, baselineY=${para.baselineY.toFixed(1)}):`);
      para.runs.forEach((run, j) => {
        const text = run.text;
        const hasTrailingSpace = text.endsWith(" ");
        const hasLeadingSpace = text.startsWith(" ");
        console.log(
          `    Run[${j}]: "${text.slice(0, 20)}${text.length > 20 ? "..." : ""}" ` +
          `x=${run.x.toFixed(1)} w=${run.width.toFixed(1)} fs=${run.fontSize.toFixed(1)} ` +
          `lead=${hasLeadingSpace} trail=${hasTrailingSpace}`
        );
      });
    });

    // Check if runs within a paragraph have gaps
    console.log("\n--- Gap Analysis ---");
    largestGroup.paragraphs.slice(0, 3).forEach((para, i) => {
      if (para.runs.length < 2) {return;}
      console.log(`  Para[${i}] gaps:`);
      for (let j = 1; j < para.runs.length && j < 6; j++) {
        const prev = para.runs[j - 1];
        const curr = para.runs[j];
        const gap = curr.x - (prev.x + prev.width);
        console.log(`    Run[${j-1}] -> Run[${j}]: gap=${gap.toFixed(2)}pt`);
      }
    });

    expect(groups.length).toBeGreaterThan(0);
  });

  it("should verify paragraph structure in converted shapes", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);

    const page = pdfDoc.pages[2] ?? pdfDoc.pages[0];

    const shapes: Shape[] = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
      fit: "contain",
    });

    // Filter to TextBoxes
    const textBoxes: readonly SpShape[] = getSpShapesWithTextBody(shapes);

    console.log("\n=== Paragraph Flattening Verification ===");
    console.log(`Total TextBoxes: ${textBoxes.length}`);

    // Find the TextBox with most runs (should preserve line structure)
    const maxRunsInfo = textBoxes.reduce<{ maxRuns: number; textBox: SpShape | null }>(
      (acc, shape) => {
        const tb = shape.textBody;
        if (!tb) {
          return acc;
        }
        const totalRuns = tb.paragraphs.reduce((sum, p) => sum + p.runs.length, 0);
        if (totalRuns > acc.maxRuns) {
          return { maxRuns: totalRuns, textBox: shape };
        }
        return acc;
      },
      { maxRuns: 0, textBox: null }
    );

    if (!maxRunsInfo.textBox) {return;}
    const tb = maxRunsInfo.textBox.textBody;
    if (tb) {
      console.log(`\n--- TextBox with most runs (${maxRunsInfo.maxRuns} runs) ---`);
      console.log(`Paragraphs: ${tb.paragraphs.length}`);
      console.log(`wrapping: ${tb.bodyProperties.wrapping}`);

      tb.paragraphs.forEach((para, i) => {
        const runsText = para.runs
          .filter(r => r.type === "text")
          .map(r => r.text)
          .join("");
        console.log(`  Para[${i}] (${para.runs.length} runs): "${runsText.slice(0, 60)}${runsText.length > 60 ? "..." : ""}"`);
      });

      // Verify wrapping is disabled to preserve explicit PDF line breaks
      expect(tb.bodyProperties.wrapping).toBe("none");
    }

    expect(textBoxes.length).toBeGreaterThan(0);
  });
});

// Receipt PDF analysis - table/shape-based grouping
describe("Receipt PDF analysis", () => {
  const RECEIPT_PDF_PATH = join(process.cwd(), "fixtures/samples/receipt.pdf");

  it("should analyze receipt structure for table extraction", async () => {
    const pdfBytes = readFileSync(RECEIPT_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");

    console.log("\n=== Receipt PDF Structure ===");
    console.log(`Page size: ${page.width}x${page.height}`);
    console.log(`Texts: ${texts.length}, Paths: ${paths.length}`);

    // Analyze filled rectangles (potential table cells)
    const filledRects = paths.filter(p => p.paintOp === "fill" || p.paintOp === "fillStroke");
    console.log(`\nFilled paths (potential cell backgrounds): ${filledRects.length}`);

    // Show sample filled rectangles
    console.log("\n--- Sample filled rectangles ---");
    filledRects.slice(0, 10).forEach((rect, i) => {
      const fill = rect.graphicsState.fillColor;
      console.log(
        `  [${i}] ops=${rect.operations.length} fill=${fill.colorSpace}[${fill.components.map(c => c.toFixed(2)).join(",")}]`
      );
    });

    // Find texts that are positioned within filled rectangles
    console.log("\n--- Texts on filled shapes ---");

    const state = { textsOnShapes: 0 };
    const textShapeMap = new Map<PdfText, PdfPath[]>();

    for (const text of texts.slice(0, 50)) {
      const containingShapes: PdfPath[] = [];
      for (const shape of filledRects) {
        const [x1, y1, x2, y2] = computePathBBox(shape);
        const shapeMinX = Math.min(x1, x2);
        const shapeMaxX = Math.max(x1, x2);
        const shapeMinY = Math.min(y1, y2);
        const shapeMaxY = Math.max(y1, y2);

        // Check if text center is within shape
        const textCenterX = text.x + text.width / 2;
        const textCenterY = text.y + text.height / 2;

        if (textCenterX >= shapeMinX && textCenterX <= shapeMaxX &&
            textCenterY >= shapeMinY && textCenterY <= shapeMaxY) {
          containingShapes.push(shape);
        }
      }

      if (containingShapes.length > 0) {
        state.textsOnShapes += 1;
        textShapeMap.set(text, containingShapes);
        if (state.textsOnShapes <= 10) {
          console.log(
            `  "${text.text.slice(0, 20)}" @ (${text.x.toFixed(1)}, ${text.y.toFixed(1)}) ` +
            `in ${containingShapes.length} shape(s)`
          );
        }
      }
    }

    console.log(`\nTexts on shapes: ${state.textsOnShapes} / ${Math.min(50, texts.length)}`);

    // Current grouping result
    const groups = spatialGrouping(texts);

    console.log(`\n--- Current grouping result ---`);
    console.log(`Groups: ${groups.length}`);

    // Show groups with most single-run paragraphs (ungrouped)
    const singleRunGroups = groups.filter(g =>
      g.paragraphs.length === 1 && g.paragraphs[0].runs.length === 1
    );
    console.log(`Single-run groups (ungrouped texts): ${singleRunGroups.length} (${(singleRunGroups.length / groups.length * 100).toFixed(1)}%)`);

    // Show some groups to understand the structure
    console.log("\n--- Sample groups ---");
    groups.slice(0, 10).forEach((g, i) => {
      const totalRuns = g.paragraphs.reduce((sum, p) => sum + p.runs.length, 0);
      const allText = g.paragraphs.flatMap(p => p.runs.map(r => r.text)).join("");
      console.log(
        `  [${i}] ${g.paragraphs.length} para(s), ${totalRuns} run(s): ` +
        `"${allText.slice(0, 40)}${allText.length > 40 ? "..." : ""}" ` +
        `bounds=(${g.bounds.x.toFixed(0)},${g.bounds.y.toFixed(0)}) ${g.bounds.width.toFixed(0)}x${g.bounds.height.toFixed(0)}`
      );
    });

    expect(texts.length).toBeGreaterThan(0);
  });

  it("should analyze table cell structure for grouping", async () => {
    const pdfBytes = readFileSync(RECEIPT_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");

    // Get filled rectangles as potential table cells
    const filledRects = paths.filter(p =>
      (p.paintOp === "fill" || p.paintOp === "fillStroke") &&
      p.operations.length === 5 // Simple rectangle = moveto + 3 lineto + closepath
    );

    console.log("\n=== Table Cell Structure Analysis ===");
    console.log(`Filled rectangles (potential cells): ${filledRects.length}`);

    // Group texts by which rectangle they're in
    const textsByRect = new Map<PdfPath, PdfText[]>();

    for (const text of texts) {
      for (const rect of filledRects) {
        const [x1, y1, x2, y2] = computePathBBox(rect);
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        const textCenterX = text.x + text.width / 2;
        const textCenterY = text.y + text.height / 2;

        if (textCenterX >= minX && textCenterX <= maxX &&
            textCenterY >= minY && textCenterY <= maxY) {
          if (!textsByRect.has(rect)) {
            textsByRect.set(rect, []);
          }
          textsByRect.get(rect)!.push(text);
          break; // Assume text belongs to first containing rect
        }
      }
    }

    console.log(`\nRectangles with texts: ${textsByRect.size}`);

    // Show cells with their texts
    console.log("\n--- Cells with texts ---");
    Array.from(textsByRect.entries())
      .slice(0, 10)
      .forEach(([rect, cellTexts], cellIndex) => {
        const [x1, y1, x2, y2] = computePathBBox(rect);
        const cellText = cellTexts.map(t => t.text).join("");
        const fill = rect.graphicsState.fillColor;
        console.log(
          `  Cell[${cellIndex}] (${Math.min(x1, x2).toFixed(0)},${Math.min(y1, y2).toFixed(0)}) ` +
          `${Math.abs(x2 - x1).toFixed(0)}x${Math.abs(y2 - y1).toFixed(0)} ` +
          `fill=${fill.colorSpace}[${fill.components.map(c => c.toFixed(2)).join(",")}] ` +
          `texts=${cellTexts.length}: "${cellText.slice(0, 30)}${cellText.length > 30 ? "..." : ""}"`
        );
      });

    // Propose: Group texts by containing cell
    console.log("\n--- Proposed cell-based grouping ---");
    console.log(`Would create ${textsByRect.size} groups based on cells`);

    expect(filledRects.length).toBeGreaterThan(0);
  });
});

// K-resource PDF table analysis
describe("K-resource PDF table analysis", () => {
  const JP_PDF_PATH = join(process.cwd(), "fixtures/samples/k-resource-dl.pdf");

  it("should analyze table structure on page with tables", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);

    // Find a page with more paths (likely has tables)
    const candidatePages = pdfDoc.pages.slice(0, Math.min(10, pdfDoc.pages.length));
    const best = candidatePages.reduce<{ page: typeof pdfDoc.pages[number]; maxPaths: number }>(
      (acc, page) => {
        const pathCount = page.elements.filter(e => e.type === "path").length;
        if (pathCount > acc.maxPaths) {
          return { page, maxPaths: pathCount };
        }
        return acc;
      },
      { page: candidatePages[0], maxPaths: 0 }
    );

    const texts = best.page.elements.filter((e): e is PdfText => e.type === "text");
    const paths = best.page.elements.filter((e): e is PdfPath => e.type === "path");

    console.log("\n=== K-resource PDF Table Analysis ===");
    console.log(`Page with most paths: ${best.maxPaths} paths, ${texts.length} texts`);

    // Find filled rectangles
    const filledRects = paths.filter(p =>
      (p.paintOp === "fill" || p.paintOp === "fillStroke") &&
      p.operations.length >= 4 && p.operations.length <= 6
    );

    console.log(`Filled rectangles: ${filledRects.length}`);

    // Group texts by containing rectangle
    const textsByRect = new Map<PdfPath, PdfText[]>();
    const textsNotInRect: PdfText[] = [];

    const tryPlaceTextIntoRects = (text: PdfText): boolean => {
      for (const rect of filledRects) {
        const [x1, y1, x2, y2] = computePathBBox(rect);
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        // Check if text is within rectangle
        if (text.x >= minX - 2 && text.x + text.width <= maxX + 2 &&
            text.y >= minY - 2 && text.y + text.height <= maxY + 2) {
          if (!textsByRect.has(rect)) {
            textsByRect.set(rect, []);
          }
          textsByRect.get(rect)!.push(text);
          return true;
        }
      }
      return false;
    };

    for (const text of texts) {
      if (!tryPlaceTextIntoRects(text)) {
        textsNotInRect.push(text);
      }
    }

    console.log(`\nTexts in rectangles: ${texts.length - textsNotInRect.length}`);
    console.log(`Texts not in rectangles: ${textsNotInRect.length}`);
    console.log(`Rectangles with texts: ${textsByRect.size}`);

    // Show sample cells
    console.log("\n--- Sample cells ---");
    Array.from(textsByRect.entries())
      .slice(0, 15)
      .forEach(([rect, cellTexts], cellIndex) => {
        const [x1, y1, x2, y2] = computePathBBox(rect);
        const cellText = cellTexts.map(t => t.text).join("");
        const fill = rect.graphicsState.fillColor;
        console.log(
          `  Cell[${cellIndex}] (${Math.min(x1, x2).toFixed(0)},${Math.min(y1, y2).toFixed(0)}) ` +
          `${Math.abs(x2 - x1).toFixed(0)}x${Math.abs(y2 - y1).toFixed(0)} ` +
          `fill=${fill.components.map(c => c.toFixed(2)).join(",")} ` +
          `texts=${cellTexts.length}: "${cellText.slice(0, 25)}${cellText.length > 25 ? "..." : ""}"`
        );
      });

    // Current grouping result for comparison
    const groups = spatialGrouping(texts);

    console.log(`\n--- Current spatial grouping ---`);
    console.log(`Groups: ${groups.length} (${texts.length} texts)`);

    // Show how cell-based grouping compares
    console.log(`\n--- Cell-based grouping would create ---`);
    console.log(`Groups for texts in cells: ${textsByRect.size}`);
    console.log(`Groups for texts outside cells: TBD (would use spatial grouping)`);

    expect(paths.length).toBeGreaterThan(0);
  });
});

// Width calculation verification
describe("TextBox width and spacing verification", () => {
  const JP_PDF_PATH = join(process.cwd(), "fixtures/samples/k-resource-dl.pdf");

  it("should verify text width includes charSpacing", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[2] ?? pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log("\n=== Text Width and charSpacing Analysis ===");

    // Find texts with charSpacing
    const textsWithSpacing = texts.filter(t => t.charSpacing !== undefined && t.charSpacing !== 0);
    console.log(`Texts with charSpacing: ${textsWithSpacing.length} / ${texts.length}`);

    // Analyze spacing vs width
    console.log("\n--- Sample texts with spacing ---");
    textsWithSpacing.slice(0, 10).forEach((t, i) => {
      const charCount = t.text.length;
      const avgCharWidth = t.width / charCount;
      const expectedTotalSpacing = (t.charSpacing ?? 0) * charCount;
      console.log(
        `  [${i}] "${t.text.slice(0, 15)}" chars=${charCount} ` +
        `w=${t.width.toFixed(2)} cs=${t.charSpacing?.toFixed(2)} ` +
        `totalCs=${expectedTotalSpacing.toFixed(2)} avgCw=${avgCharWidth.toFixed(2)}`
      );
    });

    // Group and check bounds
    const groups = spatialGrouping(texts);

    // Find a group with multiple runs to check bounds calculation
    const multiRunGroups = groups.filter(g =>
      g.paragraphs.some(p => p.runs.length > 1)
    );

    console.log(`\n--- Multi-run groups bounds check ---`);
    multiRunGroups.slice(0, 5).forEach((g, i) => {
      const allRuns = g.paragraphs.flatMap(p => p.runs);
      const sumWidths = allRuns.reduce((sum, r) => sum + r.width, 0);

      // Check for gaps between runs
      const sortedRuns = [...allRuns].sort((a, b) => a.x - b.x);
      const totalGaps = sortedRuns.reduce((sum, curr, j) => {
        if (j === 0) {
          return sum;
        }
        const prev = sortedRuns[j - 1];
        const gap = curr.x - (prev.x + prev.width);
        return sum + gap;
      }, 0);

      const minX = Math.min(...allRuns.map(r => r.x));
      const maxX = Math.max(...allRuns.map(r => r.x + r.width));
      const boundsWidth = maxX - minX;

      console.log(
        `  Group[${i}] runs=${allRuns.length} sumWidths=${sumWidths.toFixed(1)} ` +
        `totalGaps=${totalGaps.toFixed(1)} boundsW=${boundsWidth.toFixed(1)} ` +
        `match=${Math.abs(sumWidths + totalGaps - boundsWidth) < 0.1 ? "YES" : "NO"}`
      );
    });

    expect(texts.length).toBeGreaterThan(0);
  });

  it("should check if adjacent runs are being grouped", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[2] ?? pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    console.log("\n=== Adjacent Run Grouping Check ===");

    // Find adjacent texts (gap < 1pt)
    const sortedByX = [...texts].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 5) {return yDiff;}
      return a.x - b.x;
    });

    const state = { adjacentPairs: 0 };
    const adjacentExamples: { prev: PdfText; curr: PdfText; gap: number }[] = [];

    for (let i = 1; i < sortedByX.length; i++) {
      const prev = sortedByX[i - 1];
      const curr = sortedByX[i];

      // Same line (Y within 5pt)
      if (Math.abs(prev.y - curr.y) < 5) {
        const gap = curr.x - (prev.x + prev.width);
        if (gap >= -0.5 && gap <= 1) {
          state.adjacentPairs += 1;
          if (adjacentExamples.length < 10) {
            adjacentExamples.push({ prev, curr, gap });
          }
        }
      }
    }

    console.log(`Adjacent pairs (gap 0-1pt): ${state.adjacentPairs}`);
    console.log("\n--- Sample adjacent pairs ---");
    adjacentExamples.forEach(({ prev, curr, gap }, i) => {
      console.log(
        `  [${i}] "${prev.text}" + "${curr.text}" gap=${gap.toFixed(3)} ` +
        `prevEnd=${(prev.x + prev.width).toFixed(1)} currStart=${curr.x.toFixed(1)}`
      );
    });

    // Check if adjacent texts have same style
    const sameStyleAdjacent = adjacentExamples.filter(({ prev, curr }) =>
      prev.fontName === curr.fontName &&
      Math.abs(prev.fontSize - curr.fontSize) < 0.5
    );
    console.log(`\nSame-style adjacent pairs: ${sameStyleAdjacent.length} / ${adjacentExamples.length}`);

    expect(texts.length).toBeGreaterThan(0);
  });

  it("should compare grouping with and without blocking zones", async () => {
    const pdfBytes = readFileSync(JP_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes);
    const page = pdfDoc.pages[2] ?? pdfDoc.pages[0];

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");

    // Create blocking zones like pdf-to-shapes.ts does
    const blockingZones = paths
      .filter(p => p.paintOp !== "none" && p.paintOp !== "clip")
      .map(p => {
        const bbox = computePathBBox(p);
        const [x1, y1, x2, y2] = bbox;
        return {
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        };
      });

    console.log("\n=== Blocking Zone Impact Analysis ===");
    console.log(`Paths: ${paths.length}, Blocking zones: ${blockingZones.length}`);

    // Group without blocking zones
    const groupsNoBlock = spatialGrouping(texts);
    console.log(`\nGroups (no blocking): ${groupsNoBlock.length}`);

    // Group with blocking zones
    const groupsWithBlock = spatialGrouping(texts, { blockingZones });
    console.log(`Groups (with blocking): ${groupsWithBlock.length}`);
    console.log(`Difference: ${groupsWithBlock.length - groupsNoBlock.length}`);

    // Find single-character groups
    const singleCharGroupsNoBlock = groupsNoBlock.filter(g => {
      const runs = g.paragraphs.flatMap(p => p.runs);
      return runs.length === 1 && runs[0].text.length === 1;
    });

    const singleCharGroupsWithBlock = groupsWithBlock.filter(g => {
      const runs = g.paragraphs.flatMap(p => p.runs);
      return runs.length === 1 && runs[0].text.length === 1;
    });

    console.log(`\nSingle-char groups (no block): ${singleCharGroupsNoBlock.length}`);
    console.log(`Single-char groups (with block): ${singleCharGroupsWithBlock.length}`);

    // Show what's being blocked
    if (singleCharGroupsWithBlock.length > singleCharGroupsNoBlock.length) {
      console.log("\n--- Texts fragmented by blocking zones ---");
      const fragmentedCount = singleCharGroupsWithBlock.length - singleCharGroupsNoBlock.length;
      console.log(`Additional fragmented: ${fragmentedCount}`);
    }

    expect(texts.length).toBeGreaterThan(0);
  });
});
