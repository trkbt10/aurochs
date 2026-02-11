/**
 * @file IntersectionObserver mock utilities for tests
 */

let isInstalled = false;

class MockIntersectionObserver implements IntersectionObserver {
  public readonly root: Element | Document | null = null;
  public readonly rootMargin: string = "0px";
  public readonly thresholds: ReadonlyArray<number> = [0];

  public constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    // No-op for tests.
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

  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Install a mock IntersectionObserver on globalThis for tests. */
export function installIntersectionObserverMock(): void {
  if (isInstalled) {
    return;
  }
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  isInstalled = true;
}
