/**
 * @file Picture Component Tests
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Picture } from "./Picture";
import type { DrawingPicture, DrawingBlipFill } from "@aurochs-office/ooxml/domain/drawing";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockPicture(blipFill?: DrawingBlipFill): DrawingPicture {
  return {
    blipFill: blipFill ?? {
      blip: { rEmbed: "rId1" as never },
      stretch: true,
    },
    spPr: {},
  };
}

function renderPicture(props: {
  picture?: DrawingPicture;
  width?: number;
  height?: number;
  imageUrl?: string;
  clipId?: string;
}): string {
  const element = createElement(Picture, {
    picture: props.picture ?? createMockPicture(),
    width: props.width ?? 100,
    height: props.height ?? 100,
    imageUrl: props.imageUrl,
    clipId: props.clipId,
  });
  return renderToStaticMarkup(element);
}

// =============================================================================
// Tests
// =============================================================================

describe("Picture", () => {
  it("returns null when imageUrl is undefined", () => {
    const html = renderPicture({ imageUrl: undefined });
    expect(html).toBe("");
  });

  it("renders simple image without cropping", () => {
    const html = renderPicture({
      imageUrl: "data:image/png;base64,test",
      width: 100,
      height: 80,
    });

    expect(html).toContain("<image");
    expect(html).toContain('href="data:image/png;base64,test"');
    expect(html).toContain('width="100"');
    expect(html).toContain('height="80"');
    expect(html).toContain('preserveAspectRatio="none"');
  });

  it("renders image with cropping using clip path", () => {
    const pictureWithCrop = createMockPicture({
      blip: { rEmbed: "rId1" as never },
      stretch: true,
      srcRect: {
        l: 10000, // 10%
        t: 20000, // 20%
        r: 10000, // 10%
        b: 10000, // 10%
      },
    });

    const html = renderPicture({
      picture: pictureWithCrop,
      imageUrl: "data:image/png;base64,cropped",
      width: 100,
      height: 100,
      clipId: "test-clip",
    });

    expect(html).toContain("<clipPath");
    expect(html).toContain('id="test-clip"');
    expect(html).toContain('clip-path="url(#test-clip)"');
    expect(html).toContain("<image");
  });

  it("does not apply cropping when srcRect values are zero", () => {
    const pictureNoCrop = createMockPicture({
      blip: { rEmbed: "rId1" as never },
      stretch: true,
      srcRect: {
        l: 0,
        t: 0,
        r: 0,
        b: 0,
      },
    });

    const html = renderPicture({
      picture: pictureNoCrop,
      imageUrl: "data:image/png;base64,nocrop",
      width: 100,
      height: 100,
    });

    // Should not have clipPath for zero srcRect
    expect(html).not.toContain("<clipPath");
    expect(html).toContain('href="data:image/png;base64,nocrop"');
  });

  it("adds data-element-type attribute", () => {
    const html = renderPicture({
      imageUrl: "data:image/png;base64,test",
    });

    expect(html).toContain('data-element-type="picture"');
  });
});
