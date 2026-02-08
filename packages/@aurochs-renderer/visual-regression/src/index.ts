/**
 * @file Visual regression test utilities for @aurochs-renderer packages
 *
 * This package provides shared utilities and integration tests for visual
 * regression testing across chart and diagram renderers.
 *
 * For component-specific tests, see:
 * - @aurochs-renderer/chart/spec/visual/ - Chart visual tests
 * - @aurochs-renderer/diagram/spec/visual/ - Diagram visual tests
 */

export { compareSvgToSnapshot, svgToPng, hasSnapshot, listSnapshots } from "./compare";

export type { CompareOptions, CompareResult } from "./types";
export { VISUAL_THRESHOLDS } from "./types";
