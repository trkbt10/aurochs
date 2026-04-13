/**
 * @file Tests for PdfImageCache (image-cache.ts)
 *
 * Tests cover:
 *
 * **objectUrlStrategy (browser)**:
 * - Immediate Object URL generation for JPEG and PNG images
 * - Deferred encoding for raw pixel data (placeholder → real URL)
 * - Cache hit on repeated resolve calls
 * - subscribe/unsubscribe notification on encode completion
 * - dispose revokes all Object URLs and prevents further encoding
 * - pending() and size() counters
 *
 * **dataUrlStrategy (Node/CLI)**:
 * - All formats resolve immediately to data URLs
 * - No deferred encoding, no subscriber notifications
 * - Cache hit on repeated resolve calls
 *
 * **Strategy DI**:
 * - Custom strategy is called by the cache
 * - release() is called on dispose
 */


import {
  createPdfImageCache,
  objectUrlStrategy,
  dataUrlStrategy,
  PLACEHOLDER_URL,
  type PdfImageUrlStrategy,
} from "./image-cache";
import type { PdfImage } from "@aurochs/pdf/domain";
import type { PdfGraphicsState } from "@aurochs/pdf/domain";

// =============================================================================
// Helpers — minimal PdfImage factories
// =============================================================================

const IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0] as const;
const MINIMAL_GRAPHICS_STATE = { ctm: IDENTITY_MATRIX } as PdfGraphicsState;

function createJpegImage(extraBytes: number[] = [0xe0]): PdfImage {
  return {
    type: "image",
    data: new Uint8Array([0xff, 0xd8, 0xff, ...extraBytes]),
    width: 1, height: 1,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: MINIMAL_GRAPHICS_STATE,
  };
}

function createPngImage(): PdfImage {
  return {
    type: "image",
    data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    width: 1, height: 1,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: MINIMAL_GRAPHICS_STATE,
  };
}

function createRawImage(): PdfImage {
  return {
    type: "image",
    data: new Uint8Array([0xff, 0x00, 0x00]),
    width: 1, height: 1,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: MINIMAL_GRAPHICS_STATE,
  };
}

