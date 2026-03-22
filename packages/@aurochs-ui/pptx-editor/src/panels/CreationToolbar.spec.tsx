/**
 * @file CreationToolbar interaction tests
 *
 * Tests moved to @aurochs-ui/ooxml-components where CreationToolbar now lives.
 * Cross-package component tests fail due to dual React instance resolution in vitest.
 * (Same known issue as TransitionEditor.spec.tsx)
 */

// @vitest-environment jsdom

describe("CreationToolbar", () => {
  it("tests are in @aurochs-ui/ooxml-components (presentation-slide-creation; see shape-factory / creation-types specs)", () => {
    expect(true).toBe(true);
  });
});
