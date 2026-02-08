/**
 * @file Main PPTX preview application component
 */

import { useState, useEffect, type ReactElement } from "react";
import { useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { tokens, injectCSSVariables } from "@aurochs-ui/ui-components";
import { app, connectApp, type ToolResultMeta } from "./mcp-bridge";
import { SlideCanvas } from "./components/SlideCanvas";
import { Thumbnails } from "./components/Thumbnails";
import { BuildProgress } from "./components/BuildProgress";

type SlideData = {
  readonly number: number;
  readonly svg?: string;
};

type PresentationData = {
  readonly slideCount: number;
  readonly width: number;
  readonly height: number;
};

// Inject CSS variables on load (fallback when host doesn't send styles)
injectCSSVariables();

function formatPresentationStatus(presentation: PresentationData | null): string {
  if (!presentation) {
    return "No presentation";
  }
  const slideLabel = presentation.slideCount !== 1 ? "slides" : "slide";
  return `${presentation.slideCount} ${slideLabel} | ${presentation.width}x${presentation.height}`;
}

/** Main PPTX preview application */
export function App(): ReactElement {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    // Set ALL handlers before connecting (per ext-apps spec)

    app.ontoolinput = () => {
      setIsBuilding(true);
      setLastAction(null);
    };

    app.ontoolresult = (params) => {
      setIsBuilding(false);

      const meta = params._meta as ToolResultMeta | undefined;
      if (!meta) {
        return;
      }

      // Update presentation info
      if (meta.presentation) {
        setPresentation(meta.presentation);

        // Initialize slides array if needed
        const slideCount = meta.presentation.slideCount;
        setSlides((prev) => {
          if (prev.length < slideCount) {
            const newSlides = [...prev];
            for (let i = prev.length; i < slideCount; i++) {
              newSlides.push({ number: i + 1 });
            }
            return newSlides;
          }
          return prev;
        });
      }

      // Update current slide
      if (meta.currentSlide !== undefined) {
        setCurrentSlide(meta.currentSlide - 1);
      }

      // Update slide data
      if (meta.slideData) {
        setSlides((prev) => {
          const updated = [...prev];
          const idx = meta.slideData!.number - 1;
          // Grow array if needed (slide data may arrive before presentation meta)
          while (updated.length <= idx) {
            updated.push({ number: updated.length + 1 });
          }
          updated[idx] = meta.slideData!;
          return updated;
        });
      }

      // Update last action
      if (params.content?.[0]) {
        const block = params.content[0];
        if (block.type === "text" && "text" in block) {
          try {
            const data = JSON.parse(block.text);
            setLastAction(data.message || null);
          } catch {
            // Content may not be JSON
          }
        }
      }
    };

    app.ontoolcancelled = () => {
      setIsBuilding(false);
      setLastAction("Tool cancelled");
    };

    app.onteardown = async () => {
      return {};
    };

    connectApp();
  }, []);

  // Apply host theming (CSS variables, theme, fonts) from MCP Apps spec
  useHostStyles(app, app.getHostContext());

  const handleSlideSelect = (index: number): void => {
    setCurrentSlide(index);
    app
      .updateModelContext({
        content: [{ type: "text", text: `User is viewing slide ${index + 1}` }],
      })
      .catch(() => {
        // Host may not support updateModelContext
      });
  };

  const { color, spacing, font, radius } = tokens;

  return (
    <div
      style={{
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        background: color.background.primary,
        color: color.text.primary,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: `${spacing.md} ${spacing.lg}`,
          background: color.background.secondary,
          borderBottom: `1px solid ${color.border.strong}`,
          display: "flex",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <h1 style={{ fontSize: font.size.lg, fontWeight: font.weight.medium, margin: 0 }}>PPTX Preview</h1>
        <div style={{ fontSize: font.size.md, color: color.text.secondary, marginLeft: "auto" }}>
          {formatPresentationStatus(presentation)}
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Thumbnails
          slides={slides}
          currentIndex={currentSlide}
          onSelect={handleSlideSelect}
          width={presentation?.width}
          height={presentation?.height}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xl,
            position: "relative",
          }}
        >
          <SlideCanvas
            slide={slides[currentSlide]}
            width={presentation?.width ?? 960}
            height={presentation?.height ?? 540}
          />

          {isBuilding && <BuildProgress message="Building..." />}
          {lastAction && !isBuilding && (
            <div
              style={{
                position: "absolute",
                bottom: spacing.lg,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0, 0, 0, 0.8)",
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: radius.sm,
                fontSize: font.size.md,
                color: "#0f0",
              }}
            >
              {lastAction}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
