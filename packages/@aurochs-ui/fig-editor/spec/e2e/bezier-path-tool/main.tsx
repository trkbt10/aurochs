/** @file Isolated Bezier path tool E2E harness. */

import { StrictMode, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import {
  applyVectorPathDraftOperation,
  commitVectorPathDraftToNodeSpec,
  getVectorPathDraftControlLines,
  getVectorPathDraftHandleCursor,
  getVectorPathDraftHandles,
  resolveVectorPathDraftHandleIntent,
  vectorPathDraftToPreviewPath,
  type VectorPathDraftOperationResult,
  type VectorPathDraftSession,
} from "../../../src/vector-path/draft";
import { orderVectorPathHandlesForHitTesting } from "../../../src/vector-path/overlay-style";

injectCSSVariables();

function BezierPathToolHarness() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sessionRef = useRef<VectorPathDraftSession | null>(null);
  const [session, setSession] = useState<VectorPathDraftSession | null>(null);
  const [committed, setCommitted] = useState<ReturnType<typeof commitVectorPathDraftToNodeSpec> | null>(null);

  const applyResult = useCallback((result: VectorPathDraftOperationResult) => {
    sessionRef.current = result.session;
    setSession(result.session);
    if (result.committedDraft) {
      setCommitted(commitVectorPathDraftToNodeSpec(result.committedDraft));
    }
  }, []);

  const pointFromEvent = useCallback((event: Pick<PointerEvent, "clientX" | "clientY">) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (400 / rect.width),
      y: (event.clientY - rect.top) * (300 / rect.height),
    };
  }, []);

  const placePoint = useCallback((event: Pick<PointerEvent, "clientX" | "clientY">) => {
    const point = pointFromEvent(event);
    applyResult(applyVectorPathDraftOperation(sessionRef.current, {
      type: "place-point",
      parent: { parentId: null, parentTransform: undefined },
      localPoint: point,
      pagePoint: point,
      pointerStart: { clientX: event.clientX, clientY: event.clientY },
      closeTolerance: 8,
    }));
  }, [applyResult, pointFromEvent]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const current = sessionRef.current;
      if (!current) {
        return;
      }
      const point = pointFromEvent(event);
      const start = current.pointerStart;
      if (start) {
        applyResult(applyVectorPathDraftOperation(current, {
          type: "anchor-drag-preview",
          localPoint: point,
          pagePoint: point,
          exceededThreshold: Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 3,
        }));
        return;
      }
      applyResult(applyVectorPathDraftOperation(current, { type: "preview", pagePoint: point }));
    };
    const handlePointerUp = (event: PointerEvent) => {
      const current = sessionRef.current;
      const start = current?.pointerStart;
      if (!current || !start) {
        return;
      }
      const point = pointFromEvent(event);
      applyResult(applyVectorPathDraftOperation(current, {
        type: "anchor-drag-end",
        localPoint: point,
        pagePoint: point,
        exceededThreshold: Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 3,
      }));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      applyResult(applyVectorPathDraftOperation(sessionRef.current, { type: "commit" }));
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyResult, pointFromEvent]);

  const handleBackgroundPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    placePoint(event.nativeEvent);
  }, [placePoint]);

  const handleDraftHandlePointerDown = useCallback((handleIndex: number, event: ReactPointerEvent<SVGCircleElement>) => {
    const current = sessionRef.current;
    if (!current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const handle = getVectorPathDraftHandles(current.draft).find((candidate) => candidate.index === handleIndex);
    if (!handle) {
      return;
    }
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const dragState = { moved: false };
    const moveHandleToPointer = (pointerEvent: PointerEvent, movingSession: VectorPathDraftSession) => {
      const point = pointFromEvent(pointerEvent);
      applyResult(applyVectorPathDraftOperation(movingSession, {
        type: "move-handle",
        handle,
        localPoint: point,
        pagePoint: point,
      }));
    };
    const move = (moveEvent: PointerEvent) => {
      const movingSession = sessionRef.current;
      if (!movingSession) {
        return;
      }
      const intent = resolveVectorPathDraftHandleIntent({
        draft: movingSession.draft,
        handle,
        startClientX,
        startClientY,
        clientX: moveEvent.clientX,
        clientY: moveEvent.clientY,
        dragThresholdPx: 3,
      });
      if (intent !== "move-handle") {
        return;
      }
      dragState.moved = true;
      moveHandleToPointer(moveEvent, movingSession);
    };
    const up = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const movingSession = sessionRef.current;
      if (!movingSession) {
        return;
      }
      const intent = resolveVectorPathDraftHandleIntent({
        draft: movingSession.draft,
        handle,
        startClientX,
        startClientY,
        clientX: upEvent.clientX,
        clientY: upEvent.clientY,
        dragThresholdPx: 3,
      });
      if (intent === "close-start-anchor" && !dragState.moved) {
        applyResult(applyVectorPathDraftOperation(movingSession, { type: "close-from-start-handle" }));
        return;
      }
      if (!dragState.moved && intent === "move-handle") {
        moveHandleToPointer(upEvent, movingSession);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [applyResult, pointFromEvent]);

  const draft = session?.draft;
  const committedPath = committed?.type === "VECTOR" ? committed.vectorPaths[0]?.data : undefined;
  return (
    <main style={{ padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <svg
        ref={svgRef}
        role="application"
        aria-label="Bezier path tool harness"
        viewBox="0 0 400 300"
        width={800}
        height={600}
        style={{ border: "1px solid #c7d0df", background: "#fff" }}
        onPointerDown={handleBackgroundPointerDown}
      >
        {committed?.type === "VECTOR" && (
          <>
            <g transform={`translate(${committed.x} ${committed.y})`}>
              <path aria-label="Committed bezier path" d={committedPath} fill="none" stroke="#2659f2" strokeWidth={2} />
            </g>
            <rect
              aria-label="Committed bezier bounds"
              x={committed.x}
              y={committed.y}
              width={committed.width}
              height={committed.height}
              fill="none"
              stroke="#111827"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {draft && (
          <g>
            <path aria-label="Draft bezier path" d={vectorPathDraftToPreviewPath(draft)} fill="none" stroke="#0066ff" strokeWidth={1.5} />
            {getVectorPathDraftControlLines(draft).map((line) => (
              <line
                key={line.key}
                aria-label="Draft bezier control line"
                x1={line.from.x}
                y1={line.from.y}
                x2={line.to.x}
                y2={line.to.y}
                stroke="#0066ff"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            ))}
            {orderVectorPathHandlesForHitTesting(getVectorPathDraftHandles(draft)).map((handle) => (
              <circle
                key={handle.key}
                role="button"
                aria-label={handle.role === "anchor" ? `Draft bezier anchor ${handle.index + 1}` : `Draft bezier control ${handle.index + 1}`}
                cx={handle.x}
                cy={handle.y}
                r={handle.role === "anchor" ? 4 : 3}
                fill={handle.role === "anchor" ? "#fff" : "#0066ff"}
                stroke="#0066ff"
                strokeWidth={1}
                style={{ cursor: getVectorPathDraftHandleCursor(draft, handle) }}
                onPointerDown={(event) => handleDraftHandlePointerDown(handle.index, event)}
              />
            ))}
          </g>
        )}
      </svg>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BezierPathToolHarness />
  </StrictMode>,
);
