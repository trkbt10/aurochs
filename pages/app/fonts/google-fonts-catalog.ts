/**
 * @file Google Fonts catalog for demo pages (injectable)
 *
 * - Fetches families list from same-origin static JSON (no proxy; works on GitHub Pages).
 * - Loads requested fonts on demand using Google Fonts CSS2 endpoint.
 */

import type { FontCatalog, FontCatalogFamilyRecord } from "@oxen-ui/pptx-editor";

export type GoogleFontsCatalogConfig = {
  /** e.g. "/fonts/google-fonts-families.json" */
  readonly familiesUrl: string;
  /** Optional fetch injection for tests / custom runtimes */
  readonly fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** e.g. "https://fonts.googleapis.com/css2" */
  readonly cssBaseUrl: string;
  /** e.g. "swap" */
  readonly display: "auto" | "block" | "swap" | "fallback" | "optional";
  /** Weights requested when loading a family */
  readonly weights: readonly number[];
  /** Cache key for localStorage */
  readonly cacheKey: string;
  /** Cache TTL for the family list */
  readonly cacheTtlMs: number;
  /** Timeout while loading CSS/fonts */
  readonly timeoutMs: number;
};

type CachedFamilies = {
  readonly cachedAtMs: number;
  readonly families: readonly string[];
  readonly categories?: Readonly<Record<string, string>>;
};

function requireNonEmptyString(value: string, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`createGoogleFontsCatalog: "${name}" is required`);
  }
  return value;
}

function requirePositiveInt(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`createGoogleFontsCatalog: "${name}" must be > 0`);
  }
  return value;
}

function normalizeFamilyName(family: string): string {
  const trimmed = family.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function uniqueSortedFamilies(families: readonly string[]): readonly string[] {
  const set = new Set<string>();
  for (const family of families) {
    const normalized = normalizeFamilyName(family);
    if (normalized) {
      set.add(normalized);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function uniqueSortedWeights(weights: readonly number[]): readonly number[] {
  const set = new Set<number>();
  for (const weight of weights) {
    if (Number.isFinite(weight)) {
      set.add(weight);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

type FamiliesFile =
  | readonly string[]
  | {
      readonly families: readonly string[];
      readonly categories?: Readonly<Record<string, string>>;
    };

type ParsedFamiliesFile = {
  readonly families: readonly string[];
  readonly categories: Readonly<Record<string, string>>;
};

function parseFamiliesFile(value: unknown): ParsedFamiliesFile {
  if (Array.isArray(value)) {
    return { families: uniqueSortedFamilies(value.filter((v): v is string => typeof v === "string")), categories: {} };
  }
  if (value && typeof value === "object" && "families" in value) {
    const families = (value as { readonly families?: unknown }).families;
    if (Array.isArray(families)) {
      const categories = (value as { readonly categories?: unknown }).categories;
      const resolvedCategories: Record<string, string> = {};
      if (categories && typeof categories === "object") {
        for (const [key, raw] of Object.entries(categories as Record<string, unknown>)) {
          if (typeof raw === "string" && raw.trim() !== "") {
            resolvedCategories[normalizeFamilyName(key)] = raw.trim();
          }
        }
      }
      return {
        families: uniqueSortedFamilies(families.filter((v): v is string => typeof v === "string")),
        categories: resolvedCategories,
      };
    }
  }
  throw new Error("Invalid families JSON: expected string[] or { families: string[] }");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  requirePositiveInt(timeoutMs, "timeoutMs");
  return Promise.race([
    promise,
    sleep(timeoutMs).then(() => {
      throw new Error(`Timeout: ${label} (${timeoutMs}ms)`);
    }),
  ]);
}

function getCache(key: string): CachedFamilies | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CachedFamilies>;
    if (typeof parsed.cachedAtMs !== "number" || !Array.isArray(parsed.families)) {
      return null;
    }
    const families = parsed.families.filter((v): v is string => typeof v === "string");
    const categories: Record<string, string> = {};
    if (parsed.categories && typeof parsed.categories === "object") {
      for (const [family, rawCategory] of Object.entries(parsed.categories as Record<string, unknown>)) {
        if (typeof rawCategory === "string" && rawCategory.trim() !== "") {
          categories[normalizeFamilyName(family)] = rawCategory.trim();
        }
      }
    }
    return { cachedAtMs: parsed.cachedAtMs, families, categories };
  } catch {
    return null;
  }
}

function setCache(key: string, value: CachedFamilies): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode
  }
}

function buildGoogleFontsCssUrl(
  ...args: readonly [
    cssBaseUrl: string,
    family: string,
    weights: readonly number[],
    display: GoogleFontsCatalogConfig["display"],
  ]
): string {
  const [cssBaseUrl, family, weights, display] = args;
  const normalizedFamily = normalizeFamilyName(family);
  const familyParam = encodeURIComponent(normalizedFamily).replaceAll("%20", "+");

  const weightList = uniqueSortedWeights(weights).join(";");
  const hasWeights = weightList.trim() !== "";
  const familyValue = hasWeights ? `${familyParam}:wght@${weightList}` : familyParam;

  const url = new URL(cssBaseUrl);
  url.searchParams.set("family", familyValue);
  url.searchParams.set("display", display);
  return url.toString();
}

function getOrCreateStylesheetLink(href: string, dataKey: string): HTMLLinkElement {
  const existing = document.querySelector(`link[rel="stylesheet"][data-font-key="${CSS.escape(dataKey)}"]`);
  if (existing instanceof HTMLLinkElement) {
    return existing;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.fontKey = dataKey;
  document.head.appendChild(link);
  return link;
}

function waitForLinkLoad(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to load stylesheet"));
    };
    const cleanup = () => {
      link.removeEventListener("load", onLoad);
      link.removeEventListener("error", onError);
    };
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onError);
  });
}

