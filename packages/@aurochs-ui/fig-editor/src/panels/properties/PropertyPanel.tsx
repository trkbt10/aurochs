/**
 * @file Property panel
 *
 * Right panel displaying properties of the selected node.
 * Uses OptionalPropertySection for each property group.
 */

import { type ReactNode, type CSSProperties } from "react";
import { useFigEditor } from "../../context/FigEditorContext";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { TransformSection } from "../sections/appearance/TransformSection";
import { OpacitySection } from "../sections/appearance/OpacitySection";
import { FillSection } from "../sections/paint/FillSection";
import { StrokeSection } from "../sections/paint/StrokeSection";
import { CornerRadiusSection } from "../sections/appearance/CornerRadiusSection";
import { EffectsSection } from "../sections/paint/EffectsSection";
import { AutoLayoutSection } from "../sections/layout/AutoLayoutSection";
import { ComponentPropertiesSection } from "../sections/component/ComponentPropertiesSection";
import { TextPropertiesSection } from "../sections/text/TextPropertiesSection";
import { LayoutConstraintsSection } from "../sections/layout/LayoutConstraintsSection";
import { ExportSettingsSection } from "../sections/export/ExportSettingsSection";
import { SectionBehaviorSection } from "../sections/structure/SectionBehaviorSection";
import { VariantPropertiesSection } from "../sections/component/VariantPropertiesSection";
import { InstanceOverridesSection } from "../sections/component/InstanceOverridesSection";
import { ComponentSetVariantsSection } from "../sections/component/ComponentSetVariantsSection";
import { allowsFigUserOperation } from "../../context/fig-editor/user-operation";
import { useFigOperationDomain } from "../../context/use-fig-operation-domain";
import { createPropertyMutationTarget } from "./property-mutation-target";

// =============================================================================
// Component
// =============================================================================

const propertyMutationScopeStyle: CSSProperties = {
  border: 0,
  padding: 0,
  margin: 0,
  minWidth: 0,
};

function PropertyMutationScope({
  disabled,
  children,
}: {
  readonly disabled: boolean;
  readonly children: ReactNode;
}) {
  return (
    <fieldset
      disabled={disabled}
      aria-disabled={disabled}
      style={propertyMutationScopeStyle}
    >
      {children}
    </fieldset>
  );
}

/**
 * Property panel for the fig editor.
 *
 * Shows property editors when a node is selected,
 * or a message prompting selection when nothing is selected.
 */
export function PropertyPanel() {
  const { primaryNode, selectedNodes, dispatch, document } = useFigEditor();
  const operationDomain = useFigOperationDomain();
  const propertyMutationDisabled = !allowsFigUserOperation(operationDomain, "update-property");

  if (!primaryNode) {
    return (
      <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
        Select a layer to edit its properties
      </div>
    );
  }

  const hasMultipleSelected = selectedNodes.length > 1;
  const propertyTarget = createPropertyMutationTarget({ primaryNode, selectedNodes });

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
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <TransformSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      {/* Opacity (only show if not fully opaque or for convenience) */}
      <OptionalPropertySection title="Opacity" defaultExpanded>
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <OpacitySection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      {/* Corner Radius (only for applicable node types) */}
      {(primaryNode.cornerRadius !== undefined || primaryNode.rectangleCornerRadii !== undefined) && (
        <OptionalPropertySection title="Corner Radius" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <CornerRadiusSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {/* Fill */}
      <OptionalPropertySection title="Fill" defaultExpanded>
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <FillSection node={primaryNode} target={propertyTarget} images={document.images} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      {/* Stroke */}
      <OptionalPropertySection title="Stroke" defaultExpanded>
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <StrokeSection node={primaryNode} target={propertyTarget} images={document.images} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      <OptionalPropertySection title="Export" badge={primaryNode.exportSettings?.length ?? 0} defaultExpanded={false}>
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <ExportSettingsSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      {/* Text Properties (TEXT nodes only) */}
      {primaryNode.textData && (
        <OptionalPropertySection title="Text" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <TextPropertiesSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {/* Effects */}
      <OptionalPropertySection title="Effects" badge={primaryNode.effects.length} defaultExpanded>
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <EffectsSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      {/* Auto Layout */}
      {(primaryNode.type === "FRAME" || primaryNode.type === "COMPONENT" || primaryNode.autoLayout) && (
        <OptionalPropertySection title="Auto Layout" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <AutoLayoutSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {/* Child layout constraints */}
      <OptionalPropertySection title="Layout Constraints" defaultExpanded={false}>
        <PropertyMutationScope disabled={propertyMutationDisabled}>
          <LayoutConstraintsSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
        </PropertyMutationScope>
      </OptionalPropertySection>

      {primaryNode.type === "SECTION" && (
        <OptionalPropertySection title="Section" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <SectionBehaviorSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {primaryNode.variantPropSpecs && primaryNode.variantPropSpecs.length > 0 && (
        <OptionalPropertySection title="Variant Properties" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <VariantPropertiesSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {primaryNode.type === "COMPONENT_SET" && (
        <OptionalPropertySection title="Component Set Variants" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <ComponentSetVariantsSection node={primaryNode} target={propertyTarget} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {/* Component Properties (INSTANCE nodes only) */}
      {primaryNode.symbolId && (
        <OptionalPropertySection title="Component Properties" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <ComponentPropertiesSection node={primaryNode} target={propertyTarget} document={document} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}

      {primaryNode.type === "INSTANCE" && primaryNode.symbolId && (
        <OptionalPropertySection title="Instance Overrides" defaultExpanded>
          <PropertyMutationScope disabled={propertyMutationDisabled}>
            <InstanceOverridesSection node={primaryNode} target={propertyTarget} document={document} dispatch={dispatch} />
          </PropertyMutationScope>
        </OptionalPropertySection>
      )}
    </div>
  );
}
