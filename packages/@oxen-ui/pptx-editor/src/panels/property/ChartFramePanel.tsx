/**
 * @file Chart GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing charts.
 */

import type { GraphicFrame } from "@oxen/pptx/domain/index";
import type { Chart } from "@oxen/pptx/domain/chart";
import { Accordion } from "@oxen-ui/ui-components/layout";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  ChartEditor,
} from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type ChartFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly chart: Chart;
  readonly onChange: (shape: GraphicFrame) => void;
  /**
   * Callback for chart content changes.
   * Chart data is stored in ResourceStore, not on the shape.
   */
  readonly onChartChange?: (chart: Chart) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * GraphicFrame (chart) editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - Chart content
 */
export function ChartFramePanel({
  shape,
  chart,
  onChange,
  onChartChange,
}: ChartFramePanelProps) {
  const handleChartChange = (newChart: Chart) => {
    // Chart data is stored in ResourceStore, notify parent
    onChartChange?.(newChart);
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded={false}>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Chart" defaultExpanded>
        <ChartEditor value={chart} onChange={handleChartChange} />
      </Accordion>
    </>
  );
}
