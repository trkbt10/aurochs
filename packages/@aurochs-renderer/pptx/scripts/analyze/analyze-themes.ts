/**
 * Theme analysis and test case generation tool.
 *
 * Usage: bun run scripts/analyze/analyze-themes.ts <pptx-path> <output-path>
 *
 * Extracts theme structure from themes.pptx and generates test data
 * for theme application verification.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parseXml, getChild, getChildren, getAttr } from "@aurochs/xml";
import { requireFileExists, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

type ThemeInfo = {
  name: string;
  colorScheme: Record<string, string>;
  fontScheme: {
    majorFont: { latin?: string; ea?: string; cs?: string };
    minorFont: { latin?: string; ea?: string; cs?: string };
  };
  formatScheme: {
    fillStyleCount: number;
    lineStyleCount: number;
    effectStyleCount: number;
  };
};

type SlideInfo = {
  slideNumber: number;
  layoutRef: string;
  masterRef: string;
  themeRef: string;
  colorSchemeUsed: string[];
  fontRefsUsed: string[];
};

type AnalysisResult = {
  themes: ThemeInfo[];
  slides: SlideInfo[];
  masterToTheme: Record<string, string>;
  layoutToMaster: Record<string, string>;
};

async function loadZip(pptxPath: string): Promise<Map<string, { text: string; buffer: ArrayBuffer }>> {
  const { cache } = await loadPptxFile(pptxPath);
  return cache;
}

function parseTheme(xml: string, themeName: string): ThemeInfo {
  const doc = parseXml(xml);

  // Color scheme
  const colorScheme: Record<string, string> = {};
  const clrScheme = getChild(getChild(getChild(doc, "a:theme"), "a:themeElements"), "a:clrScheme");
  if (clrScheme) {
    const colorNames = [
      "dk1",
      "lt1",
      "dk2",
      "lt2",
      "accent1",
      "accent2",
      "accent3",
      "accent4",
      "accent5",
      "accent6",
      "hlink",
      "folHlink",
    ];
    for (const name of colorNames) {
      const colorEl = getChild(clrScheme, `a:${name}`);
      if (colorEl) {
        // Try srgbClr first, then sysClr
        const srgb = getChild(colorEl, "a:srgbClr");
        if (srgb) {
          colorScheme[name] = getAttr(srgb, "val") || "";
        } else {
          const sys = getChild(colorEl, "a:sysClr");
          if (sys) {
            colorScheme[name] = getAttr(sys, "lastClr") || getAttr(sys, "val") || "";
          }
        }
      }
    }
  }

  // Font scheme
  const fontScheme = getChild(getChild(getChild(doc, "a:theme"), "a:themeElements"), "a:fontScheme");
  const majorFont = { latin: "", ea: "", cs: "" };
  const minorFont = { latin: "", ea: "", cs: "" };

  if (fontScheme) {
    const majorFontEl = getChild(fontScheme, "a:majorFont");
    if (majorFontEl) {
      majorFont.latin = getAttr(getChild(majorFontEl, "a:latin"), "typeface") || "";
      majorFont.ea = getAttr(getChild(majorFontEl, "a:ea"), "typeface") || "";
      majorFont.cs = getAttr(getChild(majorFontEl, "a:cs"), "typeface") || "";
    }
    const minorFontEl = getChild(fontScheme, "a:minorFont");
    if (minorFontEl) {
      minorFont.latin = getAttr(getChild(minorFontEl, "a:latin"), "typeface") || "";
      minorFont.ea = getAttr(getChild(minorFontEl, "a:ea"), "typeface") || "";
      minorFont.cs = getAttr(getChild(minorFontEl, "a:cs"), "typeface") || "";
    }
  }

  // Format scheme
  const fmtScheme = getChild(getChild(getChild(doc, "a:theme"), "a:themeElements"), "a:fmtScheme");
  let fillStyleCount = 0;
  let lineStyleCount = 0;
  let effectStyleCount = 0;

  if (fmtScheme) {
    const fillStyleLst = getChild(fmtScheme, "a:fillStyleLst");
    const lnStyleLst = getChild(fmtScheme, "a:lnStyleLst");
    const effectStyleLst = getChild(fmtScheme, "a:effectStyleLst");
    if (fillStyleLst) {
      fillStyleCount = getChildren(fillStyleLst).length;
    }
    if (lnStyleLst) {
      lineStyleCount = getChildren(lnStyleLst).length;
    }
    if (effectStyleLst) {
      effectStyleCount = getChildren(effectStyleLst).length;
    }
  }

  return {
    name: themeName,
    colorScheme,
    fontScheme: { majorFont, minorFont },
    formatScheme: {
      fillStyleCount,
      lineStyleCount,
      effectStyleCount,
    },
  };
}

function parseRels(xml: string): Record<string, { type: string; target: string }> {
  const doc = parseXml(xml);
  const rels: Record<string, { type: string; target: string }> = {};
  const relationships = getChild(doc, "Relationships");
  if (relationships) {
    for (const rel of getChildren(relationships, "Relationship")) {
      const id = getAttr(rel, "Id") || "";
      const type = getAttr(rel, "Type") || "";
      const target = getAttr(rel, "Target") || "";
      rels[id] = { type, target };
    }
  }
  return rels;
}

function extractSchemeColorsUsed(xml: string): string[] {
  const pattern = /<a:schemeClr[^>]*val="([^"]*)"[^>]*\/?>/g;
  const colors: Set<string> = new Set();
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    colors.add(match[1]);
  }
  return [...colors];
}

function extractFontRefsUsed(xml: string): string[] {
  const pattern = /typeface="(\+[^"]+)"/g;
  const refs: Set<string> = new Set();
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    refs.add(match[1]);
  }
  return [...refs];
}

async function analyzeThemes(pptxPath: string): Promise<AnalysisResult> {
  const cache = await loadZip(pptxPath);

  // Find all themes
  const themes: ThemeInfo[] = [];
  for (const [path, data] of cache.entries()) {
    if (path.startsWith("ppt/theme/theme") && path.endsWith(".xml") && !path.includes("_rels")) {
      const themeName = path.match(/theme(\d+)\.xml/)?.[0] || path;
      themes.push(parseTheme(data.text, themeName));
    }
  }

  // Build master -> theme mapping
  const masterToTheme: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) {
    const masterRelsPath = `ppt/slideMasters/_rels/slideMaster${i}.xml.rels`;
    const masterRelsText = cache.get(masterRelsPath)?.text;
    if (masterRelsText) {
      const rels = parseRels(masterRelsText);
      for (const [, rel] of Object.entries(rels)) {
        if (rel.type.includes("theme")) {
          masterToTheme[`slideMaster${i}.xml`] = rel.target.replace("../theme/", "");
        }
      }
    }
  }

  // Build layout -> master mapping
  const layoutToMaster: Record<string, string> = {};
  for (let i = 1; i <= 100; i++) {
    const layoutRelsPath = `ppt/slideLayouts/_rels/slideLayout${i}.xml.rels`;
    const layoutRelsText = cache.get(layoutRelsPath)?.text;
    if (layoutRelsText) {
      const rels = parseRels(layoutRelsText);
      for (const [, rel] of Object.entries(rels)) {
        if (rel.type.includes("slideMaster")) {
          layoutToMaster[`slideLayout${i}.xml`] = rel.target.replace("../slideMasters/", "");
        }
      }
    }
  }

  // Parse slides
  const slides: SlideInfo[] = [];
  for (let slideNum = 1; slideNum <= 20; slideNum++) {
    const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;
    if (!slideXml) {
      continue;
    }

    const slideRelsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const slideRelsText = cache.get(slideRelsPath)?.text;
    if (!slideRelsText) {
      continue;
    }

    const slideRels = parseRels(slideRelsText);

    // Find layout reference
    let layoutRef = "";
    for (const [, rel] of Object.entries(slideRels)) {
      if (rel.type.includes("slideLayout")) {
        layoutRef = rel.target.replace("../slideLayouts/", "");
        break;
      }
    }

    const masterRef = layoutToMaster[layoutRef] || "";
    const themeRef = masterToTheme[masterRef] || "";

    slides.push({
      slideNumber: slideNum,
      layoutRef,
      masterRef,
      themeRef,
      colorSchemeUsed: extractSchemeColorsUsed(slideXml),
      fontRefsUsed: extractFontRefsUsed(slideXml),
    });
  }

  return { themes, slides, masterToTheme, layoutToMaster };
}

function generateTestData(result: AnalysisResult): string {
  return `/**
 * Auto-generated theme test data from themes.pptx
 * Generated by: bun run scripts/analyze-themes.ts
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

export const THEME_TEST_DATA = {
  themes: ${JSON.stringify(result.themes, null, 2)},

  slides: ${JSON.stringify(result.slides, null, 2)},

  masterToTheme: ${JSON.stringify(result.masterToTheme, null, 2)},

  layoutToMaster: ${JSON.stringify(result.layoutToMaster, null, 2)},
} as const;

export type ThemeTestData = typeof THEME_TEST_DATA;
`;
}

async function main() {
  const usage = "bun run scripts/analyze/analyze-themes.ts <pptx-path> <output-path>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
  const outputPath = requirePositionalArg({ args, index: 1, name: "output-path", usage });
  requireFileExists(pptxPath, usage);

  console.log(`Analyzing themes in: ${pptxPath}\n`);

  const result = await analyzeThemes(pptxPath);

  console.log("=== Themes Found ===");
  for (const theme of result.themes) {
    console.log(`\n${theme.name}:`);
    console.log(`  Color Scheme: ${Object.keys(theme.colorScheme).length} colors`);
    console.log(`  Major Font: ${theme.fontScheme.majorFont.latin || "(none)"}`);
    console.log(`  Minor Font: ${theme.fontScheme.minorFont.latin || "(none)"}`);
    console.log(`  Fill Styles: ${theme.formatScheme.fillStyleCount}`);
    console.log(`  Line Styles: ${theme.formatScheme.lineStyleCount}`);
    console.log(`  Effect Styles: ${theme.formatScheme.effectStyleCount}`);
  }

  console.log("\n=== Master to Theme Mapping ===");
  for (const [master, theme] of Object.entries(result.masterToTheme)) {
    console.log(`  ${master} -> ${theme}`);
  }

  console.log("\n=== Slides ===");
  for (const slide of result.slides) {
    console.log(`\nSlide ${slide.slideNumber}:`);
    console.log(`  Layout: ${slide.layoutRef}`);
    console.log(`  Master: ${slide.masterRef}`);
    console.log(`  Theme: ${slide.themeRef}`);
    console.log(`  Scheme colors used: ${slide.colorSchemeUsed.join(", ") || "(none)"}`);
    console.log(`  Font refs used: ${slide.fontRefsUsed.join(", ") || "(none)"}`);
  }

  // Generate test data file
  const testDataContent = generateTestData(result);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, testDataContent);
  console.log(`\nTest data written to: ${outputPath}`);
}

main().catch(console.error);
