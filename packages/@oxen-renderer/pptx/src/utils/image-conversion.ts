/**
 * @file Image conversion utilities for render layer
 *
 * Provides format-specific conversion functions for resolved image resources.
 * Resolution is done by ResourceContext at parse time; conversion is done here
 * at render time based on the target format's requirements.
 */

import { toDataUrl as bufferToDataUrl } from "@oxen/buffer";
import type { ResolvedBlipResource } from "@oxen-office/pptx/domain";
import type { ResourceStore } from "@oxen-office/pptx/domain/resource-store";

/**
 * Convert resolved blip resource to Data URL.
 *
 * Use this for SVG rendering where Data URLs are embedded inline.
 *
 * @param resolved - Resolved image resource from parse layer
 * @returns Data URL string (e.g., "data:image/png;base64,...")
 */
export function blipToDataUrl(resolved: ResolvedBlipResource): string {
  return bufferToDataUrl(resolved.data, resolved.mimeType);
}

/**
 * Convert resolved blip resource to Blob URL.
 *
 * Use this for React/browser rendering where Blob URLs provide better
 * performance for large images (no base64 encoding overhead).
 *
 * Note: Blob URLs must be revoked when no longer needed to prevent memory leaks.
 *
 * @param resolved - Resolved image resource from parse layer
 * @returns Blob URL string (e.g., "blob:...")
 */
export function blipToBlobUrl(resolved: ResolvedBlipResource): string {
  const blob = new Blob([resolved.data], { type: resolved.mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Get image source from BlipFill, preferring resolved resource.
 *
 * This is the standard method for getting an image source in the render layer.
 * It handles both pre-resolved resources and fallback to resourceId.
 *
 * @param blipFill - BlipFill with optional resolvedResource
 * @param fallbackResolver - Optional fallback resolver for unresolved resources
 * @returns Image source (Data URL, blob URL, or resolved path)
 */
export function getBlipFillImageSrc(
  blipFill: {
    readonly resourceId: string;
    readonly resolvedResource?: ResolvedBlipResource;
  },
  fallbackResolver?: (rId: string) => string | undefined,
): string | undefined {
  // 1. If already resolved at parse time, convert to Data URL
  if (blipFill.resolvedResource !== undefined) {
    return blipToDataUrl(blipFill.resolvedResource);
  }

  // 2. If resourceId is already a data URL, use it directly
  if (blipFill.resourceId.startsWith("data:")) {
    return blipFill.resourceId;
  }

  // 3. Fallback to runtime resolver (legacy path)
  if (fallbackResolver !== undefined) {
    return fallbackResolver(blipFill.resourceId);
  }

  return undefined;
}

/**
 * Resolve image URL with ResourceStore priority.
 *
 * Resolution order:
 * 1. ResourceStore.toDataUrl() - centralized resource management
 * 2. fallbackResolver - runtime resolution
 *
 * @param resourceId - Resource ID (rId)
 * @param resourceStore - Centralized resource store (optional)
 * @param fallbackResolver - Runtime fallback resolver (optional)
 * @returns Image source URL or undefined
 */
export function resolveImageUrl(
  resourceId: string,
  resourceStore?: ResourceStore,
  fallbackResolver?: (rId: string) => string | undefined,
): string | undefined {
  // 1. If resourceId is already a data URL, use it directly
  if (resourceId.startsWith("data:")) {
    return resourceId;
  }

  // 2. ResourceStore - centralized resource management (preferred)
  if (resourceStore !== undefined) {
    const url = resourceStore.toDataUrl(resourceId);
    if (url !== undefined) {
      return url;
    }
  }

  // 3. Fallback: runtime resolver
  if (fallbackResolver !== undefined) {
    return fallbackResolver(resourceId);
  }

  return undefined;
}
