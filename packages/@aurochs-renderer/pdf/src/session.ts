/**
 * @file PDF render session
 *
 * Provides `PdfRenderSession`, the single entry point for loading and
 * rendering PDFs incrementally. Wraps the parser's `PdfSourceContext`
 * and adds:
 *
 *  - Per-page building (`PdfParsedDocument` → `PdfDocument`)
 *  - A shared `FontProvider` derived from embedded fonts (created once)
 *  - LRU cache for built pages
 *  - SVG rendering via `renderPdfPageToSvgNode`
 *
 * Consumers (PdfViewer, PdfEditor) use this instead of reaching into
 * `@aurochs-builder/pdf` or `@aurochs/pdf/parser` directly.
 *
 * Architecture: parser → PdfSourceContext → PdfRenderSession → (UI)
 */

import type { PdfDocument, PdfPage } from "@aurochs/pdf/domain";
import type { PdfSourceContext } from "@aurochs/pdf/parser/core/pdf-parser";
import { createPdfSourceContext, parsePagesFromSourceContext } from "@aurochs/pdf/parser/core/pdf-parser";
import { createPdfBuilderContext, buildPdfFromBuilderContext } from "@aurochs-builder/pdf";
import { createFontProviderForDocument } from "@aurochs/pdf/domain/font";
import type { FontProvider } from "@aurochs/pdf/domain/font";
import type { PdfSvgRenderOptions } from "./types";
import { renderPdfPageToSvgNode } from "./svg";
import type { XmlElement } from "@aurochs/xml";
import type { PdfLoadEncryption } from "@aurochs/pdf/parser/core/pdf-load-error";
import { createPdfImageCache, objectUrlStrategy, type PdfImageCache, type PdfImageUrlStrategy } from "./image-cache";

// =============================================================================
// Types
// =============================================================================

/** Options for creating a render session. */
export type CreatePdfRenderSessionOptions = Readonly<{
  readonly encryption?: PdfLoadEncryption;
  /**
   * Maximum number of built pages to keep in the LRU cache.
   * Default: 8.
   */
  readonly pageCacheSize?: number;
  /**
   * Strategy for converting PdfImage data to URLs.
   * Default: `objectUrlStrategy()` (browser Object URLs with deferred encoding).
   * Use `dataUrlStrategy()` for Node/CLI environments.
   */
  readonly imageStrategy?: PdfImageUrlStrategy;
}>;

/**
 * A render session that holds a loaded PDF and provides incremental
 * page building and rendering.
 *
 * Created via `createPdfRenderSession()`.
 */
export type PdfRenderSession = Readonly<{
  /** Total number of pages. */
  readonly pageCount: number;
  /** Document metadata. */
  readonly metadata: PdfDocument["metadata"];
  /** Font provider shared across all page renders (created once from embedded fonts). */
  readonly fontProvider: FontProvider;
  /**
   * Image cache shared across all page renders.
   * Caches Object URLs for PdfImage data to avoid re-encoding on every render.
   * Pass `imageCache.resolve` as `imageUrlResolver` in `PdfSvgRenderOptions`
   * when rendering outside the session (e.g., in PdfEditor).
   */
  readonly imageCache: PdfImageCache;
  /** Get page dimensions by 1-based page number. */
  readonly getPageDimensions: (pageNumber: number) => { readonly width: number; readonly height: number } | null;
  /**
   * Build a single page (parse + build) by 1-based page number.
   * Results are cached; repeated calls for the same page return the cached result.
   */
  readonly buildPage: (pageNumber: number) => Promise<PdfPage>;
  /**
   * Build all pages at once.
   * Returns a full PdfDocument. Useful when entering editor mode.
   */
  readonly buildAllPages: () => Promise<PdfDocument>;
  /**
   * Render a page to an SVG XmlElement tree.
   * Builds the page if not already cached, then renders to SVG.
   * Automatically uses the session's image cache.
   */
  readonly renderPageToSvgNode: (pageNumber: number, options?: PdfSvgRenderOptions) => Promise<XmlElement>;
  /**
   * Dispose the session: revoke all cached Object URLs and clear caches.
   * Call when the session is no longer needed (e.g., component unmount).
   */
  readonly dispose: () => void;
}>;

// =============================================================================
// LRU cache
// =============================================================================

type LruCache<V> = {
  readonly entries: Map<number, V>;
  readonly order: number[];
  readonly maxSize: number;
};

function createLruCache<V>(maxSize: number): LruCache<V> {
  return { entries: new Map(), order: [], maxSize };
}

function lruGet<V>(cache: LruCache<V>, key: number): V | undefined {
  const entry = cache.entries.get(key);
  if (!entry) { return undefined; }
  const idx = cache.order.indexOf(key);
  if (idx !== -1) {
    cache.order.splice(idx, 1);
    cache.order.push(key);
  }
  return entry;
}

