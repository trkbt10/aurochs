/**
 * @file Phase 10 advanced elements integration tests
 *
 * Uses real PPTX fixtures and patches the underlying ZipPackage parts, then
 * re-parses the modified XML to verify round-trip correctness.
 *
 * @see docs/plans/pptx-export/phase-10-advanced-elements.md
 */

import fs from "node:fs";
import path from "node:path";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { createElement, parseXml, serializeDocument, type XmlDocument, type XmlElement, isXmlElement } from "@oxen/xml";
import { patchChartData, patchChartTitle } from "@oxen-office/chart/patcher";
import { parseChart } from "@oxen-office/chart/parser";
import type { DataReference } from "@oxen-office/chart/domain";
import { patchTable, patchDiagramNodeText, patchOleObject } from "@oxen-office/pptx/patcher";
import { parseTable, parseGraphicFrame } from "@oxen-office/pptx/parser";
import { parseDiagramDataModel } from "@oxen-office/diagram/parser/diagram/data-parser";
import { parseShapeProperties } from "@oxen-office/pptx/parser/shape-parser/properties";
import { parseTextBody } from "@oxen-office/pptx/parser/text/text-parser";
import { deg, px } from "@oxen-office/ooxml/domain/units";
import type { TextBody } from "@oxen-office/pptx/domain/text";

const FIXTURES_DIR = path.resolve(process.cwd(), "fixtures/poi-test-data/test-data/slideshow");

function readXml(pkg: Awaited<ReturnType<typeof loadPptxFile>>["zipPackage"], partPath: string): XmlDocument {
  const xmlText = pkg.readText(partPath);
  if (!xmlText) {
    throw new Error(`missing xml part: ${partPath}`);
  }
  return parseXml(xmlText);
}

function writeXml(pkg: Awaited<ReturnType<typeof loadPptxFile>>["zipPackage"], partPath: string, doc: XmlDocument): void {
  const xml = serializeDocument(doc, { declaration: true, standalone: true });
  pkg.writeText(partPath, xml);
}

