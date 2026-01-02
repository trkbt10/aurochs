/**
 * @file Animation player
 *
 * Processes PPTX timing tree and plays animations.
 * Uses functional approach - no classes.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import type { Timing } from "../domain/animation";
import type { EffectConfig, PlayerOptions, PlayerState } from "./types";
import {
  applyEffect,
  hideElement,
  parseFilterDirection,
  parseFilterToEffectType,
  prepareForAnimation,
  resetElementStyles,
  showElement,
} from "./effects";

/**
 * Animation player instance (returned by createPlayer)
 */
export type AnimationPlayerInstance = {
  /** Get current player state */
  readonly getState: () => PlayerState;
  /** Play animations from timing data */
  readonly play: (timing: Timing) => Promise<void>;
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
 * Create animation player
 */
export function createPlayer(options: PlayerOptions): AnimationPlayerInstance {
  const opts: PlayerOptions = {
    speed: 1.0,
    ...options,
  };

  let currentState: PlayerState = "idle";
  let abortController: AbortController | null = null;

  function log(message: string): void {
    opts.onLog?.(message);
  }

  function findElement(shapeId: string): HTMLElement | SVGElement | null {
    return opts.findElement(shapeId);
  }

  function shouldStop(): boolean {
    return currentState === "stopping" || currentState === "stopped";
  }

  async function delay(ms: number): Promise<void> {
    const adjustedMs = ms / (opts.speed ?? 1.0);
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, adjustedMs);

      abortController?.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new Error("Animation aborted"));
      });
    });
  }

  /**
   * Process "set" animation
   *
   * Handles both formats:
   * - attribute/value: single property (from timing parser)
   * - attributeNames: array of properties (legacy)
   */
  async function processSet(node: Record<string, unknown>): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {
      log(`Set: shape ${target.shapeId} not found`);
      return;
    }

    // Handle single attribute/value pair
    const attr = node.attribute as string | undefined;
    const value = node.value as string | undefined;

    // Handle attributeNames array (legacy)
    const attrs = node.attributeNames as string[] | undefined;

    log(`Set: shape ${target.shapeId}, attr: ${attr}, value: ${value}`);

    // Check single attribute
    if (attr === "style.visibility" && value === "visible") {
      showElement(el);
    }

    // Check attributeNames array
    if (attrs?.includes("style.visibility")) {
      showElement(el);
    }

    const duration = typeof node.duration === "number" ? node.duration : 1;
    await delay(duration);
  }

  /**
   * Process "animate" animation
   */
  async function processAnimate(node: Record<string, unknown>): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {
      log(`Animate: shape ${target.shapeId} not found`);
      return;
    }

    const duration =
      node.duration === "indefinite"
        ? 1000
        : typeof node.duration === "number"
          ? node.duration
          : 1000;

    const attrs = node.attributeNames as string[] | undefined;
    log(`Animate: shape ${target.shapeId}, duration: ${duration}ms`);

    el.style.transition = `all ${duration}ms ease-out`;

    if (attrs?.includes("ppt_x") || attrs?.includes("ppt_y")) {
      const toX =
        typeof node.to === "string" && node.to.includes("x")
          ? parseFloat(node.to)
          : 0;
      const toY =
        typeof node.to === "string" && node.to.includes("y")
          ? parseFloat(node.to)
          : 0;
      el.style.transform = `translate(${toX}px, ${toY}px)`;
    }

    if (attrs?.includes("style.opacity")) {
      const toValue = node.to as string | number | undefined;
      el.style.opacity = String(toValue ?? 1);
    }

    await delay(duration);
  }

  /**
   * Process "animateEffect" animation
   */
  async function processAnimateEffect(
    node: Record<string, unknown>
  ): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {
      log(`AnimateEffect: shape ${target.shapeId} not found`);
      return;
    }

    const filter = String(node.filter ?? "fade");
    const duration =
      node.duration === "indefinite"
        ? 1000
        : typeof node.duration === "number"
          ? node.duration
          : 1000;

    log(
      `AnimateEffect: shape ${target.shapeId}, filter: ${filter}, duration: ${duration}ms`
    );

    const effectConfig: EffectConfig = {
      type: parseFilterToEffectType(filter),
      direction: parseFilterDirection(filter),
      duration,
      entrance: true,
      easing: "ease-out",
    };

    applyEffect(el, effectConfig);
    await delay(duration);
  }

  /**
   * Process "animateMotion" animation
   */
  async function processAnimateMotion(
    node: Record<string, unknown>
  ): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {
      log(`AnimateMotion: shape ${target.shapeId} not found`);
      return;
    }

    const path = String(node.path ?? "");
    const duration = typeof node.duration === "number" ? node.duration : 2000;

    log(`AnimateMotion: shape ${target.shapeId}, path length: ${path.length}`);

    const match = path.match(/L\s*([-\d.]+)\s+([-\d.]+)/);
    if (match) {
      const endX = parseFloat(match[1]) * 100;
      const endY = parseFloat(match[2]) * 100;

      el.style.transition = `transform ${duration}ms ease-in-out`;
      el.style.transform = `translate(${endX}px, ${endY}px)`;
    }

    await delay(duration);
  }

  /**
   * Process "animateRotation" animation
   */
  async function processAnimateRotation(
    node: Record<string, unknown>
  ): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {return;}

    const by = typeof node.by === "number" ? node.by : 360;
    const duration = typeof node.duration === "number" ? node.duration : 1000;

    log(`AnimateRotation: shape ${target.shapeId}, by: ${by}deg`);

    el.style.transition = `transform ${duration}ms ease-in-out`;
    el.style.transformOrigin = "center center";
    el.style.transform = `rotate(${by}deg)`;

    await delay(duration);
  }

  /**
   * Process "animateScale" animation
   */
  async function processAnimateScale(
    node: Record<string, unknown>
  ): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {return;}

    const toX = typeof node.toX === "number" ? node.toX : 1;
    const toY = typeof node.toY === "number" ? node.toY : 1;
    const duration = typeof node.duration === "number" ? node.duration : 1000;

    log(`AnimateScale: shape ${target.shapeId}, scale: ${toX}x${toY}`);

    el.style.transition = `transform ${duration}ms ease-in-out`;
    el.style.transformOrigin = "center center";
    el.style.transform = `scale(${toX}, ${toY})`;

    await delay(duration);
  }

  /**
   * Process "animateColor" animation
   */
  async function processAnimateColor(
    node: Record<string, unknown>
  ): Promise<void> {
    const target = node.target as Record<string, unknown> | undefined;
    if (!target?.shapeId) {return;}

    const el = findElement(String(target.shapeId));
    if (!el) {return;}

    const duration = typeof node.duration === "number" ? node.duration : 1000;

    log(`AnimateColor: shape ${target.shapeId}`);

    el.style.transition = `background-color ${duration}ms ease-in-out`;

    await delay(duration);
  }

  /**
   * Process a time node and its children
   */
  async function processNode(node: unknown): Promise<void> {
    if (!node || typeof node !== "object") {return;}
    if (shouldStop()) {return;}

    const n = node as Record<string, unknown>;
    const nodeType = String(n.type ?? "unknown");
    const children = Array.isArray(n.children) ? n.children : [];

    log(`Processing node: ${nodeType}`);

    const nodeDelay = typeof n.delay === "number" ? n.delay : 0;
    if (nodeDelay > 0) {
      await delay(nodeDelay);
    }

    switch (nodeType) {
      case "parallel":
        await Promise.all(children.map((child) => processNode(child)));
        break;

      case "sequence":
        for (const child of children) {
          if (shouldStop()) {break;}
          await processNode(child);
        }
        break;

      case "exclusive":
        if (children.length > 0) {
          await processNode(children[0]);
        }
        break;

      case "set":
        await processSet(n);
        break;

      case "animate":
        await processAnimate(n);
        break;

      case "animateEffect":
        await processAnimateEffect(n);
        break;

      case "animateMotion":
        await processAnimateMotion(n);
        break;

      case "animateRotation":
        await processAnimateRotation(n);
        break;

      case "animateScale":
        await processAnimateScale(n);
        break;

      case "animateColor":
        await processAnimateColor(n);
        break;

      default:
        for (const child of children) {
          await processNode(child);
        }
    }
  }

  // Public API
  return {
    getState(): PlayerState {
      return currentState;
    },

    async play(timing: Timing): Promise<void> {
      if (!timing?.rootTimeNode) {
        log("No timing data to play");
        return;
      }

      if (currentState === "playing") {
        log("Already playing");
        return;
      }

      currentState = "playing";
      abortController = new AbortController();
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
        currentState = "idle";
        abortController = null;
        opts.onComplete?.();
      }
    },

    stop(): void {
      if (currentState !== "playing") {return;}

      currentState = "stopping";
      abortController?.abort();
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
  };
}

/**
 * Extract all shape IDs from timing tree
 */
export function extractShapeIds(timing: Timing): string[] {
  const ids = new Set<string>();

  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") {return;}
    const n = node as Record<string, unknown>;

    const target = n.target as Record<string, unknown> | undefined;
    if (target?.shapeId) {
      ids.add(String(target.shapeId));
    }

    const children = n.children as unknown[] | undefined;
    if (Array.isArray(children)) {
      for (const child of children) {
        traverse(child);
      }
    }
  }

  if (timing?.rootTimeNode) {
    traverse(timing.rootTimeNode);
  }

  return Array.from(ids);
}

