/** @file Domain object for continuous vector path drawing. */

import type { FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import type { NodeSpec } from "@aurochs-builder/fig/types";
import {
  computeVectorPathPointBounds,
  formatVectorPathNumber,
  sampleCubicBezier,
  type VectorPathPoint,
} from "./geometry";

type VectorPathDraftLineSegment = {
  readonly kind: "line";
  readonly anchor: VectorPathPoint;
  readonly pageAnchor: VectorPathPoint;
};

type VectorPathDraftCubicSegment = {
  readonly kind: "cubic";
  readonly control1: VectorPathPoint;
  readonly pageControl1: VectorPathPoint;
  readonly control2: VectorPathPoint;
  readonly pageControl2: VectorPathPoint;
  readonly anchor: VectorPathPoint;
  readonly pageAnchor: VectorPathPoint;
};

type VectorPathDraftSegment = VectorPathDraftLineSegment | VectorPathDraftCubicSegment;

export type VectorPathDraft = {
  readonly parentId: FigNodeId | null;
  readonly parentTransform: FigMatrix | undefined;
  readonly start: VectorPathPoint;
  readonly pageStart: VectorPathPoint;
  readonly segments: readonly VectorPathDraftSegment[];
  readonly closingSegment: VectorPathDraftCubicSegment | undefined;
  readonly outgoingControl: VectorPathPoint | undefined;
  readonly pageOutgoingControl: VectorPathPoint | undefined;
  readonly previewPagePoint: VectorPathPoint | undefined;
  readonly closed: boolean;
};

export type VectorPathDraftParent = {
  readonly parentId: FigNodeId | null;
  readonly parentTransform: FigMatrix | undefined;
};

export type VectorPathDraftHandle = {
  readonly key: string;
  readonly role: "anchor" | "control";
  readonly index: number;
  readonly x: number;
  readonly y: number;
};

export type VectorPathDraftControlLine = {
  readonly key: string;
  readonly from: VectorPathPoint;
  readonly to: VectorPathPoint;
};

export type VectorPathDraftPointerStart = {
  readonly clientX: number;
  readonly clientY: number;
};

export type VectorPathDraftHandleIntent = "close-start-anchor" | "move-handle";

export type VectorPathDraftSession = {
  readonly draft: VectorPathDraft;
  readonly pointerStart: VectorPathDraftPointerStart | undefined;
};

export type VectorPathDraftOperation =
  | {
      readonly type: "place-point";
      readonly parent: VectorPathDraftParent;
      readonly localPoint: VectorPathPoint;
      readonly pagePoint: VectorPathPoint;
      readonly pointerStart: VectorPathDraftPointerStart;
      readonly closeTolerance: number;
    }
  | { readonly type: "preview"; readonly pagePoint: VectorPathPoint }
  | {
      readonly type: "anchor-drag-preview";
      readonly localPoint: VectorPathPoint;
      readonly pagePoint: VectorPathPoint;
      readonly exceededThreshold: boolean;
    }
  | {
      readonly type: "anchor-drag-end";
      readonly localPoint: VectorPathPoint;
      readonly pagePoint: VectorPathPoint;
      readonly exceededThreshold: boolean;
    }
  | {
      readonly type: "move-handle";
      readonly handle: VectorPathDraftHandle;
      readonly localPoint: VectorPathPoint;
      readonly pagePoint: VectorPathPoint;
    }
  | { readonly type: "close-from-start-handle" }
  | { readonly type: "commit" }
  | { readonly type: "abort" };

export type VectorPathDraftOperationResult = {
  readonly session: VectorPathDraftSession | null;
  readonly committedDraft?: VectorPathDraft;
};

/** Create the first anchor of a continuous vector path draft. */
export function startVectorPathDraft({
  parent,
  localPoint,
  pagePoint,
}: {
  readonly parent: VectorPathDraftParent;
  readonly localPoint: VectorPathPoint;
  readonly pagePoint: VectorPathPoint;
}): VectorPathDraft {
  return {
    parentId: parent.parentId,
    parentTransform: parent.parentTransform,
    start: localPoint,
    pageStart: pagePoint,
    segments: [],
    closingSegment: undefined,
    outgoingControl: undefined,
    pageOutgoingControl: undefined,
    previewPagePoint: undefined,
    closed: false,
  };
}

/** Append an anchor click to the current continuous vector path draft. */
export function appendVectorPathDraftPoint(
  draft: VectorPathDraft,
  localPoint: VectorPathPoint,
  pagePoint: VectorPathPoint,
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
  localControlPoint: VectorPathPoint,
  pageControlPoint: VectorPathPoint,
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
    previewPagePoint: pageControlPoint,
  };
}

