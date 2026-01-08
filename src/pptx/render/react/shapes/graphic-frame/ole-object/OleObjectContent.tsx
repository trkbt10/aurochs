/**
 * @file OLE object content renderer for GraphicFrame
 *
 * Renders OLE object content within a graphic frame using the useOlePreview hook
 * for preview image resolution.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */

import { memo } from "react";
import type { OleReference } from "../../../../../domain";
import { useOlePreview } from "./useOlePreview";
import { Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for OleObjectContent component
 */
export type OleObjectContentProps = ContentProps<OleReference>;

/**
 * Renders OLE object content within a GraphicFrame.
 *
 * Uses useOlePreview hook to encapsulate resource resolution,
 * ensuring correct preview image is displayed.
 */
export const OleObjectContent = memo(function OleObjectContent({
  data,
  width,
  height,
}: OleObjectContentProps) {
  const { previewUrl, hasPreview } = useOlePreview(data);

  if (!hasPreview || previewUrl === undefined) {
    return <Placeholder width={width} height={height} label="OLE Object" />;
  }

  return (
    <image
      href={previewUrl}
      x={0}
      y={0}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
    />
  );
});
