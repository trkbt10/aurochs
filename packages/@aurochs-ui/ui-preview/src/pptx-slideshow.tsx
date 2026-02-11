/**
 * @file Standalone entry point for the PPTX Slideshow preview.
 *
 * Shows the PresentationSlideshow component for testing transitions and navigation.
 */

import { StrictMode, useState, useCallback, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables, colorTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { Section } from "@aurochs-ui/ui-components/layout";
import { PlayIcon } from "@aurochs-ui/ui-components/icons";
import {
  PresentationSlideshow,
  type SlideshowSlideContent,
} from "@aurochs-ui/pptx-editor";
import type { SlideSize, SlideTransition, TransitionType } from "@aurochs-office/pptx/domain";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import "@aurochs-ui/pptx-editor/preview/SlideshowPlayer.css";

injectCSSVariables();

// =============================================================================
// Sample Slide Data
// =============================================================================

const SLIDE_SIZE: SlideSize = {
  width: px(960),
  height: px(540),
};

type SampleSlide = {
  title: string;
  subtitle?: string;
  background: string;
  textColor: string;
  transition?: SlideTransition;
};

const SAMPLE_SLIDES: SampleSlide[] = [
  {
    title: "Presentation Slideshow",
    subtitle: "Preview Component Demo",
    background: "#1e3a5f",
    textColor: "#ffffff",
  },
  {
    title: "Fade Transition",
    subtitle: "Smooth opacity crossfade",
    background: "#2d4a3e",
    textColor: "#ffffff",
    transition: { type: "fade", duration: 800 },
  },
  {
    title: "Wipe Transition",
    subtitle: "Reveal from left to right",
    background: "#4a2d3e",
    textColor: "#ffffff",
    transition: { type: "wipe", direction: "l", duration: 600 },
  },
  {
    title: "Push Transition",
    subtitle: "Slide in with momentum",
    background: "#3e4a2d",
    textColor: "#ffffff",
    transition: { type: "push", direction: "l", duration: 500 },
  },
  {
    title: "Circle Transition",
    subtitle: "Expand from center",
    background: "#4a3e2d",
    textColor: "#ffffff",
    transition: { type: "circle", duration: 700 },
  },
  {
    title: "Dissolve Transition",
    subtitle: "Fade with subtle blur",
    background: "#2d3e4a",
    textColor: "#ffffff",
    transition: { type: "dissolve", duration: 600 },
  },
  {
    title: "Diamond Transition",
    subtitle: "Diamond shape expand",
    background: "#5a2d4a",
    textColor: "#ffffff",
    transition: { type: "diamond", duration: 700 },
  },
  {
    title: "Wheel Transition",
    subtitle: "Clockwise sweep (4 spokes)",
    background: "#2d5a4a",
    textColor: "#ffffff",
    transition: { type: "wheel", spokes: 4, duration: 1000 },
  },
  {
    title: "Split Transition",
    subtitle: "Reveal from center",
    background: "#4a2d5a",
    textColor: "#ffffff",
    transition: { type: "split", inOutDirection: "out", duration: 600 },
  },
  {
    title: "Zoom Transition",
    subtitle: "Scale from center with fade",
    background: "#5a4a2d",
    textColor: "#ffffff",
    transition: { type: "zoom", inOutDirection: "in", duration: 500 },
  },
  {
    title: "The End",
    subtitle: "Press ESC to exit",
    background: "#1a1a1a",
    textColor: "#ffffff",
    transition: { type: "fade", duration: 800 },
  },
];

function createSlideSvg(slide: SampleSlide): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SLIDE_SIZE.width} ${SLIDE_SIZE.height}">
    <rect width="100%" height="100%" fill="${slide.background}" />
    <text x="50%" y="45%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" fill="${slide.textColor}">${slide.title}</text>
    ${slide.subtitle ? `<text x="50%" y="58%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="${slide.textColor}" opacity="0.8">${slide.subtitle}</text>` : ""}
  </svg>`;
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: CSSProperties = {
  background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.lg,
  padding: spacingTokens.xl,
  textAlign: "center",
  maxWidth: "600px",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const titleStyle: CSSProperties = {
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  fontSize: "24px",
  fontWeight: 600,
  marginBottom: spacingTokens.sm,
};

const subtitleStyle: CSSProperties = {
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  fontSize: "14px",
  marginBottom: spacingTokens.lg,
};

const transitionListStyle: CSSProperties = {
  marginTop: spacingTokens.lg,
  display: "flex",
  flexWrap: "wrap",
  gap: spacingTokens.sm,
  justifyContent: "center",
};

const tagStyle: CSSProperties = {
  background: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  fontSize: "11px",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  borderRadius: radiusTokens.sm,
};

// =============================================================================
// Main Component
// =============================================================================

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  const getSlideContent = useCallback((slideIndex: number): SlideshowSlideContent => {
    const slide = SAMPLE_SLIDES[slideIndex - 1];
    return {
      svg: createSlideSvg(slide),
      transition: slide.transition,
    };
  }, []);

  const handleStartSlideshow = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleExitSlideshow = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const transitionTypes: TransitionType[] = [
    "fade", "dissolve", "wipe", "push", "cover", "pull",
    "circle", "diamond", "plus", "split", "wheel", "zoom",
  ];

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>PresentationSlideshow Preview</h1>
        <p style={subtitleStyle}>Test the slideshow player with various transitions</p>

        <Button variant="primary" size="lg" onClick={handleStartSlideshow}>
          <PlayIcon size={18} />
          Start Slideshow
        </Button>

        <Section style={{ marginTop: spacingTokens.lg, textAlign: "left" }}>
          <div style={{
            fontSize: "14px",
            fontWeight: 600,
            color: `var(--text-primary, ${colorTokens.text.primary})`,
            marginBottom: spacingTokens.sm,
          }}>
            Keyboard Controls
          </div>
          <ul style={{
            color: `var(--text-secondary, ${colorTokens.text.secondary})`,
            fontSize: "13px",
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: spacingTokens.lg,
          }}>
            <li>Arrow keys / Space / Enter - Navigate slides</li>
            <li>Home / End - Jump to first / last slide</li>
            <li>F - Toggle fullscreen</li>
            <li>B / W - Black / White screen overlay</li>
            <li>ESC - Exit slideshow</li>
          </ul>
        </Section>

        <div style={transitionListStyle}>
          {transitionTypes.map((type) => (
            <span key={type} style={tagStyle}>{type}</span>
          ))}
        </div>
      </div>

      {isPlaying && (
        <PresentationSlideshow
          slideCount={SAMPLE_SLIDES.length}
          slideSize={SLIDE_SIZE}
          startSlideIndex={1}
          getSlideContent={getSlideContent}
          onExit={handleExitSlideshow}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
