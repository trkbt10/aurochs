/**
 * Analyze gradient rendering in PPTX files
 *
 * Compares gradient definitions in PPTX source with SVG output.
 *
 * Usage: bun run scripts/analyze-gradients.ts [pptx-path] [slide-number]
 * Default: fixtures/poi-test-data/test-data/slideshow/themes.pptx all slides
 */
import { openPresentation } from "../src/pptx";
import { renderSlideToSvg } from "../src/pptx/render/svg";
import * as fs from "node:fs";
import { loadPptxFile } from "./lib/pptx-loader";

type GradientInfo = {
  type: "linear" | "radial" | "path" | "unknown";
  angle?: number;
  stops: Array<{ position: number; color: string }>;
  raw?: string;
};

function extractSvgGradients(svg: string): GradientInfo[] {
  const gradients: GradientInfo[] = [];

  // Extract linearGradient elements
  const linearPattern = /<linearGradient[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/linearGradient>/g;
  let match;
  while ((match = linearPattern.exec(svg)) !== null) {
    const content = match[0];
    const stops: Array<{ position: number; color: string }> = [];

    // Extract stops
    const stopPattern = /<stop[^>]*offset="([^"]+)"[^>]*stop-color="([^"]+)"/g;
    let stopMatch;
    while ((stopMatch = stopPattern.exec(content)) !== null) {
      const offset = parseFloat(stopMatch[1].replace("%", "")) / (stopMatch[1].includes("%") ? 100 : 1);
      stops.push({ position: offset, color: stopMatch[2] });
    }

    // Extract angle from gradientTransform or x1/y1/x2/y2
    let angle = 0;
    const transformMatch = content.match(/gradientTransform="rotate\(([^)]+)\)"/);
    if (transformMatch) {
      angle = parseFloat(transformMatch[1]);
    }

    gradients.push({
      type: "linear",
      angle,
      stops,
      raw: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
    });
  }

  // Extract radialGradient elements
  const radialPattern = /<radialGradient[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/radialGradient>/g;
  while ((match = radialPattern.exec(svg)) !== null) {
    const content = match[0];
    const stops: Array<{ position: number; color: string }> = [];

    const stopPattern = /<stop[^>]*offset="([^"]+)"[^>]*stop-color="([^"]+)"/g;
    let stopMatch;
    while ((stopMatch = stopPattern.exec(content)) !== null) {
      const offset = parseFloat(stopMatch[1].replace("%", "")) / (stopMatch[1].includes("%") ? 100 : 1);
      stops.push({ position: offset, color: stopMatch[2] });
    }

    gradients.push({
      type: "radial",
      stops,
      raw: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
    });
  }

  return gradients;
}

function extractPptxGradients(xml: string, label: string): Array<{ type: string; angle?: number; stops: string[] }> {
  const gradients: Array<{ type: string; angle?: number; stops: string[] }> = [];

  // Extract gradFill elements
  const gradFillPattern = /<a:gradFill[^>]*>([\s\S]*?)<\/a:gradFill>/g;
  let match;
  while ((match = gradFillPattern.exec(xml)) !== null) {
    const content = match[1];
    const stops: string[] = [];

    // Determine gradient type
    const isLinear = content.includes("<a:lin ");
    const isPath = content.includes("<a:path ");

    // Extract angle for linear
    let angle: number | undefined;
    if (isLinear) {
      const angMatch = content.match(/<a:lin[^>]*ang="(\d+)"/);
      if (angMatch) {
        angle = parseInt(angMatch[1], 10) / 60000; // OOXML stores in 60000ths of a degree
      }
    }

    // Extract gradient stops
    const gsPattern = /<a:gs[^>]*pos="(\d+)"[^>]*>([\s\S]*?)<\/a:gs>/g;
    let gsMatch;
    while ((gsMatch = gsPattern.exec(content)) !== null) {
      const pos = parseInt(gsMatch[1], 10) / 1000; // OOXML stores in 1000ths
      const colorContent = gsMatch[2];

      // Try to extract color
      let colorStr = "unknown";
      const srgbMatch = colorContent.match(/<a:srgbClr val="([^"]+)"/);
      const schemeMatch = colorContent.match(/<a:schemeClr val="([^"]+)"/);
      if (srgbMatch) {
        colorStr = `#${srgbMatch[1]}`;
      } else if (schemeMatch) {
        colorStr = `scheme:${schemeMatch[1]}`;

        // Check for color transforms
        const lumModMatch = colorContent.match(/<a:lumMod val="(\d+)"/);
        const lumOffMatch = colorContent.match(/<a:lumOff val="(\d+)"/);
        const shadeMatch = colorContent.match(/<a:shade val="(\d+)"/);
        const tintMatch = colorContent.match(/<a:tint val="(\d+)"/);

        const transforms: string[] = [];
        if (lumModMatch) {transforms.push(`lumMod:${parseInt(lumModMatch[1], 10) / 1000}%`);}
        if (lumOffMatch) {transforms.push(`lumOff:${parseInt(lumOffMatch[1], 10) / 1000}%`);}
        if (shadeMatch) {transforms.push(`shade:${parseInt(shadeMatch[1], 10) / 1000}%`);}
        if (tintMatch) {transforms.push(`tint:${parseInt(tintMatch[1], 10) / 1000}%`);}

        if (transforms.length > 0) {
          colorStr += ` [${transforms.join(", ")}]`;
        }
      }

      stops.push(`${(pos / 10).toFixed(1)}%: ${colorStr}`);
    }

    gradients.push({
      type: isLinear ? "linear" : isPath ? "path" : "radial",
      angle,
      stops,
    });
  }

  return gradients;
}

