/**
 * @file Media embedding helpers for picture shapes
 */

import type { MediaReference } from "@oxen-office/pptx/domain/shape";
import type { MediaType } from "@oxen-builder/pptx/patcher/resources/media-manager";
import type { MediaEmbedSpec } from "../types";

// PowerPoint natively supports: MP4/WMV (video), MP3/WAV/M4A (audio).
// WebM, MOV, OGG may require codec support on the playback machine.
const VIDEO_EXT_MAP: Record<string, MediaType> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

const AUDIO_EXT_MAP: Record<string, MediaType> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
};

/**
 * Detect the MIME type of embedded media from spec.mimeType or file extension.
 */
export function detectEmbeddedMediaType(spec: MediaEmbedSpec): MediaType {
  // Prefer explicit mimeType when data is provided
  if (spec.mimeType) {
    return spec.mimeType as MediaType;
  }

  const ext = spec.path?.split(".").pop()?.toLowerCase() ?? "";
  if (spec.type === "video") {
    const mimeType = VIDEO_EXT_MAP[ext];
    if (mimeType) {
      return mimeType;
    }
    throw new Error(`Unsupported video extension: .${ext} (supported: ${Object.keys(VIDEO_EXT_MAP).map((e) => `.${e}`).join(", ")})`);
  }
  if (spec.type === "audio") {
    const mimeType = AUDIO_EXT_MAP[ext];
    if (mimeType) {
      return mimeType;
    }
    throw new Error(`Unsupported audio extension: .${ext} (supported: ${Object.keys(AUDIO_EXT_MAP).map((e) => `.${e}`).join(", ")})`);
  }
  throw new Error(`Unsupported media type: ${(spec as { type: string }).type}`);
}

/**
 * Build a MediaReference object from a media embed spec.
 */
export function buildMediaReferenceFromSpec(spec: MediaEmbedSpec, rId: string, contentType: string): {
  readonly mediaType: "video" | "audio";
  readonly media: MediaReference;
} {
  if (!spec) {
    throw new Error("media spec is required");
  }
  if (!spec.type) {
    throw new Error("media.type is required");
  }
  if (!spec.path && !spec.data) {
    throw new Error("media.path or media.data is required");
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
