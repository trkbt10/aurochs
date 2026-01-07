/**
 * Debug script for master text styles
 */

import { openPresentation } from "../src/pptx";
import { parseXml, getByPath, getChild } from "../src/xml";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const { presentationFile, cache } = await loadPptxFile(pptxPath);

  // Check master text styles XML directly
  const masterXml = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;
  if (masterXml) {
    console.log("=== Checking master text styles in raw XML ===");
    console.log("Has p:txStyles:", masterXml.includes("p:txStyles"));
    console.log("Has p:titleStyle:", masterXml.includes("p:titleStyle"));
    console.log("Has p:bodyStyle:", masterXml.includes("p:bodyStyle"));

    // Parse and check
    const masterDoc = parseXml(masterXml);
    console.log("\n=== Parsed master document ===");
    console.log("masterDoc.children length:", masterDoc.children.length);

    const txStyles = getByPath(masterDoc, ["p:sldMaster", "p:txStyles"]);
    console.log("txStyles exists:", txStyles !== undefined);

    if (txStyles) {
      console.log("\n=== Text Styles Structure ===");
      console.log("txStyles.name:", txStyles.name);
      console.log("txStyles.children:", txStyles.children.length);

      const titleStyle = getChild(txStyles, "p:titleStyle");
      console.log("\n=== Title Style ===");
      console.log("titleStyle exists:", titleStyle !== undefined);

      if (titleStyle) {
        console.log("titleStyle.children:", titleStyle.children.length);

        // Check level 1
        const lvl1pPr = getChild(titleStyle, "a:lvl1pPr");
        console.log("a:lvl1pPr exists:", lvl1pPr !== undefined);

        if (lvl1pPr) {
          const defRPr = getChild(lvl1pPr, "a:defRPr");
          console.log("a:defRPr exists:", defRPr !== undefined);

          if (defRPr) {
            console.log("defRPr attrs:", defRPr.attrs);
            console.log("defRPr children:", defRPr.children.map((c: any) => c.name || 'text'));

            // Check for solidFill
            const solidFill = getChild(defRPr, "a:solidFill");
            console.log("\n=== Solid Fill ===");
            console.log("solidFill exists:", solidFill !== undefined);

            if (solidFill) {
              console.log("solidFill children:", solidFill.children.map((c: any) => c.name || 'text'));
              const schemeClr = getChild(solidFill, "a:schemeClr");
              console.log("schemeClr exists:", schemeClr !== undefined);
              if (schemeClr) {
                console.log("schemeClr.attrs:", schemeClr.attrs);
              }
            }
          }
        }
      }

      const bodyStyle = getChild(txStyles, "p:bodyStyle");
      console.log("\n=== Body Style ===");
      console.log("bodyStyle exists:", bodyStyle !== undefined);

      if (bodyStyle) {
        const lvl1pPr = getChild(bodyStyle, "a:lvl1pPr");
        if (lvl1pPr) {
          const defRPr = getChild(lvl1pPr, "a:defRPr");
          if (defRPr) {
            const solidFill = getChild(defRPr, "a:solidFill");
            console.log("bodyStyle a:solidFill exists:", solidFill !== undefined);
            if (solidFill) {
              const schemeClr = getChild(solidFill, "a:schemeClr");
              if (schemeClr) {
                console.log("bodyStyle schemeClr.attrs:", schemeClr.attrs);
              }
            }
          }
        }
      }
    }
  }

  // Now check via the slide API
  console.log("\n\n=== Checking via Slide API ===");
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);

  console.log("masterTextStyles defined:", slide.masterTextStyles !== undefined);

  if (slide.masterTextStyles) {
    console.log("masterTextStyles.name:", (slide.masterTextStyles as any).name);
    console.log("masterTextStyles.children count:", (slide.masterTextStyles as any).children?.length);

    const titleStyle = getChild(slide.masterTextStyles, "p:titleStyle");
    console.log("titleStyle from slide.masterTextStyles:", titleStyle !== undefined);
  }
}

main().catch(console.error);
