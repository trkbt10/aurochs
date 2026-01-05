/**
 * @file ResizeObserver mock utilities for tests
 */

type MockObserverEntry = {
  readonly callback: ResizeObserverCallback;
  readonly observer: ResizeObserver;
};

const observers: MockObserverEntry[] = [];
let originalResizeObserver: typeof ResizeObserver | undefined;
let isInstalled = false;

class MockResizeObserver implements ResizeObserver {
  public readonly callback: ResizeObserverCallback;

  public constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observers.push({ callback, observer: this });
  }

  public observe(): void {
    // No-op for tests.
  }

  public unobserve(): void {
    // No-op for tests.
  }

  public disconnect(): void {
    // No-op for tests.
  }
}

/** Install a mock ResizeObserver on globalThis for tests. */
export function installResizeObserverMock(): void {
  if (isInstalled) {
    return;
  }
  originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = MockResizeObserver as typeof ResizeObserver;
  isInstalled = true;
}

/** Clear recorded ResizeObserver instances. */
export function resetResizeObserverMock(): void {
  observers.length = 0;
}

/** Restore the original ResizeObserver after tests. */
export function restoreResizeObserverMock(): void {
  if (!isInstalled) {
    return;
  }
  if (originalResizeObserver) {
    globalThis.ResizeObserver = originalResizeObserver;
  }
  observers.length = 0;
  isInstalled = false;
}

/** Trigger callbacks on all registered ResizeObserver instances. */
export function triggerResizeObservers(entries: ResizeObserverEntry[] = []): void {
  for (const entry of observers) {
    entry.callback(entries, entry.observer);
  }
}
