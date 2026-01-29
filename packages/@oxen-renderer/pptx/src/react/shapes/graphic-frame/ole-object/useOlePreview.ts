/**
 * @file Hook for OLE object preview resolution
 *
 * Encapsulates resource resolution for OLE object preview images.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */

import { useMemo } from "react";
import type { OleReference } from "@oxen-office/pptx/domain";
import { EMU_PER_PIXEL } from "@oxen-office/pptx/domain/defaults";
import { useRenderContext, useRenderResources, useRenderResourceStore } from "../../../context";

/**
 * Result of OLE preview resolution
 */
export type OlePreviewResult = {
  /** Preview image URL (data URL or resolved resource URL) */
  readonly previewUrl: string | undefined;
  /** Whether preview is available */
  readonly hasPreview: boolean;
  /** Whether to show as icon (ECMA-376 showAsIcon attribute) */
  readonly showAsIcon: boolean;
  /** Object name for icon display */
  readonly objectName: string | undefined;
  /** Program ID for icon display (e.g., "Excel.Sheet.12") */
  readonly progId: string | undefined;
  /** Preview image width in pixels (from imgW EMU attribute) */
  readonly imageWidth: number | undefined;
  /** Preview image height in pixels (from imgH EMU attribute) */
  readonly imageHeight: number | undefined;
};

/**
 * Hook to resolve OLE object preview image.
 *
 * Tries to resolve preview image from:
 * 1. Pre-resolved previewImageUrl
 * 2. p:pic child element's resource ID
 *
 * @param oleData - OLE object reference data
 * @returns Preview resolution result
 */
export function useOlePreview(oleData: OleReference | undefined): OlePreviewResult {
  const resources = useRenderResources();
  const resourceStore = useRenderResourceStore();
  const { warnings } = useRenderContext();

  return useMemo(() => {
    if (oleData === undefined) {
      return {
        previewUrl: undefined,
        hasPreview: false,
        showAsIcon: false,
        objectName: undefined,
        progId: undefined,
        imageWidth: undefined,
        imageHeight: undefined,
      };
    }

    const showAsIcon = oleData.showAsIcon ?? false;
    const objectName = oleData.name;
    const progId = oleData.progId;

    // Convert imgW/imgH from EMU to pixels
    const imageWidth =
      oleData.imgW !== undefined ? oleData.imgW / EMU_PER_PIXEL : undefined;
    const imageHeight =
      oleData.imgH !== undefined ? oleData.imgH / EMU_PER_PIXEL : undefined;

    // Try ResourceStore first (centralized resource management)
    if (resourceStore !== undefined && oleData.resourceId !== undefined) {
      const entry = resourceStore.get(oleData.resourceId);
      if (entry?.previewUrl !== undefined) {
        return {
          previewUrl: entry.previewUrl,
          hasPreview: true,
          showAsIcon,
          objectName,
          progId,
          imageWidth,
          imageHeight,
        };
      }
    }

    // Try p:pic child element
    if (oleData.pic?.resourceId !== undefined) {
      // Check ResourceStore for pic resource first
      const picUrl = resourceStore?.toDataUrl(oleData.pic.resourceId) ?? resources.resolve(oleData.pic.resourceId);
      if (picUrl !== undefined) {
        return {
          previewUrl: picUrl,
          hasPreview: true,
          showAsIcon,
          objectName,
          progId,
          imageWidth,
          imageHeight,
        };
      }
    }

    // No preview available
    warnings.add({
      type: "fallback",
      message: `OLE object preview not available: ${oleData.progId ?? "unknown"}`,
    });

    return {
      previewUrl: undefined,
      hasPreview: false,
      showAsIcon,
      objectName,
      progId,
      imageWidth,
      imageHeight,
    };
  }, [oleData, resources, resourceStore, warnings]);
}
