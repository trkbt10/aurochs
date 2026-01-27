/**
 * Debug script for 2411-Performance_Up.pptx slide 1 structure
 */

import { openPresentation } from "../src/pptx";
import { renderSlideToSvg } from "../src/pptx/render/svg";
import { parseXml } from "../src/xml";
import { loadPptxFile } from "./lib/pptx-loader";
import * as fs from "node:fs";

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const { presentationFile, cache } = await loadPptxFile(pptxPath);

  console.log("=== Files in PPTX ===");
  for (const [path] of cache) {
    if (path.includes("slide") || path.includes("media") || path.includes("theme")) {
      console.log(path);
    }
  }

  // Check slide1.xml
  const slide1Xml = cache.get("ppt/slides/slide1.xml")?.text;
  if (slide1Xml) {
    console.log("\n=== slide1.xml (first 2000 chars) ===");
    console.log(slide1Xml.substring(0, 2000));

    // Check for background
    console.log("\n=== Background in slide1 ===");
    console.log("Has p:bg:", slide1Xml.includes("p:bg"));
    console.log("Has a:blipFill:", slide1Xml.includes("a:blipFill"));
    console.log("Has a:blip:", slide1Xml.includes("a:blip"));
  }

  // Check slideLayout
  const slideLayoutXml = cache.get("ppt/slideLayouts/slideLayout1.xml")?.text;
  if (slideLayoutXml) {
    console.log("\n=== slideLayout1.xml background ===");
    console.log("Has p:bg:", slideLayoutXml.includes("p:bg"));
    console.log("Has a:blipFill:", slideLayoutXml.includes("a:blipFill"));
  }

  // Check slideMaster
  const slideMasterXml = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;
  if (slideMasterXml) {
    console.log("\n=== slideMaster1.xml background ===");
    console.log("Has p:bg:", slideMasterXml.includes("p:bg"));
    console.log("Has a:blipFill:", slideMasterXml.includes("a:blipFill"));

    // Extract background portion
    const bgMatch = slideMasterXml.match(/<p:bg[^>]*>[\s\S]*?<\/p:bg>/);
    if (bgMatch) {
      console.log("\nBackground element:");
      console.log(bgMatch[0]);
    }
  }

  // Check rels for slide1
  const slide1Rels = cache.get("ppt/slides/_rels/slide1.xml.rels")?.text;
  if (slide1Rels) {
    console.log("\n=== slide1.xml.rels ===");
    console.log(slide1Rels);
  }

  // Check rels for slideMaster
  const masterRels = cache.get("ppt/slideMasters/_rels/slideMaster1.xml.rels")?.text;
  if (masterRels) {
    console.log("\n=== slideMaster1.xml.rels (media refs) ===");
    const mediaLines = masterRels.split("\n").filter(l => l.includes("media") || l.includes("image"));
    console.log(mediaLines.join("\n"));
  }

  // Now render and check
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);

  console.log("\n=== Slide API data ===");
  console.log("masterRelationships keys:", Object.keys(slide.masterRelationships || {}));
  console.log("masterRelationships rId15:", slide.masterRelationships?.rId15);

  // Check slideMaster content structure
  console.log("\n=== slideMaster content structure ===");
  const masterContent = slide.master;
  if (masterContent) {
    console.log("masterContent type:", typeof masterContent);
    console.log("masterContent keys:", Object.keys(masterContent as object));
    // Check if it's XmlDocument format
    if ('children' in (masterContent as object)) {
      const children = (masterContent as { children: unknown[] }).children;
      console.log("masterContent is XmlDocument format");
      console.log("Root children:", children.map((c: unknown) => (c as { name?: string }).name || 'unknown').filter(Boolean));
    }
  }

  // Test getBackgroundFillData directly
  console.log("\n=== Testing getBackgroundFillData ===");
  // We need to create a mock warpObj to test
  // For now, just log that we need to check the background module

  // Render SVG
  const { svg } = renderSlideToSvg(slide);
  fs.writeFileSync("/tmp/slide1-debug.svg", svg);
  console.log("\n=== SVG saved to /tmp/slide1-debug.svg ===");
  console.log("SVG length:", svg.length);

  // Extract text content
  const textMatches = svg.match(/<text[^>]*>[\s\S]*?<\/text>/g) || [];
  console.log("\n=== Text elements in SVG ===");
  textMatches.forEach((t, i) => {
    console.log(`Text ${i + 1}:`, t.substring(0, 200));
  });
}

main().catch(console.error);
