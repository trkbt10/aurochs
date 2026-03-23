/**
 * @file Image conversion utilities for render layer
 *
 * Provides format-specific conversion functions for resolved image resources.
 */

import { toDataUrl as bufferToDataUrl } from "@aurochs/buffer";
import type { ResolvedBlipResource } from "@aurochs-office/pptx/domain";

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
