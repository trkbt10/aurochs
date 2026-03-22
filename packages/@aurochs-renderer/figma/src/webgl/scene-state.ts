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
  GroupNode,
  FrameNode,
  EllipseNode,
  PathNode,
  PathContour,
  TextNode,
  AffineMatrix,
  Fill,
  Color,
  Effect,
  ClipShape,
} from "../scene-graph/types";
import type { SceneGraphDiff, DiffOp } from "../scene-graph/diff";
import {
  generateRectVertices,
  generateEllipseVertices,
  tessellateContours,
} from "./tessellation";

/** Resolve cornerRadius from a changes object or fall back to existing value */
function resolveCornerRadius(
  changes: Record<string, unknown>,
  fallback: number | undefined
): number | undefined {
  if ("cornerRadius" in changes) {
    return changes.cornerRadius as number | undefined;
  }
  return fallback;
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
        base.cornerRadius = node.cornerRadius;
        base.clipsContent = node.clipsContent;
        if (node.fills.length > 0) {
          base.fill = node.fills[node.fills.length - 1];
          base.vertices = generateRectVertices(node.width, node.height, node.cornerRadius);
        }
        break;
      case "rect":
        base.width = node.width;
        base.height = node.height;
        base.cornerRadius = node.cornerRadius;
        if (node.fills.length > 0) {
          base.fill = node.fills[node.fills.length - 1];
          base.vertices = generateRectVertices(node.width, node.height, node.cornerRadius);
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
      const children = (node as GroupNode | FrameNode).children;
      for (const child of children) {
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

  function checkGeometryChange(
    state: NodeGPUState,
    changes: Record<string, unknown>
  ): boolean {
    switch (state.type) {
      case "rect":
      case "frame":
        return "width" in changes || "height" in changes || "cornerRadius" in changes;
      case "ellipse":
        return "cx" in changes || "cy" in changes || "rx" in changes || "ry" in changes;
      case "path":
        return "contours" in changes;
      default:
        return false;
    }
  }

  function retessellate(
    state: NodeGPUState,
    changes: Record<string, unknown>
  ): void {
    switch (state.type) {
      case "rect":
      case "frame": {
        const w = (changes.width as number | undefined) ?? state.width;
        const h = (changes.height as number | undefined) ?? state.height;
        const cornerRadius = resolveCornerRadius(changes, state.cornerRadius);
        state.width = w;
        state.height = h;
        state.cornerRadius = cornerRadius;
        if (state.fill) {
          state.vertices = generateRectVertices(w, h, cornerRadius);
        }
        break;
      }
      case "ellipse": {
        const node = changes as Partial<EllipseNode>;
        const cx = node.cx ?? 0;
        const cy = node.cy ?? 0;
        const rx = node.rx ?? 0;
        const ry = node.ry ?? 0;
        if (state.fill) {
          state.vertices = generateEllipseVertices({ cx, cy, rx, ry });
        }
        break;
      }
      case "path": {
        const contours = changes.contours as PathNode["contours"] | undefined;
        if (contours && contours.length > 0 && state.fill) {
          state.vertices = tessellateContours(contours);
        }
        break;
      }
    }
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
    if (!state) {return;}
    const changes = op.changes as Record<string, unknown>;
    if ("transform" in changes) {
      state.transform = changes.transform as AffineMatrix;
    }
    if ("opacity" in changes) {
      state.opacity = changes.opacity as number;
    }
    if ("visible" in changes) {
      state.visible = changes.visible as boolean;
    }
    if ("effects" in changes) {
      (state as { effects: readonly Effect[] }).effects = changes.effects as readonly Effect[];
    }
    if ("clip" in changes) {
      state.clip = changes.clip as ClipShape | undefined;
    }
    const needsRetessellation = checkGeometryChange(state, changes);
    if (needsRetessellation) {
      retessellate(state, changes);
    }
    if ("fills" in changes) {
      const fills = changes.fills as readonly Fill[];
      state.fill = fills.length > 0 ? fills[fills.length - 1] : null;
    }
    if ("fill" in changes && state.type === "text") {
      const fill = changes.fill as { color: Color; opacity: number };
      state.textFillColor = fill.color;
      state.textFillOpacity = fill.opacity;
    }
    if ("glyphContours" in changes) {
      const contours = changes.glyphContours as TextNode["glyphContours"];
      state.vertices = tessellateContoursOrNull(contours);
    }
    if ("imageRef" in changes) {
      state.imageRef = changes.imageRef as string;
    }
    if ("data" in changes) {
      state.imageData = changes.data as Uint8Array;
    }
    if ("clipsContent" in changes) {
      state.clipsContent = changes.clipsContent as boolean;
    }
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