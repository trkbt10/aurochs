/**
 * @file Group node builder
 *
 * GROUP nodes are containers for grouping multiple nodes together.
 * Unlike FRAME, GROUP nodes don't have their own fill or background.
 */

import type { FigMatrix } from "../../types";
import { createTranslationMatrix, createRotationMatrix, multiplyMatrices } from "../../matrix";

export type GroupNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly size?: { x: number; y: number };
  readonly transform: FigMatrix;
  readonly visible: boolean;
  readonly opacity: number;
};

/** Group node builder instance */
export type GroupNodeBuilder = {
  name: (name: string) => GroupNodeBuilder;
  size: (width: number, height: number) => GroupNodeBuilder;
  position: (x: number, y: number) => GroupNodeBuilder;
  rotation: (degrees: number) => GroupNodeBuilder;
  visible: (v: boolean) => GroupNodeBuilder;
  opacity: (o: number) => GroupNodeBuilder;
  build: () => GroupNodeData;
};

/** Build size from state */
function buildGroupSize(state: { width?: number; height?: number }): { x: number; y: number } | undefined {
  if (state.width !== undefined && state.height !== undefined) {
    return { x: state.width, y: state.height };
  }
  return undefined;
}

/** Build transform from state */
function buildGroupTransform(state: { x: number; y: number; rotation: number }): FigMatrix {
  const translation = createTranslationMatrix(state.x, state.y);
  if (state.rotation === 0) {
    return translation;
  }
  const rad = (state.rotation * Math.PI) / 180;
  return multiplyMatrices(translation, createRotationMatrix(rad));
}

/** Create a group node builder */
function createGroupNodeBuilder(localID: number, parentID: number): GroupNodeBuilder {
  const state = {
    name: "Group",
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    x: 0,
    y: 0,
    rotation: 0,
    visible: true,
    opacity: 1,
  };

  const builder: GroupNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    /** Set size. In Figma, group size is usually auto-calculated from children bounds. */
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    rotation(degrees: number) { state.rotation = degrees; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },

    build(): GroupNodeData {
      const size = buildGroupSize(state);
      return {
        localID,
        parentID,
        name: state.name,
        size,
        transform: buildGroupTransform(state),
        visible: state.visible,
        opacity: state.opacity,
      };
    },
  };

  return builder;
}

/**
 * Create a new Group node builder
 */
export function groupNode(localID: number, parentID: number): GroupNodeBuilder {
  return createGroupNodeBuilder(localID, parentID);
}
