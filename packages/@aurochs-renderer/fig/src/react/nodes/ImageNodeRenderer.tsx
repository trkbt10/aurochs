/**
 * @file Image node React renderer
 *
 * Renders an image node as an SVG <image> element with base64 data URI.
 */

import { memo, useMemo } from "react";
import type { ImageNode } from "../../scene-graph/types";
import { matrixToSvgTransform, uint8ArrayToBase64 } from "../../scene-graph/render";

type Props = {
  readonly node: ImageNode;
};

function ImageNodeRendererImpl({ node }: Props) {
  const transformStr = matrixToSvgTransform(node.transform);

  const dataUri = useMemo(() => {
    if (!node.data || node.data.length === 0) {
      return undefined;
    }
    const base64 = uint8ArrayToBase64(node.data);
    return `data:${node.mimeType};base64,${base64}`;
  }, [node.data, node.mimeType]);

  if (!dataUri) {
    return null;
  }

  const imageEl = (
    <image
      href={dataUri}
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      preserveAspectRatio="xMidYMid slice"
    />
  );

  if (transformStr || node.opacity < 1) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
      >
        {imageEl}
      </g>
    );
  }

  return imageEl;
}

export const ImageNodeRenderer = memo(ImageNodeRendererImpl);
