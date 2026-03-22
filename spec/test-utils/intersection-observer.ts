/**
 * @file IntersectionObserver mock utilities for tests
 */

const installState = { isInstalled: false };

/** Install a mock IntersectionObserver on globalThis for tests. */
export function installIntersectionObserverMock(): void {
  if (installState.isInstalled) {
    return;
  }

  function MockIntersectionObserver(
    this: Record<string, unknown>,
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ): void {
    this.root = null;
    this.rootMargin = "0px";
    this.thresholds = [0];
  }
  MockIntersectionObserver.prototype.observe = function observe(): void { /* no-op */ };
  MockIntersectionObserver.prototype.unobserve = function unobserve(): void { /* no-op */ };
  MockIntersectionObserver.prototype.disconnect = function disconnect(): void { /* no-op */ };
  MockIntersectionObserver.prototype.takeRecords = function takeRecords(): IntersectionObserverEntry[] { return []; };

  Object.defineProperty(globalThis, "IntersectionObserver", { value: MockIntersectionObserver, writable: true });
  installState.isInstalled = true;
}
