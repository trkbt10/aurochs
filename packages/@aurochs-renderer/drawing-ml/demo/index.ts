/**
 * @file DrawingML Demo barrel export
 *
 * Demo components for DrawingML rendering tests.
 * Tests are organized by category:
 * - core/  : Core DrawingML features (mode-agnostic)
 * - svg/   : SVG mode tests (2D rendering)
 * - webgl/ : WebGL mode tests (3D rendering)
 */

// Types
export type { CheckItem, Category, CategoryRoute, FeatureRoute } from "./types";

// Fixtures
export { testSlideSize, testColorContext, makeGradient } from "./fixtures";

// Route definitions
export { categories, findCategory, findFeature, getDefaultRoute } from "./routes";

// Components
export {
  CheckBox,
  TestSubsection,
  ShapePreview,
  LinePreview,
  EffectPreview,
  CombinedPreview,
  GeometryPreview,
  PresetShapePreview,
  TransformPreview,
  LineMarkerPreview,
} from "./components";

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
