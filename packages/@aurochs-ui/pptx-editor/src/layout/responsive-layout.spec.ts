/**
 * @file responsive-layout.spec
 */

import { resolveEditorLayoutMode } from "./responsive-layout";

describe("resolveEditorLayoutMode", () => {
  it("treats unknown width as desktop", () => {
    expect(resolveEditorLayoutMode(0, { mobileMaxWidth: 768, tabletMaxWidth: 1024 })).toBe("desktop");
  });

  it("selects mobile at or below mobileMaxWidth", () => {
    expect(resolveEditorLayoutMode(768, { mobileMaxWidth: 768, tabletMaxWidth: 1024 })).toBe("mobile");
    expect(resolveEditorLayoutMode(320, { mobileMaxWidth: 768, tabletMaxWidth: 1024 })).toBe("mobile");
  });

  it("selects tablet between mobileMaxWidth and tabletMaxWidth", () => {
    expect(resolveEditorLayoutMode(800, { mobileMaxWidth: 768, tabletMaxWidth: 1024 })).toBe("tablet");
    expect(resolveEditorLayoutMode(1024, { mobileMaxWidth: 768, tabletMaxWidth: 1024 })).toBe("tablet");
  });

  it("selects desktop above tabletMaxWidth", () => {
    expect(resolveEditorLayoutMode(1400, { mobileMaxWidth: 768, tabletMaxWidth: 1024 })).toBe("desktop");
  });
});
