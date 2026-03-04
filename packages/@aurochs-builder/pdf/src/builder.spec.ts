/** @file Tests for @aurochs-builder/pdf pipeline wrapper */

import { readFileSync } from "node:fs";
import { getPdfFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import {
  buildPdf,
  buildPdfFromBuilderContext,
  createPdfBuilderContext,
  parsePdfSourceForBuilder,
  runPdfBuildPipeline,
} from "./builder";

describe("@aurochs-builder/pdf", () => {
  it("matches buildPdf output with explicit parser->context->builder stages", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));

    const direct = await buildPdf({ data: bytes });
    const parsed = await parsePdfSourceForBuilder({ data: bytes });
    const context = createPdfBuilderContext({ parsedDocument: parsed });
    const built = buildPdfFromBuilderContext({ context });

    expect(built).toEqual(direct);
  });

  it("applies build options through context stage", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));

    const built = await buildPdf({
      data: bytes,
      buildOptions: {
        includeText: false,
        includePaths: false,
      },
    });

    expect(built.pages).toHaveLength(1);
    expect(built.pages[0]!.elements).toHaveLength(0);
  });

  it("supports context rewrite while preserving pipeline artifacts", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("text-content.pdf")));
    const marker = "BUILDER_PIPELINE_MARKER";

    const result = await runPdfBuildPipeline({
      data: bytes,
      contextRewriter: {
        rewriteParsedElement: ({ element }) => {
          if (element.type !== "text" || element.runs.length === 0) {
            return element;
          }
          const firstRun = element.runs[0];
          if (!firstRun) {
            return element;
          }
          return {
            ...element,
            runs: [{ ...firstRun, text: marker }, ...element.runs.slice(1)],
          };
        },
      },
    });

    expect(result.parsedDocument.pages.length).toBeGreaterThan(0);
    expect(result.context.parsedDocument.pages.length).toBeGreaterThan(0);

    const textElements = result.document.pages[0]!.elements.filter((element) => element.type === "text");
    expect(textElements.some((element) => element.type === "text" && element.text.includes(marker))).toBe(true);
  });
});
