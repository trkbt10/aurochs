/**
 * Analyze color resolution in PPTX rendering
 *
 * Compares colors in source XML vs rendered SVG to verify
 * color transformations (lumMod, lumOff, tint, shade, etc.).
 *
 * Usage: bun run scripts/analyze-colors.ts [pptx-path] [slide-number]
 */
import { openPresentation } from "../src/pptx";
import * as fs from "node:fs";
import { loadPptxFileBundle } from "./lib/pptx-loader";

type ColorTransform = {
  type: "lumMod" | "lumOff" | "tint" | "shade" | "satMod" | "alpha";
  value: number;
};

type PptxColor = {
  type: "srgb" | "scheme";
  value: string;
  transforms: ColorTransform[];
};

function extractPptxColors(xml: string): PptxColor[] {
  const colors: PptxColor[] = [];

  // Extract srgbClr
  const srgbPattern = /<a:srgbClr val="([^"]+)"([^>]*(?:\/>|>[\s\S]*?<\/a:srgbClr>))/g;
  let match;
  while ((match = srgbPattern.exec(xml)) !== null) {
    const color = match[1];
    const content = match[2];
    const transforms = extractTransforms(content);

    colors.push({
      type: "srgb",
      value: `#${color}`,
      transforms,
    });
  }

  // Extract schemeClr
  const schemePattern = /<a:schemeClr val="([^"]+)"([^>]*(?:\/>|>[\s\S]*?<\/a:schemeClr>))/g;
  while ((match = schemePattern.exec(xml)) !== null) {
    const scheme = match[1];
    const content = match[2];
    const transforms = extractTransforms(content);

    colors.push({
      type: "scheme",
      value: scheme,
      transforms,
    });
  }

  return colors;
}

function extractTransforms(content: string): ColorTransform[] {
  const transforms: ColorTransform[] = [];

  const patterns: Array<{ type: ColorTransform["type"]; pattern: RegExp }> = [
    { type: "lumMod", pattern: /<a:lumMod val="(\d+)"/ },
    { type: "lumOff", pattern: /<a:lumOff val="(\d+)"/ },
    { type: "tint", pattern: /<a:tint val="(\d+)"/ },
    { type: "shade", pattern: /<a:shade val="(\d+)"/ },
    { type: "satMod", pattern: /<a:satMod val="(\d+)"/ },
    { type: "alpha", pattern: /<a:alpha val="(\d+)"/ },
  ];

  for (const { type, pattern } of patterns) {
    const match = content.match(pattern);
    if (match) {
      transforms.push({ type, value: parseInt(match[1], 10) / 1000 });
    }
  }

  return transforms;
}

function extractSvgColors(svg: string): string[] {
  const colors = new Set<string>();

  // Extract fill colors
  const fillPattern = /fill="(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))"/g;
  let match;
  while ((match = fillPattern.exec(svg)) !== null) {
    colors.add(match[1]);
  }

  // Extract stroke colors
  const strokePattern = /stroke="(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))"/g;
  while ((match = strokePattern.exec(svg)) !== null) {
    colors.add(match[1]);
  }

  // Extract stop-color
  const stopPattern = /stop-color="(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))"/g;
  while ((match = stopPattern.exec(svg)) !== null) {
    colors.add(match[1]);
  }

  return Array.from(colors);
}

