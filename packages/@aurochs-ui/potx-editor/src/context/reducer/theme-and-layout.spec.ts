/**
 * @file ECMA-376 theme state & layout CRUD tests
 *
 * Exhaustive tests for all ThemeEditorAction types that do NOT involve
 * shape manipulation (those are in layout-shapes.spec.ts).
 *
 * Coverage:
 * - Theme color scheme (a:clrScheme) — UPDATE/ADD/REMOVE/RENAME
 * - Font scheme (a:fontScheme) — UPDATE major/minor, name
 * - Theme preset application
 * - Master background, color mapping
 * - Custom colors (a:custClrLst)
 * - Extra color schemes
 * - Format scheme (a:fmtScheme), object defaults, master text styles
 * - Layout overrides (background, color map, transition)
 * - Layout CRUD (add, delete, duplicate, reorder, update attributes)
 * - Layout selection state machine
 */

import type { ThemeEditorState, ThemeEditorAction, LayoutListEntry } from "../types";
import { themeEditorReducer, createInitialThemeEditorState } from "./index";
import type { CustomColor, ExtraColorScheme } from "@aurochs-office/pptx/domain/theme/types";

// =============================================================================
// Helpers
// =============================================================================

function reduce(state: ThemeEditorState, action: ThemeEditorAction): ThemeEditorState {
  return themeEditorReducer(state, action);
}

function base(): ThemeEditorState {
  return createInitialThemeEditorState({
    colorScheme: {
      dk1: "000000", lt1: "FFFFFF", dk2: "333333", lt2: "EEEEEE",
      accent1: "4472C4", accent2: "ED7D31", accent3: "A5A5A5",
      accent4: "FFC000", accent5: "5B9BD5", accent6: "70AD47",
      hlink: "0563C1", folHlink: "954F72",
    },
    fontScheme: { majorFont: { latin: "Calibri Light" }, minorFont: { latin: "Calibri" } },
    themeName: "Test Theme",
    fontSchemeName: "Test Fonts",
  });
}

function withLayouts(state: ThemeEditorState, layouts: readonly LayoutListEntry[]): ThemeEditorState {
  return reduce(state, { type: "INIT_LAYOUT_LIST", layouts });
}

// ===========================================================================
// a:clrScheme — Color Scheme (ECMA-376 20.1.6.2)
// ===========================================================================

describe("Color scheme (a:clrScheme)", () => {
  it("UPDATE_COLOR_SCHEME updates a single color slot", () => {
    const s = reduce(base(), { type: "UPDATE_COLOR_SCHEME", name: "accent1", color: "FF0000" });
    expect(s.colorScheme.accent1).toBe("FF0000");
    // Other colors unchanged
    expect(s.colorScheme.dk1).toBe("000000");
  });

  it("ADD_SCHEME_COLOR adds a new named color", () => {
    const s = reduce(base(), { type: "ADD_SCHEME_COLOR", name: "customSlot", color: "AABBCC" });
    expect(s.colorScheme["customSlot"]).toBe("AABBCC");
  });

  it("REMOVE_SCHEME_COLOR removes a color slot", () => {
    const s = reduce(base(), { type: "REMOVE_SCHEME_COLOR", name: "accent6" });
    expect(s.colorScheme["accent6"]).toBeUndefined();
    // Other colors intact
    expect(s.colorScheme.accent1).toBe("4472C4");
  });

  it("RENAME_SCHEME_COLOR renames a color slot preserving value", () => {
    const s = reduce(base(), { type: "RENAME_SCHEME_COLOR", oldName: "accent1", newName: "primary" });
    expect(s.colorScheme["primary"]).toBe("4472C4");
    expect(s.colorScheme["accent1"]).toBeUndefined();
  });

  it("RENAME_SCHEME_COLOR with nonexistent name is no-op", () => {
    const s0 = base();
    const s1 = reduce(s0, { type: "RENAME_SCHEME_COLOR", oldName: "nonexistent", newName: "x" });
    expect(s1.colorScheme).toEqual(s0.colorScheme);
  });

  it("all 12 standard scheme slots are present", () => {
    const s = base();
    const required = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
    for (const slot of required) {
      expect(s.colorScheme[slot]).toBeDefined();
    }
  });
});

// ===========================================================================
// a:fontScheme — Font Scheme (ECMA-376 20.1.4.1.18)
// ===========================================================================

