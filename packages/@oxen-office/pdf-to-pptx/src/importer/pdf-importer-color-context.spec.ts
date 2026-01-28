/**
 * @file src/pdf/importer/pdf-importer-color-context.spec.ts
 */

import type { Color } from "@oxen-office/ooxml/domain/color";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";
import {
  createDefaultColorContextForPdf,
  createEmptyColorContext,
  importPdf,
} from "./pdf-importer";
import { buildSimplePdfBytes } from "../test-utils/simple-pdf";

async function createPdfBytes(pages: readonly { readonly width: number; readonly height: number }[]): Promise<Uint8Array> {
  return buildSimplePdfBytes({
    pages: pages.map((p) => ({ width: p.width, height: p.height })),
    info: { title: "color-context.pdf" },
  });
}

describe("createDefaultColorContextForPdf", () => {
  it("initializes scheme colors and colorMap with Office-like defaults", () => {
    const ctx = createDefaultColorContextForPdf();

    expect(ctx.colorScheme).toMatchObject({
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "1F497D",
      lt2: "EEECE1",
      accent1: "4F81BD",
      accent2: "C0504D",
      accent3: "9BBB59",
      accent4: "8064A2",
      accent5: "4BACC6",
      accent6: "F79646",
      hlink: "0000FF",
      folHlink: "800080",
    });

    expect(ctx.colorMap).toEqual({
      bg1: "lt1",
      tx1: "dk1",
      bg2: "lt2",
      tx2: "dk2",
      accent1: "accent1",
      accent2: "accent2",
      accent3: "accent3",
      accent4: "accent4",
      accent5: "accent5",
      accent6: "accent6",
      hlink: "hlink",
      folHlink: "folHlink",
    });
  });

  it("resolves scheme colors via resolveColor()", () => {
    const ctx = createDefaultColorContextForPdf();

    const accent1: Color = { spec: { type: "scheme", value: "accent1" } };
    expect(resolveColor(accent1, ctx)).toBe("4F81BD");

    const tx1: Color = { spec: { type: "scheme", value: "tx1" } };
    expect(resolveColor(tx1, ctx)).toBe("000000");
  });
});

describe("createEmptyColorContext", () => {
  it("creates an empty ColorContext", () => {
    expect(createEmptyColorContext()).toEqual({ colorScheme: {}, colorMap: {} });
  });

  it("does not throw even when scheme colors cannot be resolved", () => {
    const ctx = createEmptyColorContext();
    const accent1: Color = { spec: { type: "scheme", value: "accent1" } };
    expect(resolveColor(accent1, ctx)).toBeUndefined();
  });
});

describe("PDF importer ColorContext initialization", () => {
  it("uses createDefaultColorContextForPdf() in the generated PresentationDocument", async () => {
    const bytes = await createPdfBytes([{ width: 200, height: 200 }] as const);
    const result = await importPdf(bytes);

    expect(result.document.colorContext).toEqual(createDefaultColorContextForPdf());
  });
});
