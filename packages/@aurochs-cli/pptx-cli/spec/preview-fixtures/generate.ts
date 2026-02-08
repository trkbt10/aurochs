/**
 * @file Generate dedicated PPTX test fixtures for preview command tests.
 *
 * Uses the builder API (createPresentationSession) to create chart/table/mixed
 * PPTX files. The base template's placeholder shapes are stripped at runtime.
 * These fixtures serve double duty:
 *   1. Test that the builder correctly produces valid PPTX
 *   2. Test that the preview command renders them as rich ASCII art
 *
 * Called from: preview.spec.ts beforeAll
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseXml, serializeDocument, getByPath, getChild } from "@aurochs/xml";
import type { XmlElement, XmlNode } from "@aurochs/xml";
import { createPresentationSession } from "../../src/core/presentation-session";

const TEMPLATE_PATH = join(import.meta.dirname, "../verify-cases/templates/blank.pptx");
const FIXTURES_DIR = import.meta.dirname;

// =============================================================================
// Strip placeholder shapes from template at runtime
// =============================================================================

function isPlaceholderSp(node: XmlNode): boolean {
  if (typeof node === "string" || node.name !== "p:sp") return false;
  const nvSpPr = getChild(node, "p:nvSpPr");
  if (!nvSpPr) return false;
  const nvPr = getChild(nvSpPr, "p:nvPr");
  if (!nvPr) return false;
  return getChild(nvPr, "p:ph") !== undefined;
}

function replaceChild(parent: XmlElement, name: string, replacement: XmlElement): XmlElement {
  return {
    ...parent,
    children: parent.children.map((c) => (typeof c !== "string" && c.name === name ? replacement : c)),
  };
}

async function createCleanTemplateBuffer(): Promise<ArrayBuffer> {
  const raw = await readFile(TEMPLATE_PATH);
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const { zipPackage, presentationFile } = await loadPptxBundleFromBuffer(buf);
  const presentation = openPresentation(presentationFile);

  for (let i = 1; i <= presentation.count; i++) {
    const apiSlide = presentation.getSlide(i);
    const slidePath = `ppt/slides/${apiSlide.filename}.xml`;
    const xmlText = zipPackage.readText(slidePath);
    if (!xmlText) continue;

    const doc = parseXml(xmlText);
    const sld = getByPath(doc, ["p:sld"]);
    if (!sld) continue;
    const cSld = getChild(sld, "p:cSld");
    if (!cSld) continue;
    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) continue;

    const cleanSpTree: XmlElement = {
      ...spTree,
      children: spTree.children.filter((child) => !isPlaceholderSp(child)),
    };

    const newDoc = {
      ...doc,
      children: doc.children.map((c) =>
        typeof c !== "string" && c.name === "p:sld"
          ? replaceChild(sld, "p:cSld", replaceChild(cSld, "p:spTree", cleanSpTree))
          : c,
      ),
    };
    zipPackage.writeText(slidePath, serializeDocument(newDoc));
  }

  return zipPackage.toArrayBuffer();
}

// =============================================================================
// Fixture definitions
// =============================================================================

type FixtureDef = {
  readonly name: string;
  readonly setup: (session: ReturnType<typeof createPresentationSession>) => Promise<void>;
};

const fixtures: readonly FixtureDef[] = [
  {
    name: "table",
    setup: async (session) => {
      await session.addTable(1, {
        x: 50,
        y: 50,
        width: 600,
        height: 300,
        rows: [
          [{ text: "Product" }, { text: "Price" }, { text: "Quantity" }],
          [{ text: "Widget" }, { text: "9.99" }, { text: "100" }],
          [{ text: "Gadget" }, { text: "24.50" }, { text: "42" }],
          [{ text: "Doohickey" }, { text: "3.75" }, { text: "500" }],
        ],
      });
    },
  },
  {
    name: "table-headers-only",
    setup: async (session) => {
      await session.addTable(1, {
        x: 50,
        y: 50,
        width: 500,
        height: 100,
        rows: [[{ text: "A" }, { text: "B" }, { text: "C" }]],
      });
    },
  },
  {
    name: "bar-chart",
    setup: async (session) => {
      await session.modifySlide({
        slideNumber: 1,
        addCharts: [
          {
            chartType: "barChart",
            x: 50,
            y: 50,
            width: 600,
            height: 400,
            title: "Quarterly Sales",
            data: {
              categories: ["Q1", "Q2", "Q3", "Q4"],
              series: [{ name: "Revenue", values: [120, 280, 190, 350] }],
            },
          },
        ],
      });
    },
  },
  {
    name: "pie-chart",
    setup: async (session) => {
      await session.modifySlide({
        slideNumber: 1,
        addCharts: [
          {
            chartType: "pieChart",
            x: 50,
            y: 50,
            width: 500,
            height: 400,
            title: "Market Share",
            data: {
              categories: ["Alpha", "Beta", "Gamma"],
              series: [{ name: "Share", values: [50, 30, 20] }],
            },
          },
        ],
      });
    },
  },
  {
    name: "line-chart",
    setup: async (session) => {
      await session.modifySlide({
        slideNumber: 1,
        addCharts: [
          {
            chartType: "lineChart",
            x: 50,
            y: 50,
            width: 600,
            height: 400,
            title: "Monthly Trend",
            data: {
              categories: ["Jan", "Feb", "Mar", "Apr", "May"],
              series: [{ name: "Users", values: [100, 250, 180, 320, 400] }],
            },
          },
        ],
      });
    },
  },
  {
    name: "multi-series-bar",
    setup: async (session) => {
      await session.modifySlide({
        slideNumber: 1,
        addCharts: [
          {
            chartType: "barChart",
            x: 50,
            y: 50,
            width: 600,
            height: 400,
            data: {
              categories: ["East", "West", "North"],
              series: [
                { name: "2024", values: [100, 200, 150] },
                { name: "2025", values: [130, 250, 180] },
              ],
            },
          },
        ],
      });
    },
  },
  {
    name: "mixed-table-chart",
    setup: async (session) => {
      await session.addTable(1, {
        x: 50,
        y: 50,
        width: 300,
        height: 150,
        rows: [
          [{ text: "Metric" }, { text: "Value" }],
          [{ text: "Total" }, { text: "1000" }],
        ],
      });
      await session.modifySlide({
        slideNumber: 1,
        addCharts: [
          {
            chartType: "barChart",
            x: 400,
            y: 50,
            width: 300,
            height: 300,
            data: {
              categories: ["A", "B"],
              series: [{ name: "S", values: [10, 20] }],
            },
          },
        ],
      });
    },
  },
];

// =============================================================================
// Build
// =============================================================================

async function buildFixture(def: FixtureDef, cleanBuffer: ArrayBuffer): Promise<string> {
  const session = createPresentationSession();
  await session.loadFromBuffer(cleanBuffer);
  await def.setup(session);
  const buffer = await session.exportBuffer();
  const path = join(FIXTURES_DIR, `${def.name}.pptx`);
  await writeFile(path, new Uint8Array(buffer));
  return path;
}

export async function generateAllFixtures(): Promise<ReadonlyMap<string, string>> {
  await mkdir(FIXTURES_DIR, { recursive: true });
  const cleanBuffer = await createCleanTemplateBuffer();
  const paths = new Map<string, string>();
  for (const def of fixtures) {
    const path = await buildFixture(def, cleanBuffer);
    paths.set(def.name, path);
  }
  return paths;
}
