/**
 * @file Table parser tests
 */

import { loadPptxFile } from "../../../../scripts/lib/pptx-loader";
import { parseXml, getChild, isXmlElement } from "../../../xml/index";
import type { XmlDocument, XmlElement, XmlText, XmlNode } from "../../../xml/index";
import { parseTable } from "./table-parser";
import { parseShapeElement } from "../shape-parser/index";
import { parseSlide } from "../slide/slide-parser";
import { renderSlideSvg } from "../../render/svg/renderer";
import { createCoreRenderContext } from "../../render/render-context";
import { openPresentation } from "../../index";
import { px } from "../../domain/types";
import type { ParseContext } from "../context";

function getRootElement(doc: XmlDocument): XmlElement {
  for (const child of doc.children) {
    if (isXmlElement(child)) {
      return child;
    }
  }
  throw new Error("No root element found");
}

function findChildElement(parent: XmlElement, name: string): XmlElement | undefined {
  return parent.children.find((child): child is XmlElement => {
    if (!isXmlElement(child)) {
      return false;
    }
    return child.name === name;
  });
}

function el(name: string, attrs: Record<string, string> = {}, children: XmlNode[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

function text(value: string): XmlText {
  return { type: "text", value };
}

describe("table-parser", () => {
  it("parses cell headers and cell3D properties", () => {
    const tbl = el("a:tbl", {}, [
      el("a:tblGrid", {}, [el("a:gridCol", { w: "914400" })]),
      el("a:tr", { h: "370840" }, [
        el("a:tc", { id: "HeaderA" }, []),
        el("a:tc", { id: "Data1" }, [
          el("a:tcPr", {}, [
            el("a:headers", {}, [el("a:header", { val: "HeaderA" }), el("a:header", {}, [text("HeaderB")])]),
            el("a:cell3D", { prstMaterial: "metal" }, [
              el("a:bevel", { prst: "circle", w: "914400", h: "914400" }),
              el("a:lightRig", { rig: "threePt", dir: "t" }),
            ]),
          ]),
        ]),
      ]),
    ]);

    const table = parseTable(tbl);
    const dataCell = table?.rows[0]?.cells[1];
    expect(dataCell?.id).toBe("Data1");
    expect(dataCell?.properties.headers).toEqual(["HeaderA", "HeaderB"]);
    expect(dataCell?.properties.cell3d?.preset).toBe("metal");
    expect(dataCell?.properties.cell3d?.bevel?.preset).toBe("circle");
    expect(dataCell?.properties.cell3d?.bevel?.width).toBeCloseTo(96, 0);
    expect(dataCell?.properties.cell3d?.bevel?.height).toBeCloseTo(96, 0);
    expect(dataCell?.properties.cell3d?.lightRig?.rig).toBe("threePt");
    expect(dataCell?.properties.cell3d?.lightRig?.direction).toBe("t");
  });
  it("parses table from table_test.pptx slide1", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
    const { cache } = await loadPptxFile(pptxPath);
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    expect(slideXml).toBeDefined();

    const doc = parseXml(slideXml!);
    const root = getRootElement(doc);
    const cSld = findChildElement(root, "p:cSld");
    const spTree = cSld ? findChildElement(cSld, "p:spTree") : undefined;

    expect(spTree).toBeDefined();

    // Find graphicFrame containing table
    const graphicFrame = spTree ? findChildElement(spTree, "p:graphicFrame") : undefined;
    expect(graphicFrame).toBeDefined();

    // Navigate to table element
    const graphic = getChild(graphicFrame!, "a:graphic");
    expect(graphic).toBeDefined();

    const graphicData = getChild(graphic!, "a:graphicData");
    expect(graphicData).toBeDefined();

    // Check for table element
    const tbl = getChild(graphicData!, "a:tbl");
    expect(tbl).toBeDefined();

    // Parse the table
    const table = parseTable(tbl);
    expect(table).toBeDefined();
    expect(table!.rows.length).toBeGreaterThan(0);
    expect(table!.grid.columns.length).toBeGreaterThan(0);

    console.log("Table structure:");
    console.log("  Rows:", table!.rows.length);
    console.log("  Columns:", table!.grid.columns.length);
    console.log("  First row cells:", table!.rows[0]?.cells.length);
  });

  it("shape-parser returns GraphicFrame with table data", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
    const { cache } = await loadPptxFile(pptxPath);
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    const doc = parseXml(slideXml!);
    const root = getRootElement(doc);
    const cSld = findChildElement(root, "p:cSld");
    const spTree = cSld ? findChildElement(cSld, "p:spTree") : undefined;
    const graphicFrame = spTree ? findChildElement(spTree, "p:graphicFrame") : undefined;

    // Parse through shape-parser
    if (!graphicFrame) {
      throw new Error("GraphicFrame not found");
    }
    const shape = parseShapeElement(graphicFrame);
    expect(shape?.type).toBe("graphicFrame");

    if (shape?.type === "graphicFrame") {
      console.log("GraphicFrame content type:", shape.content.type);
      expect(shape.content.type).toBe("table");

      if (shape.content.type === "table") {
        console.log("Table data:", JSON.stringify(shape.content.data, null, 2).slice(0, 200));
        expect(shape.content.data.table).toBeDefined();
        expect(shape.content.data.table.rows.length).toBe(6);
      }
    } else {
      throw new Error("Expected graphicFrame shape");
    }
  });

  it("parseSlide includes table in shapes", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
    const { cache } = await loadPptxFile(pptxPath);
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    const doc = parseXml(slideXml!);

    // Minimal parse context
    const parseCtx: ParseContext = {
      colorContext: { colorScheme: {}, colorMap: {} },
      placeholderContext: {
        layout: { byIdx: new Map(), byType: {} },
        master: { byIdx: new Map(), byType: {} },
      },
      masterStylesInfo: { masterTextStyles: undefined, defaultTextStyle: undefined },
      slideResources: { getTarget: () => undefined, getType: () => undefined },
      layoutResources: { getTarget: () => undefined, getType: () => undefined },
      masterResources: { getTarget: () => undefined, getType: () => undefined },
      themeContent: undefined,
    };

    const slide = parseSlide(doc, parseCtx);
    expect(slide).toBeDefined();
    console.log("Slide shapes count:", slide!.shapes.length);
    console.log(
      "Shape types:",
      slide!.shapes.map((s) => s.type),
    );

    // Find graphicFrame with table
    const tableFrame = slide!.shapes.find((s) => s.type === "graphicFrame" && s.content.type === "table");
    expect(tableFrame).toBeDefined();
    console.log("Table frame found:", !!tableFrame);
  });

  it("renderSlideSvg renders table as foreignObject", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
    const { cache } = await loadPptxFile(pptxPath);
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    const doc = parseXml(slideXml!);

    // Minimal parse context
    const parseCtx: ParseContext = {
      colorContext: { colorScheme: {}, colorMap: {} },
      placeholderContext: {
        layout: { byIdx: new Map(), byType: {} },
        master: { byIdx: new Map(), byType: {} },
      },
      masterStylesInfo: { masterTextStyles: undefined, defaultTextStyle: undefined },
      slideResources: { getTarget: () => undefined, getType: () => undefined },
      layoutResources: { getTarget: () => undefined, getType: () => undefined },
      masterResources: { getTarget: () => undefined, getType: () => undefined },
      themeContent: undefined,
    };

    const slide = parseSlide(doc, parseCtx);
    expect(slide).toBeDefined();

    // Render to SVG
    const slideSize = { width: px(960), height: px(540) };
    const renderCtx = createCoreRenderContext({ slideSize });
    const result = renderSlideSvg(slide!, renderCtx);

    console.log("SVG length:", result.svg.length);
    console.log("Warnings:", result.warnings);
    // Native SVG table rendering (no foreignObject for resvg compatibility)
    console.log("SVG contains rect (cell bg):", result.svg.includes("<rect"));
    console.log("SVG contains scale transform:", result.svg.includes("scale("));

    // Should contain rect elements for cells (native SVG table)
    expect(result.svg).toContain("<rect");
    expect(result.svg).toContain("scale("); // Table uses scale transform
  });

  it("full integration: openPresentation.getSlide.renderSVG renders table", async () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
    const { presentationFile } = await loadPptxFile(pptxPath);

    // Open presentation and render
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = slide.renderSVG();

    console.log("Full integration SVG length:", svg.length);
    // Native SVG table rendering (no foreignObject for resvg compatibility)
    console.log("Contains rect (cell bg):", svg.includes("<rect"));
    console.log("Contains scale transform:", svg.includes("scale("));

    // Should contain rect elements for cells (native SVG table)
    expect(svg).toContain("<rect");
    expect(svg).toContain("scale("); // Table uses scale transform
  });
});
