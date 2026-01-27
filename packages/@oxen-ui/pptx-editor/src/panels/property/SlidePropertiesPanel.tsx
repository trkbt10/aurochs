/**
 * @file Slide properties panel component
 *
 * Displays property editors for slide-level settings when no shape is selected.
 */

import { useCallback, type CSSProperties } from "react";
import type { SlideSize, PresentationFile } from "@oxen/pptx/domain";
import type { Background } from "@oxen/pptx/domain/slide/types";
import type { SlideLayoutAttributes } from "@oxen/pptx/parser/slide/layout-parser";
import { Accordion } from "@oxen-ui/ui-components/layout";
import type { SlideLayoutOption } from "@oxen/pptx/app";
import { BackgroundEditor, SlideLayoutEditor, SlideSizeEditor, createDefaultBackground } from "../../editors/index";
import { Button } from "@oxen-ui/ui-components/primitives";

// =============================================================================
// Types
// =============================================================================

export type SlidePropertiesPanelProps = {
  readonly background?: Background;
  readonly onBackgroundChange: (bg: Background | undefined) => void;
  readonly layoutAttributes?: SlideLayoutAttributes;
  readonly layoutPath?: string;
  readonly layoutOptions?: readonly SlideLayoutOption[];
  readonly onLayoutAttributesChange: (attrs: SlideLayoutAttributes) => void;
  readonly onLayoutChange: (layoutPath: string) => void;
  readonly slideSize?: SlideSize;
  readonly onSlideSizeChange?: (size: SlideSize) => void;
  readonly presentationFile?: PresentationFile;
};

// =============================================================================
// Styles
// =============================================================================

const emptyBackgroundStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  padding: "16px",
};

const emptyTextStyle: CSSProperties = {
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "12px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide properties panel when no shape is selected.
 *
 * Displays editors for:
 * - Slide background
 * - Slide layout
 */
export function SlidePropertiesPanel({
  background,
  onBackgroundChange,
  layoutAttributes,
  layoutPath,
  layoutOptions = [],
  onLayoutAttributesChange,
  onLayoutChange,
  slideSize,
  onSlideSizeChange,
  presentationFile,
}: SlidePropertiesPanelProps) {
  const handleCreateBackground = useCallback(() => {
    onBackgroundChange(createDefaultBackground());
  }, [onBackgroundChange]);

  const handleRemoveBackground = useCallback(() => {
    onBackgroundChange(undefined);
  }, [onBackgroundChange]);

  return (
    <>
      {/* Slide Size - shown first as it's fundamental to the canvas */}
      {slideSize && onSlideSizeChange && (
        <Accordion title="Slide Size" defaultExpanded>
          <SlideSizeEditor value={slideSize} onChange={onSlideSizeChange} />
        </Accordion>
      )}

      <Accordion title="Slide Background" defaultExpanded={!slideSize}>
        <BackgroundContent
          background={background}
          onBackgroundChange={onBackgroundChange}
          onCreateBackground={handleCreateBackground}
          onRemoveBackground={handleRemoveBackground}
        />
      </Accordion>

      <Accordion title="Slide Layout" defaultExpanded={false}>
        <LayoutContent
          layoutAttributes={layoutAttributes}
          layoutPath={layoutPath}
          layoutOptions={layoutOptions}
          onLayoutAttributesChange={onLayoutAttributesChange}
          onLayoutChange={onLayoutChange}
          slideSize={slideSize}
          presentationFile={presentationFile}
        />
      </Accordion>
    </>
  );
}

// =============================================================================
// Subcomponents
// =============================================================================

type BackgroundContentProps = {
  readonly background?: Background;
  readonly onBackgroundChange: (bg: Background | undefined) => void;
  readonly onCreateBackground: () => void;
  readonly onRemoveBackground: () => void;
};

function BackgroundContent({
  background,
  onBackgroundChange,
  onCreateBackground,
  onRemoveBackground,
}: BackgroundContentProps) {
  if (background) {
    return (
      <>
        <BackgroundEditor value={background} onChange={onBackgroundChange} />
        <div style={{ padding: "8px", display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onRemoveBackground}>
            Remove Background
          </Button>
        </div>
      </>
    );
  }
  return (
    <div style={emptyBackgroundStyle}>
      <div style={emptyTextStyle}>
        No background set. The slide will use the layout or master background.
      </div>
      <Button variant="secondary" size="sm" onClick={onCreateBackground}>
        Set Background
      </Button>
    </div>
  );
}

type LayoutContentProps = {
  readonly layoutAttributes?: SlideLayoutAttributes;
  readonly layoutPath?: string;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly onLayoutAttributesChange: (attrs: SlideLayoutAttributes) => void;
  readonly onLayoutChange: (layoutPath: string) => void;
  readonly slideSize?: SlideSize;
  readonly presentationFile?: PresentationFile;
};

const noLayoutStyle: CSSProperties = {
  padding: "12px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "12px",
};

function LayoutContent({
  layoutAttributes,
  layoutPath,
  layoutOptions,
  onLayoutAttributesChange,
  onLayoutChange,
  slideSize,
  presentationFile,
}: LayoutContentProps) {
  if (layoutAttributes) {
    return (
      <SlideLayoutEditor
        value={layoutAttributes}
        onChange={onLayoutAttributesChange}
        layoutPath={layoutPath}
        layoutOptions={layoutOptions}
        onLayoutChange={onLayoutChange}
        slideSize={slideSize}
        presentationFile={presentationFile}
      />
    );
  }
  return <div style={noLayoutStyle}>No layout data available</div>;
}
