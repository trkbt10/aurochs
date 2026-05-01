/**
 * @file WebGL scene state management
 *
 * Maintains a mapping from SceneNodeId to pre-computed GPU-ready data
 * (tessellated vertices, fill info, transforms). Supports incremental
 * updates via applyDiff() to avoid full re-tessellation on every frame.
 */
import type {
  SceneGraph,
  SceneNode,
  SceneNodeId,
  PathContour,
  AffineMatrix,
  Fill,
  Color,
  Effect,
  ClipShape,
  CornerRadius,
} from "../scene-graph/types";
import type { SceneGraphDiff, DiffOp } from "../scene-graph/diff";
import {
  generateRectVertices,
  generateEllipseVertices,
  tessellateContours,
} from "./tessellation";

/** Extract uniform radius from CornerRadius (per-corner → average for WebGL) */
function uniformRadiusForGL(cr: CornerRadius | undefined): number | undefined {
  if (cr === undefined) { return undefined; }
  if (typeof cr === "number") { return cr; }
  const avg = (cr[0] + cr[1] + cr[2] + cr[3]) / 4;
  return avg > 0 ? avg : undefined;
}

/** Tessellate contours if they exist and are non-empty, otherwise return null */
function tessellateContoursOrNull(
  contours: readonly PathContour[] | undefined
): Float32Array | null {
  if (contours && contours.length > 0) {
    return tessellateContours(contours);
  }
  return null;
}

// =============================================================================
// Node GPU State
// =============================================================================
export type NodeGPUState = {
  readonly id: SceneNodeId;
  readonly type: SceneNode["type"];
  /** Pre-tessellated geometry (triangle vertices, xy pairs) */
  vertices: Float32Array | null;
  /** Top-most fill for shader selection */
  fill: Fill | null;
  /** Text fill color (text nodes only) */
  textFillColor: Color | null;
  textFillOpacity: number;
  /** Node transform in local coordinates */
  transform: AffineMatrix;
  opacity: number;
  visible: boolean;
  effects: readonly Effect[];
  clip: ClipShape | undefined;
  /** Ordered child IDs (groups/frames only) */
  childIds: SceneNodeId[];
  /** Image reference (image nodes only) */
  imageRef: string | null;
  imageData: Uint8Array | null;
  imageMimeType: string | null;
  imageWidth: number;
  imageHeight: number;
  /** Frame-specific properties */
  clipsContent: boolean;
  width: number;
  height: number;
  cornerRadius: number | undefined;
};
// =============================================================================
// Scene State
// =============================================================================
/**
 * Manages GPU-ready state for the entire scene graph.
 *
 * Supports two modes of operation:
 * 1. Full build: `buildFromScene(scene)` — processes entire scene graph
 * 2. Incremental: `applyDiff(diff)` — applies only changed nodes
 */
/** Scene state instance */
export type SceneStateInstance = {
  buildFromScene(scene: SceneGraph): void;
  applyDiff(diff: SceneGraphDiff): void;
  getNode(id: SceneNodeId): NodeGPUState | undefined;
  getRootId(): SceneNodeId | null;
  getSceneSize(): { width: number; height: number };
  getDrawList(): NodeGPUState[];
  getNodeIds(): SceneNodeId[];
};

/**
 * Create a scene state manager for GPU-ready data.
 *
 * Supports two modes of operation:
 * 1. Full build: `buildFromScene(scene)` -- processes entire scene graph
 * 2. Incremental: `applyDiff(diff)` -- applies only changed nodes
 */
