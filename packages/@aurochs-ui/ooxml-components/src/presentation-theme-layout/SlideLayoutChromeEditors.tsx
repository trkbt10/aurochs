/**
 * @file SlideLayoutChromeEditors — shared layout chrome for PPTX slides and POTX layouts
 *
 * Bundles p:sldLayout-style metadata (`SlideLayoutAttributesPanel`), optional layout-part
 * background (`MasterBackgroundEditor`), color map (`ColorMapEditor`), transition
 * (`TransitionEditor`), and a trailing slot for host-specific UI (e.g. placeholder shapes).
 *
 * @see ECMA-376 Part 1, §19.3.1.38 (p:sld), §19.3.1.39 (p:sldLayout)
 */

import type { ReactNode } from "react";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { SlideLayoutAttributesPanel, type SlideLayoutAttributesPanelProps } from "./SlideLayoutAttributesPanel";
import { MasterBackgroundEditor, type MasterBackgroundEditorProps } from "./MasterBackgroundEditor";
import { ColorMapEditor, type ColorMapEditorProps } from "./ColorMapEditor";
import { TransitionEditor } from "./TransitionEditor";
import {
  LAYOUT_CHROME_TRANSITION_DEFAULT_EXPANDED,
  LAYOUT_CHROME_TRANSITION_SECTION_TITLE,
} from "./layout-chrome-constants";

// =============================================================================
// Types
// =============================================================================

export type SlideLayoutChromeEditorsProps = {
  /**
   * Layout metadata section wraps `SlideLayoutAttributesPanel`.
   * `sectionTitle` / `sectionDefaultExpanded` customize the outer `OptionalPropertySection`.
   */
  readonly layout: SlideLayoutAttributesPanelProps & {
    readonly sectionTitle?: string;
    readonly sectionDefaultExpanded?: boolean;
  };
  /** Layout- or slide-part background (BaseFillEditor). Omit when the host uses a different fill editor (e.g. PPTX slide `BackgroundEditor`). */
  readonly layoutBackground?: MasterBackgroundEditorProps;
  /** Color map (p:clrMap / override). Omit to hide. */
  readonly colorMap?: ColorMapEditorProps;
  /** Slide or layout transition. Omit to hide. */
  readonly transition?: {
    readonly value: SlideTransition | undefined;
    readonly onChange: (next: SlideTransition | undefined) => void;
    /** Overrides `LAYOUT_CHROME_TRANSITION_SECTION_TITLE` when set. */
    readonly sectionTitle?: string;
    readonly sectionDefaultExpanded?: boolean;
  };
  /** Host content after chrome (e.g. POTX `LayoutShapePanel`). */
  readonly children?: ReactNode;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Single SoT composition for “layout chrome” editors shared by PPTX and POTX.
 */
export function SlideLayoutChromeEditors({
  layout,
  layoutBackground,
  colorMap,
  transition,
  children,
}: SlideLayoutChromeEditorsProps) {
  const {
    sectionTitle = "Slide Layout",
    sectionDefaultExpanded = false,
    ...layoutPanelProps
  } = layout;

  return (
    <>
      <OptionalPropertySection title={sectionTitle} defaultExpanded={sectionDefaultExpanded}>
        <SlideLayoutAttributesPanel {...layoutPanelProps} />
      </OptionalPropertySection>
      {layoutBackground !== undefined && <MasterBackgroundEditor {...layoutBackground} />}
      {colorMap !== undefined && <ColorMapEditor {...colorMap} />}
      {transition !== undefined && (
        <OptionalPropertySection
          title={transition.sectionTitle ?? LAYOUT_CHROME_TRANSITION_SECTION_TITLE}
          defaultExpanded={transition.sectionDefaultExpanded ?? LAYOUT_CHROME_TRANSITION_DEFAULT_EXPANDED}
        >
          <TransitionEditor value={transition.value} onChange={transition.onChange} />
        </OptionalPropertySection>
      )}
      {children}
    </>
  );
}
