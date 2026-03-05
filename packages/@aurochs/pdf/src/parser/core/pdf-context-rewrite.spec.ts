/**
 * @file Context rewrite/save tests for parser -> context -> builder pipeline.
 */

import path from "node:path";
import { readFileSync } from "node:fs";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { buildPdfFromBuilderContext } from "@aurochs-builder/pdf";
import { getPdfFixturePath } from "../../test-utils/pdf-fixtures";
import {
  createPdfContext,
  parsePdfSource,
  rewritePdfContext,
  serializePdfDocumentAsJson,
  deserializePdfDocumentFromJson,
} from "./pdf-parser";

describe("context rewrite and save", () => {
  it("rewrites path elements in context before build", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));
    const parsed = await parsePdfSource(bytes);
    const original = buildPdfFromBuilderContext({ context: createPdfContext(parsed) });
    const originalPathCount = original.pages[0]!.elements.filter((element) => element.type === "path").length;

    const rewrittenContext = rewritePdfContext(createPdfContext(parsed), {
      rewriteParsedElement: ({ element }) => {
        if (element.type !== "path") {
          return element;
        }
        return { ...element, paintOp: "none" };
      },
    });
    const rewritten = buildPdfFromBuilderContext({ context: rewrittenContext });
    const rewrittenPathCount = rewritten.pages[0]!.elements.filter((element) => element.type === "path").length;

    expect(originalPathCount).toBeGreaterThan(0);
    expect(rewrittenPathCount).toBe(0);
  });

  it("rewrites text elements in context before build", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("text-content.pdf")));
    const parsed = await parsePdfSource(bytes);
    const markerText = "CONTEXT_REWRITE_MARKER";

    const rewrittenContext = rewritePdfContext(createPdfContext(parsed), {
      rewriteParsedElement: ({ element }) => {
        if (element.type !== "text" || element.runs.length === 0) {
          return element;
        }
        const firstRun = element.runs[0];
        if (!firstRun) {
          return element;
        }
        const restRuns = element.runs.slice(1);
        return {
          ...element,
          runs: [
            { ...firstRun, text: markerText },
            ...restRuns,
          ],
        };
      },
    });
    const rewritten = buildPdfFromBuilderContext({ context: rewrittenContext });

    const texts = rewritten.pages[0]!.elements.filter((element) => element.type === "text");
    expect(texts.some((text) => text.type === "text" && text.text.includes(markerText))).toBe(true);
  });

  it("rewrites image elements and supports save/load", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("ccitt-group4.pdf")));
    const parsed = await parsePdfSource(bytes);

    const rewrittenContext = rewritePdfContext(createPdfContext(parsed), {
      rewriteExtractedImage: ({ image, imageIndex }) => {
        if (imageIndex !== 0) {
          return image;
        }
        return {
          ...image,
          graphicsState: {
            ...image.graphicsState,
            fillAlpha: 0.33,
          },
        };
      },
    });

    const outputDir = await mkdtemp(path.join(tmpdir(), "aurochs-pdf-context-save-"));
    const outputPath = path.join(outputDir, "rewritten-document.json");

    // Build and save
    const saved = buildPdfFromBuilderContext({ context: rewrittenContext });
    await writeFile(outputPath, serializePdfDocumentAsJson(saved, 2));

    // Load and verify
    const loadedJson = await readFile(outputPath, "utf8");
    const loaded = deserializePdfDocumentFromJson(loadedJson);

    expect(saved.pages[0]!.elements.some((element) => {
      return element.type === "image" && element.graphicsState.fillAlpha === 0.33;
    })).toBe(true);
    expect(loaded).toEqual(saved);
  });
});
