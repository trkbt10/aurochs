/** @file Domain object for continuous vector path drawing. */

import type { FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import type { NodeSpec } from "@aurochs-builder/fig/types";

export type VectorPathDraftPoint = {
  readonly x: number;
  readonly y: number;
};

type VectorPathDraftLineSegment = {
  readonly kind: "line";
  readonly anchor: VectorPathDraftPoint;
  readonly pageAnchor: VectorPathDraftPoint;
};

type VectorPathDraftCubicSegment = {
  readonly kind: "cubic";
  readonly control1: VectorPathDraftPoint;
  readonly pageControl1: VectorPathDraftPoint;
  readonly control2: VectorPathDraftPoint;
  readonly pageControl2: VectorPathDraftPoint;
  readonly anchor: VectorPathDraftPoint;
  readonly pageAnchor: VectorPathDraftPoint;
};

type VectorPathDraftSegment = VectorPathDraftLineSegment | VectorPathDraftCubicSegment;

export type VectorPathDraft = {
  readonly parentId: FigNodeId | null;
  readonly parentTransform: FigMatrix | undefined;
  readonly start: VectorPathDraftPoint;
  readonly pageStart: VectorPathDraftPoint;
  readonly segments: readonly VectorPathDraftSegment[];
  readonly outgoingControl: VectorPathDraftPoint | undefined;
  readonly pageOutgoingControl: VectorPathDraftPoint | undefined;
  readonly previewPagePoint: VectorPathDraftPoint | undefined;
  readonly closed: boolean;
};

export type VectorPathDraftParent = {
  readonly parentId: FigNodeId | null;
  readonly parentTransform: FigMatrix | undefined;
};

/** Create the first anchor of a continuous vector path draft. */
export function startVectorPathDraft({
  parent,
  localPoint,
  pagePoint,
}: {
  readonly parent: VectorPathDraftParent;
  readonly localPoint: VectorPathDraftPoint;
  readonly pagePoint: VectorPathDraftPoint;
}): VectorPathDraft {
  return {
    parentId: parent.parentId,
    parentTransform: parent.parentTransform,
    start: localPoint,
    pageStart: pagePoint,
    segments: [],
    outgoingControl: undefined,
    pageOutgoingControl: undefined,
    previewPagePoint: undefined,
    closed: false,
  };
}

/** Append an anchor click to the current continuous vector path draft. */
export function appendVectorPathDraftPoint(
  draft: VectorPathDraft,
  localPoint: VectorPathDraftPoint,
  pagePoint: VectorPathDraftPoint,
): VectorPathDraft {
  if (draft.closed) {
    return draft;
  }
  return {
    ...draft,
    segments: [...draft.segments, createSegmentToAnchor(draft, localPoint, pagePoint)],
    outgoingControl: undefined,
    pageOutgoingControl: undefined,
    previewPagePoint: undefined,
  };
}

/** Convert the just-placed anchor drag into mirrored Bezier handles. */
export function applyVectorPathDraftAnchorDrag(
  draft: VectorPathDraft,
  localControlPoint: VectorPathDraftPoint,
  pageControlPoint: VectorPathDraftPoint,
): VectorPathDraft {
  if (draft.closed) {
    return draft;
  }
  const anchor = getCurrentAnchor(draft);
  const pageAnchor = getCurrentPageAnchor(draft);
  const incomingControl = mirrorPoint(anchor, localControlPoint);
  const pageIncomingControl = mirrorPoint(pageAnchor, pageControlPoint);
  const segments = replaceLastSegmentWithIncomingControl(draft, incomingControl, pageIncomingControl);
  return {
    ...draft,
    segments,
    outgoingControl: localControlPoint,
    pageOutgoingControl: pageControlPoint,
  };
}

/** Mark the path as closed by connecting the current anchor to the first anchor. */
export function closeVectorPathDraft(draft: VectorPathDraft): VectorPathDraft {
  if (!canCommitVectorPathDraft(draft)) {
    return draft;
  }
  return { ...draft, closed: true, previewPagePoint: undefined };
}

/** Return whether a click should close the currently open draft. */
export function isVectorPathDraftClosePoint(
  draft: VectorPathDraft,
  pagePoint: VectorPathDraftPoint,
  tolerance: number,
): boolean {
  return draft.segments.length >= 2 && Math.hypot(draft.pageStart.x - pagePoint.x, draft.pageStart.y - pagePoint.y) <= tolerance;
}

/** Update the transient cursor segment without committing an anchor. */
export function updateVectorPathDraftPreview(
  draft: VectorPathDraft,
  pagePoint: VectorPathDraftPoint,
): VectorPathDraft {
  if (draft.closed) {
    return draft;
  }
  return {
    ...draft,
    previewPagePoint: pagePoint,
  };
}

/** Return whether a draft has enough anchors to become a vector node. */
export function canCommitVectorPathDraft(draft: VectorPathDraft): boolean {
  return draft.segments.length >= 1;
}

/** Serialize the visible page-space preview path for the draft. */
export function vectorPathDraftToPreviewPath(draft: VectorPathDraft): string {
  const base = serializePagePath(draft);
  if (!draft.previewPagePoint || draft.closed) {
    return base;
  }
  if (draft.pageOutgoingControl) {
    return `${base} C ${formatPathNumber(draft.pageOutgoingControl.x)} ${formatPathNumber(draft.pageOutgoingControl.y)} ${formatPathNumber(draft.previewPagePoint.x)} ${formatPathNumber(draft.previewPagePoint.y)} ${formatPathNumber(draft.previewPagePoint.x)} ${formatPathNumber(draft.previewPagePoint.y)}`;
  }
  return `${base} L ${formatPathNumber(draft.previewPagePoint.x)} ${formatPathNumber(draft.previewPagePoint.y)}`;
}

/** Convert a complete draft into a normalized vector node creation spec. */
export function commitVectorPathDraftToNodeSpec(draft: VectorPathDraft): NodeSpec {
  if (!canCommitVectorPathDraft(draft)) {
    throw new Error("Vector path draft requires at least two anchors before commit");
  }

  const points = collectLocalBoundsPoints(draft);
  const bounds = computePointBounds(points);
  return {
    type: "VECTOR",
    name: "Vector Path",
    x: bounds.left,
    y: bounds.top,
    width: Math.max(1, bounds.right - bounds.left),
    height: Math.max(1, bounds.bottom - bounds.top),
    fills: [],
    strokes: [{ type: "SOLID", color: { r: 0.15, g: 0.35, b: 0.95, a: 1 }, opacity: 1, visible: true }],
    strokeWeight: 2,
    vectorPaths: [{
      windingRule: "NONZERO",
      data: serializeLocalPath(draft, bounds),
    }],
  };
}

function createSegmentToAnchor(
  draft: VectorPathDraft,
  localPoint: VectorPathDraftPoint,
  pagePoint: VectorPathDraftPoint,
): VectorPathDraftSegment {
  if (!draft.outgoingControl || !draft.pageOutgoingControl) {
    return { kind: "line", anchor: localPoint, pageAnchor: pagePoint };
  }
  return {
    kind: "cubic",
    control1: draft.outgoingControl,
    pageControl1: draft.pageOutgoingControl,
    control2: localPoint,
    pageControl2: pagePoint,
    anchor: localPoint,
    pageAnchor: pagePoint,
  };
}

function replaceLastSegmentWithIncomingControl(
  draft: VectorPathDraft,
  incomingControl: VectorPathDraftPoint,
  pageIncomingControl: VectorPathDraftPoint,
): readonly VectorPathDraftSegment[] {
  const last = draft.segments[draft.segments.length - 1];
  if (!last) {
    return draft.segments;
  }
  const previousAnchor = getPreviousAnchor(draft);
  const previousPageAnchor = getPreviousPageAnchor(draft);
  const control1 = last.kind === "cubic" ? last.control1 : previousAnchor;
  const pageControl1 = last.kind === "cubic" ? last.pageControl1 : previousPageAnchor;
  const nextLast: VectorPathDraftCubicSegment = {
    kind: "cubic",
    control1,
    pageControl1,
    control2: incomingControl,
    pageControl2: pageIncomingControl,
    anchor: last.anchor,
    pageAnchor: last.pageAnchor,
  };
  return [...draft.segments.slice(0, -1), nextLast];
}

function serializePagePath(draft: VectorPathDraft): string {
  return [
    `M ${formatPathNumber(draft.pageStart.x)} ${formatPathNumber(draft.pageStart.y)}`,
    ...draft.segments.map((segment) => serializePageSegment(segment)),
    draft.closed ? "Z" : "",
  ].filter(Boolean).join(" ");
}

function serializePageSegment(segment: VectorPathDraftSegment): string {
  if (segment.kind === "line") {
    return `L ${formatPathNumber(segment.pageAnchor.x)} ${formatPathNumber(segment.pageAnchor.y)}`;
  }
  return `C ${formatPathNumber(segment.pageControl1.x)} ${formatPathNumber(segment.pageControl1.y)} ${formatPathNumber(segment.pageControl2.x)} ${formatPathNumber(segment.pageControl2.y)} ${formatPathNumber(segment.pageAnchor.x)} ${formatPathNumber(segment.pageAnchor.y)}`;
}

function serializeLocalPath(
  draft: VectorPathDraft,
  bounds: { readonly left: number; readonly top: number },
): string {
  return [
    `M ${formatRelativePoint(draft.start, bounds)}`,
    ...draft.segments.map((segment) => serializeLocalSegment(segment, bounds)),
    draft.closed ? "Z" : "",
  ].filter(Boolean).join(" ");
}

function serializeLocalSegment(
  segment: VectorPathDraftSegment,
  bounds: { readonly left: number; readonly top: number },
): string {
  if (segment.kind === "line") {
    return `L ${formatRelativePoint(segment.anchor, bounds)}`;
  }
  return `C ${formatRelativePoint(segment.control1, bounds)} ${formatRelativePoint(segment.control2, bounds)} ${formatRelativePoint(segment.anchor, bounds)}`;
}

function collectLocalBoundsPoints(draft: VectorPathDraft): readonly VectorPathDraftPoint[] {
  return [
    draft.start,
    ...draft.segments.flatMap((segment) => {
      if (segment.kind === "line") {
        return [segment.anchor];
      }
      return [segment.control1, segment.control2, segment.anchor];
    }),
  ];
}

function getCurrentAnchor(draft: VectorPathDraft): VectorPathDraftPoint {
  return draft.segments[draft.segments.length - 1]?.anchor ?? draft.start;
}

function getCurrentPageAnchor(draft: VectorPathDraft): VectorPathDraftPoint {
  return draft.segments[draft.segments.length - 1]?.pageAnchor ?? draft.pageStart;
}

function getPreviousAnchor(draft: VectorPathDraft): VectorPathDraftPoint {
  return draft.segments[draft.segments.length - 2]?.anchor ?? draft.start;
}

function getPreviousPageAnchor(draft: VectorPathDraft): VectorPathDraftPoint {
  return draft.segments[draft.segments.length - 2]?.pageAnchor ?? draft.pageStart;
}

function mirrorPoint(anchor: VectorPathDraftPoint, control: VectorPathDraftPoint): VectorPathDraftPoint {
  return {
    x: anchor.x * 2 - control.x,
    y: anchor.y * 2 - control.y,
  };
}

function formatRelativePoint(
  point: VectorPathDraftPoint,
  bounds: { readonly left: number; readonly top: number },
): string {
  return `${formatPathNumber(point.x - bounds.left)} ${formatPathNumber(point.y - bounds.top)}`;
}

function computePointBounds(points: readonly VectorPathDraftPoint[]): {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
} {
  if (points.length === 0) {
    throw new Error("Vector path draft bounds require at least one point");
  }
  return points.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
      right: Math.max(bounds.right, point.x),
      bottom: Math.max(bounds.bottom, point.y),
    }),
    { left: points[0]!.x, top: points[0]!.y, right: points[0]!.x, bottom: points[0]!.y },
  );
}

function formatPathNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(3)).toString();
}
