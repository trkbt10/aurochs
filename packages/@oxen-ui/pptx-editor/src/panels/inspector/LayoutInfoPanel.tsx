/**
 * @file Layout info panel component
 *
 * Displays available slide layouts and current layout information.
 * Read-only view of layout structure for reference.
 */

import { useMemo, type CSSProperties } from "react";
import type { SlideSize, PresentationFile } from "@oxen/pptx/domain";
import { px } from "@oxen/ooxml/domain/units";
import type { SlideLayoutAttributes } from "@oxen/pptx/parser/slide/layout-parser";
import type { SlideLayoutOption } from "@oxen/pptx/app";
import { InspectorSection, Accordion } from "@oxen-ui/ui-components/layout";
import { colorTokens, fontTokens, spacingTokens } from "@oxen-ui/ui-components/design-tokens";
import { LayoutThumbnail, useLayoutThumbnails, type LayoutThumbnailData } from "../../thumbnail";

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
  readonly presentationFile?: PresentationFile;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

/** Layout thumbnail width - compact size for narrow panels */
const LAYOUT_THUMBNAIL_WIDTH = 70;

const layoutGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
};

const layoutCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  padding: spacingTokens.xs,
  borderRadius: "6px",
  cursor: "default",
  transition: "background-color 0.15s ease",
};

const layoutCardActiveStyle: CSSProperties = {
  ...layoutCardStyle,
  backgroundColor: `var(--accent-primary, ${colorTokens.accent.primary})20`,
  border: `2px solid var(--accent-primary, ${colorTokens.accent.primary})`,
};

const layoutCardInactiveStyle: CSSProperties = {
  ...layoutCardStyle,
  backgroundColor: colorTokens.background.secondary,
  border: "2px solid transparent",
};

const layoutLabelStyle: CSSProperties = {
  fontSize: "10px",
  color: colorTokens.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
  width: "100%",
  marginTop: "2px",
};

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
 * Render layout grid with SVG previews.
 */
function LayoutGrid({
  layouts,
  currentPath,
  slideSize,
}: {
  layouts: readonly LayoutThumbnailData[];
  currentPath?: string;
  slideSize: SlideSize;
}) {
  if (layouts.length === 0) {
    return <div style={emptyStateStyle}>No layouts available</div>;
  }

  return (
    <div style={layoutGridStyle}>
      {layouts.map((layout) => {
        const isActive = layout.value === currentPath;
        return (
          <div
            key={layout.value}
            style={isActive ? layoutCardActiveStyle : layoutCardInactiveStyle}
            title={layout.value}
          >
            <LayoutThumbnail
              shapes={layout.shapes}
              slideSize={slideSize}
              width={LAYOUT_THUMBNAIL_WIDTH}
            />
            <div style={layoutLabelStyle}>{layout.label}</div>
          </div>
        );
      })}
    </div>
  );
}

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
      <InspectorSection title="Layouts">
        <Accordion title={`Available Layouts (${layoutOptions.length})`} defaultExpanded>
          <LayoutGrid layouts={layoutThumbnails} currentPath={currentLayoutPath} slideSize={slideSize} />
        </Accordion>

        <Accordion title="Current Layout" defaultExpanded={false}>
          <CurrentLayoutContent attributes={layoutAttributes} />
        </Accordion>
      </InspectorSection>
    </div>
  );
}
