/**
 * @file pptx-editors index barrel tests
 *
 * Verifies exported symbols.
 */

import * as editors from "./index";

describe("pptx-editors index exports", () => {
  it("exports LineEditor-related symbols", () => {
    expect(editors.LineEditor).toBeTypeOf("function");
    expect(editors.createDefaultLine).toBeTypeOf("function");
  });

  it("exports core editors", () => {
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
