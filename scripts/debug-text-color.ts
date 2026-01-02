/**
 * Debug script for text color resolution
 */

import * as fs from "node:fs";
import JSZip from "jszip";
import { openPresentation, type PresentationFile } from "../src/pptx";
import { parseXml, getByPath, getChild, getChildren, isXmlElement } from "../src/xml";
import { createSlideRenderContextFromWarp } from "../src/pptx/core/context/factory";
import type { WarpObject, ZipFile } from "../src/pptx/core/types";

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

async function loadPptxFile(filePath: string): Promise<{ pf: PresentationFile; cache: FileCache; zip: ZipFile }> {
  const pptxBuffer = fs.readFileSync(filePath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache: FileCache = new Map();
  const files = Object.keys(jszip.files);

  for (const fp of files) {
    const file = jszip.file(fp);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(fp, { text, buffer });
    }
  }

  const pf: PresentationFile = {
    readText(fp: string): string | null {
      return cache.get(fp)?.text ?? null;
    },
    readBinary(fp: string): ArrayBuffer | null {
      return cache.get(fp)?.buffer ?? null;
    },
    exists(fp: string): boolean {
      return cache.has(fp);
    },
  };

  const zip: ZipFile = {
    file(path: string) {
      const data = cache.get(path);
      if (!data) {return null;}
      return {
        async: async (type: string) => type === "arraybuffer" ? data.buffer : data.text,
      };
    },
  };

  return { pf, cache, zip };
}

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const { pf, cache, zip } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(pf);
  const slide = presentation.getSlide(1);

  // Get slide content
  const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
  const masterXml = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;
  const layoutXml = cache.get("ppt/slideLayouts/slideLayout1.xml")?.text;
  const themeXml = cache.get("ppt/theme/theme1.xml")?.text;

  if (!slideXml || !masterXml || !themeXml) {
    console.log("Missing required XML files");
    return;
  }

  const slideDoc = parseXml(slideXml);
  const masterDoc = parseXml(masterXml);
  const layoutDoc = layoutXml ? parseXml(layoutXml) : null;
  const themeDoc = parseXml(themeXml);

  // Build warpObj similar to what the actual rendering does
  const warpObj: WarpObject = {
    zip,
    slideContent: slideDoc,
    slideLayoutContent: layoutDoc,
    slideLayoutTables: slide.layoutTables,
    slideMasterContent: masterDoc,
    slideMasterTables: slide.masterTables,
    slideMasterTextStyles: slide.masterTextStyles,
    slideResObj: slide.relationships,
    layoutResObj: slide.layoutRelationships,
    masterResObj: slide.masterRelationships,
    themeContent: themeDoc,
    themeResObj: slide.themeRelationships,
    digramFileContent: null,
    diagramResObj: {},
    defaultTextStyle: null,
  };

  // Create context
  const slideRenderCtx = createSlideRenderContextFromWarp(warpObj);

  console.log("=== Examining shapes in slide ===");

  // Get shapes from slide
  const spTree = getByPath(slideDoc, ["p:sld", "p:cSld", "p:spTree"]);
  if (!spTree) {
    console.log("No spTree found");
    return;
  }

  const shapes = getChildren(spTree, "p:sp");
  console.log(`Found ${shapes.length} shapes\n`);

  for (let i = 0; i < shapes.length; i++) {
    const sp = shapes[i];
    const nvSpPr = getChild(sp, "p:nvSpPr");
    const nvPr = nvSpPr ? getChild(nvSpPr, "p:nvPr") : undefined;
    const ph = nvPr ? getChild(nvPr, "p:ph") : undefined;

    const type = ph?.attrs?.type ?? "body";
    const idx = ph?.attrs?.idx;

    const cNvPr = nvSpPr ? getChild(nvSpPr, "p:cNvPr") : undefined;
    const shapeName = cNvPr?.attrs?.name ?? "Unknown";

    console.log(`=== Shape ${i + 1}: ${shapeName} ===`);
    console.log(`  type: ${type}`);
    console.log(`  idx: ${idx ?? "none"}`);

    // Create shape context
    const shapeCtx = slideRenderCtx.forShape(type, idx);
    const paraCtx = shapeCtx.forParagraph(1);

    console.log(`  Shape context type: ${shapeCtx.type}`);

    // Check getDefRPr
    const defRPr = paraCtx.getDefRPr(undefined);
    console.log(`  defRPr exists: ${defRPr !== undefined}`);

    if (defRPr) {
      console.log(`  defRPr attrs: ${JSON.stringify(defRPr.attrs)}`);
      const solidFill = getChild(defRPr, "a:solidFill");
      console.log(`  solidFill exists: ${solidFill !== undefined}`);
      if (solidFill) {
        const srgbClr = getChild(solidFill, "a:srgbClr");
        const schemeClr = getChild(solidFill, "a:schemeClr");
        console.log(`  srgbClr: ${srgbClr?.attrs?.val ?? "none"}`);
        console.log(`  schemeClr: ${schemeClr?.attrs?.val ?? "none"}`);
      }
    }

    // Get text body to check text runs
    const txBody = getChild(sp, "p:txBody");
    if (txBody) {
      const paragraphs = getChildren(txBody, "a:p");
      console.log(`  paragraphs: ${paragraphs.length}`);

      for (const p of paragraphs) {
        const runs = getChildren(p, "a:r");
        for (const run of runs) {
          const t = getChild(run, "a:t");
          const text = t?.children[0];
          const textValue = typeof text === "object" && "value" in text ? text.value : "";
          console.log(`  Text: "${textValue}"`);

          // Check direct rPr on the run
          const rPr = getChild(run, "a:rPr");
          console.log(`  Direct rPr exists: ${rPr !== undefined}`);
          if (rPr) {
            const solidFill = getChild(rPr, "a:solidFill");
            console.log(`  Direct solidFill exists: ${solidFill !== undefined}`);
          }
        }
      }
    }

    console.log("");
  }

  // Also check master text styles directly
  console.log("\n=== Master Text Styles in context ===");
  console.log("titleStyle exists:", slideRenderCtx.master.textStyles.titleStyle !== undefined);
  console.log("bodyStyle exists:", slideRenderCtx.master.textStyles.bodyStyle !== undefined);

  if (slideRenderCtx.master.textStyles.titleStyle) {
    const lvl1pPr = getChild(slideRenderCtx.master.textStyles.titleStyle, "a:lvl1pPr");
    const defRPr = lvl1pPr ? getChild(lvl1pPr, "a:defRPr") : undefined;
    console.log("titleStyle a:lvl1pPr exists:", lvl1pPr !== undefined);
    console.log("titleStyle a:defRPr exists:", defRPr !== undefined);

    if (defRPr) {
      const solidFill = getChild(defRPr, "a:solidFill");
      const srgbClr = solidFill ? getChild(solidFill, "a:srgbClr") : undefined;
      console.log("titleStyle color:", srgbClr?.attrs?.val ?? "none");
    }
  }
}

main().catch(console.error);
