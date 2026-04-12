/**
 * @file Fig route gate component
 *
 * Wraps fig route content to ensure a FigDesignDocument is always available.
 * When the fig loader is idle (no document loaded), triggers demo document
 * generation as the default fallback. Shows a loading state while the
 * document is being prepared.
 *
 * This separates the "what to do when there's no document" policy from
 * both the file loader (useFig) and the page components (FigViewerPage,
 * FigEditorPage).
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { FigDesignDocument } from "@aurochs/fig/domain";

// =============================================================================
// Types
// =============================================================================

type FigLoaderState = {
  readonly status: "idle" | "loading" | "loaded" | "error";
  readonly document: FigDesignDocument | null;
};

type FigRouteGateProps = {
  /** Current fig loader state */
  readonly fig: FigLoaderState;
  /** Trigger demo load. Called when status is "idle". */
  readonly onLoadDemo: () => void;
  /** Content to show while loading */
  readonly loadingContent: ReactNode;
  /** Redirect target on error */
  readonly errorRedirect: string;
  /** Children receive the loaded document */
  readonly children: (document: FigDesignDocument) => ReactNode;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Gate that ensures a FigDesignDocument is available before rendering children.
 *
 * State transitions:
 * - idle → calls onLoadDemo → status becomes "loading"
 * - loading → renders loadingContent
 * - loaded → renders children(document)
 * - error → redirects to errorRedirect
 */
export function FigRouteGate({
  fig,
  onLoadDemo,
  loadingContent,
  errorRedirect,
  children,
}: FigRouteGateProps) {
  const demoTriggeredRef = useRef(false);

  useEffect(() => {
    if (fig.status === "idle" && !demoTriggeredRef.current) {
      demoTriggeredRef.current = true;
      onLoadDemo();
    }
  }, [fig.status, onLoadDemo]);

  // idle: demo load triggered but useEffect hasn't flushed state yet.
  // loading: file or demo load in progress.
  // Both show the loading state.
  if (fig.status === "idle" || fig.status === "loading") {
    return <>{loadingContent}</>;
  }

  if (fig.status === "error" || !fig.document) {
    return <Navigate to={errorRedirect} replace />;
  }

  return <>{children(fig.document)}</>;
}
