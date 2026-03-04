/**
 * @file Pipeline tests for native PDF parser (parser -> context -> builder)
 */

import { readFileSync } from "node:fs";
import { getPdfFixturePath } from "../../test-utils/pdf-fixtures";
import {
  buildPdfDocumentFromContext,
  createPdfBuildContext,
  parsePdfNative,
  parsePdfSourceNative,
} from "./pdf-parser.native";

describe("native PDF parser pipeline", () => {
  it("exposes parsed source pages for low-level access", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));
    const parsed = await parsePdfSourceNative(bytes, { pages: [1] });

    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0]!.parsedElements.length).toBeGreaterThan(0);
  });

  it("matches parsePdfNative output when using default pipeline stages", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));
    const direct = await parsePdfNative(bytes);
    const parsed = await parsePdfSourceNative(bytes);
    const context = createPdfBuildContext(parsed);
    const built = buildPdfDocumentFromContext(context);

    expect(built).toEqual(direct);
  });

  it("allows build-time filtering through context options", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));
    const parsed = await parsePdfSourceNative(bytes);
    const context = createPdfBuildContext(parsed, {
      includeText: false,
      includePaths: false,
    });
    const built = buildPdfDocumentFromContext(context);

    expect(built.pages[0]!.elements).toHaveLength(0);
  });
});