describe("Font scheme (a:fontScheme)", () => {
  it("UPDATE_FONT_SCHEME updates major font", () => {
    const s = reduce(base(), { type: "UPDATE_FONT_SCHEME", target: "major", spec: { latin: "Arial Black" } });
    expect(s.fontScheme?.majorFont.latin).toBe("Arial Black");
    expect(s.fontScheme?.minorFont.latin).toBe("Calibri");
  });

  it("UPDATE_FONT_SCHEME updates minor font", () => {
    const s = reduce(base(), { type: "UPDATE_FONT_SCHEME", target: "minor", spec: { latin: "Georgia", eastAsian: "MS Gothic" } });
    expect(s.fontScheme?.minorFont.latin).toBe("Georgia");
    expect(s.fontScheme?.minorFont.eastAsian).toBe("MS Gothic");
    expect(s.fontScheme?.majorFont.latin).toBe("Calibri Light");
  });

  it("UPDATE_FONT_SCHEME is no-op when fontScheme is undefined", () => {
    const s0 = createInitialThemeEditorState({ colorScheme: base().colorScheme });
    const s1 = reduce(s0, { type: "UPDATE_FONT_SCHEME", target: "major", spec: { latin: "Arial" } });
    expect(s1.fontScheme).toBeUndefined();
  });

  it("UPDATE_FONT_SCHEME_NAME updates font scheme name", () => {
    const s = reduce(base(), { type: "UPDATE_FONT_SCHEME_NAME", name: "Custom Fonts" });
    expect(s.fontSchemeName).toBe("Custom Fonts");
  });
});

// ===========================================================================
// Theme names & presets
// ===========================================================================

describe("Theme names & presets", () => {
  it("UPDATE_THEME_NAME updates theme name", () => {
    const s = reduce(base(), { type: "UPDATE_THEME_NAME", name: "My Custom Theme" });
    expect(s.themeName).toBe("My Custom Theme");
  });

  it("APPLY_THEME_PRESET replaces colors, fonts, and names", () => {
    const preset = {
      id: "test",
      name: "Preset Theme",
      colorScheme: { ...base().colorScheme, accent1: "112233" },
      fontScheme: { majorFont: { latin: "Impact" }, minorFont: { latin: "Verdana" } },
    };
    const s = reduce(base(), { type: "APPLY_THEME_PRESET", preset });
    expect(s.themeName).toBe("Preset Theme");
    expect(s.colorScheme.accent1).toBe("112233");
    expect(s.fontScheme?.majorFont.latin).toBe("Impact");
    expect(s.fontSchemeName).toBe("Preset Theme");
  });
});

// ===========================================================================
// Master background & color mapping (p:sldMaster)
// ===========================================================================

describe("Master background & color mapping", () => {
  it("UPDATE_MASTER_BACKGROUND sets fill", () => {
    const s = reduce(base(), { type: "UPDATE_MASTER_BACKGROUND", background: { fill: { type: "solidFill", color: { type: "srgb", value: "FF0000" } } } });
    expect(s.masterBackground.fill?.type).toBe("solidFill");
  });

  it("UPDATE_MASTER_BACKGROUND sets shadeToTitle", () => {
    const s = reduce(base(), { type: "UPDATE_MASTER_BACKGROUND", background: { shadeToTitle: true } });
    expect(s.masterBackground.shadeToTitle).toBe(true);
  });

  it("UPDATE_MASTER_COLOR_MAPPING updates full mapping", () => {
    const mapping = { ...base().masterColorMapping, bg1: "dk1", tx1: "lt1" };
    const s = reduce(base(), { type: "UPDATE_MASTER_COLOR_MAPPING", mapping });
    expect(s.masterColorMapping.bg1).toBe("dk1");
    expect(s.masterColorMapping.tx1).toBe("lt1");
  });
});

// ===========================================================================
// Custom colors (a:custClrLst — ECMA-376 20.1.6.3)
// ===========================================================================

