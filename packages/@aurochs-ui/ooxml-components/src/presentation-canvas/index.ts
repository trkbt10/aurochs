/**
 * @file presentation-canvas — barrel exports for EditorCanvas interaction wiring
 * @packageDocumentation
 *
 * **presentation-canvas** — Wires selection, drag, and resize between the shared EditorCanvas
 * (`@aurochs-ui/editor-controls`) and PPTX/POTX editor state.
 */

export {
  useCanvasHandlers,
  type UseCanvasHandlersOptions,
  type CanvasHandlers,
  type CanvasSelectionCallbacks,
  type CanvasDragCallbacks,
} from "./use-canvas-handlers";
