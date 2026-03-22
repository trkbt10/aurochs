/**
 * @file Group node builder
 *
 * GROUP nodes are containers for grouping multiple nodes together.
 * Unlike FRAME, GROUP nodes don't have their own fill or background.
 */

export type GroupNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly size?: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
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
function buildGroupTransform(state: { x: number; y: number; rotation: number }): GroupNodeData["transform"] {
  if (state.rotation === 0) {
    return { m00: 1, m01: 0, m02: state.x, m10: 0, m11: 1, m12: state.y };
  }
  const rad = (state.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { m00: cos, m01: -sin, m02: state.x, m10: sin, m11: cos, m12: state.y };
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
