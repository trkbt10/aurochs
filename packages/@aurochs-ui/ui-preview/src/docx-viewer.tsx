/**
 * @file DOCX Viewer preview with mock data
 *
 * Tests the viewer components from @aurochs-ui/docx-editor/viewer:
 * - DocumentViewer: Full-featured viewer with thumbnails
 * - EmbeddableDocument: Lightweight embed component
 *
 * Note: Uses mock PageLayout data for demonstration.
 * Full DOCX file loading would require the layout pipeline.
 */

import { StrictMode, useState, useMemo, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables, colorTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { Tabs, type TabItem } from "@aurochs-ui/ui-components/primitives";
import { DocumentViewer } from "@aurochs-ui/docx-editor/viewer/DocumentViewer";
import { EmbeddableDocument } from "@aurochs-ui/docx-editor/viewer/EmbeddableDocument";
import type { PageLayout, LayoutParagraphResult, LayoutLine, PositionedSpan } from "@aurochs-office/text-layout";
import { px, pt, type Pixels, type Points } from "@aurochs-office/drawing-ml/domain/units";

injectCSSVariables();

// =============================================================================
// Types
// =============================================================================

type ViewerMode = "full" | "embeddable";

// =============================================================================
// Mock Data Helpers
// =============================================================================

function createMockSpan(
  text: string,
  dxOffset: Pixels,
  options?: { bold?: boolean; fontSize?: Points },
): PositionedSpan {
  const fontSize = options?.fontSize ?? pt(12);
  return {
    text,
    dx: dxOffset,
    width: px(text.length * (fontSize as number) * 0.8),
    fontSize,
    fontFamily: "system-ui, sans-serif",
    fontFamilyEastAsian: undefined,
    fontFamilyComplexScript: undefined,
    fontWeight: options?.bold ? 700 : 400,
    fontStyle: "normal",
    color: "#000000",
    textDecoration: undefined,
    verticalAlign: "baseline",
    letterSpacing: px(0),
    breakType: "none",
    direction: "ltr",
    highlightColor: undefined,
    textTransform: undefined,
    linkId: undefined,
    linkTooltip: undefined,
    textOutline: undefined,
    textFill: undefined,
    kerning: undefined,
  };
}

function createMockLine(spans: PositionedSpan[], y: Pixels): LayoutLine {
  const height = px(20);
  return {
    spans,
    x: px(0),
    y,
    height,
    width: px(spans.reduce((acc, s) => acc + (s.width as number), 0)),
  };
}

function createMockParagraph(lines: LayoutLine[]): LayoutParagraphResult {
  return {
    lines,
    alignment: "left",
    bullet: undefined,
    bulletWidth: px(0),
    fontAlignment: "auto",
  };
}

function createMockPage(
  pageIndex: number,
  width: Pixels,
  height: Pixels,
): PageLayout {
  const paragraphs: LayoutParagraphResult[] = [];
  let currentY = 72; // 1 inch top margin

  // Title (only on first page)
  if (pageIndex === 0) {
    const titleSpan = createMockSpan("Document Viewer Preview", px(0), {
      bold: true,
      fontSize: pt(24),
    });
    paragraphs.push(createMockParagraph([createMockLine([titleSpan], px(currentY))]));
    currentY += 48;

    // Subtitle
    const subtitleSpan = createMockSpan("Demonstrating the DocumentViewer and EmbeddableDocument components", px(0), {
      fontSize: pt(11),
    });
    paragraphs.push(createMockParagraph([createMockLine([subtitleSpan], px(currentY))]));
    currentY += 32;
  }

  // Page header
  const headerSpan = createMockSpan(`Page ${pageIndex + 1}`, px(0), {
    bold: true,
    fontSize: pt(16),
  });
  paragraphs.push(createMockParagraph([createMockLine([headerSpan], px(currentY))]));
  currentY += 32;

  // Content paragraphs
  const contentLines = [
    "This is a preview of the DOCX viewer components.",
    "The DocumentViewer provides a full-featured viewing experience",
    "with thumbnail navigation, zoom controls, and keyboard shortcuts.",
    "",
    "The EmbeddableDocument is a lightweight alternative",
    "suitable for embedding in iframes or cards.",
    "",
    "Both components share the same design language",
    "and provide consistent user experience.",
  ];

  for (const line of contentLines) {
    if (line === "") {
      currentY += 12;
      continue;
    }
    const span = createMockSpan(line, px(0), { fontSize: pt(11) });
    paragraphs.push(createMockParagraph([createMockLine([span], px(currentY))]));
    currentY += 20;
  }

  return {
    pageIndex,
    y: px(pageIndex * (height as number)),
    width,
    height,
    paragraphs,
  };
}

function createMockPages(count: number): PageLayout[] {
  const width = px(612); // US Letter width in pixels (at 72 DPI)
  const height = px(792); // US Letter height in pixels (at 72 DPI)

  return Array.from({ length: count }, (_, i) => createMockPage(i, width, height));
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: colorTokens.background.primary,
  fontFamily: "system-ui, sans-serif",
  color: colorTokens.text.primary,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.md} ${spacingTokens.lg}`,
  background: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
};

const contentStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  position: "relative",
  padding: spacingTokens.lg,
};

const viewerContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const componentInfoStyle: CSSProperties = {
  position: "absolute",
  bottom: spacingTokens.md,
  left: "50%",
  transform: "translateX(-50%)",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  background: "rgba(0, 0, 0, 0.7)",
  borderRadius: "6px",
  fontSize: "13px",
  color: colorTokens.overlay.lightText,
};

const noteStyle: CSSProperties = {
  fontSize: "12px",
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Main Component
// =============================================================================

function App() {
  const [viewerMode, setViewerMode] = useState<ViewerMode>("full");

  // Create mock pages
  const pages = useMemo(() => createMockPages(3), []);

  const tabItems: TabItem<ViewerMode>[] = useMemo(
    () => [
      {
        id: "full",
        label: "DocumentViewer",
        content: (
          <div style={viewerContainerStyle}>
            <div style={{ width: "100%", height: "100%" }}>
              <DocumentViewer
                pages={pages}
                showThumbnails
                showControls
                showZoom
                showToolbar
              />
            </div>
            <div style={componentInfoStyle}>DocumentViewer component</div>
          </div>
        ),
      },
      {
        id: "embeddable",
        label: "EmbeddableDocument",
        content: (
          <div style={viewerContainerStyle}>
            <div style={{ maxWidth: "600px", width: "100%", height: "600px" }}>
              <EmbeddableDocument
                pages={pages}
                showNavigation
                showPageIndicator
                showZoom
                maxHeight="600px"
              />
            </div>
            <div style={componentInfoStyle}>EmbeddableDocument component</div>
          </div>
        ),
      },
    ],
    [pages],
  );

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={titleStyle}>DOCX Viewer Preview</div>
        <div style={noteStyle}>Using mock data for demonstration</div>
      </header>

      <div style={contentStyle}>
        <Tabs
          items={tabItems}
          value={viewerMode}
          onChange={setViewerMode}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
