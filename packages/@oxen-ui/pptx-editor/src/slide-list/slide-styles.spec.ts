/**
 * @file Slide styles tests
 *
 * Tests for style consistency between editable and readonly modes
 */

import { describe, it, expect } from "vitest";
import {
  getThumbnailContainerStyle,
  getDeleteButtonStyle,
  getNumberBadgeStyle,
  getGapHoverZoneStyle,
  getAddButtonStyle,
} from "./styles";

// =============================================================================
// Thumbnail container styles
// =============================================================================

describe("getThumbnailContainerStyle", () => {
  const aspectRatio = "1.7778"; // 16:9

  describe("selection ring behavior (uses box-shadow to prevent layout shift)", () => {
    it("has no selection ring when not selected or active", () => {
      const style = getThumbnailContainerStyle(
        aspectRatio,
        false, // isSelected
        false, // isPrimary
        false  // isActive
      );

      // No border - uses box-shadow only
      expect(style.border).toBeUndefined();
      // Has base shadow but no inset selection ring
      expect(style.boxShadow).not.toContain("inset");
    });

    it("has inset box-shadow ring when selected", () => {
      const style = getThumbnailContainerStyle(
        aspectRatio,
        true,  // isSelected
        true,  // isPrimary
        false  // isActive
      );

      // Uses inset box-shadow for selection (no layout shift)
      expect(style.boxShadow).toContain("inset");
    });

    it("has inset box-shadow ring when active (current slide)", () => {
      const style = getThumbnailContainerStyle(
        aspectRatio,
        false, // isSelected
        false, // isPrimary
        true   // isActive
      );

      // Uses inset box-shadow for active state (no layout shift)
      expect(style.boxShadow).toContain("inset");
    });
  });

  describe("consistent appearance", () => {
    it("has white background", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.backgroundColor).toBe("#fff");
    });

    it("has correct aspect ratio", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.aspectRatio).toBe(aspectRatio);
    });

    it("has box shadow", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.boxShadow).toBeDefined();
      expect(style.boxShadow).not.toBe("none");
    });

    it("has overflow hidden", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.overflow).toBe("hidden");
    });
  });

  describe("layout stability", () => {
    it("produces same layout properties regardless of selection state", () => {
      const notSelected = getThumbnailContainerStyle(aspectRatio, false, false, false);
      const selected = getThumbnailContainerStyle(aspectRatio, true, true, false);

      // Layout properties should be identical (no layout shift)
      expect(notSelected.width).toBe(selected.width);
      expect(notSelected.height).toBe(selected.height);
      expect(notSelected.aspectRatio).toBe(selected.aspectRatio);
      expect(notSelected.borderRadius).toBe(selected.borderRadius);
      expect(notSelected.overflow).toBe(selected.overflow);

      // Only boxShadow differs (visual, not layout)
      expect(notSelected.boxShadow).not.toBe(selected.boxShadow);
    });
  });
});

// =============================================================================
// Delete button styles
// =============================================================================