function lruSet<V>(cache: LruCache<V>, key: number, value: V): void {
  if (cache.entries.has(key)) {
    // Update existing: refresh order
    const idx = cache.order.indexOf(key);
    if (idx !== -1) {
      cache.order.splice(idx, 1);
    }
  }
  cache.entries.set(key, value);
  cache.order.push(key);
  while (cache.entries.size > cache.maxSize && cache.order.length > 0) {
    const oldest = cache.order.shift();
    if (oldest !== undefined) {
      cache.entries.delete(oldest);
    }
  }
}

// =============================================================================
// Session creation
// =============================================================================

const DEFAULT_PAGE_CACHE_SIZE = 8;

/**
 * Create a render session from raw PDF bytes.
 *
 * Performs the one-time expensive work (PDF structure load + font extraction),
 * then provides a lightweight API for incremental page rendering.
 */
export async function createPdfRenderSession(
  data: Uint8Array | ArrayBuffer,
  options: CreatePdfRenderSessionOptions = {},
): Promise<PdfRenderSession> {
  const sourceContext = await createPdfSourceContext(data, { encryption: options.encryption });
  return createPdfRenderSessionFromSourceContext(sourceContext, options);
}

/**
 * Create a render session from an existing source context.
 *
 * Useful when the caller already has a `PdfSourceContext`
 * (e.g., created earlier for inspection).
 */
export function createPdfRenderSessionFromSourceContext(
  sourceContext: PdfSourceContext,
  options: CreatePdfRenderSessionOptions = {},
): PdfRenderSession {
  const cacheSize = options.pageCacheSize ?? DEFAULT_PAGE_CACHE_SIZE;
  const pageCache = createLruCache<PdfPage>(cacheSize);

  // Create fontProvider once from the embedded fonts in the source context.
  const fontProvider = createFontProviderForDocument({
    embeddedFonts: sourceContext.embeddedFonts,
  });

  // Image cache: caches URLs across all page renders using the injected strategy.
  const imageCache = createPdfImageCache(options.imageStrategy ?? objectUrlStrategy());

  // Track in-flight page builds to avoid duplicate work for the same page.
  const inFlightBuilds = new Map<number, Promise<PdfPage>>();

  async function buildPageInternal(pageNumber: number): Promise<PdfPage> {
    if (pageNumber < 1 || pageNumber > sourceContext.pageCount) {
      throw new Error(`Page number ${pageNumber} out of range (1..${sourceContext.pageCount})`);
    }

    // Check cache first.
    const cached = lruGet(pageCache, pageNumber);
    if (cached) { return cached; }

    // Deduplicate concurrent builds for the same page.
    const inFlight = inFlightBuilds.get(pageNumber);
    if (inFlight) { return inFlight; }

    const buildPromise = (async () => {
      const parsedDoc = await parsePagesFromSourceContext(sourceContext, [pageNumber]);
      const context = createPdfBuilderContext({ parsedDocument: parsedDoc });
      const document = buildPdfFromBuilderContext({ context });
      const page = document.pages[0];
      if (!page) {
        throw new Error(`Page ${pageNumber} not found after build`);
      }
      lruSet(pageCache, pageNumber, page);
      return page;
    })();

    inFlightBuilds.set(pageNumber, buildPromise);
    try {
      return await buildPromise;
    } finally {
      inFlightBuilds.delete(pageNumber);
    }
  }

  async function buildAllPages(): Promise<PdfDocument> {
    const allPageNumbers = Array.from({ length: sourceContext.pageCount }, (_, i) => i + 1);
    const parsedDoc = await parsePagesFromSourceContext(sourceContext, allPageNumbers);
    const context = createPdfBuilderContext({ parsedDocument: parsedDoc });
    const document = buildPdfFromBuilderContext({ context });

    // Populate cache with all built pages.
    for (const page of document.pages) {
      lruSet(pageCache, page.pageNumber, page);
    }

    return document;
  }

  async function renderPageToSvgNode(pageNumber: number, renderOptions?: PdfSvgRenderOptions): Promise<XmlElement> {
    const page = await buildPageInternal(pageNumber);
    return renderPdfPageToSvgNode(page, {
      ...renderOptions,
      fontProvider,
      imageUrlResolver: renderOptions?.imageUrlResolver ?? imageCache.resolve,
    });
  }

  function dispose(): void {
    imageCache.dispose();
    pageCache.entries.clear();
    pageCache.order.length = 0;
    inFlightBuilds.clear();
  }

  return {
    pageCount: sourceContext.pageCount,
    metadata: sourceContext.metadata,
    fontProvider,
    imageCache,
    getPageDimensions: sourceContext.getPageDimensions,
    buildPage: buildPageInternal,
    buildAllPages,
    renderPageToSvgNode,
    dispose,
  };
}
