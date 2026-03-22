/**
 * @file Editors index barrel tests
 *
 * Verifies intentionally removed exports stay removed.
 */

import * as editors from "./index";

describe("pptx-editor/editors index exports", () => {
  it("does not re-export LineEditor-related symbols", () => {
    expect("LineEditor" in editors).toBe(false);
    expect("LineEditorProps" in editors).toBe(false);
    expect("createDefaultLine" in editors).toBe(false);
  });

  it("still exports core editors", () => {
    expect(editors.FillEditor).toBeTypeOf("function");
    expect(editors.ShapePropertiesEditor).toBeTypeOf("function");
    expect(editors.TextBodyEditor).toBeTypeOf("function");
  });

  it("does not re-export SlideLayoutEditor (SoT: ooxml-components/presentation-theme-layout)", () => {
    expect("SlideLayoutEditor" in editors).toBe(false);
    expect("SlideLayoutEditorProps" in editors).toBe(false);
  });

  it("does not re-export SlideSizeEditor (SoT: ooxml-components/presentation-theme-layout)", () => {
    expect("SlideSizeEditor" in editors).toBe(false);
    expect("SlideSizeEditorProps" in editors).toBe(false);
    expect("createDefaultSlideSize" in editors).toBe(false);
  });
});

