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
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  ImageNode,
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
export class SceneState {
  private nodes = new Map<SceneNodeId, NodeGPUState>();
  private rootId: SceneNodeId | null = null;
  private sceneWidth = 0;
  private sceneHeight = 0;

  /**
   * Build GPU state from a complete scene graph (initial render)
   */
  buildFromScene(scene: SceneGraph): void {
    this.nodes.clear();
    this.sceneWidth = scene.width;
    this.sceneHeight = scene.height;
    this.rootId = scene.root.id;
    this.processNode(scene.root);
  }

  /**
   * Apply a diff to incrementally update the scene state
   */
  applyDiff(diff: SceneGraphDiff): void {
    for (const op of diff.ops) {
      switch (op.type) {
        case "add":
          this.applyAdd(op);
          break;
        case "remove":
          this.applyRemove(op);
          break;
        case "update":
          this.applyUpdate(op);
          break;
        case "reorder":
          this.applyReorder(op);
          break;
      }
    }
  }

  /**
   * Get a node's GPU state by ID
   */
  getNode(id: SceneNodeId): NodeGPUState | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get the root node ID
   */
  getRootId(): SceneNodeId | null {
    return this.rootId;
  }

  /**
   * Get scene dimensions
   */
  getSceneSize(): { width: number; height: number } {
    return { width: this.sceneWidth, height: this.sceneHeight };
  }

  /**
   * Produce a depth-first ordered draw list from the scene tree
   */
  getDrawList(): NodeGPUState[] {
    if (!this.rootId) return [];
    const list: NodeGPUState[] = [];
    this.collectDrawList(this.rootId, list);
    return list;
  }

  /**
   * Get all managed node IDs
   */
  getNodeIds(): SceneNodeId[] {
    return [...this.nodes.keys()];
  }

  // ===========================================================================
  // Internal: Building
  // ===========================================================================

  private processNode(node: SceneNode): void {
    const state = this.createNodeState(node);
    this.nodes.set(node.id, state);

    // Process children for container nodes
    if (node.type === "group" || node.type === "frame") {
      const children = (node as GroupNode | FrameNode).children;
      for (const child of children) {
        this.processNode(child);
      }
    }
  }

  private createNodeState(node: SceneNode): NodeGPUState {
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
          base.vertices = generateEllipseVertices(node.cx, node.cy, node.rx, node.ry);
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

  // ===========================================================================
  // Internal: Diff Application
  // ===========================================================================

  private applyAdd(op: Extract<DiffOp, { type: "add" }>): void {
    // Recursively add the new node and its children
    this.processNode(op.node);

    // Insert into parent's child list
    const parent = this.nodes.get(op.parentId);
    if (parent) {
      const childIds = [...parent.childIds];
      childIds.splice(op.index, 0, op.node.id);
      parent.childIds = childIds;
    }
  }

  private applyRemove(op: Extract<DiffOp, { type: "remove" }>): void {
    // Remove from parent's child list
    const parent = this.nodes.get(op.parentId);
    if (parent) {
      parent.childIds = parent.childIds.filter((id) => id !== op.nodeId);
    }

    // Recursively remove the node and its children
    this.removeNodeRecursive(op.nodeId);
  }

  private applyUpdate(op: Extract<DiffOp, { type: "update" }>): void {
    const state = this.nodes.get(op.nodeId);
    if (!state) return;

    const changes = op.changes as Record<string, unknown>;

    // Apply property changes
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

    // Geometry changes require re-tessellation
    const needsRetessellation = this.checkGeometryChange(state, changes);
    if (needsRetessellation) {
      this.retessellate(state, changes);
    }

    // Fill changes
    if ("fills" in changes) {
      const fills = changes.fills as readonly Fill[];
      state.fill = fills.length > 0 ? fills[fills.length - 1] : null;
    }

    // Text-specific changes
    if ("fill" in changes && state.type === "text") {
      const fill = changes.fill as { color: Color; opacity: number };
      state.textFillColor = fill.color;
      state.textFillOpacity = fill.opacity;
    }
    if ("glyphContours" in changes) {
      const contours = changes.glyphContours as TextNode["glyphContours"];
      state.vertices = contours && contours.length > 0
        ? tessellateContours(contours)
        : null;
    }

    // Image changes
    if ("imageRef" in changes) {
      state.imageRef = changes.imageRef as string;
    }
    if ("data" in changes) {
      state.imageData = changes.data as Uint8Array;
    }

    // Frame-specific
    if ("clipsContent" in changes) {
      state.clipsContent = changes.clipsContent as boolean;
    }
  }

  private applyReorder(op: Extract<DiffOp, { type: "reorder" }>): void {
    const parent = this.nodes.get(op.parentId);
    if (!parent) return;

    const childIds = parent.childIds.filter((id) => id !== op.nodeId);
    childIds.splice(op.newIndex, 0, op.nodeId);
    parent.childIds = childIds;
  }

  // ===========================================================================
  // Internal: Helpers
  // ===========================================================================

  private removeNodeRecursive(id: SceneNodeId): void {
    const state = this.nodes.get(id);
    if (!state) return;

    // Remove children first
    for (const childId of state.childIds) {
      this.removeNodeRecursive(childId);
    }

    this.nodes.delete(id);
  }

  private checkGeometryChange(
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

  private retessellate(
    state: NodeGPUState,
    changes: Record<string, unknown>
  ): void {
    switch (state.type) {
      case "rect":
      case "frame": {
        const width = (changes.width as number | undefined) ?? state.width;
        const height = (changes.height as number | undefined) ?? state.height;
        const cornerRadius = "cornerRadius" in changes
          ? (changes.cornerRadius as number | undefined)
          : state.cornerRadius;
        state.width = width;
        state.height = height;
        state.cornerRadius = cornerRadius;
        if (state.fill) {
          state.vertices = generateRectVertices(width, height, cornerRadius);
        }
        break;
      }
      case "ellipse": {
        // Re-tessellate with new dimensions
        const node = changes as Partial<EllipseNode>;
        const cx = node.cx ?? 0;
        const cy = node.cy ?? 0;
        const rx = node.rx ?? 0;
        const ry = node.ry ?? 0;
        if (state.fill) {
          state.vertices = generateEllipseVertices(cx, cy, rx, ry);
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

  private collectDrawList(nodeId: SceneNodeId, list: NodeGPUState[]): void {
    const state = this.nodes.get(nodeId);
    if (!state || !state.visible) return;

    list.push(state);

    // Recurse into children
    for (const childId of state.childIds) {
      this.collectDrawList(childId, list);
    }
  }
}
