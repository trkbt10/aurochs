/**
 * @file Media embedding helpers for picture shapes
 */

import type { MediaReference } from "@aurochs-office/pptx/domain/shape";
import type { MediaContentType } from "@aurochs-office/opc";
import type { MediaEmbedSpec } from "../types";

/**
 * Detect the MIME type of embedded media from spec.mimeType or file extension.
 */
export function detectEmbeddedMediaType(spec: MediaEmbedSpec): MediaContentType {
  return spec.mimeType as MediaContentType;
}

/**
 * Build a MediaReference object from a media embed spec.
 */
export function buildMediaReferenceFromSpec(
  spec: MediaEmbedSpec,
  rId: string,
  contentType: string,
): {
  readonly mediaType: "video" | "audio";
  readonly media: MediaReference;
} {
  if (!spec) {
    throw new Error("media spec is required");
  }
  if (!spec.type) {
    throw new Error("media.type is required");
  }
  if (!spec.data) {
    throw new Error("media.data is required");
  }
  if (!rId) {
    throw new Error("media rId is required");
  }

  if (spec.type === "video") {
    return {
      mediaType: "video",
      media: { videoFile: { link: rId, contentType } },
    };
  }
  return {
    mediaType: "audio",
    media: { audioFile: { link: rId, contentType } },
  };
}
