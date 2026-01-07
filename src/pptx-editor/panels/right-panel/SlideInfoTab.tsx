/**
 * @file Slide info tab component for right panel
 *
 * Displays slide-level properties including background and layout settings.
 * This is a dedicated tab for slide information, separate from shape properties.
 */

import type { CSSProperties } from "react";
import type { SlideSize, PresentationFile } from "../../../pptx/domain";
import type { Background, SlideLayoutAttributes } from "../../../pptx/domain/slide";
import type { SlideLayoutOption } from "../../../pptx/app";
import { SlidePropertiesPanel } from "../property/SlidePropertiesPanel";
import { InspectorSection } from "../../ui/layout";

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
  /** Presentation file for loading layout shapes */
  readonly presentationFile?: PresentationFile;
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
 * - Slide layout selector and editor
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
  presentationFile,
}: SlideInfoTabProps) {
  return (
    <div style={containerStyle}>
      <InspectorSection title="Slide Info">
        <SlidePropertiesPanel
          background={background}
          onBackgroundChange={onBackgroundChange}
          layoutAttributes={layoutAttributes}
          layoutPath={layoutPath}
          layoutOptions={layoutOptions}
          onLayoutAttributesChange={onLayoutAttributesChange}
          onLayoutChange={onLayoutChange}
          slideSize={slideSize}
          presentationFile={presentationFile}
        />
      </InspectorSection>
    </div>
  );
}