export function createSceneState(): SceneStateInstance {
  const nodes = new Map<SceneNodeId, NodeGPUState>();
  const rootIdRef = { value: null as SceneNodeId | null };
  const sceneWidthRef = { value: 0 };
  const sceneHeightRef = { value: 0 };

  function createNodeState(node: SceneNode): NodeGPUState {
    const base: NodeGPUState = {
      id: node.id,
      type: node.type,
      vertices: null,
      fill: null,
      textFillColor: null,
      textFillOpacity: 1,
      transform: node.transform,
      opacity: node.opacity,
      visible: node.visible,
      effects: node.effects,
      clip: node.clip,
      childIds: [],
      imageRef: null,
      imageData: null,
      imageMimeType: null,
      imageWidth: 0,
      imageHeight: 0,
      clipsContent: false,
      width: 0,
      height: 0,
      cornerRadius: undefined,
    };
    switch (node.type) {
      case "group":
        base.childIds = node.children.map((c) => c.id);
        break;
      case "frame":
        base.childIds = node.children.map((c) => c.id);
        base.width = node.width;
        base.height = node.height;
        base.cornerRadius = uniformRadiusForGL(node.cornerRadius);
        base.clipsContent = node.clipsContent;
        if (node.fills.length > 0) {
          base.fill = node.fills[node.fills.length - 1];
          base.vertices = generateRectVertices(node.width, node.height, uniformRadiusForGL(node.cornerRadius));
        }
        break;
      case "rect":
        base.width = node.width;
        base.height = node.height;
        base.cornerRadius = uniformRadiusForGL(node.cornerRadius);
        if (node.fills.length > 0) {
          base.fill = node.fills[node.fills.length - 1];
          base.vertices = generateRectVertices(node.width, node.height, uniformRadiusForGL(node.cornerRadius));
        }
        break;
      case "ellipse":
        if (node.fills.length > 0) {
          base.fill = node.fills[node.fills.length - 1];
          base.vertices = generateEllipseVertices({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry });
        }
        break;
      case "path":
        if (node.contours.length > 0 && node.fills.length > 0) {
          base.fill = node.fills[node.fills.length - 1];
          base.vertices = tessellateContours(node.contours);
        }
        break;
      case "text":
        base.textFillColor = node.fill.color;
        base.textFillOpacity = node.fill.opacity;
        if (node.glyphContours && node.glyphContours.length > 0) {
          base.vertices = tessellateContours(node.glyphContours);
        }
        break;
      case "image":
        base.width = node.width;
        base.height = node.height;
        base.imageRef = node.imageRef;
        base.imageData = node.data;
        base.imageMimeType = node.mimeType;
        base.imageWidth = node.width;
        base.imageHeight = node.height;
        break;
    }
    return base;
  }

  function processNode(node: SceneNode): void {
    const state = createNodeState(node);
    nodes.set(node.id, state);
    if (node.type === "group" || node.type === "frame") {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  function removeNodeRecursive(id: SceneNodeId): void {
    const state = nodes.get(id);
    if (!state) {return;}
    for (const childId of state.childIds) {
      removeNodeRecursive(childId);
    }
    nodes.delete(id);
  }

  function collectDrawList(nodeId: SceneNodeId, list: NodeGPUState[]): void {
    const state = nodes.get(nodeId);
    if (!state || !state.visible) {return;}
    list.push(state);
    for (const childId of state.childIds) {
      collectDrawList(childId, list);
    }
  }

  function applyAdd(op: Extract<DiffOp, { type: "add" }>): void {
    processNode(op.node);
    const parent = nodes.get(op.parentId);
    if (parent) {
      const childIds = [...parent.childIds];
      childIds.splice(op.index, 0, op.node.id);
      parent.childIds = childIds;
    }
  }

  function applyRemove(op: Extract<DiffOp, { type: "remove" }>): void {
    const parent = nodes.get(op.parentId);
    if (parent) {
      parent.childIds = parent.childIds.filter((id) => id !== op.nodeId);
    }
    removeNodeRecursive(op.nodeId);
  }

  function applyUpdate(op: Extract<DiffOp, { type: "update" }>): void {
    const state = nodes.get(op.nodeId);
    if (!state) {
      return;
    }
    // SceneNodeBase common fields — every UpdateOp variant carries
    // `changes: Partial<T>` for a single SceneNode subtype, but the
    // SceneNodeBase fields below exist on every subtype, so accessing
    // them on the union of partials is safe.
    const baseChanges = op.changes;
    if (baseChanges.transform !== undefined) {
      state.transform = baseChanges.transform;
    }
    if (baseChanges.opacity !== undefined) {
      state.opacity = baseChanges.opacity;
    }
    if (baseChanges.visible !== undefined) {
      state.visible = baseChanges.visible;
    }
    if (baseChanges.effects !== undefined) {
      state.effects = baseChanges.effects;
    }
    if ("clip" in baseChanges) {
      state.clip = baseChanges.clip;
    }
    // Variant-specific fields use `op.nodeType` for narrowing — the
    // discriminator built into `UpdateOp` aligns the variant tag with
    // the corresponding `Partial<T>` payload type.
    switch (op.nodeType) {
      case "rect": {
        const c = op.changes;
        applyGeometryRetessellation(state, c.width, c.height, c.cornerRadius);
        applyFillsUpdate(state, c.fills);
        break;
      }
      case "frame": {
        const c = op.changes;
        applyGeometryRetessellation(state, c.width, c.height, c.cornerRadius);
        applyFillsUpdate(state, c.fills);
        if (c.clipsContent !== undefined) {
          state.clipsContent = c.clipsContent;
        }
        break;
      }
      case "ellipse": {
        const c = op.changes;
        if (c.cx !== undefined || c.cy !== undefined || c.rx !== undefined || c.ry !== undefined) {
          if (state.fill) {
            state.vertices = generateEllipseVertices({
              cx: c.cx ?? 0,
              cy: c.cy ?? 0,
              rx: c.rx ?? 0,
              ry: c.ry ?? 0,
            });
          }
        }
        applyFillsUpdate(state, c.fills);
        break;
      }
      case "path": {
        const c = op.changes;
        if (c.contours !== undefined && c.contours.length > 0 && state.fill) {
          state.vertices = tessellateContours(c.contours);
        }
        applyFillsUpdate(state, c.fills);
        break;
      }
      case "text": {
        const c = op.changes;
        if (c.fill !== undefined) {
          state.textFillColor = c.fill.color;
          state.textFillOpacity = c.fill.opacity;
        }
        if (c.glyphContours !== undefined) {
          state.vertices = tessellateContoursOrNull(c.glyphContours);
        }
        break;
      }
      case "image": {
        const c = op.changes;
        if (c.imageRef !== undefined) {
          state.imageRef = c.imageRef;
        }
        if (c.data !== undefined) {
          state.imageData = c.data;
        }
        break;
      }
      case "group":
        // No variant-specific fields to update beyond the common base.
        break;
    }
  }

  /**
   * Re-tessellate rect / frame geometry when any of width / height /
   * cornerRadius changed. Mutates `state` in place.
   */
  function applyGeometryRetessellation(
    state: NodeGPUState,
    width: number | undefined,
    height: number | undefined,
    cornerRadius: CornerRadius | undefined,
  ): void {
    if (width === undefined && height === undefined && cornerRadius === undefined) {
      return;
    }
    const w = width ?? state.width;
    const h = height ?? state.height;
    const cr = cornerRadius !== undefined ? uniformRadiusForGL(cornerRadius) : state.cornerRadius;
    state.width = w;
    state.height = h;
    state.cornerRadius = cr;
    if (state.fill) {
      state.vertices = generateRectVertices(w, h, cr);
    }
  }

  /**
   * Apply a fills update — the shape's fill is the topmost paint, or
   * `null` when the array is empty.
   */
  function applyFillsUpdate(state: NodeGPUState, fills: readonly Fill[] | undefined): void {
    if (fills === undefined) {
      return;
    }
    state.fill = fills.length > 0 ? fills[fills.length - 1] : null;
  }

  function applyReorder(op: Extract<DiffOp, { type: "reorder" }>): void {
    const parent = nodes.get(op.parentId);
    if (!parent) {return;}
    const childIds = parent.childIds.filter((id) => id !== op.nodeId);
    childIds.splice(op.newIndex, 0, op.nodeId);
    parent.childIds = childIds;
  }

  return {
    buildFromScene(scene: SceneGraph): void {
      nodes.clear();
      sceneWidthRef.value = scene.width;
      sceneHeightRef.value = scene.height;
      rootIdRef.value = scene.root.id;
      processNode(scene.root);
    },

    applyDiff(diff: SceneGraphDiff): void {
      for (const op of diff.ops) {
        switch (op.type) {
          case "add":
            applyAdd(op);
            break;
          case "remove":
            applyRemove(op);
            break;
          case "update":
            applyUpdate(op);
            break;
          case "reorder":
            applyReorder(op);
            break;
        }
      }
    },

    getNode(id: SceneNodeId): NodeGPUState | undefined {
      return nodes.get(id);
    },

    getRootId(): SceneNodeId | null {
      return rootIdRef.value;
    },

    getSceneSize(): { width: number; height: number } {
      return { width: sceneWidthRef.value, height: sceneHeightRef.value };
    },

    getDrawList(): NodeGPUState[] {
      if (!rootIdRef.value) {return [];}
      const list: NodeGPUState[] = [];
      collectDrawList(rootIdRef.value, list);
      return list;
    },

    getNodeIds(): SceneNodeId[] {
      return [...nodes.keys()];
    },
  };
}