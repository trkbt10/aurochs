/**
 * @file Font module - browser-compatible font utilities
 *
 * This module provides font resolution, weight/style detection, and caching
 * without any Node.js dependencies. Environment-specific font loaders are
 * available in separate packages:
 *
 * - @aurochs-renderer/figma/font-drivers/node - Node.js filesystem loader
 * - @aurochs-renderer/figma/font-drivers/browser - Browser Local Font Access API loader
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Abstract font types (opentype.js compatible)
  AbstractFont,
  AbstractGlyph,
  FontPath,
  PathCommand,

  // Font loader types
  LoadedFont,
  FontLoadOptions,

  // Font resolution types
  FigmaFontRef,
  ResolvedFont,
  FontAvailability,
  FontVariant,
  FontResolverConfig,
  FontAvailabilityChecker,
  FontMetrics,
} from "./types";

export type { FontLoader } from "./loader";

// =============================================================================
// Weight Detection
// =============================================================================

export { FONT_WEIGHTS, type FontWeight, detectWeight, normalizeWeight, getWeightName } from "./weight";

// =============================================================================
// Style Detection
// =============================================================================

export { type FontStyle, detectStyle, isItalic, isOblique, isSlanted } from "./style";

// =============================================================================
// Font Mappings
// =============================================================================

export {
  SYSTEM_UI_STACK,
  MONOSPACE_STACK,
  SERIF_STACK,
  SANS_SERIF_STACK,
  COMMON_FONT_MAPPINGS,
  GENERIC_FALLBACKS,
  detectFontCategory,
  getDefaultFallbacks,
} from "./mappings";

// =============================================================================
// Font Resolver
// =============================================================================

export { FontResolver, createFontResolver, createBrowserAvailabilityChecker } from "./resolver";

// =============================================================================
// Font Cache
// =============================================================================

export { FontCache, CachingFontLoader } from "./cache";

// =============================================================================
// Helpers
// =============================================================================

export { CJK_FALLBACK_FONTS, fontHasGlyph, isCJKCharacter } from "./helpers";