/** Mark the path as closed by connecting the current anchor to the first anchor. */
export function closeVectorPathDraft(draft: VectorPathDraft): VectorPathDraft {
  if (!canCommitVectorPathDraft(draft)) {
    return draft;
  }
  return {
    ...draft,
    closingSegment: createClosingSegment(draft),
    outgoingControl: undefined,
    pageOutgoingControl: undefined,
    closed: true,
    previewPagePoint: undefined,
  };
}

/** Return whether a click should close the currently open draft. */
export function isVectorPathDraftClosePoint(
  draft: VectorPathDraft,
  pagePoint: VectorPathPoint,
  tolerance: number,
): boolean {
  return draft.segments.length >= 2 && Math.hypot(draft.pageStart.x - pagePoint.x, draft.pageStart.y - pagePoint.y) <= tolerance;
}

/** Update the transient cursor segment without committing an anchor. */
export function updateVectorPathDraftPreview(
  draft: VectorPathDraft,
  pagePoint: VectorPathPoint,
): VectorPathDraft {
  if (draft.closed) {
    return draft;
  }
  return {
    ...draft,
    previewPagePoint: pagePoint,
  };
}

/** Return editable page-space handles for the in-progress path draft. */
export function getVectorPathDraftHandles(draft: VectorPathDraft): readonly VectorPathDraftHandle[] {
  const handles: VectorPathDraftHandle[] = [
    { key: "draft-anchor-0", role: "anchor", index: 0, x: draft.pageStart.x, y: draft.pageStart.y },
  ];
  draft.segments.forEach((segment, segmentIndex) => {
    if (segment.kind === "cubic") {
      handles.push(
        { key: `draft-control-${segmentIndex}-1`, role: "control", index: segmentIndex * 2 + 1, x: segment.pageControl1.x, y: segment.pageControl1.y },
        { key: `draft-control-${segmentIndex}-2`, role: "control", index: segmentIndex * 2 + 2, x: segment.pageControl2.x, y: segment.pageControl2.y },
      );
    }
    handles.push({
      key: `draft-anchor-${segmentIndex + 1}`,
      role: "anchor",
      index: segmentIndex + 1,
      x: segment.pageAnchor.x,
      y: segment.pageAnchor.y,
    });
  });
  if (draft.pageOutgoingControl) {
    handles.push({
      key: "draft-control-outgoing",
      role: "control",
      index: draft.segments.length * 2 + 1,
      x: draft.pageOutgoingControl.x,
      y: draft.pageOutgoingControl.y,
    });
  }
  return handles;
}

/** Return page-space Bezier control guide lines for the in-progress path draft. */
export function getVectorPathDraftControlLines(draft: VectorPathDraft): readonly VectorPathDraftControlLine[] {
  const state = draft.segments.reduce((currentState, segment, segmentIndex) => {
    if (segment.kind === "cubic") {
      return {
        previousAnchor: segment.pageAnchor,
        lines: [
          ...currentState.lines,
          { key: `draft-control-line-${segmentIndex}-1`, from: currentState.previousAnchor, to: segment.pageControl1 },
          { key: `draft-control-line-${segmentIndex}-2`, from: segment.pageAnchor, to: segment.pageControl2 },
        ],
      };
    }
    return { ...currentState, previousAnchor: segment.pageAnchor };
  }, {
    previousAnchor: draft.pageStart,
    lines: [] as VectorPathDraftControlLine[],
  });
  if (!draft.pageOutgoingControl) {
    return state.lines;
  }
  return [...state.lines, {
    key: "draft-control-line-outgoing",
    from: getCurrentPageAnchor(draft),
    to: draft.pageOutgoingControl,
  }];
}

/** Move an in-progress draft anchor or control point before the path is committed. */
export function moveVectorPathDraftHandle(
  {
    draft,
    handle,
    localPoint,
    pagePoint,
  }: {
    readonly draft: VectorPathDraft;
    readonly handle: VectorPathDraftHandle;
    readonly localPoint: VectorPathPoint;
    readonly pagePoint: VectorPathPoint;
  },
): VectorPathDraft {
  if (draft.closed) {
    return draft;
  }
  if (handle.role === "anchor") {
    return moveDraftAnchor({ draft, anchorIndex: handle.index, localPoint, pagePoint });
  }
  return moveDraftControl({ draft, controlIndex: handle.index, localPoint, pagePoint });
}

