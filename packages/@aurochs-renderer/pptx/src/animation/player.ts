/**
 * @file Animation player
 *
 * Processes PPTX timing tree and plays animations.
 * Uses functional approach - no classes.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import type {
  TimeNode,
  AnimateBehavior,
  AnimateMotionBehavior,
  AnimateColorBehavior,
  AnimateRotationBehavior,
  AnimateScaleBehavior,
  AnimateEffectBehavior,
  SetBehavior,
  ParallelTimeNode,
  SequenceTimeNode,
  ExclusiveTimeNode,
  AnimationTarget,
} from "@aurochs-office/pptx/domain/animation";
import type { EffectConfig, PlayerOptions, PlayerState } from "./types";
import type { AnimationController, EasingName } from "./engine";
import {
  applyEffect,
  hideElement,
  parseFilterDirection,
  parseFilterToEffectType,
  resetElementStyles,
  showElement,
} from "./effects";
import { animate } from "./engine";
import { createAnimateFunction } from "./interpolate";
import { createMotionPathFunction, parseMotionPath } from "./motion-path";
import { createColorAnimationFunction } from "./color-interpolate";

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Animation update function type
 */
type AnimationUpdateFn = (progress: number) => void;

/**
 * Animation execution options
 */
type AnimationExecOptions = {
  duration: number;
  easing?: EasingName;
  updateFn: AnimationUpdateFn;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse duration value from timing node.
 * Handles "indefinite" string and numeric values.
 */
function parseDuration(duration: number | "indefinite" | undefined): number {
  if (duration === "indefinite") {
    return 1000;
  }
  if (typeof duration === "number") {
    return duration;
  }
  return 1000;
}

/**
 * Extract shape ID from animation target.
 * Returns undefined if target is not a shape target.
 */
function getShapeId(target: AnimationTarget | undefined): string | undefined {
  if (!target) {
    return undefined;
  }
  if (target.type === "shape") {
    return target.shapeId;
  }
  return undefined;
}

/**
 * Check if a time node has behavior target (is a behavior node).
 */
function isBehaviorNode(
  node: TimeNode,
): node is
  | AnimateBehavior
  | AnimateMotionBehavior
  | AnimateColorBehavior
  | AnimateRotationBehavior
  | AnimateScaleBehavior
  | AnimateEffectBehavior
  | SetBehavior {
  return "target" in node;
}

/**
 * Check if a time node is a container node (has children).
 */
function isContainerNode(node: TimeNode): node is ParallelTimeNode | SequenceTimeNode | ExclusiveTimeNode {
  return "children" in node;
}

// =============================================================================
// Animation Player Instance
// =============================================================================

/**
 * Animation player instance (returned by createPlayer)
 *
 * This is a pure playback engine - it doesn't store any navigation state.
 * Step/click group state management should be handled at a higher level.
 */
export type AnimationPlayerInstance = {
  /** Get current player state */
  readonly getState: () => PlayerState;
  /** Play animations from timing data */
  readonly play: (timing: TimingLike | null) => Promise<void>;
  /** Play an array of time nodes */
  readonly playNodes: (nodes: readonly TimeNode[]) => Promise<void>;
  /** Stop current animation */
  readonly stop: () => void;
  /** Reset all animated elements */
  readonly resetAll: (shapeIds: string[]) => void;
  /** Show all elements */
  readonly showAll: (shapeIds: string[]) => void;
  /** Hide all elements */
  readonly hideAll: (shapeIds: string[]) => void;
};

/**
 * Internal state container for player lifecycle management.
 * Only contains playback state, not step navigation state.
 */
type PlayerStateContainer = {
  status: PlayerState;
  abortController: AbortController | null;
};

/**
 * Create animation player
 */
export function createPlayer(options: PlayerOptions): AnimationPlayerInstance {
  const opts: PlayerOptions = {
    speed: 1.0,
    ...options,
  };

  const state: PlayerStateContainer = {
    status: "idle",
    abortController: null,
  };

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  function log(message: string): void {
    opts.onLog?.(message);
  }

  function findElement(shapeId: string): HTMLElement | SVGElement | null {
    return opts.findElement(shapeId);
  }

  function shouldStop(): boolean {
    return state.status === "stopping" || state.status === "stopped";
  }

  /**
   * Find element for a behavior node.
   * Returns null if target is not a shape or element not found.
   */
  function findTargetElement(target: AnimationTarget | undefined): HTMLElement | SVGElement | null {
    const shapeId = getShapeId(target);
    if (!shapeId) {
      return null;
    }
    return findElement(shapeId);
  }

  /**
   * Delay execution with abort support.
   */
  async function delay(ms: number): Promise<void> {
    const adjustedMs = ms / (opts.speed ?? 1.0);
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, adjustedMs);

      state.abortController?.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new Error("Animation aborted"));
      });
    });
  }

  /**
   * Execute a RAF-based animation with abort support.
   * This is the common pattern extracted from multiple process functions.
   */
  function runAnimation(execOpts: AnimationExecOptions): Promise<void> {
    const { duration, easing = "ease-out", updateFn } = execOpts;

    return new Promise<void>((resolve) => {
      const controller: AnimationController = animate({
        duration: duration / (opts.speed ?? 1.0),
        easing,
        onUpdate: (progress) => {
          if (shouldStop()) {
            controller.cancel();
            return;
          }
          updateFn(progress);
        },
        onComplete: resolve,
        onCancel: resolve,
      });

      // Handle abort from player stop
      state.abortController?.signal.addEventListener("abort", () => {
        controller.cancel();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Behavior Processors
  // ---------------------------------------------------------------------------

  /**
   * Process "set" behavior - instant property change.
   */
  async function processSet(node: SetBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      log(`Set: shape not found`);
      return;
    }

    const shapeId = getShapeId(node.target);
    log(`Set: shape ${shapeId}, attr: ${node.attribute}, value: ${node.value}`);

    // Handle visibility
    if (node.attribute === "style.visibility" && node.value === "visible") {
      showElement(el);
    }

    const duration = parseDuration(node.duration);
    await delay(duration);
  }

  /**
   * Process "animate" behavior - property animation.
   */
  async function processAnimate(node: AnimateBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      log(`Animate: shape not found`);
      return;
    }

    const shapeId = getShapeId(node.target);
    const duration = parseDuration(node.duration);
    log(`Animate: shape ${shapeId}, attr: ${node.attribute}, duration: ${duration}ms`);

    const updateFn = createAnimateFunction({ behavior: node, element: el });
    await runAnimation({ duration, easing: "ease-out", updateFn });
  }

  /**
   * Process "animateEffect" behavior - visual effect.
   */
  async function processAnimateEffect(node: AnimateEffectBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      log(`AnimateEffect: shape not found`);
      return;
    }

    const shapeId = getShapeId(node.target);
    const duration = parseDuration(node.duration);
    log(`AnimateEffect: shape ${shapeId}, filter: ${node.filter}, duration: ${duration}ms`);

    const effectConfig: EffectConfig = {
      type: parseFilterToEffectType(node.filter),
      direction: parseFilterDirection(node.filter),
      duration,
      entrance: node.transition === "in",
      easing: "ease-out",
    };

    applyEffect(el, effectConfig);
    await delay(duration);
  }

  /**
   * Process "animateMotion" behavior - motion path animation.
   */
  async function processAnimateMotion(node: AnimateMotionBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      log(`AnimateMotion: shape not found`);
      return;
    }

    const shapeId = getShapeId(node.target);
    const duration = parseDuration(node.duration);
    const pathLength = node.path?.length ?? 0;
    log(`AnimateMotion: shape ${shapeId}, path length: ${pathLength}`);

    // Check if we have a valid path or from/to/by
    if (node.path) {
      const motionPath = parseMotionPath(node.path);
      if (motionPath.totalLength > 0) {
        const updateFn = createMotionPathFunction({ behavior: node, element: el });
        await runAnimation({ duration, easing: "ease-in-out", updateFn });
        return;
      }
    }

    if (node.from || node.to || node.by) {
      const updateFn = createMotionPathFunction({ behavior: node, element: el });
      await runAnimation({ duration, easing: "ease-in-out", updateFn });
      return;
    }

    // Legacy fallback for simple path
    if (node.path) {
      const match = node.path.match(/L\s*([-\d.]+)\s+([-\d.]+)/);
      if (match) {
        const endX = parseFloat(match[1]) * 100;
        const endY = parseFloat(match[2]) * 100;
        el.style.transition = `transform ${duration}ms ease-in-out`;
        el.style.transform = `translate(${endX}px, ${endY}px)`;
      }
    }

    await delay(duration);
  }

  /**
   * Process "animateRotation" behavior - rotation animation.
   */
  async function processAnimateRotation(node: AnimateRotationBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      return;
    }

    const shapeId = getShapeId(node.target);
    const by = node.by ?? 360;
    const duration = parseDuration(node.duration);
    log(`AnimateRotation: shape ${shapeId}, by: ${by}deg`);

    el.style.transition = `transform ${duration}ms ease-in-out`;
    el.style.transformOrigin = "center center";
    el.style.transform = `rotate(${by}deg)`;

    await delay(duration);
  }

  /**
   * Process "animateScale" behavior - scale animation.
   */
  async function processAnimateScale(node: AnimateScaleBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      return;
    }

    const shapeId = getShapeId(node.target);
    const toX = node.toX ?? 1;
    const toY = node.toY ?? 1;
    const duration = parseDuration(node.duration);
    log(`AnimateScale: shape ${shapeId}, scale: ${toX}x${toY}`);

    el.style.transition = `transform ${duration}ms ease-in-out`;
    el.style.transformOrigin = "center center";
    el.style.transform = `scale(${toX}, ${toY})`;

    await delay(duration);
  }

  /**
   * Process "animateColor" behavior - color animation.
   */
  async function processAnimateColor(node: AnimateColorBehavior): Promise<void> {
    const el = findTargetElement(node.target);
    if (!el) {
      return;
    }

    const shapeId = getShapeId(node.target);
    const duration = parseDuration(node.duration);
    log(`AnimateColor: shape ${shapeId}, colorSpace: ${node.colorSpace ?? "rgb"}`);

    if (node.from && node.to) {
      const updateFn = createColorAnimationFunction(node, el);
      await runAnimation({ duration, easing: "ease-in-out", updateFn });
      return;
    }

    // Legacy fallback
    el.style.transition = `background-color ${duration}ms ease-in-out`;
    await delay(duration);
  }

  // ---------------------------------------------------------------------------
  // Node Processing
  // ---------------------------------------------------------------------------

  /**
   * Process a time node and its children.
   */
  async function processNode(node: TimeNode): Promise<void> {
    if (shouldStop()) {
      return;
    }

    log(`Processing node: ${node.type}`);

    // Handle delay from startConditions if present
    if (node.startConditions) {
      for (const cond of node.startConditions) {
        if (typeof cond.delay === "number" && cond.delay > 0) {
          await delay(cond.delay);
        }
      }
    }

    switch (node.type) {
      case "parallel": {
        const children = node.children;
        await Promise.all(children.map((child) => processNode(child)));
        break;
      }

      case "sequence": {
        for (const child of node.children) {
          if (shouldStop()) {
            break;
          }
          await processNode(child);
        }
        break;
      }

      case "exclusive": {
        // Only first child is active
        if (node.children.length > 0) {
          await processNode(node.children[0]);
        }
        break;
      }

      case "set":
        await processSet(node);
        break;

      case "animate":
        await processAnimate(node);
        break;

      case "animateEffect":
        await processAnimateEffect(node);
        break;

      case "animateMotion":
        await processAnimateMotion(node);
        break;

      case "animateRotation":
        await processAnimateRotation(node);
        break;

      case "animateScale":
        await processAnimateScale(node);
        break;

      case "animateColor":
        await processAnimateColor(node);
        break;

      case "audio":
      case "video":
      case "command":
        // Not yet implemented
        log(`Skipping unsupported node type: ${node.type}`);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    getState(): PlayerState {
      return state.status;
    },

    async play(timing: TimingLike | null): Promise<void> {
      if (!timing?.rootTimeNode) {
        log("No timing data to play");
        return;
      }

      if (state.status === "playing") {
        log("Already playing");
        return;
      }

      state.status = "playing";
      state.abortController = new AbortController();
      opts.onStart?.();
      log("Starting animation playback");

      try {
        await processNode(timing.rootTimeNode);
        log("Animation playback complete");
      } catch (error) {
        if ((error as Error).message === "Animation aborted") {
          log("Animation stopped");
        } else {
          throw error;
        }
      } finally {
        state.status = "idle";
        state.abortController = null;
        opts.onComplete?.();
      }
    },

    stop(): void {
      if (state.status !== "playing") {
        return;
      }

      state.status = "stopping";
      state.abortController?.abort();
      log("Stopping animation");
    },

    resetAll(shapeIds: string[]): void {
      log(`Resetting ${shapeIds.length} shapes`);
      for (const id of shapeIds) {
        const el = findElement(id);
        if (el) {
          resetElementStyles(el);
        }
      }
    },

    showAll(shapeIds: string[]): void {
      log(`Showing ${shapeIds.length} shapes`);
      for (const id of shapeIds) {
        const el = findElement(id);
        if (el) {
          showElement(el);
        }
      }
    },

    hideAll(shapeIds: string[]): void {
      log(`Hiding ${shapeIds.length} shapes`);
      for (const id of shapeIds) {
        const el = findElement(id);
        if (el) {
          hideElement(el);
        }
      }
    },

    async playNodes(nodes: readonly TimeNode[]): Promise<void> {
      // Check if already playing
      if (state.status === "playing") {
        log("Cannot play nodes while already playing");
        return;
      }

      log(`Playing ${nodes.length} nodes`);

      state.status = "playing";
      state.abortController = new AbortController();
      opts.onStart?.();

      try {
        for (const node of nodes) {
          if (shouldStop()) {
            break;
          }
          await processNode(node);
        }
        log("Nodes playback complete");
      } catch (error) {
        if ((error as Error).message === "Animation aborted") {
          log("Nodes playback stopped");
        } else {
          throw error;
        }
      } finally {
        state.status = "idle";
        state.abortController = null;
        opts.onComplete?.();
      }
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

export type TimingLike = {
  readonly rootTimeNode?: TimeNode;
};

/**
 * Extract all shape IDs from timing tree.
 */
export function extractShapeIds(timing: TimingLike | null): string[] {
  const ids = new Set<string>();

  function traverse(node: TimeNode): void {
    // Extract shape ID from behavior nodes
    if (isBehaviorNode(node)) {
      const shapeId = getShapeId(node.target);
      if (shapeId) {
        ids.add(shapeId);
      }
    }

    // Recurse into container nodes
    if (isContainerNode(node)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  if (timing?.rootTimeNode) {
    traverse(timing.rootTimeNode);
  }

  return Array.from(ids);
}