describe("getDeleteButtonStyle", () => {
  describe("visibility", () => {
    it("is visible when visible=true", () => {
      const style = getDeleteButtonStyle(true);
      expect(style.opacity).toBe(1);
    });

    it("is hidden when visible=false", () => {
      const style = getDeleteButtonStyle(false);
      expect(style.opacity).toBe(0);
    });
  });

  describe("appearance", () => {
    it("has dark background (not red)", () => {
      const style = getDeleteButtonStyle(true);
      // Should be something like rgba(0,0,0,0.6), not a red color
      expect(style.backgroundColor).toMatch(/rgba?\s*\(\s*0\s*,\s*0\s*,\s*0/i);
    });

    it("has light text (for contrast on dark background)", () => {
      const style = getDeleteButtonStyle(true);
      // Should be white or near-white (design token: #fafafa)
      expect(style.color).toMatch(/^#f/i);
    });

    it("is positioned inside thumbnail (not outside)", () => {
      const style = getDeleteButtonStyle(true);
      // Position should be small positive values, not negative
      expect(parseInt(style.top as string)).toBeGreaterThanOrEqual(0);
      expect(parseInt(style.right as string)).toBeGreaterThanOrEqual(0);
    });

    it("is not circular (has border-radius but not 50%)", () => {
      const style = getDeleteButtonStyle(true);
      // Should be small border-radius, not 50%
      expect(style.borderRadius).not.toBe("50%");
    });
  });
});

// =============================================================================
// Number badge styles
// =============================================================================

describe("getNumberBadgeStyle", () => {
  describe("vertical orientation", () => {
    it("has min-width for number alignment", () => {
      const style = getNumberBadgeStyle("vertical");
      expect(style.minWidth).toBeDefined();
    });
  });

  describe("horizontal orientation", () => {
    it("has margin for spacing from slide", () => {
      const style = getNumberBadgeStyle("horizontal");
      expect(style.marginBottom).toBeDefined();
    });
  });

  describe("common properties", () => {
    it("has centered text", () => {
      const styleV = getNumberBadgeStyle("vertical");
      const styleH = getNumberBadgeStyle("horizontal");

      expect(styleV.textAlign).toBe("center");
      expect(styleH.textAlign).toBe("center");
    });

    it("prevents text selection", () => {
      const style = getNumberBadgeStyle("vertical");
      expect(style.userSelect).toBe("none");
    });
  });
});

// =============================================================================
// Gap hover zone styles
// =============================================================================

describe("getGapHoverZoneStyle", () => {
  describe("vertical orientation", () => {
    it("is absolutely positioned", () => {
      const style = getGapHoverZoneStyle("vertical");
      expect(style.position).toBe("absolute");
    });

    it("offsets from left to skip number badge", () => {
      const style = getGapHoverZoneStyle("vertical");
      expect(style.left).toBe("26px");
    });

    it("has height for reliable hover detection", () => {
      const style = getGapHoverZoneStyle("vertical");
      expect(parseInt(style.height as string)).toBeGreaterThanOrEqual(8);
    });

    it("uses flexbox to center button child", () => {
      const style = getGapHoverZoneStyle("vertical");
      expect(style.display).toBe("flex");
      expect(style.alignItems).toBe("center");
      expect(style.justifyContent).toBe("center");
    });
  });

  describe("horizontal orientation", () => {
    it("is absolutely positioned", () => {
      const style = getGapHoverZoneStyle("horizontal");
      expect(style.position).toBe("absolute");
    });

    it("has width for reliable hover detection", () => {
      const style = getGapHoverZoneStyle("horizontal");
      expect(parseInt(style.width as string)).toBeGreaterThanOrEqual(8);
    });
  });
});

// =============================================================================
// Add button styles
// =============================================================================

describe("getAddButtonStyle", () => {
  describe("visibility states", () => {
    it("is visible when hovered", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(style.opacity).toBe(1);
      expect(style.pointerEvents).toBe("auto");
    });

    it("is hidden when not hovered", () => {
      const style = getAddButtonStyle(false, "vertical");
      expect(style.opacity).toBe(0);
      expect(style.pointerEvents).toBe("none");
    });
  });

  describe("positioning", () => {
    it("is NOT absolutely positioned (centered by parent flex)", () => {
      const style = getAddButtonStyle(true, "vertical");
      // Button should be centered by parent flexbox, not absolute positioning
      expect(style.position).toBeUndefined();
    });

    it("prevents shrinking in flex container", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(style.flexShrink).toBe(0);
    });
  });

  describe("appearance", () => {
    it("has compact size", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(parseInt(style.width as string)).toBeLessThanOrEqual(20);
      expect(parseInt(style.height as string)).toBeLessThanOrEqual(20);
    });

    it("has accent background when visible", () => {
      const style = getAddButtonStyle(true, "vertical");
      // Should be the accent color (PowerPoint blue)
      expect(style.backgroundColor).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    });

    it("has subtle shadow when visible", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(style.boxShadow).toBeDefined();
      expect(style.boxShadow).not.toBe("none");
    });

    it("has no shadow when hidden", () => {
      const style = getAddButtonStyle(false, "vertical");
      expect(style.boxShadow).toBe("none");
    });
  });

  describe("interaction", () => {
    it("has pointer cursor", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(style.cursor).toBe("pointer");
    });

    it("prevents text selection", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(style.userSelect).toBe("none");
    });

    it("has smooth transition", () => {
      const style = getAddButtonStyle(true, "vertical");
      expect(style.transition).toBeDefined();
    });
  });
});
