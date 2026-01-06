/**
 * @file Slide properties panel component
 *
 * Displays property editors for slide-level settings when no shape is selected.
 */

import type { Background, SlideLayoutAttributes } from "../../../pptx/domain/slide";
import { Accordion } from "../../ui/layout/Accordion";
import type { SlideLayoutOption } from "../../../pptx/app";
import { BackgroundEditor, SlideLayoutEditor } from "../../editors/index";
import type { SearchableSelectOption } from "../../ui/primitives/SearchableSelect";

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
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide properties panel when no shape is selected.
 *
 * Displays editors for:
 * - Slide background
 * - Slide transition
 */
export function SlidePropertiesPanel({
  background,
  onBackgroundChange,
  layoutAttributes,
  layoutPath,
  layoutOptions = [],
  onLayoutAttributesChange,
  onLayoutChange,
}: SlidePropertiesPanelProps) {
  const layoutSelectOptions: SearchableSelectOption<string>[] = layoutOptions.map((option) => ({
    value: option.value,
    label: option.label,
    keywords: option.keywords,
  }));

  return (
    <>
      <Accordion title="Slide Background" defaultExpanded>
        {background ? (
          <BackgroundEditor value={background} onChange={onBackgroundChange} />
        ) : (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              color: "var(--text-tertiary, #737373)",
              fontSize: "12px",
            }}
          >
            No background set
          </div>
        )}
      </Accordion>

      <Accordion title="Slide Layout" defaultExpanded={false}>
        {layoutAttributes ? (
          <SlideLayoutEditor
            value={layoutAttributes}
            onChange={onLayoutAttributesChange}
            layoutPath={layoutPath}
            layoutOptions={layoutSelectOptions}
            onLayoutChange={onLayoutChange}
          />
        ) : (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              color: "var(--text-tertiary, #737373)",
              fontSize: "12px",
            }}
          >
            No layout data available
          </div>
        )}
      </Accordion>
    </>
  );
}
