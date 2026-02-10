/**
 * @file Public API barrel for zoom controls
 */
export type { ZoomMode } from "./types";
export {
  ZOOM_STEPS,
  FIT_ZOOM_VALUE,
  getClosestZoomIndex,
  getNextZoomValue,
  getZoomOptions,
  isFitMode,
} from "./zoom-steps";
export { ZoomControls, type ZoomControlsProps } from "./ZoomControls";
