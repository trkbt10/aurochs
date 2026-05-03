/** @file Fig image asset helpers for fill/stroke editors. */

import type { FigImage } from "@aurochs/fig/parser";

export type CreateFigImageAssetParams = {
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly fileName: string;
};

/** Build a stable image asset entry and ref for a browser-selected file. */
export function createFigImageAsset({ data, mimeType, fileName }: CreateFigImageAssetParams): FigImage {
  if (data.length === 0) {
    throw new Error("Image asset data is empty");
  }
  if (!mimeType.startsWith("image/")) {
    throw new Error(`Unsupported image MIME type: ${mimeType}`);
  }
  const extension = resolveImageExtension({ mimeType, fileName });
  const ref = `${hashBytes(data)}.${extension}`;
  return { ref, data, mimeType };
}

function resolveImageExtension({ mimeType, fileName }: { readonly mimeType: string; readonly fileName: string }): string {
  const lowerName = fileName.toLowerCase();
  const nameExt = lowerName.match(/\.([a-z0-9]+)$/)?.[1];
  if (nameExt && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(nameExt)) {
    return nameExt === "jpeg" ? "jpg" : nameExt;
  }
  switch (mimeType) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/gif": return "gif";
    case "image/webp": return "webp";
    case "image/svg+xml": return "svg";
    default: throw new Error(`Unsupported image MIME type: ${mimeType}`);
  }
}

function hashBytes(data: Uint8Array): string {
  const hash = data.reduce((current, byte) => Math.imul(current ^ byte, 0x01000193), 0x811C9DC5);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
