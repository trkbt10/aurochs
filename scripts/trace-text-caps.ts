/**
 * Trace text caps attribute through the style cascade
 *
 * Investigates where text-transform (caps) should come from in the
 * OOXML style inheritance chain.
 *
 * Usage: bun run scripts/trace-text-caps.ts [pptx-path] [slide-number]
 * Default: fixtures/poi-test-data/test-data/slideshow/themes.pptx slide 8
 */
import * as fs from "node:fs";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = process.argv[2] ?? "fixtures/poi-test-data/test-data/slideshow/themes.pptx";
  const slideNum = parseInt(process.argv[3] ?? "8", 10);

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { cache } = await loadPptxFile(pptxPath);

  const readFile = async (path: string): Promise<string | null> => {
    return cache.get(path)?.text ?? null;
  };

  console.log("=".repeat(70));
  console.log(`Text Caps Trace: Slide ${slideNum}`);
  console.log("=".repeat(70));

  // Get slide content
  const slideXml = await readFile(`ppt/slides/slide${slideNum}.xml`);
  if (!slideXml) {
    console.error(`Slide ${slideNum} not found`);
    process.exit(1);
  }

  // Get slide relationships to find layout
  const slideRels = await readFile(`ppt/slides/_rels/slide${slideNum}.xml.rels`);
  const layoutMatch = slideRels?.match(/Target="\.\.\/slideLayouts\/([^"]+)"/);
  const layoutName = layoutMatch?.[1] ?? "unknown";
  console.log(`\nSlide layout: ${layoutName}`);

  // Get layout content
  const layoutXml = await readFile(`ppt/slideLayouts/${layoutName}`);

  // Get layout relationships to find master
  const layoutRels = await readFile(`ppt/slideLayouts/_rels/${layoutName}.rels`);
  const masterMatch = layoutRels?.match(/Target="\.\.\/slideMasters\/([^"]+)"/);
  const masterName = masterMatch?.[1] ?? "unknown";
  console.log(`Slide master: ${masterName}`);

  // Get master content
  const masterXml = await readFile(`ppt/slideMasters/${masterName}`);

  // Search for cap attribute in each level
  console.log("\n" + "-".repeat(40));
  console.log("Searching for 'cap' attribute in style cascade:");
  console.log("-".repeat(40));

  // Check slide
  const slideCapMatches = slideXml.match(/cap="([^"]+)"/g);
  console.log(`\n[Slide] cap attributes found: ${slideCapMatches?.length ?? 0}`);
  if (slideCapMatches) {
    for (const m of slideCapMatches) {
      console.log(`  ${m}`);
    }
  }

  // Check layout
  if (layoutXml) {
    const layoutCapMatches = layoutXml.match(/cap="([^"]+)"/g);
    console.log(`\n[Layout] cap attributes found: ${layoutCapMatches?.length ?? 0}`);
    if (layoutCapMatches) {
      for (const m of layoutCapMatches) {
        console.log(`  ${m}`);
      }
    }
  }

  // Check master
  if (masterXml) {
    const masterCapMatches = masterXml.match(/cap="([^"]+)"/g);
    console.log(`\n[Master] cap attributes found: ${masterCapMatches?.length ?? 0}`);
    if (masterCapMatches) {
      for (const m of masterCapMatches) {
        console.log(`  ${m}`);
      }
    }
  }

  // Extract text from slide for context
  console.log("\n" + "-".repeat(40));
  console.log("Text content in slide:");
  console.log("-".repeat(40));
  const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
  if (textMatches) {
    for (const m of textMatches) {
      const text = m.replace(/<\/?a:t>/g, "");
      console.log(`  "${text}"`);
    }
  }

  // Check for defRPr (default run properties) which often contain cap
  console.log("\n" + "-".repeat(40));
  console.log("Checking defRPr (default run properties):");
  console.log("-".repeat(40));

  // Slide defRPr
  const slideDefRPr = slideXml.match(/<a:defRPr[^>]*>/g);
  console.log(`\n[Slide] defRPr elements: ${slideDefRPr?.length ?? 0}`);
  if (slideDefRPr) {
    for (const m of slideDefRPr) {
      if (m.includes("cap=")) {
        console.log(`  ${m}`);
      }
    }
  }

  // Layout defRPr
  if (layoutXml) {
    const layoutDefRPr = layoutXml.match(/<a:defRPr[^>]*>/g);
    console.log(`\n[Layout] defRPr elements: ${layoutDefRPr?.length ?? 0}`);
    if (layoutDefRPr) {
      for (const m of layoutDefRPr) {
        if (m.includes("cap=")) {
          console.log(`  ${m}`);
        }
      }
    }
  }

  // Master defRPr
  if (masterXml) {
    const masterDefRPr = masterXml.match(/<a:defRPr[^>]*>/g);
    console.log(`\n[Master] defRPr elements: ${masterDefRPr?.length ?? 0}`);
    if (masterDefRPr) {
      for (const m of masterDefRPr) {
        if (m.includes("cap=")) {
          console.log(`  ${m}`);
        }
      }
    }
  }

  // Check for lstStyle which contains text level styles
  console.log("\n" + "-".repeat(40));
  console.log("Checking lstStyle (list styles) for cap:");
  console.log("-".repeat(40));

  // Extract lstStyle sections that contain cap
  const extractLstStyleCaps = (xml: string, label: string) => {
    const lstStylePattern = /<p:txBody>[\s\S]*?<a:lstStyle>([\s\S]*?)<\/a:lstStyle>/g;
    let match;
    let found = false;
    while ((match = lstStylePattern.exec(xml)) !== null) {
      const content = match[1];
      if (content.includes("cap=")) {
        console.log(`\n[${label}] lstStyle with cap:`);
        // Extract the specific level that has cap
        const levelPattern = /<a:lvl(\d+)pPr[^>]*>([\s\S]*?)<\/a:lvl\1pPr>/g;
        let levelMatch;
        while ((levelMatch = levelPattern.exec(content)) !== null) {
          if (levelMatch[2].includes("cap=")) {
            const capMatch = levelMatch[2].match(/cap="([^"]+)"/);
            console.log(`  Level ${levelMatch[1]}: cap="${capMatch?.[1]}"`);
            found = true;
          }
        }
      }
    }
    if (!found) {
      console.log(`\n[${label}] No cap in lstStyle`);
    }
  };

  extractLstStyleCaps(slideXml, "Slide");
  if (layoutXml) {extractLstStyleCaps(layoutXml, "Layout");}
  if (masterXml) {extractLstStyleCaps(masterXml, "Master");}

  // Check bodyPr for title placeholder
  console.log("\n" + "-".repeat(40));
  console.log("Title placeholder analysis:");
  console.log("-".repeat(40));

  // Find title shape in slide
  const titleShapePattern = /<p:sp>[\s\S]*?<p:ph[^>]*type="title"[^>]*\/>[\s\S]*?<\/p:sp>/;
  const titleMatch = slideXml.match(titleShapePattern);
  if (titleMatch) {
    console.log("\nTitle shape found in slide");
    const titleContent = titleMatch[0];

    // Check for cap in title shape
    const capInTitle = titleContent.match(/cap="([^"]+)"/);
    console.log(`  Direct cap attribute: ${capInTitle ? capInTitle[0] : "none"}`);

    // Check defRPr in title
    const defRPrInTitle = titleContent.match(/<a:defRPr[^>]*>/g);
    console.log(`  defRPr elements: ${defRPrInTitle?.length ?? 0}`);
    if (defRPrInTitle) {
      for (const d of defRPrInTitle) {
        console.log(`    ${d}`);
      }
    }
  } else {
    console.log("\nNo title placeholder found in slide XML");
  }

  // Check master for title style with cap
  if (masterXml) {
    console.log("\n" + "-".repeat(40));
    console.log("Master title style (p:titleStyle):");
    console.log("-".repeat(40));

    const titleStylePattern = /<p:titleStyle>([\s\S]*?)<\/p:titleStyle>/;
    const titleStyleMatch = masterXml.match(titleStylePattern);
    if (titleStyleMatch) {
      const titleStyleContent = titleStyleMatch[1];
      console.log("\nFound p:titleStyle in master");

      // Check each level
      const levelPattern = /<a:lvl(\d+)pPr[^>]*>([\s\S]*?)<\/a:lvl\1pPr>/g;
      let levelMatch;
      while ((levelMatch = levelPattern.exec(titleStyleContent)) !== null) {
        const level = levelMatch[1];
        const content = levelMatch[2];
        const defRPr = content.match(/<a:defRPr[^>]*>/);
        console.log(`  Level ${level}:`);
        if (defRPr) {
          console.log(`    defRPr: ${defRPr[0]}`);
          const capMatch = defRPr[0].match(/cap="([^"]+)"/);
          if (capMatch) {
            console.log(`    CAP FOUND: ${capMatch[0]}`);
          }
        }
      }
    } else {
      console.log("No p:titleStyle found in master");
    }
  }

  console.log("\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
