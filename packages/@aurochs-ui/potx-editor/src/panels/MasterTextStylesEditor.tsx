/**
 * @file MasterTextStylesEditor - Editor for master text styles
 *
 * Displays title/body/other text styles with level indicators.
 * Each style is stored as XmlElement (lstStyle with up to 9 levels).
 *
 * @see ECMA-376 Part 1, Section 19.3.1.12 (txStyles)
 */

import { type CSSProperties } from "react";
import type { XmlElement } from "@aurochs/xml";
import type { RawMasterTextStyles } from "@aurochs-office/pptx/domain/theme/types";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type MasterTextStylesEditorProps = {
  readonly masterTextStyles: RawMasterTextStyles | undefined;
  readonly onChange: (styles: RawMasterTextStyles) => void;
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

const styleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const labelStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
};

const statusStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Helpers
// =============================================================================

function countLevels(styleElement: XmlElement | undefined): number {
  if (!styleElement) {
    return 0;
  }
  const children = styleElement.children ?? [];
  return children.filter((c) => typeof c === "object" && "name" in c && /^a:lvl\dpPr$/.test(c.name)).length;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for master text styles (title, body, other).
 *
 * Shows style presence and level counts. Full editing of individual
 * paragraph/run properties per level requires XML ⇄ domain round-trip.
 */
export function MasterTextStylesEditor({ masterTextStyles }: MasterTextStylesEditorProps) {
  const styles = [
    { label: "Title Style", element: masterTextStyles?.titleStyle },
    { label: "Body Style", element: masterTextStyles?.bodyStyle },
    { label: "Other Style", element: masterTextStyles?.otherStyle },
  ] as const;

  return (
    <OptionalPropertySection title="Master Text Styles" defaultExpanded={false}>
      <div style={contentStyle}>
        {styles.map(({ label, element }) => {
          const levels = countLevels(element);
          return (
            <div key={label} style={styleRowStyle}>
              <span style={labelStyle}>{label}</span>
              <span style={statusStyle}>
                {element ? `${levels} level${levels !== 1 ? "s" : ""}` : "not defined"}
              </span>
            </div>
          );
        })}
      </div>
    </OptionalPropertySection>
  );
}
