/**
 * @file Theme importer tests
 *
 * Tests theme import by verifying round-trip: export POTX → import POTX.
 * Uses OFFICE_THEME preset to generate test fixtures dynamically.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { extractThemeFromPptx } from "./theme-importer";
import { exportThemeAsPotx } from "./theme-exporter";
import { OFFICE_THEME } from "./presets/office-themes";

describe("extractThemeFromPptx", () => {
  let officeThemeFile: File;

  beforeAll(async () => {
    // Generate POTX from OFFICE_THEME preset
    const blob = await exportThemeAsPotx({
      name: OFFICE_THEME.name,
      colorScheme: OFFICE_THEME.colorScheme,
      fontScheme: OFFICE_THEME.fontScheme,
    });
    officeThemeFile = new File([blob], "Office.potx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.template",
    });
  });

  it("should extract color scheme from generated POTX (round-trip)", async () => {
    const result = await extractThemeFromPptx(officeThemeFile);

    expect(result.success).toBe(true);
    if (!result.success) {return;}

    const { theme } = result;

    // Verify all 12 color scheme values match the original preset
    expect(theme.colorScheme.dk1).toBe(OFFICE_THEME.colorScheme.dk1);
    expect(theme.colorScheme.lt1).toBe(OFFICE_THEME.colorScheme.lt1);
    expect(theme.colorScheme.dk2).toBe(OFFICE_THEME.colorScheme.dk2);
    expect(theme.colorScheme.lt2).toBe(OFFICE_THEME.colorScheme.lt2);
    expect(theme.colorScheme.accent1).toBe(OFFICE_THEME.colorScheme.accent1);
    expect(theme.colorScheme.accent2).toBe(OFFICE_THEME.colorScheme.accent2);
    expect(theme.colorScheme.accent3).toBe(OFFICE_THEME.colorScheme.accent3);
    expect(theme.colorScheme.accent4).toBe(OFFICE_THEME.colorScheme.accent4);
    expect(theme.colorScheme.accent5).toBe(OFFICE_THEME.colorScheme.accent5);
    expect(theme.colorScheme.accent6).toBe(OFFICE_THEME.colorScheme.accent6);
    expect(theme.colorScheme.hlink).toBe(OFFICE_THEME.colorScheme.hlink);
    expect(theme.colorScheme.folHlink).toBe(OFFICE_THEME.colorScheme.folHlink);

    // Verify entire color scheme matches
    expect(theme.colorScheme).toEqual(OFFICE_THEME.colorScheme);
  });

  it("should extract font scheme from generated POTX (round-trip)", async () => {
    const result = await extractThemeFromPptx(officeThemeFile);

    expect(result.success).toBe(true);
    if (!result.success) {return;}

    const { theme } = result;

    // Verify major font (latin only - eastAsian/complexScript are undefined)
    expect(theme.fontScheme.majorFont.latin).toBe(OFFICE_THEME.fontScheme.majorFont.latin);
    expect(theme.fontScheme.minorFont.latin).toBe(OFFICE_THEME.fontScheme.minorFont.latin);
  });

  it("should set theme name from file name", async () => {
    const result = await extractThemeFromPptx(officeThemeFile);

    expect(result.success).toBe(true);
    if (!result.success) {return;}

    // File name is "Office.potx", so theme name should be "Office"
    expect(result.theme.name).toBe("Office");
  });

  it("should handle theme with custom name", async () => {
    // Generate POTX with custom name
    const customBlob = await exportThemeAsPotx({
      name: "Custom Theme",
      colorScheme: OFFICE_THEME.colorScheme,
      fontScheme: OFFICE_THEME.fontScheme,
    });
    const customFile = new File([customBlob], "My Custom Theme.potx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.template",
    });

    const result = await extractThemeFromPptx(customFile);

    expect(result.success).toBe(true);
    if (!result.success) {return;}

    // Theme name comes from file name, not internal name
    expect(result.theme.name).toBe("My Custom Theme");
  });
});
