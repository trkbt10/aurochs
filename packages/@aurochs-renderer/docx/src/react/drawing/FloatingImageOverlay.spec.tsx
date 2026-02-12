/**
 * @file FloatingImageOverlay Component Tests
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FloatingImageOverlay } from "./FloatingImageOverlay";
import type { PositionedFloatingImage } from "@aurochs-office/text-layout";
import { px } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockFloatingImage(overrides?: Partial<PositionedFloatingImage>): PositionedFloatingImage {
  return {
    src: "data:image/png;base64,test",
    width: px(100),
    height: px(100),
    alt: undefined,
    title: undefined,
    relationshipId: "rId1",
    horizontalRef: "column",
    horizontalOffset: px(0),
    verticalRef: "paragraph",
    verticalOffset: px(0),
    wrap: { type: "none" },
    distanceTop: px(0),
    distanceBottom: px(0),
    distanceLeft: px(0),
    distanceRight: px(0),
    behindDoc: false,
    relativeHeight: 0,
    x: px(0),
    y: px(0),
    ...overrides,
  };
}

function renderFloatingImageOverlay(props: {
  images?: readonly PositionedFloatingImage[];
  idPrefix?: string;
}): string {
  const element = createElement(FloatingImageOverlay, {
    images: props.images ?? [],
    idPrefix: props.idPrefix,
  });
  return renderToStaticMarkup(element);
}

// =============================================================================
// Tests
// =============================================================================

describe("FloatingImageOverlay", () => {
  describe("basic rendering", () => {
    it("returns null for empty images array", () => {
      const html = renderFloatingImageOverlay({ images: [] });
      expect(html).toBe("");
    });

    it("renders single image", () => {
      const images = [createMockFloatingImage({ x: px(50), y: px(100) })];
      const html = renderFloatingImageOverlay({ images });

      expect(html).toContain("<image");
      expect(html).toContain('href="data:image/png;base64,test"');
      expect(html).toContain('x="50"');
      expect(html).toContain('y="100"');
    });

    it("renders multiple images", () => {
      const images = [
        createMockFloatingImage({ src: "data:image/png;base64,img1", x: px(0), y: px(0) }),
        createMockFloatingImage({ src: "data:image/png;base64,img2", x: px(200), y: px(100) }),
      ];
      const html = renderFloatingImageOverlay({ images });

      expect(html).toContain('href="data:image/png;base64,img1"');
      expect(html).toContain('href="data:image/png;base64,img2"');
    });

    it("adds data-element-type attribute", () => {
      const images = [createMockFloatingImage()];
      const html = renderFloatingImageOverlay({ images });

      expect(html).toContain('data-element-type="floating-image"');
    });

    it("skips images with empty src", () => {
      const images = [createMockFloatingImage({ src: "" })];
      const html = renderFloatingImageOverlay({ images });

      expect(html).not.toContain("<image");
    });
  });

  describe("z-ordering", () => {
    it("adds behind-doc and relative-height attributes", () => {
      const images = [
        createMockFloatingImage({ behindDoc: true, relativeHeight: 100 }),
      ];
      const html = renderFloatingImageOverlay({ images });

      expect(html).toContain('data-behind-doc="true"');
      expect(html).toContain('data-relative-height="100"');
    });

    it("sorts behindDoc images before regular images", () => {
      const images = [
        createMockFloatingImage({ src: "data:image/png;base64,front", behindDoc: false, relativeHeight: 100 }),
        createMockFloatingImage({ src: "data:image/png;base64,back", behindDoc: true, relativeHeight: 0 }),
      ];
      const html = renderFloatingImageOverlay({ images });

      // Behind doc image should appear first in the output
      const backIndex = html.indexOf("data:image/png;base64,back");
      const frontIndex = html.indexOf("data:image/png;base64,front");
      expect(backIndex).toBeLessThan(frontIndex);
    });

    it("sorts by relativeHeight within same layer", () => {
      const images = [
        createMockFloatingImage({ src: "data:image/png;base64,high", relativeHeight: 200 }),
        createMockFloatingImage({ src: "data:image/png;base64,low", relativeHeight: 100 }),
      ];
      const html = renderFloatingImageOverlay({ images });

      // Lower relativeHeight should appear first
      const lowIndex = html.indexOf("data:image/png;base64,low");
      const highIndex = html.indexOf("data:image/png;base64,high");
      expect(lowIndex).toBeLessThan(highIndex);
    });
  });

  describe("cropping", () => {
    it("renders cropped image with clipPath", () => {
      const images = [
        createMockFloatingImage({
          srcRect: { left: 10, top: 10, right: 10, bottom: 10 },
        }),
      ];
      const html = renderFloatingImageOverlay({ images, idPrefix: "test" });

      expect(html).toContain("<clipPath");
      expect(html).toContain('id="test-clip-0"');
      expect(html).toContain('clip-path="url(#test-clip-0)"');
    });

    it("does not apply clipPath for zero srcRect", () => {
      const images = [
        createMockFloatingImage({
          srcRect: { left: 0, top: 0, right: 0, bottom: 0 },
        }),
      ];
      const html = renderFloatingImageOverlay({ images });

      expect(html).not.toContain("<clipPath");
    });
  });

  describe("accessibility", () => {
    it("renders title element for alt text", () => {
      const images = [createMockFloatingImage({ alt: "Test image description" })];
      const html = renderFloatingImageOverlay({ images });

      expect(html).toContain("<title>Test image description</title>");
    });
  });
});
