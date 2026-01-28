/**
 * @file DrawingML tests barrel export
 *
 * Tests are organized by category:
 * - core/  : Core DrawingML features (mode-agnostic)
 * - svg/   : SVG mode tests (2D rendering)
 * - webgl/ : WebGL mode tests (3D rendering)
 */

// Common utilities
export { testSlideSize, testColorContext } from "./common";

// Route definitions
export type { Category, CategoryRoute, FeatureRoute } from "./routes";
export { categories, findCategory, findFeature, getDefaultRoute } from "./routes";

// Core DrawingML tests
export {
  ColorTest,
  FillTest,
  LineEndTest,
  LineTest,
  EffectsTest,
  ShapesTest,
  CombinedTest,
} from "./core";

// SVG Mode tests
export { SvgTextEffectsTest } from "./svg";

// WebGL Mode tests
export { WebglTextEffectsTest, WordArtGallery } from "./webgl";
