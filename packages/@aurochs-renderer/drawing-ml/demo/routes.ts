/**
 * @file DrawingML Demo Routes Configuration
 *
 * Schema-driven route definitions for DrawingML demos.
 * Each category (core/svg/webgl) has its own set of features.
 */

import type { Category, CategoryRoute, FeatureRoute } from "./types";
import {
  ColorTest,
  FillTest,
  LineTest,
  LineEndTest,
  EffectsTest,
  ShapesTest,
  CombinedTest,
} from "./core";
import { SvgTextEffectsTest } from "./svg";
import { WebglTextEffectsTest } from "./webgl";

export const categories: readonly CategoryRoute[] = [
  {
    id: "core",
    label: "Core",
    description: "Mode-Agnostic",
    icon: "🎨",
    color: "#4F81BD",
    features: [
      { id: "colors", label: "Colors", component: ColorTest },
      { id: "fills", label: "Fills", component: FillTest },
      { id: "lines", label: "Lines", component: LineTest },
      { id: "arrows", label: "Arrows", component: LineEndTest },
      { id: "effects", label: "Effects", component: EffectsTest },
      { id: "shapes", label: "Shapes", component: ShapesTest },
      { id: "combined", label: "Combined", component: CombinedTest },
    ],
  },
  {
    id: "svg",
    label: "SVG",
    description: "2D Rendering",
    icon: "📐",
    color: "#9BBB59",
    features: [
      { id: "text", label: "Text", component: SvgTextEffectsTest },
    ],
  },
  {
    id: "webgl",
    label: "WebGL",
    description: "3D Rendering",
    icon: "🧊",
    color: "#C0504D",
    features: [
      { id: "text", label: "Text", component: WebglTextEffectsTest },
    ],
  },
];

export function findCategory(categoryId: string): CategoryRoute | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function findFeature(categoryId: string, featureId: string): FeatureRoute | undefined {
  const category = findCategory(categoryId);
  return category?.features.find((f) => f.id === featureId);
}

export function getDefaultRoute(): { category: Category; feature: string } {
  const category = categories[0];
  return { category: category.id, feature: category.features[0].id };
}