function flushTimers(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Simple call-tracking function factory (no-vi alternative to vi.fn). */
function makeTracker<TRet = void>(): { (...args: unknown[]): TRet; calls: unknown[][]; callCount: number } {
  const calls: unknown[][] = [];
  const fn = (...args: unknown[]): TRet => {
    calls.push(args);
    fn.callCount = calls.length;
    return undefined as TRet;
  };
  fn.calls = calls;
  fn.callCount = 0;
  return fn;
}

function makeTrackerWithReturn<TArgs extends unknown[], TRet>(impl: (...args: TArgs) => TRet): { (...args: TArgs): TRet; calls: TArgs[]; callCount: number } {
  const calls: TArgs[] = [];
  const fn = (...args: TArgs): TRet => {
    calls.push(args);
    (fn as { callCount: number }).callCount = calls.length;
    return impl(...args);
  };
  fn.calls = calls;
  fn.callCount = 0;
  return fn;
}

// =============================================================================
// objectUrlStrategy tests (browser)
// =============================================================================

describe("PdfImageCache + objectUrlStrategy", () => {
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeEach
  let revokedUrls: string[];
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeEach
  let createObjectURLCallCount: number;
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable for saving/restoring global
  let originalCreateObjectURL: (typeof URL)["createObjectURL"];
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable for saving/restoring global
  let originalRevokeObjectURL: (typeof URL)["revokeObjectURL"];

  beforeEach(() => {
    revokedUrls = [];
    createObjectURLCallCount = 0;
    originalCreateObjectURL = globalThis.URL.createObjectURL;
    originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
    // eslint-disable-next-line no-restricted-syntax -- mutable counter inside mock function closure
    let counter = 0;
    globalThis.URL.createObjectURL = (_blob: Blob) => {
      counter += 1;
      createObjectURLCallCount = counter;
      return `blob:test/${counter}`;
    };
    globalThis.URL.revokeObjectURL = (url: string) => {
      revokedUrls.push(url);
    };
  });

  afterEach(() => {
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("resolves JPEG to an Object URL immediately", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const url = cache.resolve(createJpegImage());
    expect(url).toBe("blob:test/1");
    expect(cache.pending()).toBe(0);
    expect(cache.size()).toBe(1);
    cache.dispose();
  });

  it("resolves PNG to an Object URL immediately", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const url = cache.resolve(createPngImage());
    expect(url).toBe("blob:test/1");
    expect(cache.pending()).toBe(0);
    expect(cache.size()).toBe(1);
    cache.dispose();
  });

  it("returns the same URL on repeated resolve calls (cache hit)", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const image = createJpegImage();
    const url1 = cache.resolve(image);
    const url2 = cache.resolve(image);
    expect(url1).toBe(url2);
    expect(createObjectURLCallCount).toBe(1);
    cache.dispose();
  });

  it("returns placeholder for raw pixel data", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const url = cache.resolve(createRawImage());
    expect(url).toBe(PLACEHOLDER_URL);
    expect(cache.pending()).toBe(1);
    expect(cache.size()).toBe(0);
    cache.dispose();
  });

  it("resolves to real URL after deferred encoding completes", async () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const image = createRawImage();

    const placeholder = cache.resolve(image);
    expect(placeholder).toBe(PLACEHOLDER_URL);

    await flushTimers();

    expect(cache.pending()).toBe(0);
    expect(cache.size()).toBe(1);
    const realUrl = cache.resolve(image);
    expect(realUrl).toMatch(/^blob:test\//);
    cache.dispose();
  });

  it("does not schedule duplicate encodes for the same image", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const image = createRawImage();
    cache.resolve(image);
    cache.resolve(image);
    cache.resolve(image);
    expect(cache.pending()).toBe(1);
    cache.dispose();
  });

  it("notifies subscribers when deferred encoding completes", async () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const listener = makeTracker();
    cache.subscribe(listener);
    cache.resolve(createRawImage());
    expect(listener.callCount).toBe(0);
    await flushTimers();
    expect(listener.callCount).toBe(1);
    cache.dispose();
  });

  it("does not notify after unsubscribe", async () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const listener = makeTracker();
    const unsub = cache.subscribe(listener);
    unsub();
    cache.resolve(createRawImage());
    await flushTimers();
    expect(listener.callCount).toBe(0);
    cache.dispose();
  });

  it("does not notify for JPEG/PNG (no deferred work)", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const listener = makeTracker();
    cache.subscribe(listener);
    cache.resolve(createJpegImage());
    cache.resolve(createPngImage());
    expect(listener.callCount).toBe(0);
    cache.dispose();
  });

  it("dispose revokes all cached Object URLs", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    cache.resolve(createJpegImage());
    cache.resolve(createPngImage());
    expect(cache.size()).toBe(2);
    cache.dispose();
    expect(revokedUrls).toHaveLength(2);
    expect(cache.size()).toBe(0);
  });

  it("dispose prevents deferred encoding from completing", async () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const listener = makeTracker();
    cache.subscribe(listener);
    cache.resolve(createRawImage());
    cache.dispose();
    await flushTimers();
    expect(listener.callCount).toBe(0);
    expect(cache.size()).toBe(0);
  });

  it("treats same data reference as one cache entry", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    const sharedData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const img1: PdfImage = { type: "image", data: sharedData, width: 1, height: 1, colorSpace: "DeviceRGB", bitsPerComponent: 8, graphicsState: MINIMAL_GRAPHICS_STATE };
    const img2: PdfImage = { type: "image", data: sharedData, width: 2, height: 2, colorSpace: "DeviceRGB", bitsPerComponent: 8, graphicsState: MINIMAL_GRAPHICS_STATE };
    expect(cache.resolve(img1)).toBe(cache.resolve(img2));
    expect(cache.size()).toBe(1);
    cache.dispose();
  });

  it("treats distinct data references as separate entries", () => {
    const cache = createPdfImageCache(objectUrlStrategy());
    expect(cache.resolve(createJpegImage())).not.toBe(cache.resolve(createJpegImage()));
    expect(cache.size()).toBe(2);
    cache.dispose();
  });
});

// =============================================================================
// dataUrlStrategy tests (Node/CLI)
// =============================================================================

