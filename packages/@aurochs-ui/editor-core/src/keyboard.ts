/**
 * @file Keyboard shortcut utilities
 *
 * Format-agnostic utilities for keyboard shortcut handling.
 * Provides platform detection, modifier key helpers, and input target guards.
 */

/**
 * Check if an event target is an input element (should not trigger shortcuts).
 */
export function isInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Check if the current platform is Mac.
 */
export function isPlatformMac(): boolean {
  return typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Get the platform-appropriate modifier key state (Cmd on Mac, Ctrl elsewhere).
 */
export function getModKey(event: { readonly metaKey: boolean; readonly ctrlKey: boolean }, isMac: boolean): boolean {
  return isMac ? event.metaKey : event.ctrlKey;
}

/**
 * A keyboard shortcut handler function.
 * Returns true if the shortcut was handled (stops further processing).
 */
export type ShortcutHandler<TContext> = (event: KeyboardEvent, context: TContext) => boolean;

/**
 * Process a keyboard event through a chain of shortcut handlers.
 * Stops at the first handler that returns true.
 */
export function processShortcutHandlers<TContext>(
  event: KeyboardEvent,
  context: TContext,
  handlers: readonly ShortcutHandler<TContext>[],
): boolean {
  for (const handler of handlers) {
    if (handler(event, context)) {
      return true;
    }
  }
  return false;
}