describe("Custom colors (a:custClrLst)", () => {
  const color1: CustomColor = { type: "srgb", color: "FF0000", name: "Red" };
  const color2: CustomColor = { type: "srgb", color: "00FF00", name: "Green" };
  const color3: CustomColor = { type: "system", systemColor: "windowText", name: "System" };

  it("ADD_CUSTOM_COLOR appends color", () => {
    const s = reduce(base(), { type: "ADD_CUSTOM_COLOR", color: color1 });
    expect(s.customColors).toHaveLength(1);
    expect(s.customColors[0]).toEqual(color1);
  });

  it("ADD_CUSTOM_COLOR multiple times builds list", () => {
    let s = base();
    s = reduce(s, { type: "ADD_CUSTOM_COLOR", color: color1 });
    s = reduce(s, { type: "ADD_CUSTOM_COLOR", color: color2 });
    s = reduce(s, { type: "ADD_CUSTOM_COLOR", color: color3 });
    expect(s.customColors).toHaveLength(3);
  });

  it("REMOVE_CUSTOM_COLOR removes by index", () => {
    let s = base();
    s = reduce(s, { type: "ADD_CUSTOM_COLOR", color: color1 });
    s = reduce(s, { type: "ADD_CUSTOM_COLOR", color: color2 });
    s = reduce(s, { type: "REMOVE_CUSTOM_COLOR", index: 0 });
    expect(s.customColors).toHaveLength(1);
    expect(s.customColors[0]).toEqual(color2);
  });

  it("UPDATE_CUSTOM_COLOR replaces at index", () => {
    let s = reduce(base(), { type: "ADD_CUSTOM_COLOR", color: color1 });
    s = reduce(s, { type: "UPDATE_CUSTOM_COLOR", index: 0, color: color2 });
    expect(s.customColors[0]).toEqual(color2);
  });

  it("supports system color type", () => {
    const s = reduce(base(), { type: "ADD_CUSTOM_COLOR", color: color3 });
    expect(s.customColors[0].type).toBe("system");
    expect(s.customColors[0].systemColor).toBe("windowText");
  });
});

// ===========================================================================
// Extra color schemes (ECMA-376 20.1.6.5)
// ===========================================================================

describe("Extra color schemes", () => {
  const scheme: ExtraColorScheme = {
    name: "Extra 1",
    colorScheme: { dk1: "111111", lt1: "EEEEEE", dk2: "222222", lt2: "DDDDDD", accent1: "AA0000", accent2: "00AA00", accent3: "0000AA", accent4: "AA00AA", accent5: "00AAAA", accent6: "AAAA00", hlink: "0000FF", folHlink: "800080" },
    colorMap: { bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2", accent1: "accent1", accent2: "accent2", accent3: "accent3", accent4: "accent4", accent5: "accent5", accent6: "accent6", hlink: "hlink", folHlink: "folHlink" },
  };

  it("ADD_EXTRA_COLOR_SCHEME appends", () => {
    const s = reduce(base(), { type: "ADD_EXTRA_COLOR_SCHEME", scheme });
    expect(s.extraColorSchemes).toHaveLength(1);
    expect(s.extraColorSchemes[0].name).toBe("Extra 1");
  });

  it("REMOVE_EXTRA_COLOR_SCHEME removes by index", () => {
    let s = reduce(base(), { type: "ADD_EXTRA_COLOR_SCHEME", scheme });
    s = reduce(s, { type: "REMOVE_EXTRA_COLOR_SCHEME", index: 0 });
    expect(s.extraColorSchemes).toHaveLength(0);
  });

  it("UPDATE_EXTRA_COLOR_SCHEME replaces at index", () => {
    let s = reduce(base(), { type: "ADD_EXTRA_COLOR_SCHEME", scheme });
    const updated = { ...scheme, name: "Updated" };
    s = reduce(s, { type: "UPDATE_EXTRA_COLOR_SCHEME", index: 0, scheme: updated });
    expect(s.extraColorSchemes[0].name).toBe("Updated");
  });
});

// ===========================================================================
// Format scheme, object defaults, master text styles
// ===========================================================================

describe("Format scheme, object defaults, master text styles", () => {
  it("UPDATE_FORMAT_SCHEME sets format scheme", () => {
    const fs = { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] } as any;
    const s = reduce(base(), { type: "UPDATE_FORMAT_SCHEME", formatScheme: fs });
    expect(s.formatScheme).toBe(fs);
  });

  it("UPDATE_OBJECT_DEFAULTS sets object defaults", () => {
    const od = { lineDefault: { tag: "test" } } as any;
    const s = reduce(base(), { type: "UPDATE_OBJECT_DEFAULTS", objectDefaults: od });
    expect(s.objectDefaults).toBe(od);
  });

  it("UPDATE_MASTER_TEXT_STYLES sets master text styles", () => {
    const mts = { titleStyle: { tag: "test" } } as any;
    const s = reduce(base(), { type: "UPDATE_MASTER_TEXT_STYLES", masterTextStyles: mts });
    expect(s.masterTextStyles).toBe(mts);
  });
});

// ===========================================================================
// Layout overrides (p:sldLayout overrides per ECMA-376 19.3.1.39)
// ===========================================================================

