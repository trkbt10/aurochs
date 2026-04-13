/**
 * @file Chart GraphicFrame property panel component
 *
 * Uses ChartPanelEditor for purpose-oriented chart editing.
 * Sections are organized by user intent:
 * - Identity / Transform (GraphicFrame properties)
 * - Title & Legend (most common edits)
 * - Series (chart data and type)
 * - Axes (axis configuration)
 * - Appearance (styling, 3D)
 * - Advanced (protection, external data)
 */

import type { GraphicFrame } from "@aurochs-office/pptx/domain/index";
import type { Chart } from "@aurochs-office/chart/domain";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { ChartPanelEditor, ChartEditorAdaptersProvider } from "@aurochs-ui/chart-editor";
import { pptxChartEditorAdapters } from "../../adapters";
import { NonVisualPropertiesEditor } from "@aurochs-ui/ooxml-components/drawing-ml";
import { TransformEditor } from "@aurochs-ui/editor-controls/editors";

// =============================================================================
// Types
// =============================================================================

export type ChartFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly chart: Chart;
  readonly onChange: (shape: GraphicFrame) => void;
  readonly onChartChange?: (chart: Chart) => void;
};

// =============================================================================
// Component
// =============================================================================
















/** Property panel for chart frame shapes. */
export function ChartFramePanel({ shape, chart, onChange, onChartChange }: ChartFramePanelProps) {
  return (
    <>
      <OptionalPropertySection title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </OptionalPropertySection>

      <OptionalPropertySection title="Transform" defaultExpanded={false}>
        {shape.transform && (
          <TransformEditor value={shape.transform} onChange={(transform) => onChange({ ...shape, transform })} />
        )}
      </OptionalPropertySection>

      <ChartEditorAdaptersProvider adapters={pptxChartEditorAdapters}>
        <ChartPanelEditor
          value={chart}
          onChange={(newChart) => onChartChange?.(newChart)}
        />
      </ChartEditorAdaptersProvider>
    </>
  );
}
