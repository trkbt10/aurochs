/**
 * @file LayoutInfoPanel — read-only layout catalog + current layout summary (PPTX inspector)
 */

import { useMemo, type CSSProperties } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import type { PackageFile } from "@aurochs-office/opc";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { SlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { LayoutThumbnailPickerGrid } from "./LayoutThumbnailPickerGrid";
import { useLayoutThumbnails } from "./use-layout-thumbnails";

export type LayoutInfoPanelProps = {
  /** Available layout options */
  readonly layoutOptions: readonly SlideLayoutOption[];
  /** Current layout path */
  readonly currentLayoutPath?: string;
  /** Current layout attributes */
  readonly layoutAttributes?: SlideLayoutAttributes;
  /** Slide size for preview */
  readonly slideSize?: SlideSize;
  /** Presentation file for loading layout shapes */
  readonly presentationFile?: PackageFile;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

/** Layout thumbnail width — matches `SlideLayoutEditor` inline picker / selector cards */
const LAYOUT_THUMBNAIL_WIDTH = 70;

const attributeRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const attributeLabelStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.xs,
};

const attributeValueStyle: CSSProperties = {
  color: colorTokens.text.primary,
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
};

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

const DEFAULT_SLIDE_SIZE: SlideSize = { width: px(9144000 / 914.4), height: px(6858000 / 914.4) };

/**
 * Render layout attributes as key-value pairs.
 */
function LayoutAttributes({ attributes }: { attributes: SlideLayoutAttributes }) {
  const rows = useMemo(() => {
    const result: { label: string; value: string }[] = [];

    if (attributes.type) {
      result.push({ label: "Type", value: attributes.type });
    }
    if (attributes.name) {
      result.push({ label: "Name", value: attributes.name });
    }
    if (attributes.matchingName) {
      result.push({ label: "Matching Name", value: attributes.matchingName });
    }
    result.push({
      label: "Show Master Shapes",
      value: attributes.showMasterShapes ? "Yes" : "No",
    });
    result.push({
      label: "Show Master Animation",
      value: attributes.showMasterPhAnim ? "Yes" : "No",
    });
    result.push({
      label: "Preserve",
      value: attributes.preserve ? "Yes" : "No",
    });
    result.push({
      label: "User Drawn",
      value: attributes.userDrawn ? "Yes" : "No",
    });

    return result;
  }, [attributes]);

  return (
    <div>
      {rows.map(({ label, value }) => (
        <div key={label} style={attributeRowStyle}>
          <span style={attributeLabelStyle}>{label}</span>
          <span style={attributeValueStyle}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Render current layout content.
 */
function CurrentLayoutContent({ attributes }: { attributes?: SlideLayoutAttributes }) {
  if (attributes) {
    return <LayoutAttributes attributes={attributes} />;
  }
  return <div style={emptyStateStyle}>No layout selected</div>;
}

/**
 * Layout info panel component.
 *
 * Displays presentation layout information:
 * - Grid of available layouts with SVG previews
 * - Current layout attributes
 */
export function LayoutInfoPanel({
  layoutOptions,
  currentLayoutPath,
  layoutAttributes,
  slideSize = DEFAULT_SLIDE_SIZE,
  presentationFile,
}: LayoutInfoPanelProps) {
  // Load layout shapes for thumbnail preview
  const layoutThumbnails = useLayoutThumbnails({
    presentationFile,
    layoutOptions,
    slideSize,
  });

  return (
    <div style={containerStyle}>
      <OptionalPropertySection title={`Available Layouts (${layoutOptions.length})`} defaultExpanded>
        <LayoutThumbnailPickerGrid
          layouts={layoutThumbnails}
          selectedPath={currentLayoutPath}
          slideSize={slideSize}
          thumbnailWidth={LAYOUT_THUMBNAIL_WIDTH}
          variant="inspector"
          hasSourceOptions={layoutOptions.length > 0}
        />
      </OptionalPropertySection>

      <OptionalPropertySection title="Current Layout" defaultExpanded={false}>
        <CurrentLayoutContent attributes={layoutAttributes} />
      </OptionalPropertySection>
    </div>
  );
}