describe("Layout overrides", () => {
  const layouts: readonly LayoutListEntry[] = [
    { id: "layout1", name: "Title Slide", type: "title" },
    { id: "layout2", name: "Blank", type: "blank" },
  ];

  it("UPDATE_LAYOUT_BACKGROUND sets per-layout background", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_BACKGROUND", layoutId: "layout1", background: { fill: { type: "solidFill", color: { type: "srgb", value: "0000FF" } } } });
    const layout = s1.layoutEdit.layouts.find((l) => l.id === "layout1");
    expect(layout?.overrides?.background?.fill?.type).toBe("solidFill");
    // Other layout unchanged
    const layout2 = s1.layoutEdit.layouts.find((l) => l.id === "layout2");
    expect(layout2?.overrides?.background).toBeUndefined();
  });

  it("UPDATE_LAYOUT_COLOR_MAP_OVERRIDE sets per-layout color map", () => {
    const s0 = withLayouts(base(), layouts);
    const override = { type: "override" as const, mappings: { ...base().masterColorMapping, bg1: "dk2" } };
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE", layoutId: "layout2", override });
    const layout = s1.layoutEdit.layouts.find((l) => l.id === "layout2");
    expect(layout?.overrides?.colorMapOverride?.type).toBe("override");
    if (layout?.overrides?.colorMapOverride?.type === "override") {
      expect(layout.overrides.colorMapOverride.mappings.bg1).toBe("dk2");
    }
  });

  it("UPDATE_LAYOUT_TRANSITION sets per-layout transition", () => {
    const s0 = withLayouts(base(), layouts);
    const transition = { type: "fade" as const, duration: 500, advanceOnClick: true };
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_TRANSITION", layoutId: "layout1", transition });
    const layout = s1.layoutEdit.layouts.find((l) => l.id === "layout1");
    expect(layout?.overrides?.transition?.type).toBe("fade");
  });

  it("UPDATE_LAYOUT_TRANSITION can clear transition", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_TRANSITION", layoutId: "layout1", transition: { type: "fade" as const } });
    const s2 = reduce(s1, { type: "UPDATE_LAYOUT_TRANSITION", layoutId: "layout1", transition: undefined });
    const layout = s2.layoutEdit.layouts.find((l) => l.id === "layout1");
    expect(layout?.overrides?.transition).toBeUndefined();
  });
});

// ===========================================================================
// Layout CRUD (p:sldLayoutIdLst — ECMA-376 19.3.1.38)
// ===========================================================================

