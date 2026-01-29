/**
 * @file Animation Player Hook
 *
 * React hook for controlling animation playback.
 * Uses useRef for callbacks to prevent unnecessary player recreation.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { Timing } from "@oxen-office/pptx/domain/animation";
import type {
  AnimationPlayerInstance,
  ElementFinder,
  PlayerState,
} from "../../animation";
import { createPlayer, extractShapeIds } from "../../animation";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useAnimationPlayer hook
 */
export type UseAnimationPlayerOptions = {
  /**
   * Function to find DOM elements by shape ID.
   * Typically queries for `[data-ooxml-id="${shapeId}"]`.
   */
  readonly findElement: ElementFinder;

  /**
   * Callback when animation starts
   */
  readonly onStart?: () => void;

  /**
   * Callback when animation completes
   */
  readonly onComplete?: () => void;

  /**
   * Callback for logging/debugging
   */
  readonly onLog?: (message: string) => void;

  /**
   * Speed multiplier (1.0 = normal)
   */
  readonly speed?: number;
};

/**
 * Return value of useAnimationPlayer hook
 */
export type UseAnimationPlayerResult = {
  /**
   * Current player state
   */
  readonly state: PlayerState;

  /**
   * Whether animation is currently playing
   */
  readonly isPlaying: boolean;

  /**
   * Play animations from timing data
   */
  readonly play: (timing: Timing) => Promise<void>;

  /**
   * Stop current animation
   */
  readonly stop: () => void;

  /**
   * Reset all animated elements
   */
  readonly resetAll: (shapeIds: string[]) => void;

  /**
   * Show all elements
   */
  readonly showAll: (shapeIds: string[]) => void;

  /**
   * Hide all elements
   */
  readonly hideAll: (shapeIds: string[]) => void;

  /**
   * Extract shape IDs from timing data
   */
  readonly extractShapeIds: (timing: Timing) => string[];

  /**
   * Underlying player instance
   */
  readonly player: AnimationPlayerInstance;
};

// =============================================================================
// Internal Store for External State Sync
// =============================================================================

type PlayerStore = {
  state: PlayerState;
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PlayerState;
  setState: (newState: PlayerState) => void;
};

function createPlayerStore(): PlayerStore {
  const store: PlayerStore = {
    state: "idle",
    listeners: new Set(),
    subscribe(listener) {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    getSnapshot() {
      return store.state;
    },
    setState(newState) {
      if (store.state !== newState) {
        store.state = newState;
        for (const listener of store.listeners) {
          listener();
        }
      }
    },
  };
  return store;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * React hook for animation playback control.
 *
 * Key improvements:
 * - Uses useRef for callbacks to prevent player recreation on every render
 * - Uses useSyncExternalStore for reliable state synchronization
 * - Player instance is stable across renders (only recreated if speed changes)
 *
 * @example
 * ```tsx
 * function SlideViewer({ timing }: { timing: Timing }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   const { play, stop, isPlaying } = useAnimationPlayer({
 *     findElement: (id) =>
 *       containerRef.current?.querySelector(`[data-ooxml-id="${id}"]`) ?? null,
 *   });
 *
 *   return (
 *     <div ref={containerRef}>
 *       <SlideContent />
 *       <button onClick={() => play(timing)} disabled={isPlaying}>
 *         Play
 *       </button>
 *       <button onClick={stop}>Stop</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnimationPlayer(
  options: UseAnimationPlayerOptions
): UseAnimationPlayerResult {
  // Store callbacks in refs to avoid recreating player on callback changes
  const findElementRef = useRef(options.findElement);
  const onStartRef = useRef(options.onStart);
  const onCompleteRef = useRef(options.onComplete);
  const onLogRef = useRef(options.onLog);

  // Update refs on every render (synchronously, before effects)
  findElementRef.current = options.findElement;
  onStartRef.current = options.onStart;
  onCompleteRef.current = options.onComplete;
  onLogRef.current = options.onLog;

  // Create store for external state synchronization (stable reference)
  const storeRef = useRef<PlayerStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createPlayerStore();
  }
  const store = storeRef.current;

  // Subscribe to player state using useSyncExternalStore
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Create player instance (only recreated if speed changes)
  const speedRef = useRef(options.speed);
  const playerRef = useRef<AnimationPlayerInstance | null>(null);

  if (!playerRef.current || speedRef.current !== options.speed) {
    speedRef.current = options.speed;
    playerRef.current = createPlayer({
      // Use ref.current so we always get the latest findElement
      findElement: (shapeId) => findElementRef.current(shapeId),
      onStart: () => {
        store.setState("playing");
        onStartRef.current?.();
      },
      onComplete: () => {
        store.setState("idle");
        onCompleteRef.current?.();
      },
      onLog: (message) => onLogRef.current?.(message),
      speed: options.speed,
    });
  }

  const player = playerRef.current;

  // Play wrapper
  const play = useCallback(
    async (timing: Timing) => {
      if (store.getSnapshot() === "playing") {
        return;
      }
      await player.play(timing);
    },
    [player, store]
  );

  // Stop wrapper
  const stop = useCallback(() => {
    player.stop();
    store.setState("stopped");
  }, [player, store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player.stop();
    };
  }, [player]);

  return {
    state,
    isPlaying: state === "playing",
    play,
    stop,
    resetAll: player.resetAll,
    showAll: player.showAll,
    hideAll: player.hideAll,
    extractShapeIds,
    player,
  };
}
