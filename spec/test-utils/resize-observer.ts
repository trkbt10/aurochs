/**
 * @file ResizeObserver mock utilities for tests
 */

type MockObserverEntry = {
  readonly callback: ResizeObserverCallback;
  readonly observer: ResizeObserver;
};

const observers: MockObserverEntry[] = [];
const mockState = { originalResizeObserver: undefined as typeof ResizeObserver | undefined, isInstalled: false };

/** Install a mock ResizeObserver on globalThis for tests. */
export function installResizeObserverMock(): void {
  if (mockState.isInstalled) {
    return;
  }
  mockState.originalResizeObserver = globalThis.ResizeObserver;

  /** Type guard to cast mock constructor context to ResizeObserver. */
  function toResizeObserver(value: unknown): value is ResizeObserver {
    return typeof value === "object" && value !== null;
  }

  function MockResizeObserver(
    this: Record<string, unknown>,
    callback: ResizeObserverCallback,
  ): void {
    this.callback = callback;
    if (toResizeObserver(this)) {
      observers.push({ callback, observer: this });
    }
  }
  MockResizeObserver.prototype.observe = function observe(): void { /* no-op */ };
  MockResizeObserver.prototype.unobserve = function unobserve(): void { /* no-op */ };
  MockResizeObserver.prototype.disconnect = function disconnect(): void { /* no-op */ };

  Object.defineProperty(globalThis, "ResizeObserver", { value: MockResizeObserver, writable: true });
  mockState.isInstalled = true;
}

/** Clear recorded ResizeObserver instances. */
export function resetResizeObserverMock(): void {
  observers.length = 0;
}

/** Restore the original ResizeObserver after tests. */
export function restoreResizeObserverMock(): void {
  if (!mockState.isInstalled) {
    return;
  }
  if (mockState.originalResizeObserver) {
    globalThis.ResizeObserver = mockState.originalResizeObserver;
  }
  observers.length = 0;
  mockState.isInstalled = false;
}

/** Trigger callbacks on all registered ResizeObserver instances. */
export function triggerResizeObservers(entries: ResizeObserverEntry[] = []): void {
  for (const entry of observers) {
    entry.callback(entries, entry.observer);
  }
}