function findFirstElement(root: XmlElement, predicate: (el: XmlElement) => boolean): XmlElement | undefined {
  if (predicate(root)) {
    return root;
  }
  for (const child of root.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const found = findFirstElement(child, predicate);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function getDocRoot(doc: XmlDocument): XmlElement {
  const root = doc.children.find(isXmlElement);
  if (!root) {
    throw new Error("xml doc has no root element");
  }
  return root;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isPptxTextBody(value: unknown): value is TextBody {
  if (!isObject(value)) {
    return false;
  }
  if (!("bodyProperties" in value) || !isObject(value.bodyProperties)) {
    return false;
  }
  return "paragraphs" in value && Array.isArray(value.paragraphs);
}

function replaceElementByReference(doc: XmlDocument, target: XmlElement, replacement: XmlElement): XmlDocument {
  const rewriteNode = (node: XmlElement): XmlElement => {
    if (node === target) {
      return replacement;
    }
    const nextChildren = node.children.map((child) => {
      if (!isXmlElement(child)) {
        return child;
      }
      return rewriteNode(child);
    });
    return createElement(node.name, { ...node.attrs }, nextChildren);
  };

  const root = getDocRoot(doc);
  return { ...doc, children: [rewriteNode(root)] };
}

function hasCategoriesAndValues(
  series: unknown,
): series is { readonly categories: DataReference; readonly values: DataReference } {
  if (typeof series !== "object" || series === null) {
    return false;
  }
  return "categories" in series && "values" in series;
}

describe("Phase 10 - Advanced elements", () => {
  it("Chart: patches chart title + cached data in chart*.xml (ECMA-376 DrawingML charts)", async () => {
    const pptxPath = path.join(FIXTURES_DIR, "bar-chart.pptx");
    if (!fs.existsSync(pptxPath)) {
      console.warn(`SKIPPED: PPTX file not found: ${pptxPath}`);
      return;
    }

    const { zipPackage, presentationFile } = await loadPptxFile(pptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);

    const slideRoot = getDocRoot(slide.content);
    const chartEl = findFirstElement(slideRoot, (el) => el.name === "c:chart");
    if (!chartEl) {
      throw new Error("expected slide to contain a c:chart reference");
    }

    const rId = chartEl.attrs["r:id"];
    if (!rId) {
      throw new Error("expected c:chart to have r:id");
    }

    const chartPath = slide.relationships.getTarget(rId);
    if (!chartPath) {
      throw new Error(`expected slide relationships to resolve chart rId: ${rId}`);
    }

    const originalChartDoc = readXml(zipPackage, chartPath);
    const updatedChartDoc = patchChartData(patchChartTitle(originalChartDoc, "Phase10 Title"), {
      categories: ["X", "Y", "Z"],
      series: [{ name: "Series 1", values: [101, 202, 303] }],
    });
    writeXml(zipPackage, chartPath, updatedChartDoc);

    const reloadedChartDoc = readXml(zipPackage, chartPath);
    const parsed = parseChart(reloadedChartDoc);
    if (!parsed) {
      throw new Error("expected parseChart to succeed after patch");
    }

    const titleText = parsed.title?.textBody?.paragraphs?.[0]?.runs?.[0];
    if (!titleText || titleText.type !== "text") {
      throw new Error("expected chart title text run to exist");
    }
    expect(titleText.text).toBe("Phase10 Title");

    const firstChart = parsed.plotArea.charts[0];
    if (!firstChart) {
      throw new Error("expected at least one chart in plotArea");
    }
    const firstSeries = firstChart.series[0];
    if (!firstSeries) {
      throw new Error("expected at least one series");
    }

    if (!hasCategoriesAndValues(firstSeries)) {
      throw new Error("expected bar chart series to have categories + values");
    }
    const categories = firstSeries.categories.strRef?.cache?.points.map((p: { readonly value: string }) => p.value);
    const values = firstSeries.values.numRef?.cache?.points.map((p: { readonly value: number }) => p.value);
    expect(categories).toEqual(["X", "Y", "Z"]);
    expect(values).toEqual([101, 202, 303]);
  });

  it("Table: patches a:tbl cell text in slide XML (ECMA-376 DrawingML tables)", async () => {
    const pptxPath = path.join(FIXTURES_DIR, "table_test.pptx");
    if (!fs.existsSync(pptxPath)) {
      console.warn(`SKIPPED: PPTX file not found: ${pptxPath}`);
      return;
    }

    const { zipPackage, presentationFile } = await loadPptxFile(pptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const slidePath = `ppt/slides/${slide.filename}.xml`;

    const slideDoc = readXml(zipPackage, slidePath);
    const slideRoot = getDocRoot(slideDoc);
    const tbl = findFirstElement(slideRoot, (el) => el.name === "a:tbl");
    if (!tbl) {
      throw new Error("expected slide to contain a table (a:tbl)");
    }

    const parsedTable = parseTable(tbl);
    if (!parsedTable) {
      throw new Error("expected parseTable to succeed");
    }
    if (parsedTable.rows.length === 0 || parsedTable.rows[0]?.cells.length === 0) {
      throw new Error("expected table to have at least one cell");
    }

    const patchedTbl = patchTable(tbl, [
      {
        type: "cell",
        row: 0,
        col: 0,
        content: {
          bodyProperties: {},
          paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Phase10 Cell" }] }],
        },
      },
    ]);

    const patchedSlide = replaceElementByReference(slideDoc, tbl, patchedTbl);
    writeXml(zipPackage, slidePath, patchedSlide);

    const reloadedDoc = readXml(zipPackage, slidePath);
    const reloadedRoot = getDocRoot(reloadedDoc);
    const reloadedTbl = findFirstElement(reloadedRoot, (el) => el.name === "a:tbl");
    if (!reloadedTbl) {
      throw new Error("expected reloaded slide to contain a table");
    }
    const reloadedParsed = parseTable(reloadedTbl);
    if (!reloadedParsed) {
      throw new Error("expected parseTable to succeed after patch");
    }

    const firstCellText = reloadedParsed.rows[0]?.cells[0]?.textBody?.paragraphs?.[0]?.runs?.[0];
    if (!firstCellText || firstCellText.type !== "text") {
      throw new Error("expected first cell to have text after patch");
    }
    expect(firstCellText.text).toBe("Phase10 Cell");
  });

  it("Diagram: patches dgm:dataModel node text in data*.xml (ECMA-376 DrawingML diagrams)", async () => {
    const pptxPath = path.join(FIXTURES_DIR, "smartart-simple.pptx");
    if (!fs.existsSync(pptxPath)) {
      console.warn(`SKIPPED: PPTX file not found: ${pptxPath}`);
      return;
    }

    const { zipPackage, presentationFile } = await loadPptxFile(pptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);

    const slideRoot = getDocRoot(slide.content);
    const relIds = findFirstElement(slideRoot, (el) => el.name === "dgm:relIds");
    if (!relIds) {
      throw new Error("expected slide to contain a dgm:relIds element");
    }

    const dmRel = relIds.attrs["r:dm"];
    if (!dmRel) {
      throw new Error("expected dgm:relIds to have r:dm");
    }
    const dataPath = slide.relationships.getTarget(dmRel);
    if (!dataPath) {
      throw new Error(`expected slide relationships to resolve diagram data rId: ${dmRel}`);
    }

    const dataDoc = readXml(zipPackage, dataPath);
    const model = parseDiagramDataModel(dataDoc, { parseShapeProperties, parseTextBody });
    if (!model) {
      throw new Error("expected parseDiagramDataModel to succeed");
    }

    const pointWithText = model.points.find((p) => {
      const tb = p.textBody;
      if (!isPptxTextBody(tb)) {
        return false;
      }
      return tb.paragraphs.some((para) =>
        para.runs.some((run) => run.type === "text" && run.text.length > 0),
      );
    });
    if (!pointWithText) {
      throw new Error("expected diagram to contain a point with text");
    }

    const updated = patchDiagramNodeText(dataDoc, pointWithText.modelId, "Phase10 Node");
    writeXml(zipPackage, dataPath, updated);

    const reloaded = parseDiagramDataModel(readXml(zipPackage, dataPath), { parseShapeProperties, parseTextBody });
    if (!reloaded) {
      throw new Error("expected parseDiagramDataModel to succeed after patch");
    }

    const updatedNode = reloaded.points.find((p) => p.modelId === pointWithText.modelId);
    const updatedTextBody = updatedNode?.textBody;
    if (!isPptxTextBody(updatedTextBody)) {
      throw new Error("expected updated node to have text body");
    }
    const updatedText = updatedTextBody.paragraphs[0]?.runs[0];
    if (!updatedText || updatedText.type !== "text") {
      throw new Error("expected updated node to have text body");
    }
    expect(updatedText.text).toBe("Phase10 Node");
  });

  it("OLE: patches p:oleObj progId + graphicFrame transform in slide XML (ECMA-376 PresentationML)", async () => {
    const pptxPath = path.join(FIXTURES_DIR, "bug64693.pptx");
    if (!fs.existsSync(pptxPath)) {
      console.warn(`SKIPPED: PPTX file not found: ${pptxPath}`);
      return;
    }

    const { zipPackage, presentationFile } = await loadPptxFile(pptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const slidePath = `ppt/slides/${slide.filename}.xml`;

    const slideDoc = readXml(zipPackage, slidePath);
    const slideRoot = getDocRoot(slideDoc);
    const frame = findFirstElement(slideRoot, (el) => {
      if (el.name !== "p:graphicFrame") {
        return false;
      }
      return findFirstElement(el, (child) => child.name === "p:oleObj") !== undefined;
    });
    if (!frame) {
      throw new Error("expected slide to contain an OLE graphicFrame");
    }

    const patchedFrame = patchOleObject(frame, [
      { type: "replace", newData: new ArrayBuffer(0), progId: "Excel.Sheet.12" },
      {
        type: "transform",
        transform: {
          x: px(10),
          y: px(20),
          width: px(300),
          height: px(200),
          rotation: deg(0),
          flipH: false,
          flipV: false,
        },
      },
    ]);

    const patchedSlide = replaceElementByReference(slideDoc, frame, patchedFrame);
    writeXml(zipPackage, slidePath, patchedSlide);

    const reloadedSlide = readXml(zipPackage, slidePath);
    const reloadedRoot = getDocRoot(reloadedSlide);
    const reloadedFrame = findFirstElement(reloadedRoot, (el) => {
      if (el.name !== "p:graphicFrame") {
        return false;
      }
      return findFirstElement(el, (child) => child.name === "p:oleObj") !== undefined;
    });
    if (!reloadedFrame) {
      throw new Error("expected reloaded slide to contain an OLE graphicFrame");
    }

    const parsed = parseGraphicFrame(reloadedFrame);
    if (!parsed) {
      throw new Error("expected parseGraphicFrame to succeed");
    }
    if (parsed.content.type !== "oleObject") {
      throw new Error("expected parsed graphicFrame to be oleObject");
    }
    expect(parsed.content.data.progId).toBe("Excel.Sheet.12");
    expect(parsed.transform.x).toBe(px(10));
    expect(parsed.transform.y).toBe(px(20));
    expect(parsed.transform.width).toBe(px(300));
    expect(parsed.transform.height).toBe(px(200));
  });
});
