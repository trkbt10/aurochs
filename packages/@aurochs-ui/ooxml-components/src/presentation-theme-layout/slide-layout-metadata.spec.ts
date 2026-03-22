/**
 * @file slide-layout-metadata.spec — SoT completeness for ST_SlideLayoutType
 */

import {
  SLIDE_LAYOUT_TYPE_LABELS,
  SLIDE_LAYOUT_TYPE_UI_ORDER,
  slideLayoutTypeSelectOptions,
} from "./slide-layout-metadata";

describe("slide-layout-metadata (SoT)", () => {
  it("UI order is a permutation of all layout types", () => {
    const fromLabels = new Set(Object.keys(SLIDE_LAYOUT_TYPE_LABELS));
    const fromOrder = new Set(SLIDE_LAYOUT_TYPE_UI_ORDER);
    expect(fromOrder.size).toBe(SLIDE_LAYOUT_TYPE_UI_ORDER.length);
    expect(fromOrder).toEqual(fromLabels);
  });

  it("slideLayoutTypeSelectOptions(false) has one option per type", () => {
    const opts = slideLayoutTypeSelectOptions(false);
    expect(opts).toHaveLength(SLIDE_LAYOUT_TYPE_UI_ORDER.length);
    expect(opts.every((o) => o.value !== "")).toBe(true);
  });

  it("slideLayoutTypeSelectOptions(true) prepends Default", () => {
    const opts = slideLayoutTypeSelectOptions(true);
    expect(opts[0]).toEqual({ value: "", label: "Default" });
    expect(opts).toHaveLength(SLIDE_LAYOUT_TYPE_UI_ORDER.length + 1);
  });
});