describe("PdfImageCache + dataUrlStrategy", () => {
  it("resolves JPEG to a data URL", () => {
    const cache = createPdfImageCache(dataUrlStrategy());
    const url = cache.resolve(createJpegImage());
    expect(url).toMatch(/^data:image\/jpeg;base64,/);
    expect(cache.size()).toBe(1);
    expect(cache.pending()).toBe(0);
    cache.dispose();
  });

  it("resolves PNG to a data URL", () => {
    const cache = createPdfImageCache(dataUrlStrategy());
    const url = cache.resolve(createPngImage());
    expect(url).toMatch(/^data:image\/png;base64,/);
    cache.dispose();
  });

  it("resolves raw pixel data to a data URL synchronously (no placeholder)", () => {
    const cache = createPdfImageCache(dataUrlStrategy());
    const url = cache.resolve(createRawImage());
    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(url).not.toBe(PLACEHOLDER_URL);
    expect(cache.pending()).toBe(0);
    expect(cache.size()).toBe(1);
    cache.dispose();
  });

  it("caches data URLs on repeated resolve calls", () => {
    const cache = createPdfImageCache(dataUrlStrategy());
    const image = createRawImage();
    const url1 = cache.resolve(image);
    const url2 = cache.resolve(image);
    expect(url1).toBe(url2);
    expect(cache.size()).toBe(1);
    cache.dispose();
  });

  it("subscribe never fires (no deferred work)", async () => {
    const cache = createPdfImageCache(dataUrlStrategy());
    const listener = makeTracker();
    cache.subscribe(listener);
    cache.resolve(createRawImage());
    await flushTimers();
    expect(listener.callCount).toBe(0);
    cache.dispose();
  });

  it("dispose clears the cache", () => {
    const cache = createPdfImageCache(dataUrlStrategy());
    cache.resolve(createJpegImage());
    cache.resolve(createRawImage());
    expect(cache.size()).toBe(2);
    cache.dispose();
    expect(cache.size()).toBe(0);
  });
});

// =============================================================================
// Custom strategy DI tests
// =============================================================================

describe("PdfImageCache with custom strategy", () => {
  it("delegates resolve to the injected strategy", () => {
    const resolveTracker = makeTrackerWithReturn((_image: PdfImage) => ({ url: "custom://image-1" }));
    const releaseTracker = makeTracker();
    const strategy: PdfImageUrlStrategy = {
      resolve: resolveTracker,
      release: releaseTracker,
    };
    const cache = createPdfImageCache(strategy);
    const image = createJpegImage();

    const url = cache.resolve(image);

    expect(url).toBe("custom://image-1");
    expect(resolveTracker.calls.length).toBe(1);
    expect(resolveTracker.calls[0]![0]).toBe(image);
    cache.dispose();
  });

  it("calls strategy.release on dispose for each cached URL", () => {
    const releaseTracker = makeTrackerWithReturn((_url: string) => undefined);
    const strategy: PdfImageUrlStrategy = {
      resolve: (_image: PdfImage) => ({ url: "custom://img" }),
      release: releaseTracker,
    };
    const cache = createPdfImageCache(strategy);
    cache.resolve(createJpegImage());
    cache.dispose();

    expect(releaseTracker.calls.length).toBe(1);
    expect(releaseTracker.calls[0]![0]).toBe("custom://img");
  });

  it("handles deferred results from custom strategy", async () => {
    const strategy: PdfImageUrlStrategy = {
      resolve: (_image: PdfImage) => ({
        url: "placeholder://tmp",
        deferred: Promise.resolve("custom://real"),
      }),
      release: () => {},
    };
    const cache = createPdfImageCache(strategy);
    const listener = makeTracker();
    cache.subscribe(listener);

    const image = createRawImage();
    const url = cache.resolve(image);
    expect(url).toBe("placeholder://tmp");
    expect(cache.pending()).toBe(1);

    await flushTimers();

    expect(cache.pending()).toBe(0);
    expect(cache.size()).toBe(1);
    expect(cache.resolve(image)).toBe("custom://real");
    expect(listener.callCount).toBe(1);
    cache.dispose();
  });

  it("releases deferred URL if cache was disposed before completion", async () => {
    // eslint-disable-next-line no-restricted-syntax -- mutable variable capturing promise resolver from constructor callback
    let resolveDeferred: (url: string) => void;
    const deferred = new Promise<string>((r) => { resolveDeferred = r; });

    const releaseTracker = makeTrackerWithReturn((_url: string) => undefined);
    const strategy: PdfImageUrlStrategy = {
      resolve: (_image: PdfImage) => ({ url: "placeholder://tmp", deferred }),
      release: releaseTracker,
    };
    const cache = createPdfImageCache(strategy);
    cache.resolve(createRawImage());
    cache.dispose();

    // Resolve the deferred after dispose.
    resolveDeferred!("custom://late");
    await flushTimers();

    // The late URL should be released, not cached.
    expect(releaseTracker.calls.some((args) => args[0] === "custom://late")).toBe(true);
    expect(cache.size()).toBe(0);
  });
});
