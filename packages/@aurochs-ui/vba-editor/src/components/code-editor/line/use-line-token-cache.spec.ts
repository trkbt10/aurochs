/**
 * @file Line Token Cache Tests
 *
 * Tests the LRU cache behavior used by useLineTokenCache.
 * Since the hook is a thin wrapper, we test the tokenization logic directly.
 */

import { tokenizeLine } from "../code/syntax-highlight";

// =============================================================================
// LRU Cache Implementation (extracted for testing)
// =============================================================================

type LRUCacheInstance<K, V> = {
  readonly get: (key: K) => V | undefined;
  readonly set: (key: K, value: V) => void;
  readonly clear: () => void;
  readonly size: () => number;
};

function createLRUCache<K, V>(maxSize: number): LRUCacheInstance<K, V> {
  const cache = new Map<K, V>();

  const get = (key: K): V | undefined => {
    const value = cache.get(key);
    if (value !== undefined) {
      cache.delete(key);
      cache.set(key, value);
    }
    return value;
  };

  const set = (key: K, value: V): void => {
    cache.delete(key);
    cache.set(key, value);

    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
  };

  const clear = (): void => {
    cache.clear();
  };

  const size = (): number => cache.size;

  return { get, set, clear, size };
}

// =============================================================================
// Tests
// =============================================================================

describe("LRUCache", () => {
  test("stores and retrieves values", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
  });

  test("returns undefined for missing keys", () => {
    const cache = createLRUCache<string, number>(3);
    expect(cache.get("missing")).toBeUndefined();
  });

  test("evicts oldest entry when over capacity", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // This should evict "a"

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });

  test("accessing an entry moves it to end (LRU)", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    // Access "a" to move it to end
    cache.get("a");

    // Add new entry - should evict "b" (now oldest)
    cache.set("d", 4);

    expect(cache.get("a")).toBe(1); // Still present
    expect(cache.get("b")).toBeUndefined(); // Evicted
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });

  test("clear removes all entries", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });
});

describe("tokenizeLine cache behavior", () => {
  test("same line produces same tokens", () => {
    const line = "Dim x As Integer";
    const tokens1 = tokenizeLine(line);
    const tokens2 = tokenizeLine(line);

    // Content should be equal
    expect(tokens1).toEqual(tokens2);
  });

  test("tokenizes VBA keywords correctly", () => {
    const tokens = tokenizeLine("Public Sub Test()");

    const types = tokens.map((t) => t.type);
    expect(types).toContain("keyword"); // Public, Sub
    expect(types).toContain("identifier"); // Test
    expect(types).toContain("punctuation"); // (, )
  });

  test("handles empty lines", () => {
    const tokens = tokenizeLine("");
    expect(tokens).toEqual([]);
  });

  test("handles lines with only whitespace", () => {
    const tokens = tokenizeLine("   ");
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe("whitespace");
  });

  test("different lines produce different tokens", () => {
    const tokens1 = tokenizeLine("Dim x As Integer");
    const tokens2 = tokenizeLine("Dim y As String");

    expect(tokens1).not.toEqual(tokens2);
  });
});

describe("Token cache integration", () => {
  test("caching tokenized lines improves performance", () => {
    const cache = createLRUCache<string, readonly ReturnType<typeof tokenizeLine>[number][]>(100);
    const line = "Public Function GetValue(ByVal index As Integer) As Variant";

    // First call - tokenize and cache
    const tokens1 = cache.get(line) ?? tokenizeLine(line);
    cache.set(line, tokens1);

    // Second call - should hit cache
    const tokens2 = cache.get(line);

    expect(tokens2).toBe(tokens1); // Same reference (cached)
  });
});
