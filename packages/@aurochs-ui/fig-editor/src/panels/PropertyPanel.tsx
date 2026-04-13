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
import { OpacitySection } from "./sections/OpacitySection";
import { FillSection } from "./sections/FillSection";
import { StrokeSection } from "./sections/StrokeSection";
import { CornerRadiusSection } from "./sections/CornerRadiusSection";
import { EffectsSection } from "./sections/EffectsSection";
import { AutoLayoutSection } from "./sections/AutoLayoutSection";
import { ComponentPropertiesSection } from "./sections/ComponentPropertiesSection";
import { TextPropertiesSection } from "./sections/TextPropertiesSection";

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
  const { primaryNode, selectedNodes, dispatch, document } = useFigEditor();

  if (!primaryNode) {
    return (
      <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
        Select a layer to edit its properties
      </div>
    );
  }

  const hasMultipleSelected = selectedNodes.length > 1;

  return (
    <div>
      {/* Node identity header */}
      <OptionalPropertySection
        title={primaryNode.name}
        badge={hasMultipleSelected ? `${selectedNodes.length} selected` : primaryNode.type}
        defaultExpanded={false}
      >
        <div style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.tertiary }}>
          <div>Type: {primaryNode.type}</div>
          <div>ID: {primaryNode.id}</div>
          {primaryNode.visible === false && (
            <div style={{ color: colorTokens.text.tertiary, fontStyle: "italic" }}>Hidden</div>
          )}
        </div>
      </OptionalPropertySection>

      {/* Transform */}
      <OptionalPropertySection title="Transform" defaultExpanded>
        <TransformSection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>

      {/* Opacity (only show if not fully opaque or for convenience) */}
      <OptionalPropertySection title="Opacity" defaultExpanded>
        <OpacitySection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>

      {/* Corner Radius (only for applicable node types) */}
      {(primaryNode.cornerRadius !== undefined || primaryNode.rectangleCornerRadii !== undefined) && (
        <OptionalPropertySection title="Corner Radius" defaultExpanded>
          <CornerRadiusSection node={primaryNode} dispatch={dispatch} />
        </OptionalPropertySection>
      )}

      {/* Fill */}
      <OptionalPropertySection title="Fill" defaultExpanded>
        <FillSection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>

      {/* Stroke */}
      <OptionalPropertySection title="Stroke" defaultExpanded>
        <StrokeSection node={primaryNode} dispatch={dispatch} />
      </OptionalPropertySection>

      {/* Text Properties (TEXT nodes only) */}
      {primaryNode.textData && (
        <OptionalPropertySection title="Text" defaultExpanded>
          <TextPropertiesSection node={primaryNode} dispatch={dispatch} />
        </OptionalPropertySection>
      )}

      {/* Effects */}
      {primaryNode.effects.length > 0 && (
        <OptionalPropertySection title="Effects" badge={primaryNode.effects.length} defaultExpanded>
          <EffectsSection node={primaryNode} />
        </OptionalPropertySection>
      )}

      {/* Auto Layout */}
      {primaryNode.autoLayout && (
        <OptionalPropertySection title="Auto Layout" defaultExpanded>
          <AutoLayoutSection node={primaryNode} />
        </OptionalPropertySection>
      )}

      {/* Component Properties (INSTANCE nodes only) */}
      {primaryNode.symbolId && (
        <OptionalPropertySection title="Component Properties" defaultExpanded>
          <ComponentPropertiesSection node={primaryNode} document={document} />
        </OptionalPropertySection>
      )}
    </div>
  );
}
