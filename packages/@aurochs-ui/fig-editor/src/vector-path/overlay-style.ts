/** @file Visual and hit-test constants for canvas vector path editing. */

export const VECTOR_PATH_OVERLAY_STYLE = {
  selectionColor: "#0066ff",
  anchorFill: "#ffffff",
  segmentHitStroke: "rgba(0, 102, 255, 0.001)",
  previewFill: "rgba(0, 102, 255, 0.08)",
  segmentHitStrokeWidthPx: 12,
  controlLineStrokeWidthPx: 1,
  handleStrokeWidthPx: 2,
  anchorRadiusPx: 5,
  controlRadiusPx: 4,
  controlLineDashPx: [4, 3],
  creationPreviewDashPx: [4, 2],
  minViewportScale: 0.001,
} as const;

/** Converts a screen-pixel size into page-space size under the current viewport scale. */
export function screenPxToPagePx(px: number, viewportScale: number): number {
  return px / Math.max(viewportScale, VECTOR_PATH_OVERLAY_STYLE.minViewportScale);
}

/** Converts a dash pattern in screen pixels into an SVG dash pattern in page units. */
export function screenDashToPageDash(dash: readonly [number, number], viewportScale: number): string {
  return dash.map((px) => screenPxToPagePx(px, viewportScale)).join(" ");
}

/** Draw controls first and anchors last so anchor completion wins hit testing. */
export function orderVectorPathHandlesForHitTesting<T extends { readonly role: "anchor" | "control" }>(
  handles: readonly T[],
): readonly T[] {
  return [
    ...handles.filter((handle) => handle.role === "control"),
    ...handles.filter((handle) => handle.role === "anchor"),
  ];
}

/** Cursor for committed vector path handles. */
export function getVectorPathHandleCursor(handle: { readonly role: "anchor" | "control" }): string {
  return handle.role === "control" ? "grab" : "pointer";
}
