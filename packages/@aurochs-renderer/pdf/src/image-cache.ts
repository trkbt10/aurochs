/**
 * @file PDF image cache — caches resolved URLs for PdfImage data.
 *
 * The cache itself is strategy-agnostic: it delegates URL generation to an
 * injected `PdfImageUrlStrategy`. Two built-in strategies are provided:
 *
 * - `objectUrlStrategy()` — Browser. JPEG/PNG → immediate Object URL.
 *   Raw pixel data → placeholder + deferred encode + subscriber notification.
 *
 * - `dataUrlStrategy()` — Node/CLI. All formats → synchronous data URL.
 *   No deferred work, no subscriber notifications.
 *
 * The cache keys on `PdfImage.data` (Uint8Array reference identity).
 */

import type { PdfImage } from "@aurochs/pdf/domain";
import { isJpeg } from "@aurochs/jpeg";
import { convertToRgba } from "@aurochs/pdf/image/pixel-converter";
import { encodeRgbaToPng, isPng } from "@aurochs/png";
import { buildPdfImageDataUrl } from "./svg/image-data-url";
import type { PdfImageUrlResolver } from "./types";

// =============================================================================
// Strategy interface
// =============================================================================

/**
 * Result of attempting to resolve an image URL.
 *
 * - `url` is always set (either the real URL or a placeholder).
 * - `deferred` is set when the real encoding is scheduled for later.
 *   When it resolves, the cache replaces the placeholder with the real URL.
 */
export type ImageResolveResult = {
  /** URL to use immediately (real URL or placeholder). */
  readonly url: string;
  /** If set, a promise that resolves to the real URL after background encoding. */
  readonly deferred?: Promise<string>;
};

/**
 * Strategy for converting PdfImage data to a URL string.
 *
 * Injected into `createPdfImageCache` to decouple URL generation
 * from caching logic.
 */
export type PdfImageUrlStrategy = {
  /** Convert an image to a URL. May return a deferred result for heavy encoding. */
  readonly resolve: (image: PdfImage) => ImageResolveResult;
  /** Release a URL previously returned by resolve. Called on cache dispose. */
  readonly release: (url: string) => void;
};

// =============================================================================
// Built-in strategies
// =============================================================================

/**
 * Browser strategy: generates `blob:` Object URLs.
 *
 * - JPEG/PNG: immediate Object URL (wraps raw bytes in Blob, no encoding).
 * - Raw pixel data: returns a 1x1 transparent PNG placeholder immediately,
 *   then encodes in a `setTimeout(0)` macrotask and returns the real URL
 *   via `deferred`.
 */
export function objectUrlStrategy(): PdfImageUrlStrategy {
  return {
    resolve(image: PdfImage): ImageResolveResult {
      if (isJpeg(image.data)) {
        return { url: createObjectUrlFromBytes(image.data, "image/jpeg") };
      }
      if (isPng(image.data)) {
        return { url: createObjectUrlFromBytes(image.data, "image/png") };
      }
      // Raw pixel data — placeholder now, encode later.
      const deferred = new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(encodeRawToObjectUrl(image));
        }, 0);
      });
      return { url: PLACEHOLDER_URL, deferred };
    },
    release(url: string): void {
      // Only revoke blob: URLs; ignore data: URLs (placeholder).
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    },
  };
}

/**
 * Node/CLI strategy: generates `data:` URLs synchronously.
 *
 * All formats are resolved immediately. No deferred work.
 */
export function dataUrlStrategy(): PdfImageUrlStrategy {
  return {
    resolve(image: PdfImage): ImageResolveResult {
      return { url: buildPdfImageDataUrl(image) };
    },
    release(): void {
      // data: URLs don't need cleanup.
    },
  };
}

// =============================================================================
// Placeholder
// =============================================================================

const PLACEHOLDER_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==";

export { PLACEHOLDER_URL };

// =============================================================================
// PdfImageCache
// =============================================================================

/** Listener called when one or more deferred images finish encoding. */
export type PdfImageCacheListener = () => void;

/**
 * A cache that resolves PdfImage data to reusable URLs.
 *
 * Pass `cache.resolve` as `imageUrlResolver` in `PdfSvgRenderOptions`.
 */
export type PdfImageCache = {
  /** Resolve a PdfImage to a URL. Always synchronous. */
  readonly resolve: PdfImageUrlResolver;
  /** Number of images currently being encoded in the background. */
  readonly pending: () => number;
  /** Subscribe to encoding-complete events. Returns unsubscribe function. */
  readonly subscribe: (listener: PdfImageCacheListener) => () => void;
  /** Release all URLs and clear the cache. */
  readonly dispose: () => void;
  /** Number of cached entries (completed). */
  readonly size: () => number;
};

/**
 * Create an image cache with the given URL generation strategy.
 *
 * @param strategy - How to convert PdfImage → URL. Use `objectUrlStrategy()`
 *   for browsers or `dataUrlStrategy()` for Node/CLI.
 */
export function createPdfImageCache(strategy: PdfImageUrlStrategy): PdfImageCache {
  const cache = new Map<Uint8Array, string>();
  const encoding = new Set<Uint8Array>();
  const listeners = new Set<PdfImageCacheListener>();
  let disposed = false;

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function resolve(image: PdfImage): string {
    const existing = cache.get(image.data);
    if (existing !== undefined) {
      return existing;
    }

    const result = strategy.resolve(image);

    if (result.deferred) {
      // Deferred: use placeholder now, replace when ready.
      encoding.add(image.data);
      const dataRef = image.data;

      result.deferred.then((realUrl) => {
        encoding.delete(dataRef);
        if (disposed) {
          strategy.release(realUrl);
          return;
        }
        cache.set(dataRef, realUrl);
        notify();
      });

      return result.url;
    }

    // Immediate: cache and return.
    cache.set(image.data, result.url);
    return result.url;
  }

  function subscribe(listener: PdfImageCacheListener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function dispose(): void {
    disposed = true;
    for (const url of cache.values()) {
      strategy.release(url);
    }
    cache.clear();
    encoding.clear();
    listeners.clear();
  }

  return {
    resolve,
    pending: () => encoding.size,
    subscribe,
    dispose,
    size: () => cache.size,
  };
}

// =============================================================================
// Internal helpers (used by objectUrlStrategy)
// =============================================================================

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function createObjectUrlFromBytes(data: Uint8Array, mimeType: string): string {
  return URL.createObjectURL(new Blob([toArrayBuffer(data)], { type: mimeType }));
}

function applyAlphaChannel(rgba: Uint8ClampedArray, alpha: Uint8Array | undefined): void {
  if (!alpha) { return; }
  const pixelCount = rgba.length / 4;
  if (alpha.length !== pixelCount) { return; }
  for (let i = 0; i < pixelCount; i += 1) {
    rgba[i * 4 + 3] = alpha[i] ?? 255;
  }
}

function encodeRawToObjectUrl(image: PdfImage): string {
  const rgba = convertToRgba({
    data: image.data,
    width: image.width,
    height: image.height,
    colorSpace: image.colorSpace,
    bitsPerComponent: image.bitsPerComponent,
    decode: image.decode,
  });
  applyAlphaChannel(rgba, image.alpha);
  const pngBytes = encodeRgbaToPng(rgba, image.width, image.height);
  return URL.createObjectURL(new Blob([toArrayBuffer(pngBytes)], { type: "image/png" }));
}