/** Resolve whether a handle click should close the path or start a handle drag. */
export function resolveVectorPathDraftHandleIntent({
  draft,
  handle,
  startClientX,
  startClientY,
  clientX,
  clientY,
  dragThresholdPx,
}: {
  readonly draft: VectorPathDraft;
  readonly handle: VectorPathDraftHandle;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly dragThresholdPx: number;
}): VectorPathDraftHandleIntent {
  const moved = Math.hypot(clientX - startClientX, clientY - startClientY) > dragThresholdPx;
  if (moved || handle.role !== "anchor" || handle.index !== 0 || !canCommitVectorPathDraft(draft)) {
    return "move-handle";
  }
  return "close-start-anchor";
}

/** Cursor for draft vector path handles in the active pen operation. */
export function getVectorPathDraftHandleCursor(
  draft: VectorPathDraft,
  handle: VectorPathDraftHandle,
): string {
  if (handle.role === "control") {
    return "grab";
  }
  if (handle.index === 0 && canCommitVectorPathDraft(draft)) {
    return "alias";
  }
  return "pointer";
}

/** Apply one user-intent operation to the in-progress path drawing session. */
export function applyVectorPathDraftOperation(
  session: VectorPathDraftSession | null,
  operation: VectorPathDraftOperation,
): VectorPathDraftOperationResult {
  switch (operation.type) {
    case "place-point": {
      const currentDraft = session?.draft;
      if (!currentDraft) {
        return {
          session: {
            draft: startVectorPathDraft({
              parent: operation.parent,
              localPoint: operation.localPoint,
              pagePoint: operation.pagePoint,
            }),
            pointerStart: operation.pointerStart,
          },
        };
      }
      if (isVectorPathDraftClosePoint(currentDraft, operation.pagePoint, operation.closeTolerance)) {
        const committedDraft = closeVectorPathDraft(currentDraft);
        return { session: null, committedDraft };
      }
      return {
        session: {
          draft: appendVectorPathDraftPoint(currentDraft, operation.localPoint, operation.pagePoint),
          pointerStart: operation.pointerStart,
        },
      };
    }
    case "preview":
      if (!session) {
        return { session };
      }
      return { session: { ...session, draft: updateVectorPathDraftPreview(session.draft, operation.pagePoint) } };
    case "anchor-drag-preview":
      if (!session || !session.pointerStart || !operation.exceededThreshold) {
        return { session };
      }
      return {
        session: {
          ...session,
          draft: applyVectorPathDraftAnchorDrag(session.draft, operation.localPoint, operation.pagePoint),
        },
      };
    case "anchor-drag-end":
      if (!session) {
        return { session };
      }
      if (!session.pointerStart || !operation.exceededThreshold) {
        return { session: { ...session, pointerStart: undefined } };
      }
      return {
        session: {
          draft: applyVectorPathDraftAnchorDrag(session.draft, operation.localPoint, operation.pagePoint),
          pointerStart: undefined,
        },
      };
    case "move-handle":
      if (!session) {
        return { session };
      }
      return {
        session: {
          ...session,
          draft: moveVectorPathDraftHandle({
            draft: session.draft,
            handle: operation.handle,
            localPoint: operation.localPoint,
            pagePoint: operation.pagePoint,
          }),
        },
      };
    case "close-from-start-handle":
      if (!session || !canCommitVectorPathDraft(session.draft)) {
        return { session };
      }
      return { session: null, committedDraft: closeVectorPathDraft(session.draft) };
    case "commit":
      if (!session) {
        return { session };
      }
      if (!canCommitVectorPathDraft(session.draft)) {
        return { session: null };
      }
      return { session: null, committedDraft: session.draft };
    case "abort":
      return { session: null };
  }
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
    return `${base} C ${formatVectorPathNumber(draft.pageOutgoingControl.x)} ${formatVectorPathNumber(draft.pageOutgoingControl.y)} ${formatVectorPathNumber(draft.previewPagePoint.x)} ${formatVectorPathNumber(draft.previewPagePoint.y)} ${formatVectorPathNumber(draft.previewPagePoint.x)} ${formatVectorPathNumber(draft.previewPagePoint.y)}`;
  }
  return `${base} L ${formatVectorPathNumber(draft.previewPagePoint.x)} ${formatVectorPathNumber(draft.previewPagePoint.y)}`;
}

