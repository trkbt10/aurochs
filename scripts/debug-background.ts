/**
 * Debug tool: Investigate background color processing
 *
 * Usage: bun run scripts/debug-background.ts [pptx-file]
 */
import { openPresentation } from "../src/pptx";
import { getSlideBackgroundFill, getBackgroundFillData } from "../src/pptx/render/drawing-ml";
import { getTextByPathList, getNode, getString } from "../src/pptx/parser/traverse";
import { getSolidFill, getSchemeColorFromTheme } from "../src/pptx/parser/drawing-ml";
import { isXmlElement, getChild, getChildren, getByPath } from "../src/xml";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = process.argv[2] || "fixtures/poi-test-data/test-data/slideshow/60810.pptx";

  console.log(`Debugging background in: ${pptxPath}\n`);

  const { presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);

  // Build warpObj from slide properties (matching factory.ts buildWarpObject)
  const warpObj = {
    zip: presentationFile,
    slideContent: slide.content,
    slideLayoutContent: slide.layout,
    slideLayoutTables: slide.layoutTables,
    slideMasterContent: slide.master,
    slideMasterTables: slide.masterTables,
    slideMasterTextStyles: slide.masterTextStyles,
    slideResObj: slide.relationships,
    layoutResObj: slide.layoutRelationships,
    masterResObj: slide.masterRelationships,
    themeContent: slide.theme,
    themeResObj: slide.themeRelationships,
    digramFileContent: slide.diagram,
    diagramResObj: slide.diagramRelationships,
    defaultTextStyle: null,
  };

  console.log("=== WarpObject Contents ===");
  console.log("slideContent:", warpObj.slideContent ? "present" : "null");
  console.log("slideLayoutContent:", warpObj.slideLayoutContent ? "present" : "null");
  console.log("slideMasterContent:", warpObj.slideMasterContent ? "present" : "null");
  console.log("themeContent:", warpObj.themeContent ? "present" : "null");

  // Check slide background path
  console.log("\n=== Background Path Resolution ===");
  const slideBgPr = getTextByPathList(warpObj.slideContent, ["p:sld", "p:cSld", "p:bg", "p:bgPr"]);
  console.log("Slide bgPr:", slideBgPr ? "found" : "not found");

  const layoutBgPr = getTextByPathList(warpObj.slideLayoutContent, ["p:sldLayout", "p:cSld", "p:bg", "p:bgPr"]);
  console.log("Layout bgPr:", layoutBgPr ? "found" : "not found");

  const masterBgPr = getTextByPathList(warpObj.slideMasterContent, ["p:sldMaster", "p:cSld", "p:bg", "p:bgPr"]);
  console.log("Master bgPr:", masterBgPr ? "found" : "not found");

  // Check the actual master content structure
  console.log("\n=== SlideMaster Content Structure ===");
  if (warpObj.slideMasterContent) {
    const root = warpObj.slideMasterContent;
    if (isXmlElement(root)) {
      console.log("Root element:", root.name);
    } else if (root.children) {
      const firstChild = root.children.find(isXmlElement);
      console.log("First child:", firstChild?.name);
      if (firstChild && isXmlElement(firstChild)) {
        const cSld = getChild(firstChild, "p:cSld");
        if (cSld) {
          console.log("Found p:cSld");
          const bg = getChild(cSld, "p:bg");
          if (bg) {
            console.log("Found p:bg");
            const bgPr = getChild(bg, "p:bgPr");
            if (bgPr) {
              console.log("Found p:bgPr");
              console.log("bgPr children:", bgPr.children.filter(isXmlElement).map(c => c.name));

              const solidFill = getChild(bgPr, "a:solidFill");
              if (solidFill) {
                console.log("\nFound a:solidFill:");
                console.log(JSON.stringify(solidFill, null, 2));

                // Try to resolve the color
                console.log("\n=== Color Resolution ===");
                const color = getSolidFill(solidFill, undefined, undefined, warpObj);
                console.log("Resolved color:", color);
              }
            }
          }
        }
      }
    }
  }

  // Check theme color scheme
  console.log("\n=== Theme Color Scheme ===");
  const clrScheme = getTextByPathList(warpObj.themeContent, ["a:theme", "a:themeElements", "a:clrScheme"]);
  if (clrScheme && isXmlElement(clrScheme)) {
    console.log("Color scheme name:", clrScheme.attrs.name);
    for (const child of clrScheme.children) {
      if (isXmlElement(child)) {
        const innerChild = child.children.find(isXmlElement);
        if (innerChild) {
          console.log(`  ${child.name}: ${innerChild.name} = ${JSON.stringify(innerChild.attrs)}`);
        }
      }
    }
  }

  // Test getSchemeColorFromTheme directly
  console.log("\n=== Testing getSchemeColorFromTheme ===");
  const schemeResult = getSchemeColorFromTheme("a:bg1", undefined, undefined, warpObj);
  console.log("getSchemeColorFromTheme('a:bg1'):", schemeResult);

  // Test getNode on theme content
  console.log("\n=== Testing getNode on theme ===");
  const lt1Node = getNode(warpObj.themeContent, ["a:theme", "a:themeElements", "a:clrScheme", "a:lt1"]);
  console.log("getNode for a:lt1:", lt1Node ? "found" : "not found");
  if (lt1Node) {
    console.log("lt1Node:", JSON.stringify(lt1Node, null, 2));
    const srgbVal = getString(lt1Node, ["a:srgbClr", "attrs", "val"]);
    console.log("srgbClr val:", srgbVal);
    const sysClrVal = getString(lt1Node, ["a:sysClr", "attrs", "lastClr"]);
    console.log("sysClr lastClr:", sysClrVal);
  }

  // Test using XmlElement functions directly
  console.log("\n=== Testing with XmlElement functions ===");
  if (warpObj.themeContent && isXmlElement(warpObj.themeContent)) {
    console.log("themeContent is XmlElement");
  } else if (warpObj.themeContent && (warpObj.themeContent as any).children) {
    console.log("themeContent is XmlDocument");
    const root = (warpObj.themeContent as any).children?.find?.(isXmlElement);
    if (root) {
      const themeElements = getChild(root, "a:themeElements");
      if (themeElements) {
        const clrScheme = getChild(themeElements, "a:clrScheme");
        if (clrScheme) {
          const lt1 = getChild(clrScheme, "a:lt1");
          console.log("lt1 via XmlElement:", lt1 ? "found" : "not found");
          if (lt1) {
            const sysClr = getChild(lt1, "a:sysClr");
            if (sysClr) {
              console.log("sysClr.attrs:", sysClr.attrs);
            }
          }
        }
      }
    }
  }

  // Now try the actual background fill function
  console.log("\n=== getSlideBackgroundFill Result ===");
  const bgFill = getSlideBackgroundFill(warpObj);
  console.log("Result:", bgFill);

  console.log("\n=== getBackgroundFillData Result ===");
  const bgData = getBackgroundFillData(warpObj);
  console.log("Result:", bgData);
}

main().catch(console.error);
