/**
 * @file ThemeNameSection — Theme display name editor (OOXML theme part)
 *
 * Shared shell for POTX template editing and any editor that surfaces theme name.
 * Callers supply state and dispatch; this component is presentation-only.
 */

import { useCallback } from "react";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";

export type ThemeNameSectionProps = {
  readonly themeName: string;
  readonly onThemeNameChange: (name: string) => void;
  readonly title?: string;
  readonly defaultExpanded?: boolean;
  readonly label?: string;
  readonly placeholder?: string;
};

/**
 * Collapsible "Theme" section with a single name field.
 */
export function ThemeNameSection({
  themeName,
  onThemeNameChange,
  title = "Theme",
  defaultExpanded = true,
  label = "Name",
  placeholder = "Theme name",
}: ThemeNameSectionProps) {
  const handleChange = useCallback(
    (value: string | number) => {
      onThemeNameChange(String(value));
    },
    [onThemeNameChange],
  );

  return (
    <OptionalPropertySection title={title} defaultExpanded={defaultExpanded}>
      <FieldGroup label={label} inline labelWidth={60}>
        <Input value={themeName} onChange={handleChange} placeholder={placeholder} />
      </FieldGroup>
    </OptionalPropertySection>
  );
}
