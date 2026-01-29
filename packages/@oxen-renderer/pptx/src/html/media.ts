/**
 * @file Media renderer
 *
 * Renders video and audio media elements to HTML.
 */

import type { PicShape, Transform } from "@oxen-office/pptx/domain/index";
import type { HtmlString } from "./primitives";
import { createElement, unsafeHtml, buildStyle, EMPTY_HTML } from "./primitives";
import type { HtmlRenderContext } from "./context";
import { extractTransformData, buildCssPositionStyles } from "../transform";

// =============================================================================
// Types
// =============================================================================

/**
 * Media render result
 */
export type MediaRenderResult = {
  readonly html: HtmlString;
  readonly isSupported: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const videoStyle = "width: 100%; height: 100%;";
const audioStyle = "width: 100%;";
const iframeStyle = "width: 100%; height: 100%; border: none;";
const errorStyle = "color: red;";

// =============================================================================
// Video Rendering
// =============================================================================

/**
 * Render video element from PicShape
 */
export function renderVideo(
  shape: PicShape,
  transform: Transform,
  ctx: HtmlRenderContext
): MediaRenderResult {
  const resourceId = shape.blipFill.resourceId;
  const src = ctx.resources.resolve(resourceId);

  if (!src) {
    ctx.warnings.add({
      type: "fallback",
      message: `Video resource not found: ${resourceId}`,
      element: "video",
    });
    return {
      html: createErrorElement("Video file not found"),
      isSupported: false,
    };
  }

  // Check if it's an external video (YouTube, etc.)
  if (isExternalVideoUrl(src)) {
    return renderExternalVideo(src, transform);
  }

  // Embedded video
  return renderEmbeddedVideo(src, transform);
}

/**
 * Check if URL is an external video service
 */
function isExternalVideoUrl(url: string): boolean {
  const externalPatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
  ];
  return externalPatterns.some((pattern) => pattern.test(url));
}

/**
 * Render external video (YouTube, Vimeo, etc.) as iframe
 */
function renderExternalVideo(
  src: string,
  transform: Transform
): MediaRenderResult {
  const positionStyles = buildPositionStyles(transform);

  const html = createElement(
    "div",
    {
      class: "media video external",
      style: buildStyle(positionStyles),
    },
    createElement("iframe", {
      src,
      style: iframeStyle,
      allowfullscreen: "true",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    })
  );

  return { html, isSupported: true };
}

/**
 * Render embedded video
 */
function renderEmbeddedVideo(
  src: string,
  transform: Transform
): MediaRenderResult {
  const positionStyles = buildPositionStyles(transform);

  const html = createElement(
    "div",
    {
      class: "media video embedded",
      style: buildStyle(positionStyles),
    },
    createElement(
      "video",
      {
        src,
        controls: "true",
        style: videoStyle,
      },
      unsafeHtml("Your browser does not support the video tag.")
    )
  );

  return { html, isSupported: true };
}

// =============================================================================
// Audio Rendering
// =============================================================================

/**
 * Render audio element from PicShape
 */
export function renderAudio(
  shape: PicShape,
  transform: Transform,
  ctx: HtmlRenderContext
): MediaRenderResult {
  const resourceId = shape.blipFill.resourceId;
  const src = ctx.resources.resolve(resourceId);

  if (!src) {
    ctx.warnings.add({
      type: "fallback",
      message: `Audio resource not found: ${resourceId}`,
      element: "audio",
    });
    return {
      html: createErrorElement("Audio file not found"),
      isSupported: false,
    };
  }

  const positionStyles = buildPositionStyles(transform);

  const html = createElement(
    "div",
    {
      class: "media audio",
      style: buildStyle(positionStyles),
    },
    createElement(
      "audio",
      {
        controls: "true",
        style: audioStyle,
      },
      createElement("source", { src }),
      unsafeHtml("Your browser does not support the audio tag.")
    )
  );

  return { html, isSupported: true };
}

// =============================================================================
// Media Rendering Entry Point
// =============================================================================

/**
 * Render media element (video or audio) from PicShape
 *
 * @param shape - Picture shape with mediaType set
 * @param ctx - HTML render context
 * @returns Rendered HTML or EMPTY_HTML if no media type
 */
export function renderMedia(
  shape: PicShape,
  ctx: HtmlRenderContext
): HtmlString {
  const transform = shape.properties.transform;
  if (!transform) {
    return EMPTY_HTML;
  }

  const mediaType = shape.mediaType;
  if (!mediaType) {
    return EMPTY_HTML;
  }

  switch (mediaType) {
    case "video":
      return renderVideo(shape, transform, ctx).html;
    case "audio":
      return renderAudio(shape, transform, ctx).html;
    default:
      return EMPTY_HTML;
  }
}

/**
 * Check if a PicShape contains media (video or audio)
 */
export function hasMedia(shape: PicShape): boolean {
  return shape.mediaType === "video" || shape.mediaType === "audio";
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Build position styles from transform using core transform utilities
 */
function buildPositionStyles(transform: Transform): Record<string, string> {
  return buildCssPositionStyles(extractTransformData(transform));
}

/**
 * Create error element for missing or unsupported media
 */
function createErrorElement(message: string): HtmlString {
  return createElement(
    "span",
    { style: errorStyle },
    unsafeHtml(message)
  );
}
