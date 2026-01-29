/**
 * Debug tool: Investigate background color processing
 *
 * Usage: bun run scripts/debug/debug-background.ts <pptx-path> <slide-number>
 */
import { DEFAULT_RENDER_OPTIONS, openPresentation } from "@oxen-office/pptx";
import type { Slide } from "@oxen-office/pptx/app/types";
import { getBackgroundFillData, getSolidFill, getSchemeColorFromTheme, parseTheme, parseMasterTextStyles } from "@oxen-office/pptx/parser/drawing-ml/index";
import { createSlideContext, type SlideContext } from "@oxen-office/pptx/parser/slide/context";
import { createPlaceholderTable, createColorMap } from "@oxen-office/pptx/parser/slide/resource-adapters";
import { toResolvedBackgroundFill } from "@oxen-renderer/pptx";
import { getTextByPathList, getNode, getString } from "@oxen-office/pptx/parser/traverse";
import { isXmlDocument, isXmlElement, getChild, getByPath, type XmlElement } from "@oxen/xml";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

function buildSlideContextFromSlide(slide: Slide): SlideContext {
  const slideContent = getByPath(slide.content, ["p:sld"]);
  if (!isXmlElement(slideContent)) {
    throw new Error("Failed to locate slide root element (p:sld).");
  }

  const masterClrMapNode = getByPath(slide.master, ["p:sldMaster", "p:clrMap"]);
  if (!isXmlElement(masterClrMapNode)) {
    throw new Error("Failed to locate master color map (p:clrMap).");
  }

  const slideClrMapOvrNode = getByPath(slide.content, ["p:sld", "p:clrMapOvr", "a:overrideClrMapping"]);
  const slideClrMapOvr = isXmlElement(slideClrMapOvrNode) ? slideClrMapOvrNode : undefined;

  const layoutContentNode = getByPath(slide.layout, ["p:sldLayout"]);
  const layoutContent = isXmlElement(layoutContentNode) ? layoutContentNode : undefined;

  const masterContentNode = getByPath(slide.master, ["p:sldMaster"]);
  const masterContent = isXmlElement(masterContentNode) ? masterContentNode : undefined;

  const masterTextStyles = isXmlElement(slide.masterTextStyles) ? slide.masterTextStyles : undefined;
  const defaultTextStyle = isXmlElement(slide.defaultTextStyle) ? slide.defaultTextStyle : null;

  const slideParams = {
    content: slideContent,
    resources: slide.relationships,
    colorMapOverride: slideClrMapOvr !== undefined ? createColorMap(slideClrMapOvr as XmlElement) : undefined,
  };

  const layout = {
    placeholders: createPlaceholderTable(slide.layoutTables),
    resources: slide.layoutRelationships,
    content: layoutContent,
  };

  const master = {
    textStyles: parseMasterTextStyles(masterTextStyles),
    placeholders: createPlaceholderTable(slide.masterTables),
    colorMap: createColorMap(masterClrMapNode as XmlElement),
    resources: slide.masterRelationships,
    content: masterContent,
  };

  const theme = parseTheme(slide.theme, slide.themeOverrides);

  const presentation = {
    theme,
    defaultTextStyle,
    zip: slide.zip,
    renderOptions: slide.renderOptions ?? DEFAULT_RENDER_OPTIONS,
    themeResources: slide.themeRelationships,
    tableStyles: slide.tableStyles ?? undefined,
  };

  return createSlideContext(slideParams, layout, master, presentation);
}

async function main() {
  const usage = "bun run scripts/debug/debug-background.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg(args, 0, "pptx-path", usage);
  const slideNumber = requireIntArg(args[1], "slide-number", usage);
  requireFileExists(pptxPath, usage);

  console.log(`Debugging background in: ${pptxPath}\n`);

  const { presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(slideNumber);
  const slideContext = buildSlideContextFromSlide(slide);

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
  } else if (warpObj.themeContent && isXmlDocument(warpObj.themeContent)) {
    console.log("themeContent is XmlDocument");
    const root = warpObj.themeContent.children.find(isXmlElement);
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
  console.log("\n=== getBackgroundFillData Result ===");
  const bgData = getBackgroundFillData(slideContext);
  console.log("Result:", bgData);

  console.log("\n=== toResolvedBackgroundFill Result ===");
  const resolved = toResolvedBackgroundFill(bgData);
  console.log("Result:", resolved);
}

main().catch(console.error);
