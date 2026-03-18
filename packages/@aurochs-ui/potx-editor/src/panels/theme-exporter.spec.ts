/**
 * @file Theme exporter tests
 *
 * Verifies that exportThemeAsPotx produces a valid POTX
 * that aurochs can load back (round-trip).
 */

import { describe, it, expect } from "vitest";
import { exportThemeAsPotx, getThemeFileName } from "./theme-exporter";
import { OFFICE_THEME } from "./presets/office-themes";
import { loadPptxFromBuffer, convertToPresentationDocument, buildSlideLayoutOptions } from "@aurochs-office/pptx/app";

describe("exportThemeAsPotx", () => {
  it("produces a valid POTX that aurochs can load", async () => {
    const blob = await exportThemeAsPotx({
      name: "Test Theme",
      colorScheme: OFFICE_THEME.colorScheme,
      fontScheme: OFFICE_THEME.fontScheme,
    });

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.presentationml.template");

    const buffer = await blob.arrayBuffer();
    const loaded = await loadPptxFromBuffer(buffer);

    expect(loaded.presentation).toBeDefined();
    expect(loaded.presentationFile).toBeDefined();
  });

  it("round-trips to PresentationDocument with color scheme", async () => {
    const blob = await exportThemeAsPotx({
      name: "Round Trip",
      colorScheme: OFFICE_THEME.colorScheme,
      fontScheme: OFFICE_THEME.fontScheme,
    });

    const buffer = await blob.arrayBuffer();
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.colorContext.colorScheme).toBeDefined();
    expect(doc.colorContext.colorScheme.accent1).toBe(OFFICE_THEME.colorScheme.accent1);
    expect(doc.colorContext.colorScheme.dk1).toBe(OFFICE_THEME.colorScheme.dk1);
  });

  it("round-trips with discoverable layout", async () => {
    const blob = await exportThemeAsPotx({
      name: "Layout Test",
      colorScheme: OFFICE_THEME.colorScheme,
      fontScheme: OFFICE_THEME.fontScheme,
    });

    const buffer = await blob.arrayBuffer();
    const loaded = await loadPptxFromBuffer(buffer);
    const layoutOptions = buildSlideLayoutOptions(loaded.presentationFile);

    expect(layoutOptions.length).toBeGreaterThanOrEqual(1);
    expect(layoutOptions[0].label).toContain("Blank");
  });

  it("preserves font scheme through round-trip", async () => {
    const blob = await exportThemeAsPotx({
      name: "Font Test",
      colorScheme: OFFICE_THEME.colorScheme,
      fontScheme: {
        majorFont: { latin: "Arial Black" },
        minorFont: { latin: "Georgia", eastAsian: "MS Gothic" },
      },
    });

    const buffer = await blob.arrayBuffer();
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.fontScheme?.majorFont.latin).toBe("Arial Black");
    expect(doc.fontScheme?.minorFont.latin).toBe("Georgia");
    expect(doc.fontScheme?.minorFont.eastAsian).toBe("MS Gothic");
  });
});

describe("getThemeFileName", () => {
  it("generates .potx filename", () => {
    expect(getThemeFileName("My Theme")).toBe("My Theme.potx");
  });

  it("sanitizes special characters", () => {
    expect(getThemeFileName('A<B>C:D"E')).toBe("A_B_C_D_E.potx");
  });
});