function isFontAvailable(family: string): boolean {
  const escaped = family.replaceAll("\"", "\\\"");
  return document.fonts.check(`12px "${escaped}"`);
}

function buildFontLoadSpecs(escapedFamily: string, weights: readonly number[]): readonly string[] {
  if (weights.length > 0) {
    return weights.map((weight) => `${weight} 12px "${escapedFamily}"`);
  }
  return [`12px "${escapedFamily}"`];
}

async function loadFontFace(family: string, weights: readonly number[], timeoutMs: number): Promise<void> {
  const escaped = family.replaceAll("\"", "\\\"");
  const specs = buildFontLoadSpecs(escaped, weights);

  await withTimeout(
    Promise.allSettled(specs.map((spec) => document.fonts.load(spec))).then(() => undefined),
    timeoutMs,
    `document.fonts.load("${family}")`
  );
}

/**
 * Creates an injectable FontCatalog backed by Google Fonts.
 *
 * The family list is fetched at runtime (no bundling), cached in localStorage,
 * and fonts are loaded on demand via Google Fonts CSS2.
 */
export function createGoogleFontsCatalog(config: GoogleFontsCatalogConfig): FontCatalog {
  const familiesUrl = requireNonEmptyString(config.familiesUrl, "familiesUrl");
  const fetcher = config.fetcher ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new Error('createGoogleFontsCatalog: "fetcher" is required in this environment');
  }
  const cssBaseUrl = requireNonEmptyString(config.cssBaseUrl, "cssBaseUrl");
  const cacheKey = requireNonEmptyString(config.cacheKey, "cacheKey");
  const cacheTtlMs = requirePositiveInt(config.cacheTtlMs, "cacheTtlMs");
  const timeoutMs = requirePositiveInt(config.timeoutMs, "timeoutMs");
  const display = config.display;
  if (!display) {
    throw new Error('createGoogleFontsCatalog: "display" is required');
  }
  if (!Array.isArray(config.weights) || config.weights.length === 0) {
    throw new Error('createGoogleFontsCatalog: "weights" must be a non-empty array');
  }
  const weights = config.weights;

  const inMemoryFamilies: { value: ParsedFamiliesFile | null; inFlight: Promise<ParsedFamiliesFile> | null } = {
    value: null,
    inFlight: null,
  };
  const inMemoryRecords: { value: readonly FontCatalogFamilyRecord[] | null } = { value: null };

  const getParsedFamilies = async (): Promise<ParsedFamiliesFile> => {
    if (inMemoryFamilies.value) {
      return inMemoryFamilies.value;
    }
    if (inMemoryFamilies.inFlight) {
      return inMemoryFamilies.inFlight;
    }
    const inFlight = fetchFamilies();
    inMemoryFamilies.inFlight = inFlight;
    try {
      return await inFlight;
    } finally {
      if (inMemoryFamilies.inFlight === inFlight) {
        inMemoryFamilies.inFlight = null;
      }
    }
  };

  const fetchFamilies = async (): Promise<ParsedFamiliesFile> => {
    const cached = getCache(cacheKey);
    if (cached) {
      const age = Date.now() - cached.cachedAtMs;
      if (age >= 0 && age < cacheTtlMs) {
        const families = uniqueSortedFamilies(cached.families);
        const categories = cached.categories ?? {};
        const parsed: ParsedFamiliesFile = { families, categories };
        inMemoryFamilies.value = parsed;
        inMemoryRecords.value = null;
        return parsed;
      }
    }

    const response = await fetcher(familiesUrl, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Google Fonts families fetch failed: ${response.status} (${familiesUrl})`);
    }
    const parsed = parseFamiliesFile((await response.json()) as FamiliesFile);
    inMemoryFamilies.value = parsed;
    inMemoryRecords.value = null;
    setCache(cacheKey, { cachedAtMs: Date.now(), families: parsed.families, categories: parsed.categories });
    return parsed;
  };

  const listFamilies = async (): Promise<readonly string[]> => {
    const parsed = await getParsedFamilies();
    return parsed.families;
  };

  const listFamilyRecords = async (): Promise<readonly FontCatalogFamilyRecord[]> => {
    if (inMemoryRecords.value) {
      return inMemoryRecords.value;
    }
    const parsed = await getParsedFamilies();
    const records: FontCatalogFamilyRecord[] = parsed.families.map((family) => {
      const category = parsed.categories[family];
      const tag = typeof category === "string" && category.trim() !== "" ? category.trim() : undefined;
      return tag ? { family, tags: [tag] } : { family };
    });
    inMemoryRecords.value = records;
    return records;
  };

  const ensureFamilyLoaded = async (family: string): Promise<boolean> => {
    if (typeof document === "undefined") {
      throw new Error("GoogleFontsCatalog.ensureFamilyLoaded: document is not available");
    }

    const normalized = normalizeFamilyName(family);
    if (normalized === "") {
      return false;
    }
    if (isFontAvailable(normalized)) {
      return true;
    }

    const href = buildGoogleFontsCssUrl(cssBaseUrl, normalized, weights, display);
    const link = getOrCreateStylesheetLink(href, `google-fonts:${normalized}`);

    await withTimeout(waitForLinkLoad(link), timeoutMs, `load stylesheet for "${normalized}"`);
    await loadFontFace(normalized, weights, timeoutMs);

    return isFontAvailable(normalized);
  };

  return {
    label: "Google Fonts",
    listFamilies,
    listFamilyRecords,
    ensureFamilyLoaded,
  };
}
