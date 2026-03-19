/**
 * @file ObjectDefaultsEditor - Editor for object defaults (a:objectDefaults)
 *
 * Displays default fill/line/text settings for new objects.
 * Object defaults are stored as XmlElement, parsed to domain types for editing.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.7 (objectDefaults)
 */

import { type CSSProperties } from "react";
import type { ObjectDefaults } from "@aurochs-office/pptx/domain/theme/types";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ObjectDefaultsEditorProps = {
  readonly objectDefaults: ObjectDefaults | undefined;
  readonly onChange: (objectDefaults: ObjectDefaults) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const infoStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for object defaults (shape, line, text defaults).
 *
 * Shows which defaults are defined. Full editing requires
 * deep XML ⇄ domain round-trip for each default's spPr.
 */
export function ObjectDefaultsEditor({ objectDefaults }: ObjectDefaultsEditorProps) {
  const hasShape = objectDefaults?.shapeDefault != null;
  const hasLine = objectDefaults?.lineDefault != null;
  const hasText = objectDefaults?.textDefault != null;
  const hasAny = hasShape || hasLine || hasText;

  return (
    <OptionalPropertySection title="Object Defaults" defaultExpanded={false}>
      <div style={contentStyle}>
        {!hasAny && <span style={infoStyle}>No defaults defined</span>}
        {hasShape && <span style={infoStyle}>Shape default: defined</span>}
        {hasLine && <span style={infoStyle}>Line default: defined</span>}
        {hasText && <span style={infoStyle}>Text default: defined</span>}
      </div>
    </OptionalPropertySection>
  );
}
