/**
 * Generic PPTX theme verification script
 *
 * Usage: bun run scripts/verify-themes-completeness.ts [pptx-path]
 * Default: fixtures/poi-test-data/test-data/slideshow/themes.pptx
 *
 * Checks:
 * - All slides render without errors
 * - Background fill is applied (not blank)
 * - Text elements are rendered
 * - Theme colors are resolved
 * - Gradients and images are rendered when present
 */
import { openPresentation } from "../src/pptx";
import * as fs from "node:fs";
import JSZip from "jszip";

type SlideResult = {
  slide: number;
  hasBackground: boolean;
  backgroundType: "solid" | "linearGradient" | "radialGradient" | "image" | "none";
  hasText: boolean;
  colorCount: number;
  colors: string[];
  svgLength: number;
  renderSuccess: boolean;
  error?: string;
}

async function verifyPptxThemes(pptxPath: string): Promise<{ results: SlideResult[]; success: boolean }> {
  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    return { results: [], success: false };
  }

  const pptxBuffer = fs.readFileSync(pptxPath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache = new Map<string, { text: string; buffer: ArrayBuffer }>();
  for (const fp of Object.keys(jszip.files)) {
    const file = jszip.file(fp);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(fp, { text, buffer });
    }
  }

  const presentationFile = {
    readText: (fp: string) => cache.get(fp)?.text ?? null,
    readBinary: (fp: string) => cache.get(fp)?.buffer ?? null,
    exists: (fp: string) => cache.has(fp),
  };

  const presentation = openPresentation(presentationFile);
  const slideCount = presentation.count;

  console.log("=".repeat(70));
  console.log(`Theme Verification: ${pptxPath}`);
  console.log(`Slides: ${slideCount}`);
  console.log("=".repeat(70));
  console.log();

  const results: SlideResult[] = [];

  for (let i = 1; i <= slideCount; i++) {
    try {
      const slide = presentation.getSlide(i);
      const svg = slide.renderSVG();

      // Extract colors
      const colorPattern = /#([0-9a-fA-F]{6})\b/g;
      const colors = new Set<string>();
      let match;
      while ((match = colorPattern.exec(svg)) !== null) {
        colors.add(match[1].toLowerCase());
      }

      // Detect background type
      let backgroundType: SlideResult["backgroundType"] = "none";
      let hasBackground = false;
      const hasImage = svg.includes("data:image/");
      const hasRadialGradient = svg.includes("radialGradient");
      const hasLinearGradient = svg.includes("linearGradient");
      const hasSolidRect = svg.includes('<rect') && svg.includes('fill="#');

      if (hasImage) {
        backgroundType = "image";
        hasBackground = true;
      } else if (hasRadialGradient) {
        backgroundType = "radialGradient";
        hasBackground = true;
      } else if (hasLinearGradient) {
        backgroundType = "linearGradient";
        hasBackground = true;
      } else if (hasSolidRect) {
        backgroundType = "solid";
        hasBackground = true;
      }

      const hasText = svg.includes("<text");
      const colorList = [...colors];

      results.push({
        slide: i,
        hasBackground,
        backgroundType,
        hasText,
        colorCount: colors.size,
        colors: colorList.slice(0, 5),
        svgLength: svg.length,
        renderSuccess: true,
      });

      const bgIcon = hasBackground ? "✓" : "✗";
      const textIcon = hasText ? "✓" : "-";
      console.log(`Slide ${i.toString().padStart(2)}: bg=${bgIcon} text=${textIcon} type=${backgroundType.padEnd(14)} colors=${colors.size} size=${svg.length}`);

    } catch (err) {
      results.push({
        slide: i,
        hasBackground: false,
        backgroundType: "none",
        hasText: false,
        colorCount: 0,
        colors: [],
        svgLength: 0,
        renderSuccess: false,
        error: err instanceof Error ? err.message : String(err),
      });
      console.log(`Slide ${i.toString().padStart(2)}: ✗ RENDER ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Summary
  console.log();
  console.log("=".repeat(70));
  console.log("Summary");
  console.log("=".repeat(70));

  const renderSuccessCount = results.filter(r => r.renderSuccess).length;
  const hasBackgroundCount = results.filter(r => r.hasBackground).length;
  const hasTextCount = results.filter(r => r.hasText).length;
  const hasGradientCount = results.filter(r => r.backgroundType.includes("Gradient")).length;
  const hasImageCount = results.filter(r => r.backgroundType === "image").length;

  console.log(`Render success: ${renderSuccessCount} / ${slideCount}`);
  console.log(`Has background: ${hasBackgroundCount} / ${slideCount}`);
  console.log(`Has text:       ${hasTextCount} / ${slideCount}`);
  console.log(`Gradient bg:    ${hasGradientCount}`);
  console.log(`Image bg:       ${hasImageCount}`);

  const allRendered = renderSuccessCount === slideCount;
  const allHaveBackground = hasBackgroundCount === slideCount;

  if (!allRendered) {
    console.log("\n⚠️  Some slides failed to render");
  }
  if (!allHaveBackground) {
    console.log("\n⚠️  Some slides have no background");
    for (const r of results.filter(r => !r.hasBackground)) {
      console.log(`   Slide ${r.slide}: ${r.error ?? "no background detected"}`);
    }
  }

  console.log();
  return { results, success: allRendered && allHaveBackground };
}

// Main
const pptxPath = process.argv[2] ?? "fixtures/poi-test-data/test-data/slideshow/themes.pptx";

verifyPptxThemes(pptxPath)
  .then(({ success }) => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
