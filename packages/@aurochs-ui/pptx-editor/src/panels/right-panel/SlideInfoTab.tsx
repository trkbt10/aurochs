/**
 * @file Slide info tab component for right panel
 *
 * Displays slide-level properties including background and layout settings.
 * This is a dedicated tab for slide information, separate from shape properties.
 */

import type { CSSProperties } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import type { PackageFile } from "@aurochs-office/opc";
import type { Background } from "@aurochs-office/pptx/domain/slide/types";
import type { SlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { ColorMapping } from "@aurochs-office/pptx/domain/color/types";
import { SlidePropertiesPanel } from "../property/SlidePropertiesPanel";

export type SlideInfoTabProps = {
  /** Current slide background */
  readonly background?: Background;
  /** Callback when background changes */
  readonly onBackgroundChange: (bg: Background | undefined) => void;
  /** Current layout attributes */
  readonly layoutAttributes?: SlideLayoutAttributes;
  /** Current layout path */
  readonly layoutPath?: string;
  /** Available layout options */
  readonly layoutOptions: readonly SlideLayoutOption[];
  /** Callback when layout attributes change */
  readonly onLayoutAttributesChange: (attrs: SlideLayoutAttributes) => void;
  /** Callback when layout selection changes */
  readonly onLayoutChange: (layoutPath: string) => void;
  /** Slide size for layout preview */
  readonly slideSize?: SlideSize;
  /** Callback when slide size changes */
  readonly onSlideSizeChange?: (size: SlideSize) => void;
  /** Presentation file for loading layout shapes */
  readonly presentationFile?: PackageFile;
  readonly colorMapping?: ColorMapping;
  readonly onColorMapChange?: (mappings: ColorMapping) => void;
  readonly slideTransition?: SlideTransition;
  readonly onSlideTransitionChange?: (transition: SlideTransition | undefined) => void;
  readonly showLayoutCatalog?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

/**
 * Slide info tab component.
 *
 * Displays slide-level settings within the right panel pivot tabs:
 * - Slide background editor
 * - Slide layout selector and editor (via `SlidePropertiesPanel`, including optional layout catalog)
 */
export function SlideInfoTab({
  background,
  onBackgroundChange,
  layoutAttributes,
  layoutPath,
  layoutOptions,
  onLayoutAttributesChange,
  onLayoutChange,
  slideSize,
  onSlideSizeChange,
  presentationFile,
  colorMapping,
  onColorMapChange,
  slideTransition,
  onSlideTransitionChange,
  showLayoutCatalog,
}: SlideInfoTabProps) {
  return (
    <div style={containerStyle}>
      <SlidePropertiesPanel
        background={background}
        onBackgroundChange={onBackgroundChange}
        layoutAttributes={layoutAttributes}
        layoutPath={layoutPath}
        layoutOptions={layoutOptions}
        onLayoutAttributesChange={onLayoutAttributesChange}
        onLayoutChange={onLayoutChange}
        slideSize={slideSize}
        onSlideSizeChange={onSlideSizeChange}
        presentationFile={presentationFile}
        colorMapping={colorMapping}
        onColorMapChange={onColorMapChange}
        slideTransition={slideTransition}
        onSlideTransitionChange={onSlideTransitionChange}
        showLayoutCatalog={showLayoutCatalog}
      />
    </div>
  );
}
