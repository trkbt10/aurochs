/**
 * @file Hook for OLE object preview resolution
 *
 * Encapsulates resource resolution for OLE object preview images.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */

import { useMemo } from "react";
import type { OleReference } from "../../../../../domain";
import { useRenderContext, useRenderResources } from "../../../context";

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
  const { warnings } = useRenderContext();

  return useMemo(() => {
    if (oleData === undefined) {
      return {
        previewUrl: undefined,
        hasPreview: false,
        showAsIcon: false,
        objectName: undefined,
        progId: undefined,
      };
    }

    const showAsIcon = oleData.showAsIcon ?? false;
    const objectName = oleData.name;
    const progId = oleData.progId;

    // Try pre-resolved preview image first
    if (oleData.previewImageUrl !== undefined) {
      return {
        previewUrl: oleData.previewImageUrl,
        hasPreview: true,
        showAsIcon,
        objectName,
        progId,
      };
    }

    // Try p:pic child element
    if (oleData.pic?.resourceId !== undefined) {
      const dataUrl = resources.resolve(oleData.pic.resourceId);
      if (dataUrl !== undefined) {
        return {
          previewUrl: dataUrl,
          hasPreview: true,
          showAsIcon,
          objectName,
          progId,
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
    };
  }, [oleData, resources, warnings]);
}