describe("Layout CRUD", () => {
  const layouts: readonly LayoutListEntry[] = [
    { id: "L1", name: "Title Slide", type: "title" },
    { id: "L2", name: "Content", type: "obj" },
    { id: "L3", name: "Blank", type: "blank" },
  ];

  it("INIT_LAYOUT_LIST sets layouts and activates first", () => {
    const s = withLayouts(base(), layouts);
    expect(s.layoutEdit.layouts).toHaveLength(3);
    expect(s.layoutEdit.activeLayoutPath).toBe("L1");
  });

  it("SELECT_LAYOUT switches active and resets state", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "SELECT_LAYOUT", layoutPath: "L2" });
    expect(s1.layoutEdit.activeLayoutPath).toBe("L2");
    expect(s1.layoutEdit.layoutShapes).toHaveLength(0);
    expect(s1.layoutEdit.textEdit.type).toBe("inactive");
  });

  it("ADD_LAYOUT appends and activates new layout", () => {
    const s0 = withLayouts(base(), layouts);
    const newLayout: LayoutListEntry = { id: "L4", name: "New Layout", type: "blank" };
    const s1 = reduce(s0, { type: "ADD_LAYOUT", layout: newLayout });
    expect(s1.layoutEdit.layouts).toHaveLength(4);
    expect(s1.layoutEdit.activeLayoutPath).toBe("L4");
  });

  it("ADD_LAYOUT at specific index", () => {
    const s0 = withLayouts(base(), layouts);
    const newLayout: LayoutListEntry = { id: "L0", name: "First", type: "blank" };
    const s1 = reduce(s0, { type: "ADD_LAYOUT", layout: newLayout, atIndex: 0 });
    expect(s1.layoutEdit.layouts[0].id).toBe("L0");
    expect(s1.layoutEdit.layouts[1].id).toBe("L1");
  });

  it("DELETE_LAYOUT removes layout and switches active", () => {
    const s0 = reduce(withLayouts(base(), layouts), { type: "SELECT_LAYOUT", layoutPath: "L2" });
    const s1 = reduce(s0, { type: "DELETE_LAYOUT", layoutId: "L2" });
    expect(s1.layoutEdit.layouts).toHaveLength(2);
    expect(s1.layoutEdit.layouts.every((l) => l.id !== "L2")).toBe(true);
    // Active switches to next (or previous if last)
    expect(s1.layoutEdit.activeLayoutPath).toBeDefined();
    expect(s1.layoutEdit.activeLayoutPath).not.toBe("L2");
  });

  it("DELETE_LAYOUT is no-op when only 1 layout remains", () => {
    const s0 = withLayouts(base(), [layouts[0]]);
    const s1 = reduce(s0, { type: "DELETE_LAYOUT", layoutId: "L1" });
    expect(s1.layoutEdit.layouts).toHaveLength(1);
  });

  it("DUPLICATE_LAYOUT creates copy with new ID", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "DUPLICATE_LAYOUT", layoutId: "L2" });
    expect(s1.layoutEdit.layouts).toHaveLength(4);
    const dupe = s1.layoutEdit.layouts[2]; // inserted after source
    expect(dupe.name).toContain("(Copy)");
    expect(dupe.type).toBe("obj");
    expect(dupe.id).not.toBe("L2");
    expect(s1.layoutEdit.activeLayoutPath).toBe(dupe.id);
  });

  it("REORDER_LAYOUTS moves layout to new position", () => {
    const s0 = withLayouts(base(), layouts);
    // Move L3 to position 0
    const s1 = reduce(s0, { type: "REORDER_LAYOUTS", layoutId: "L3", toIndex: 0 });
    expect(s1.layoutEdit.layouts[0].id).toBe("L3");
    expect(s1.layoutEdit.layouts[1].id).toBe("L1");
    expect(s1.layoutEdit.layouts[2].id).toBe("L2");
  });

  it("UPDATE_LAYOUT_ATTRIBUTES updates name and type", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: "L1", updates: { name: "Custom Title", type: "ctrTitle" as any } });
    const layout = s1.layoutEdit.layouts.find((l) => l.id === "L1");
    expect(layout?.name).toBe("Custom Title");
    expect(layout?.type).toBe("ctrTitle");
  });

  it("UPDATE_LAYOUT_ATTRIBUTES updates matchingName", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: "L1", updates: { matchingName: "1_Title" } });
    const layout = s1.layoutEdit.layouts.find((l) => l.id === "L1");
    expect(layout?.matchingName).toBe("1_Title");
  });

  it("UPDATE_LAYOUT_ATTRIBUTES updates showMasterShapes, preserve, userDrawn", () => {
    const s0 = withLayouts(base(), layouts);
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: "L1", updates: { showMasterShapes: false, preserve: true, userDrawn: true } });
    const layout = s1.layoutEdit.layouts.find((l) => l.id === "L1");
    expect(layout?.showMasterShapes).toBe(false);
    expect(layout?.preserve).toBe(true);
    expect(layout?.userDrawn).toBe(true);
  });

  it("DELETE then SELECT maintains valid active path", () => {
    const s0 = withLayouts(base(), layouts);
    // Select last, delete it
    const s1 = reduce(s0, { type: "SELECT_LAYOUT", layoutPath: "L3" });
    const s2 = reduce(s1, { type: "DELETE_LAYOUT", layoutId: "L3" });
    expect(s2.layoutEdit.layouts).toHaveLength(2);
    // Active should be within remaining layouts
    expect(s2.layoutEdit.layouts.some((l) => l.id === s2.layoutEdit.activeLayoutPath)).toBe(true);
  });
});

// ===========================================================================
// State isolation: theme mutations don't affect layout shapes
// ===========================================================================

describe("State isolation", () => {
  it("theme color changes do not affect layoutEdit", () => {
    const s0 = base();
    const layoutBefore = s0.layoutEdit;
    const s1 = reduce(s0, { type: "UPDATE_COLOR_SCHEME", name: "accent1", color: "FF0000" });
    expect(s1.layoutEdit).toBe(layoutBefore);
  });

  it("font scheme changes do not affect layoutEdit", () => {
    const s0 = base();
    const layoutBefore = s0.layoutEdit;
    const s1 = reduce(s0, { type: "UPDATE_FONT_SCHEME", target: "major", spec: { latin: "Impact" } });
    expect(s1.layoutEdit).toBe(layoutBefore);
  });

  it("master background changes do not affect layoutEdit", () => {
    const s0 = base();
    const layoutBefore = s0.layoutEdit;
    const s1 = reduce(s0, { type: "UPDATE_MASTER_BACKGROUND", background: { shadeToTitle: true } });
    expect(s1.layoutEdit).toBe(layoutBefore);
  });
});