async function main() {
  const pptxPath = process.argv[2] ?? "fixtures/poi-test-data/test-data/slideshow/themes.pptx";
  const slideNumArg = process.argv[3];

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { cache, presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);
  const slideCount = presentation.count;

  const startSlide = slideNumArg ? parseInt(slideNumArg, 10) : 1;
  const endSlide = slideNumArg ? parseInt(slideNumArg, 10) : slideCount;

  console.log("=".repeat(70));
  console.log(`Gradient Analysis: ${pptxPath}`);
  console.log("=".repeat(70));

  for (let i = startSlide; i <= endSlide; i++) {
    console.log(`\nSlide ${i}`);
    console.log("-".repeat(40));

    // Get our SVG output
    const slide = presentation.getSlide(i);
    const { svg } = renderSlideToSvg(slide);

    // Extract gradients from SVG
    const svgGradients = extractSvgGradients(svg);
    console.log(`\n[SVG Output] Gradients found: ${svgGradients.length}`);
    for (const g of svgGradients) {
      console.log(`  Type: ${g.type}${g.angle ? `, angle: ${g.angle}°` : ""}`);
      console.log(`  Stops: ${g.stops.length}`);
      for (const stop of g.stops) {
        console.log(`    ${(stop.position * 100).toFixed(1)}%: ${stop.color}`);
      }
    }

    // Extract gradients from PPTX source
    const slideXml = cache.get(`ppt/slides/slide${i}.xml`)?.text;
    if (slideXml) {
      const pptxGradients = extractPptxGradients(slideXml, "slide");
      console.log(`\n[PPTX Source] Gradients found: ${pptxGradients.length}`);
      for (const g of pptxGradients) {
        console.log(`  Type: ${g.type}${g.angle !== undefined ? `, angle: ${g.angle}°` : ""}`);
        for (const stop of g.stops) {
          console.log(`    ${stop}`);
        }
      }
    }

    // Check theme for gradients used in bgFillStyleLst
    const themeXml = cache.get("ppt/theme/theme1.xml")?.text;
    if (themeXml) {
      // Look for bgFillStyleLst gradients
      const bgFillStylePattern = /<a:bgFillStyleLst>([\s\S]*?)<\/a:bgFillStyleLst>/;
      const bgMatch = themeXml.match(bgFillStylePattern);
      if (bgMatch && bgMatch[1].includes("gradFill")) {
        const bgGradients = extractPptxGradients(bgMatch[1], "theme-bg");
        if (bgGradients.length > 0) {
          console.log(`\n[Theme bgFillStyleLst] Gradients: ${bgGradients.length}`);
          for (let gi = 0; gi < bgGradients.length; gi++) {
            const g = bgGradients[gi];
            console.log(`  [idx ${gi + 1001}] Type: ${g.type}${g.angle !== undefined ? `, angle: ${g.angle}°` : ""}`);
            for (const stop of g.stops) {
              console.log(`    ${stop}`);
            }
          }
        }
      }
    }
  }

  console.log("\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