async function main() {
  const pptxPath = process.argv[2] ?? "fixtures/poi-test-data/test-data/slideshow/themes.pptx";
  const slideNum = parseInt(process.argv[3] ?? "3", 10);

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { cache, presentationFile } = await loadPptxFileBundle(pptxPath);

  const presentation = openPresentation(presentationFile);

  console.log("=".repeat(70));
  console.log(`Color Analysis: Slide ${slideNum}`);
  console.log("=".repeat(70));

  // Get SVG output
  const slide = presentation.getSlide(slideNum);
  const svg = slide.renderSVG();

  console.log("\n[SVG Output] Colors used:");
  const svgColors = extractSvgColors(svg);
  for (const color of svgColors.sort()) {
    console.log(`  ${color}`);
  }

  // Get slide XML colors
  const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;
  if (slideXml) {
    console.log("\n[Slide XML] Colors with transforms:");
    const slideColors = extractPptxColors(slideXml);
    for (const color of slideColors) {
      if (color.transforms.length > 0) {
        const transformStr = color.transforms.map(t => `${t.type}:${t.value}%`).join(", ");
        console.log(`  ${color.type}:${color.value} [${transformStr}]`);
      } else if (color.type === "scheme") {
        console.log(`  scheme:${color.value}`);
      }
    }
  }

  // Get theme colors
  const slideRels = cache.get(`ppt/slides/_rels/slide${slideNum}.xml.rels`)?.text;
  const layoutMatch = slideRels?.match(/Target="\.\.\/slideLayouts\/([^"]+)"/);
  const layoutName = layoutMatch?.[1];

  if (layoutName) {
    const layoutRels = cache.get(`ppt/slideLayouts/_rels/${layoutName}.rels`)?.text;
    const masterMatch = layoutRels?.match(/Target="\.\.\/slideMasters\/([^"]+)"/);
    const masterName = masterMatch?.[1];

    if (masterName) {
      const masterRels = cache.get(`ppt/slideMasters/_rels/${masterName}.rels`)?.text;
      const themeMatch = masterRels?.match(/Target="\.\.\/theme\/([^"]+)"/);
      const themeName = themeMatch?.[1];

      if (themeName) {
        console.log(`\n[Theme: ${themeName}] Color Scheme:`);
        const themeXml = cache.get(`ppt/theme/${themeName}`)?.text;
        if (themeXml) {
          // Extract color scheme
          const schemePattern = /<a:clrScheme[^>]*>([\s\S]*?)<\/a:clrScheme>/;
          const schemeMatch = themeXml.match(schemePattern);
          if (schemeMatch) {
            const schemeContent = schemeMatch[1];
            const colorElements = [
              "dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3",
              "accent4", "accent5", "accent6", "hlink", "folHlink",
            ];

            for (const elem of colorElements) {
              const elemPattern = new RegExp(`<a:${elem}>(.*?)</a:${elem}>`, "s");
              const elemMatch = schemeContent.match(elemPattern);
              if (elemMatch) {
                const srgbMatch = elemMatch[1].match(/<a:srgbClr val="([^"]+)"/);
                const sysMatch = elemMatch[1].match(/<a:sysClr val="([^"]+)" lastClr="([^"]+)"/);
                if (srgbMatch) {
                  console.log(`  ${elem.padEnd(8)}: #${srgbMatch[1]}`);
                } else if (sysMatch) {
                  console.log(`  ${elem.padEnd(8)}: system(${sysMatch[1]}) → #${sysMatch[2]}`);
                }
              }
            }
          }
        }
      }
    }
  }

  // Look for background fill with color transforms
  console.log("\n[Background] Fill Analysis:");
  const bgPattern = /<p:bg>([\s\S]*?)<\/p:bg>/;
  const bgMatch = slideXml?.match(bgPattern);
  if (bgMatch) {
    const bgColors = extractPptxColors(bgMatch[1]);
    for (const color of bgColors) {
      const transformStr = color.transforms.length > 0
        ? ` [${color.transforms.map(t => `${t.type}:${t.value}%`).join(", ")}]`
        : "";
      console.log(`  ${color.type}:${color.value}${transformStr}`);
    }

    // Check for bgRef
    const bgRefMatch = bgMatch[1].match(/<p:bgRef idx="(\d+)"/);
    if (bgRefMatch) {
      console.log(`  bgRef idx=${bgRefMatch[1]} (uses theme bgFillStyleLst)`);
    }
  } else {
    console.log("  No background defined in slide (inherited from layout/master)");
  }

  console.log("\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
