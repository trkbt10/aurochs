/**
 * @file Text centering and color tests
 *
 * Investigates issues with text alignment and color in 2411-Performance_Up.pptx
 */

import { loadPptxFileBundle } from "../../../../scripts/lib/pptx-loader";
import { parseXml, getChild, getByPath } from "../../../xml";
import { parseSlide } from "../../parser/slide/slide-parser";
import { openPresentation } from "../../index";
import type { ParseContext } from "../../parser/context";
import type { SpShape } from "../../domain";
import type { FieldRun, RegularRun } from "../../domain/text";

async function loadPptx(pptxPath: string) {
  const { cache, presentationFile } = await loadPptxFileBundle(pptxPath);
  return { cache, presentationFile };
}

describe("text-centering-and-color", () => {
  it("parses paragraph alignment from 2411-Performance_Up slide1", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    const { cache } = await loadPptx(pptxPath);

    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    expect(slideXml).toBeDefined();

    const doc = parseXml(slideXml!);

    // Minimal parse context
    const parseCtx: ParseContext = {
      colorContext: { colorScheme: {}, colorMap: {} },
      placeholderContext: {
        layout: { byIdx: new Map(), byType: {} },
        master: { byIdx: new Map(), byType: {} },
      },
      masterStylesInfo: {
        masterTextStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
        defaultTextStyle: undefined,
      },
      slideResources: { getTarget: () => undefined, getType: () => undefined },
      layoutResources: { getTarget: () => undefined, getType: () => undefined },
      masterResources: { getTarget: () => undefined, getType: () => undefined },
      themeContent: undefined,
    };

    const slide = parseSlide(doc, parseCtx);
    expect(slide).toBeDefined();

    console.log("\n=== Slide 1 Text Analysis ===");

    for (const shape of slide!.shapes) {
      if (shape.type === "sp" && shape.textBody) {
        const textBody = shape.textBody;
        console.log(`\nShape: ${shape.nonVisual.name} (placeholder: ${shape.placeholder?.type})`);

        for (let i = 0; i < textBody.paragraphs.length; i++) {
          const para = textBody.paragraphs[i];
          const runsWithText = para.runs.filter(
            (run): run is RegularRun | FieldRun => run.type === "text" || run.type === "field",
          );
          const textContent = runsWithText.map((run) => run.text).join("");

          console.log(`  Paragraph ${i}:`);
          console.log(`    Text: "${textContent.slice(0, 50)}..."`);
          console.log(`    Alignment: ${para.properties?.alignment ?? "NOT SET"}`);

          // Check run colors
          for (const run of para.runs) {
            if (run.type === "text" && run.properties?.fill) {
              console.log(`    Run fill: ${JSON.stringify(run.properties.fill)}`);
            }
          }
        }
      }
    }
  });

  it("checks parsed alignment with proper context", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    const { cache } = await loadPptx(pptxPath);

    // Load XML documents
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    const masterXml = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;

    const slideDoc = parseXml(slideXml!);
    const masterDoc = parseXml(masterXml!);

    // Get master text styles
    const masterTxStyles = getByPath(masterDoc, ["p:sldMaster", "p:txStyles"]);
    const titleStyle = masterTxStyles ? getChild(masterTxStyles, "p:titleStyle") : undefined;
    const bodyStyle = masterTxStyles ? getChild(masterTxStyles, "p:bodyStyle") : undefined;
    const otherStyle = masterTxStyles ? getChild(masterTxStyles, "p:otherStyle") : undefined;

    console.log("\n=== Master Text Styles Check ===");
    console.log("titleStyle present:", !!titleStyle);
    const lvl1pPr = titleStyle ? getChild(titleStyle, "a:lvl1pPr") : undefined;
    console.log("titleStyle lvl1pPr algn:", lvl1pPr?.attrs?.algn);

    // Create full ParseContext with master text styles
    const parseCtx: ParseContext = {
      colorContext: { colorScheme: {}, colorMap: {} },
      placeholderContext: {
        layout: { byIdx: new Map(), byType: {} },
        master: { byIdx: new Map(), byType: {} },
      },
      masterStylesInfo: {
        masterTextStyles: { titleStyle, bodyStyle, otherStyle },
        defaultTextStyle: undefined,
      },
      slideResources: { getTarget: () => undefined, getType: () => undefined },
      layoutResources: { getTarget: () => undefined, getType: () => undefined },
      masterResources: { getTarget: () => undefined, getType: () => undefined },
      themeContent: undefined,
    };

    // Parse slide with proper context
    const slide = parseSlide(slideDoc, parseCtx);
    expect(slide).toBeDefined();

    console.log("\n=== Parsed Alignment Results ===");
    for (const shape of slide!.shapes) {
      if (shape.type === "sp" && shape.textBody) {
        const textBody = shape.textBody;
        console.log(`\nShape: ${shape.nonVisual.name} (placeholder: ${shape.placeholder?.type})`);
        for (let i = 0; i < textBody.paragraphs.length; i++) {
          const para = textBody.paragraphs[i];
          console.log(`  Paragraph ${i} alignment: ${para.properties?.alignment}`);
          if (para.runs.length > 0 && para.runs[0].type === "text") {
            const run = para.runs[0];
            console.log(`  First run color: ${JSON.stringify(run.properties?.color)}`);
          }
        }
      }
    }

    // ctrTitle should have center alignment (inherited from master titleStyle)
    const ctrTitleShape = slide!.shapes.find(
      (s) => s.type === "sp" && (s as SpShape).placeholder?.type === "ctrTitle",
    ) as SpShape | undefined;
    expect(ctrTitleShape).toBeDefined();
    expect(ctrTitleShape!.textBody?.paragraphs[0]?.properties?.alignment).toBe("center");
  });

  it("verifies text color inheritance in SVG", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    const { presentationFile } = await loadPptx(pptxPath);

    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = slide.renderSVG();

    // The title text should have the inherited color #276288 from master titleStyle
    const hasBlueTitle = svg.includes('fill="#276288"');
    expect(hasBlueTitle).toBe(true);
  });

  it("checks SVG output for text-anchor attribute", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    const { presentationFile } = await loadPptx(pptxPath);

    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = slide.renderSVG();

    // Check for text-anchor in SVG
    const hasTextAnchorMiddle = svg.includes('text-anchor="middle"');
    const hasTextAnchorStart = svg.includes('text-anchor="start"');
    const hasTextAnchorEnd = svg.includes('text-anchor="end"');

    console.log("\n=== SVG Text Anchor Analysis ===");
    console.log(`text-anchor="middle": ${hasTextAnchorMiddle}`);
    console.log(`text-anchor="start": ${hasTextAnchorStart}`);
    console.log(`text-anchor="end": ${hasTextAnchorEnd}`);

    // Check for fill colors in text elements
    const blueTextMatch = svg.match(/fill="#[0-9a-fA-F]{6}"[^>]*>[^<]*Apache/);
    console.log(`\nBlue text for "Apache": ${blueTextMatch ? "Found" : "NOT FOUND"}`);

    // Extract a sample of text element
    const textMatch = svg.match(/<text[^>]*>Apache[^<]*/);
    if (textMatch) {
      console.log(`\nSample text element:\n${textMatch[0]}`);
    }

    // For now, just log - we'll add assertions after understanding the issue
    expect(svg.length).toBeGreaterThan(0);
  });

  it("checks raw XML for alignment attributes", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    const { cache } = await loadPptx(pptxPath);

    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;

    console.log("\n=== Raw XML Alignment Check ===");

    // Check for algn attribute in paragraphs
    const algnMatches = slideXml!.match(/algn="[^"]+"/g);
    console.log(`Alignment attributes found: ${JSON.stringify(algnMatches)}`);

    // Check for schemeClr (theme colors)
    const schemeClrMatches = slideXml!.match(/<a:schemeClr[^>]+>/g);
    console.log(`\nScheme colors found: ${schemeClrMatches?.slice(0, 5).join("\n")}`);
  });

  it("checks layout and master for text style inheritance", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    const { cache } = await loadPptx(pptxPath);

    // Find slide1's layout via relationships
    const slideRels = cache.get("ppt/slides/_rels/slide1.xml.rels")?.text;
    console.log("\n=== Slide1 Relationships ===");
    const layoutMatch = slideRels?.match(/Target="([^"]+slideLayout[^"]+)"/);
    console.log(`Layout: ${layoutMatch?.[1]}`);

    // Read layout
    const layoutPath = layoutMatch?.[1]?.replace("../", "ppt/");
    const layoutXml = layoutPath ? cache.get(layoutPath)?.text : undefined;

    // Check layout for alignment
    const layoutAlgnMatches = layoutXml?.match(/algn="[^"]+"/g);
    console.log(`\nLayout alignment attributes: ${JSON.stringify(layoutAlgnMatches)}`);

    // Find master via layout relationships
    const layoutRelsPath = layoutPath
      ? layoutPath.replace(".xml", ".xml.rels").replace("slideLayouts/", "slideLayouts/_rels/")
      : undefined;
    const layoutRels = layoutRelsPath ? cache.get(layoutRelsPath)?.text : undefined;
    const masterMatch = layoutRels?.match(/Target="([^"]+slideMaster[^"]+)"/);
    console.log(`Master: ${masterMatch?.[1]}`);

    // Read master
    const masterPath = masterMatch?.[1]?.replace("../", "ppt/");
    const masterXml = masterPath ? cache.get(masterPath)?.text : undefined;

    // Check master for titleStyle alignment
    console.log("\n=== Master titleStyle ===");
    const titleStyleMatch = masterXml?.match(/<p:titleStyle>[\s\S]*?<\/p:titleStyle>/);
    if (titleStyleMatch) {
      const titleAlgn = titleStyleMatch[0].match(/algn="([^"]+)"/g);
      console.log(`Title style alignments: ${JSON.stringify(titleAlgn)}`);

      // Check for scheme colors in title style
      const titleSchemeClr = titleStyleMatch[0].match(/<a:schemeClr[^>]+>/g);
      console.log(`Title style scheme colors: ${titleSchemeClr?.join(", ")}`);
    }

    // Check theme for color scheme
    const themeXml = cache.get("ppt/theme/theme1.xml")?.text;
    console.log("\n=== Theme Color Scheme ===");
    const dk1Match = themeXml?.match(/<a:dk1>[\s\S]*?<\/a:dk1>/);
    const dk2Match = themeXml?.match(/<a:dk2>[\s\S]*?<\/a:dk2>/);
    const lt1Match = themeXml?.match(/<a:lt1>[\s\S]*?<\/a:lt1>/);
    const lt2Match = themeXml?.match(/<a:lt2>[\s\S]*?<\/a:lt2>/);
    console.log(`dk1: ${dk1Match?.[0]?.slice(0, 100)}`);
    console.log(`dk2: ${dk2Match?.[0]?.slice(0, 100)}`);
    console.log(`lt1: ${lt1Match?.[0]?.slice(0, 100)}`);
    console.log(`lt2: ${lt2Match?.[0]?.slice(0, 100)}`);

    // Check layout for ctrTitle placeholder style
    console.log("\n=== Layout ctrTitle Placeholder ===");
    const ctrTitleMatch = layoutXml?.match(/<p:sp[^>]*>[\s\S]*?<p:ph type="ctrTitle"[^>]*\/>[\s\S]*?<\/p:sp>/);
    if (ctrTitleMatch) {
      console.log("Found ctrTitle placeholder");
      const solidFillMatch = ctrTitleMatch[0].match(/<a:solidFill>[\s\S]*?<\/a:solidFill>/g);
      console.log(`Solid fills: ${solidFillMatch?.join("\n")}`);
      const schemeClrMatch = ctrTitleMatch[0].match(/<a:schemeClr[^>]*val="([^"]+)"[^>]*>/g);
      console.log(`Scheme colors: ${schemeClrMatch?.join(", ")}`);
    }

    // Check master body/title style for color
    console.log("\n=== Master bodyStyle ===");
    const bodyStyleMatch = masterXml?.match(/<p:bodyStyle>[\s\S]*?<\/p:bodyStyle>/);
    if (bodyStyleMatch) {
      const bodySchemeClr = bodyStyleMatch[0].match(/<a:schemeClr[^>]*val="([^"]+)"[^>]*>/g);
      console.log(`Body style scheme colors: ${bodySchemeClr?.join(", ")}`);
    }

    // Check colorMap in master
    console.log("\n=== Master Color Map ===");
    const clrMapMatch = masterXml?.match(/<p:clrMap[^>]+>/);
    console.log(`Color map: ${clrMapMatch?.[0]}`);

    // Print full layout ctrTitle shape
    console.log("\n=== Full Layout ctrTitle XML ===");
    if (ctrTitleMatch) {
      // Find all a:rPr (run properties) with colors
      const rPrMatches = ctrTitleMatch[0].match(/<a:rPr[^>]*>[\s\S]*?<\/a:rPr>/g) ?? [];
      console.log(`Run properties found: ${rPrMatches.length}`);
      rPrMatches.forEach((rPr, i) => {
        console.log(`  rPr ${i}: ${rPr.slice(0, 200)}`);
      });

      // Find all a:defRPr (default run properties)
      const defRPrMatches = ctrTitleMatch[0].match(/<a:defRPr[^>]*>[\s\S]*?<\/a:defRPr>/g) ?? [];
      console.log(`\nDefault run properties found: ${defRPrMatches.length}`);
      defRPrMatches.forEach((defRPr, i) => {
        console.log(`  defRPr ${i}: ${defRPr.slice(0, 300)}`);
      });
    }

    // Check theme accent colors
    console.log("\n=== Theme Accent Colors ===");
    const accent1Match = themeXml?.match(/<a:accent1>[\s\S]*?<\/a:accent1>/);
    const accent2Match = themeXml?.match(/<a:accent2>[\s\S]*?<\/a:accent2>/);
    console.log(`accent1: ${accent1Match?.[0]}`);
    console.log(`accent2: ${accent2Match?.[0]}`);

    // Check master for ctrTitle placeholder
    console.log("\n=== Master ctrTitle Placeholder ===");
    const masterCtrTitleMatch = masterXml?.match(/<p:sp[^>]*>[\s\S]*?<p:ph type="ctrTitle"[^>]*\/>[\s\S]*?<\/p:sp>/);
    if (masterCtrTitleMatch) {
      console.log("Found master ctrTitle placeholder");
      // Find defRPr with colors
      const defRPrMatches = masterCtrTitleMatch[0].match(/<a:defRPr[^>]*>[\s\S]*?<\/a:defRPr>/g) ?? [];
      console.log(`Default run properties found: ${defRPrMatches.length}`);
      defRPrMatches.forEach((defRPr, i) => {
        console.log(`  defRPr ${i}: ${defRPr.slice(0, 400)}`);
      });
    } else {
      console.log("No master ctrTitle placeholder found");
    }

    // Check master p:titleStyle for colors in detail
    console.log("\n=== Master titleStyle Detail ===");
    if (titleStyleMatch) {
      // Print the first 2000 characters of titleStyle
      console.log(titleStyleMatch[0].slice(0, 2000));
    }
  });
});
