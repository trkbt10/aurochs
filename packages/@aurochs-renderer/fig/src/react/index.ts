/**
 * @file React components for fig scene graph rendering
 *
 * Provides React-native SVG rendering of a SceneGraph, replacing
 * the string-based renderSceneGraphToSvg + dangerouslySetInnerHTML pattern.
 */

export { FigSceneRenderer } from "./FigSceneRenderer";
export { FigSvgDefsProvider, FigSvgIdProvider, useFigSvgDefs } from "./context/FigSvgDefsContext";
export type { FigSvgIdGenerator } from "./context/FigSvgDefsContext";
export { SceneNodeRenderer } from "./nodes/SceneNodeRenderer";