/** Convert a complete draft into a normalized vector node creation spec. */
export function commitVectorPathDraftToNodeSpec(draft: VectorPathDraft): NodeSpec {
  if (!canCommitVectorPathDraft(draft)) {
    throw new Error("Vector path draft requires at least two anchors before commit");
  }

  const points = collectRenderedPathBoundsPoints(draft);
  const bounds = computeVectorPathPointBounds(points);
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
  localPoint: VectorPathPoint,
  pagePoint: VectorPathPoint,
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

function createClosingSegment(draft: VectorPathDraft): VectorPathDraftCubicSegment | undefined {
  if (!draft.outgoingControl || !draft.pageOutgoingControl) {
    return undefined;
  }
  return {
    kind: "cubic",
    control1: draft.outgoingControl,
    pageControl1: draft.pageOutgoingControl,
    control2: draft.start,
    pageControl2: draft.pageStart,
    anchor: draft.start,
    pageAnchor: draft.pageStart,
  };
}

function replaceLastSegmentWithIncomingControl(
  draft: VectorPathDraft,
  incomingControl: VectorPathPoint,
  pageIncomingControl: VectorPathPoint,
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

function moveDraftAnchor({
  draft,
  anchorIndex,
  localPoint,
  pagePoint,
}: {
  readonly draft: VectorPathDraft;
  readonly anchorIndex: number;
  readonly localPoint: VectorPathPoint;
  readonly pagePoint: VectorPathPoint;
}): VectorPathDraft {
  if (anchorIndex === 0) {
    const localDelta = { x: localPoint.x - draft.start.x, y: localPoint.y - draft.start.y };
    const pageDelta = { x: pagePoint.x - draft.pageStart.x, y: pagePoint.y - draft.pageStart.y };
    return {
      ...draft,
      start: localPoint,
      pageStart: pagePoint,
      segments: draft.segments.map((segment, index) => index === 0 ? translateSegmentControl1(segment, localDelta, pageDelta) : segment),
      outgoingControl: draft.segments.length === 0 ? translatePoint(draft.outgoingControl, localDelta) : draft.outgoingControl,
      pageOutgoingControl: draft.segments.length === 0 ? translatePoint(draft.pageOutgoingControl, pageDelta) : draft.pageOutgoingControl,
    };
  }
  const currentAnchor = draft.segments[anchorIndex - 1]?.anchor;
  const currentPageAnchor = draft.segments[anchorIndex - 1]?.pageAnchor;
  if (!currentAnchor || !currentPageAnchor) {
    return draft;
  }
  const localDelta = { x: localPoint.x - currentAnchor.x, y: localPoint.y - currentAnchor.y };
  const pageDelta = { x: pagePoint.x - currentPageAnchor.x, y: pagePoint.y - currentPageAnchor.y };
  const isCurrentAnchor = anchorIndex === draft.segments.length;
  return {
    ...draft,
    segments: draft.segments.map((segment, index) => {
      if (index === anchorIndex - 1) {
        return moveSegmentAnchor({
          segment,
          localPoint,
          pagePoint,
          localDelta,
          pageDelta,
        });
      }
      if (index === anchorIndex) {
        return translateSegmentControl1(segment, localDelta, pageDelta);
      }
      return segment;
    }),
    outgoingControl: isCurrentAnchor ? translatePoint(draft.outgoingControl, localDelta) : draft.outgoingControl,
    pageOutgoingControl: isCurrentAnchor ? translatePoint(draft.pageOutgoingControl, pageDelta) : draft.pageOutgoingControl,
  };
}

function moveSegmentAnchor({
  segment,
  localPoint,
  pagePoint,
  localDelta,
  pageDelta,
}: {
  readonly segment: VectorPathDraftSegment;
  readonly localPoint: VectorPathPoint;
  readonly pagePoint: VectorPathPoint;
  readonly localDelta: VectorPathPoint;
  readonly pageDelta: VectorPathPoint;
}): VectorPathDraftSegment {
  if (segment.kind === "line") {
    return { ...segment, anchor: localPoint, pageAnchor: pagePoint };
  }
  return {
    ...segment,
    control2: { x: segment.control2.x + localDelta.x, y: segment.control2.y + localDelta.y },
    pageControl2: { x: segment.pageControl2.x + pageDelta.x, y: segment.pageControl2.y + pageDelta.y },
    anchor: localPoint,
    pageAnchor: pagePoint,
  };
}

function translatePoint(
  point: VectorPathPoint | undefined,
  delta: VectorPathPoint,
): VectorPathPoint | undefined {
  if (!point) {
    return undefined;
  }
  return { x: point.x + delta.x, y: point.y + delta.y };
}

function translateSegmentControl1(
  segment: VectorPathDraftSegment,
  localDelta: VectorPathPoint,
  pageDelta: VectorPathPoint,
): VectorPathDraftSegment {
  if (segment.kind !== "cubic") {
    return segment;
  }
  return {
    ...segment,
    control1: { x: segment.control1.x + localDelta.x, y: segment.control1.y + localDelta.y },
    pageControl1: { x: segment.pageControl1.x + pageDelta.x, y: segment.pageControl1.y + pageDelta.y },
  };
}

function moveDraftControl({
  draft,
  controlIndex,
  localPoint,
  pagePoint,
}: {
  readonly draft: VectorPathDraft;
  readonly controlIndex: number;
  readonly localPoint: VectorPathPoint;
  readonly pagePoint: VectorPathPoint;
}): VectorPathDraft {
  const outgoingIndex = draft.segments.length * 2 + 1;
  if (controlIndex === outgoingIndex) {
    return { ...draft, outgoingControl: localPoint, pageOutgoingControl: pagePoint };
  }
  const segmentIndex = Math.floor((controlIndex - 1) / 2);
  const isControl1 = controlIndex % 2 === 1;
  return {
    ...draft,
    segments: draft.segments.map((segment, index) => {
      if (index !== segmentIndex || segment.kind !== "cubic") {
        return segment;
      }
      if (isControl1) {
        return { ...segment, control1: localPoint, pageControl1: pagePoint };
      }
      return { ...segment, control2: localPoint, pageControl2: pagePoint };
    }),
  };
}

function serializePagePath(draft: VectorPathDraft): string {
  return [
    `M ${formatVectorPathNumber(draft.pageStart.x)} ${formatVectorPathNumber(draft.pageStart.y)}`,
    ...draft.segments.map((segment) => serializePageSegment(segment)),
    draft.closingSegment ? serializePageSegment(draft.closingSegment) : "",
    draft.closed ? "Z" : "",
  ].filter(Boolean).join(" ");
}

function serializePageSegment(segment: VectorPathDraftSegment): string {
  if (segment.kind === "line") {
  return `L ${formatVectorPathNumber(segment.pageAnchor.x)} ${formatVectorPathNumber(segment.pageAnchor.y)}`;
  }
  return `C ${formatVectorPathNumber(segment.pageControl1.x)} ${formatVectorPathNumber(segment.pageControl1.y)} ${formatVectorPathNumber(segment.pageControl2.x)} ${formatVectorPathNumber(segment.pageControl2.y)} ${formatVectorPathNumber(segment.pageAnchor.x)} ${formatVectorPathNumber(segment.pageAnchor.y)}`;
}

function serializeLocalPath(
  draft: VectorPathDraft,
  bounds: { readonly left: number; readonly top: number },
): string {
  return [
    `M ${formatRelativePoint(draft.start, bounds)}`,
    ...draft.segments.map((segment) => serializeLocalSegment(segment, bounds)),
    draft.closingSegment ? serializeLocalSegment(draft.closingSegment, bounds) : "",
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

function collectRenderedPathBoundsPoints(draft: VectorPathDraft): readonly VectorPathPoint[] {
  const segments = draft.closingSegment ? [...draft.segments, draft.closingSegment] : draft.segments;
  return segments.reduce((state, segment) => {
    if (segment.kind === "line") {
      return {
        current: segment.anchor,
        points: [...state.points, segment.anchor],
      };
    }
    return {
      current: segment.anchor,
      points: [
        ...state.points,
        ...sampleCubicBezier({
        start: state.current,
        control1: segment.control1,
        control2: segment.control2,
        end: segment.anchor,
        }),
      ],
    };
  }, { current: draft.start, points: [draft.start] }).points;
}

function getCurrentAnchor(draft: VectorPathDraft): VectorPathPoint {
  return draft.segments[draft.segments.length - 1]?.anchor ?? draft.start;
}

function getCurrentPageAnchor(draft: VectorPathDraft): VectorPathPoint {
  return draft.segments[draft.segments.length - 1]?.pageAnchor ?? draft.pageStart;
}

function getPreviousAnchor(draft: VectorPathDraft): VectorPathPoint {
  return draft.segments[draft.segments.length - 2]?.anchor ?? draft.start;
}

function getPreviousPageAnchor(draft: VectorPathDraft): VectorPathPoint {
  return draft.segments[draft.segments.length - 2]?.pageAnchor ?? draft.pageStart;
}

function mirrorPoint(anchor: VectorPathPoint, control: VectorPathPoint): VectorPathPoint {
  return {
    x: anchor.x * 2 - control.x,
    y: anchor.y * 2 - control.y,
  };
}

function formatRelativePoint(
  point: VectorPathPoint,
  bounds: { readonly left: number; readonly top: number },
): string {
  return `${formatVectorPathNumber(point.x - bounds.left)} ${formatVectorPathNumber(point.y - bounds.top)}`;
}
