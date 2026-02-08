/**
 * @file DrawingML Context module exports
 *
 * Context types and providers for shared DrawingML rendering.
 */

export type {
  DrawingMLRenderContext,
  SvgDefsManager,
  WarningCollector,
  RenderSize,
} from "./types";

export {
  DrawingMLProvider,
  DrawingMLContext,
  type DrawingMLProviderProps,
} from "./DrawingMLProvider";

export {
  useDrawingMLContext,
  useOptionalDrawingMLContext,
} from "./useDrawingMLContext";
