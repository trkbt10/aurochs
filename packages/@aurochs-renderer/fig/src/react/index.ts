/**
 * @file React components for fig scene graph rendering
 *
 * Provides React-native SVG rendering via the RenderTree intermediate
 * representation. SceneGraph → RenderTree → React SVG elements.
 */

// Top-level renderers
export { FigSceneRenderer, FigRenderTreeRenderer } from "./FigSceneRenderer";

// RenderTree-based node components
export { RenderNodeComponent } from "./nodes/RenderNodeComponent";

// Shared components
export { FigSvgDefsProvider, FigSvgIdProvider, useFigSvgDefs } from "./context/FigSvgDefsContext";
export type { FigSvgIdGenerator } from "./context/FigSvgDefsContext";
export { FigTextLines } from "./nodes/FigTextLines";
