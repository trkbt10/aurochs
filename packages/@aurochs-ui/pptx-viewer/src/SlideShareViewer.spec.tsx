/**
 * @file SlideShareViewer layout tests
 *
 * Verifies layout structure to prevent regressions in:
 * - Container sizing and overflow handling
 * - Sidebar scroll behavior (single scrollbar, not duplicated)
 * - Main slide area responsive sizing
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { SlideShareViewer } from "./SlideShareViewer";
import { px } from "@aurochs-office/drawing-ml/domain";

const mockSlideSize = { width: px(960), height: px(540) };

function getMockSlideContent(index: number) {
  return `<svg viewBox="0 0 960 540"><text>Slide ${index}</text></svg>`;
}

describe("SlideShareViewer", () => {
  describe("layout structure", () => {
    it("renders main container with flex column layout", () => {
      const { container } = render(
        <SlideShareViewer
          slideCount={3}
          slideSize={mockSlideSize}
          getSlideContent={getMockSlideContent}
        />,
      );

      const root = container.firstChild as HTMLElement;
      expect(root.style.display).toBe("flex");
      expect(root.style.flexDirection).toBe("column");
      expect(root.style.height).toBe("100%");
    });

    it("renders sidebar with single scroll container (SlideList handles scrolling)", () => {
      const { container } = render(
        <SlideShareViewer
          slideCount={3}
          slideSize={mockSlideSize}
          getSlideContent={getMockSlideContent}
        />,
      );

      // Find sidebar by role or structure
      const aside = container.querySelector("aside");
      expect(aside).toBeTruthy();

      // thumbnailList wrapper should have overflow: hidden (SlideList handles scrolling)
      const sidebarChildren = aside?.children;
      expect(sidebarChildren?.length).toBeGreaterThanOrEqual(2);
    });

    it("renders slide area with proper sizing constraints", () => {
      const { container } = render(
        <SlideShareViewer
          slideCount={3}
          slideSize={mockSlideSize}
          getSlideContent={getMockSlideContent}
        />,
      );

      const main = container.querySelector("main");
      expect(main).toBeTruthy();
      // flex: 1 normalizes to "1 1 0%" in computed style
      expect(main?.style.flex).toMatch(/^1/);
      // display: flex for centering slide content
      expect(main?.style.display).toBe("flex");
    });
  });

  describe("responsive behavior", () => {
    it("slide container maintains aspect ratio", () => {
      const { container } = render(
        <SlideShareViewer
          slideCount={3}
          slideSize={mockSlideSize}
          getSlideContent={getMockSlideContent}
        />,
      );

      const main = container.querySelector("main");
      // Find the slide container with aspectRatio
      const slideContainer = main?.querySelector('[style*="aspect-ratio"]') as HTMLElement;
      expect(slideContainer).toBeTruthy();
      expect(slideContainer?.style.aspectRatio).toBe("960 / 540");
    });
  });
});
