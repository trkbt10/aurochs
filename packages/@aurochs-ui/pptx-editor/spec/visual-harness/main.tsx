/**
 * @file PPTX visual test harness entry point
 *
 * Renders a slide with given configuration and allows
 * screenshot capture via Puppeteer.
 */

import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Slide, SlideSize } from "@aurochs-office/pptx/domain";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";

// Window extension type for test harness functions
type HarnessWindow = Window & {
  renderSlide: (json: string, config: RenderConfig) => Promise<void>;
  waitForRender: () => Promise<void>;
  __renderComplete?: boolean;
};

// Type-safe accessor for the harness window
const harnessWindow = window as HarnessWindow;

type RenderConfig = {
  width: number;
  height: number;
};

type SlideData = {
  slide: Slide;
  slideSize: SlideSize;
};

type AppState = {
  slideData: SlideData | null;
  config: RenderConfig | null;
  renderKey: number;
};

// Slide component that renders the slide
function SlideView({
  slideData,
  config,
}: {
  slideData: SlideData;
  config: RenderConfig;
}) {
  console.log("[PPTX Harness] Rendering slide with", slideData.slide.shapes?.length ?? 0, "shapes");

  return (
    <svg
      width={config.width}
      height={config.height}
      viewBox={`0 0 ${slideData.slideSize.width} ${slideData.slideSize.height}`}
      style={{ backgroundColor: "#fff" }}
    >
      <SlideRenderer
        slide={slideData.slide}
        slideSize={slideData.slideSize}
      />
    </svg>
  );
}

// Root component that listens for render events
function Root() {
  const [appState, setAppState] = useState<AppState>({
    slideData: null,
    config: null,
    renderKey: 0,
  });

  // Listen for render requests from Puppeteer
  useEffect(() => {
    const handler = (e: CustomEvent<{ slideData: SlideData; config: RenderConfig }>) => {
      // Reset render complete flag
      harnessWindow.__renderComplete = false;
      setAppState((prev) => ({
        slideData: e.detail.slideData,
        config: e.detail.config,
        renderKey: prev.renderKey + 1,
      }));
    };

    window.addEventListener("pptx-harness-render", handler as EventListener);
    return () => {
      window.removeEventListener("pptx-harness-render", handler as EventListener);
    };
  }, []);

  // Signal render complete after DOM update
  useEffect(() => {
    if (appState.slideData && appState.config) {
      // Small delay to ensure React has finished rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          harnessWindow.__renderComplete = true;
        });
      });
    }
  }, [appState.slideData, appState.config, appState.renderKey]);

  if (!appState.slideData || !appState.config) {
    return null;
  }

  return (
    <div
      style={{
        width: appState.config.width,
        height: appState.config.height,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <SlideView
        key={appState.renderKey}
        slideData={appState.slideData}
        config={appState.config}
      />
    </div>
  );
}

// Global render function called by Puppeteer
harnessWindow.renderSlide = async (json: string, config: RenderConfig): Promise<void> => {
  const slideData = JSON.parse(json) as SlideData;

  // Update state via a custom event
  window.dispatchEvent(
    new CustomEvent("pptx-harness-render", {
      detail: { slideData, config },
    })
  );
};

// Wait for render to complete
harnessWindow.waitForRender = async (): Promise<void> => {
  return new Promise((resolve) => {
    const check = () => {
      if (harnessWindow.__renderComplete) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
};

// Mount application
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <Root />
  </StrictMode>
);

// Signal readiness
document.title = "ready";
