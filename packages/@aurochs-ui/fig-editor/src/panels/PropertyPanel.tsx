/**
 * @file Property panel
 *
 * Right panel displaying properties of the selected node.
 * Uses OptionalPropertySection for each property group.
 */

import { useFigEditor } from "../context/FigEditorContext";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { TransformSection } from "./sections/TransformSection";
import { FillSection } from "./sections/FillSection";
import { StrokeSection } from "./sections/StrokeSection";

// =============================================================================
// Component
// =============================================================================

/**
 * Property panel for the fig editor.
 *
 * Shows property editors when a node is selected,
 * or a message prompting selection when nothing is selected.
 */
export function PropertyPanel() {
  const { primaryNode, dispatch } = useFigEditor();

  if (!primaryNode) {
    return (
      <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
        Select a layer to edit its properties
      </div>
    );
  }

  return (
    <div>
      {/* Node identity header */}
      <OptionalPropertySection title={primaryNode.name} badge={primaryNode.type} defaultExpanded={false}>
        <div style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.tertiary }}>
          ID: {primaryNode.id}
        </div>
      </OptionalPropertySection>

      {/* Transform */}
      <OptionalPropertySection title="Transform" defaultExpanded>
        <TransformSection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>

      {/* Fill */}
      <OptionalPropertySection title="Fill" defaultExpanded>
        <FillSection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>

      {/* Stroke */}
      <OptionalPropertySection title="Stroke" defaultExpanded>
        <StrokeSection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>
    </div>
  );
}
