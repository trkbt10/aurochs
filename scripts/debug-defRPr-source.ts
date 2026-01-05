/**
 * Debug script to trace where defRPr comes from
 */

import { openPresentation, type PresentationFile } from "../src/pptx";
import { parseXml, getByPath, getChild, getChildren } from "../src/xml";
import type { ZipFile } from "../src/pptx/core/types";
import { loadPptxFileBundle } from "./lib/pptx-loader";

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

async function loadPptxFile(filePath: string): Promise<{ pf: PresentationFile; cache: FileCache; zip: ZipFile }> {
  const { cache, presentationFile } = await loadPptxFileBundle(filePath);

  const zip: ZipFile = {
    file(path: string) {
      const data = cache.get(path);
      if (!data) {return null;}
      return {
        async: async (type: string) => type === "arraybuffer" ? data.buffer : data.text,
      };
    },
  };

  return { pf: presentationFile, cache, zip };
}

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const { pf, cache } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(pf);
  const slide = presentation.getSlide(1);

  const layoutXml = cache.get("ppt/slideLayouts/slideLayout1.xml")?.text;
  const masterXml = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;

  if (!layoutXml || !masterXml) {
    console.log("Missing required XML files");
    return;
  }

  const layoutDoc = parseXml(layoutXml);
  const masterDoc = parseXml(masterXml);

  // Check layout placeholders
  console.log("=== Layout Placeholders ===");
  const layoutSpTree = getByPath(layoutDoc, ["p:sldLayout", "p:cSld", "p:spTree"]);
  if (layoutSpTree) {
    const shapes = getChildren(layoutSpTree, "p:sp");
    for (const sp of shapes) {
      const nvSpPr = getChild(sp, "p:nvSpPr");
      const nvPr = nvSpPr ? getChild(nvSpPr, "p:nvPr") : undefined;
      const ph = nvPr ? getChild(nvPr, "p:ph") : undefined;
      const type = ph?.attrs?.type ?? "body";

      if (type === "ctrTitle" || type === "subTitle") {
        console.log(`\nLayout placeholder type: ${type}`);
        const txBody = getChild(sp, "p:txBody");
        if (txBody) {
          const lstStyle = getChild(txBody, "a:lstStyle");
          console.log("  lstStyle exists:", lstStyle !== undefined);
          if (lstStyle) {
            const lvl1pPr = getChild(lstStyle, "a:lvl1pPr");
            console.log("  a:lvl1pPr exists:", lvl1pPr !== undefined);
            if (lvl1pPr) {
              const defRPr = getChild(lvl1pPr, "a:defRPr");
              console.log("  a:defRPr exists:", defRPr !== undefined);
              if (defRPr) {
                console.log("  defRPr attrs:", defRPr.attrs);
                const solidFill = getChild(defRPr, "a:solidFill");
                console.log("  solidFill exists:", solidFill !== undefined);
              }
            }
          }
        }
      }
    }
  }

  // Check master placeholders
  console.log("\n\n=== Master Placeholders ===");
  const masterSpTree = getByPath(masterDoc, ["p:sldMaster", "p:cSld", "p:spTree"]);
  if (masterSpTree) {
    const shapes = getChildren(masterSpTree, "p:sp");
    for (const sp of shapes) {
      const nvSpPr = getChild(sp, "p:nvSpPr");
      const nvPr = nvSpPr ? getChild(nvSpPr, "p:nvPr") : undefined;
      const ph = nvPr ? getChild(nvPr, "p:ph") : undefined;
      const type = ph?.attrs?.type ?? "body";

      if (type === "ctrTitle" || type === "subTitle" || type === "title") {
        console.log(`\nMaster placeholder type: ${type}`);
        const txBody = getChild(sp, "p:txBody");
        if (txBody) {
          const lstStyle = getChild(txBody, "a:lstStyle");
          console.log("  lstStyle exists:", lstStyle !== undefined);
          if (lstStyle) {
            const lvl1pPr = getChild(lstStyle, "a:lvl1pPr");
            console.log("  a:lvl1pPr exists:", lvl1pPr !== undefined);
            if (lvl1pPr) {
              const defRPr = getChild(lvl1pPr, "a:defRPr");
              console.log("  a:defRPr exists:", defRPr !== undefined);
              if (defRPr) {
                console.log("  defRPr attrs:", defRPr.attrs);
                const solidFill = getChild(defRPr, "a:solidFill");
                console.log("  solidFill exists:", solidFill !== undefined);
              }
            }
          }
        }
      }
    }
  }

  // Check actual index tables
  console.log("\n\n=== Index Tables (from API) ===");
  console.log("Layout byType keys:", Object.keys(slide.layoutTables.typeTable));
  console.log("Master byType keys:", Object.keys(slide.masterTables.typeTable));

  // Check the ctrTitle from layout
  const layoutCtrTitle = slide.layoutTables.typeTable["ctrTitle"];
  if (layoutCtrTitle) {
    console.log("\n\nLayout ctrTitle:");
    const txBody = getChild(layoutCtrTitle, "p:txBody");
    if (txBody) {
      const lstStyle = getChild(txBody, "a:lstStyle");
      console.log("  lstStyle exists:", lstStyle !== undefined);
      if (lstStyle) {
        const lvl1pPr = getChild(lstStyle, "a:lvl1pPr");
        console.log("  a:lvl1pPr exists:", lvl1pPr !== undefined);
        if (lvl1pPr) {
          const defRPr = getChild(lvl1pPr, "a:defRPr");
          console.log("  a:defRPr exists:", defRPr !== undefined);
          if (defRPr) {
            console.log("  defRPr attrs:", defRPr.attrs);
            const solidFill = getChild(defRPr, "a:solidFill");
            console.log("  solidFill exists:", solidFill !== undefined);
          }
        }
      }
    }
  }
}

main().catch(console.error);
