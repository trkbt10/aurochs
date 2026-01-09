/**
 * @file FontFamilySelect - Font family selector based on document.fonts
 *
 * Uses SearchableSelect (same UX as the existing searchable select UI)
 * and renders each option in its own font for easier discovery.
 */

import { useMemo, type CSSProperties } from "react";
import { SearchableSelect } from "../../ui/primitives";
import type { SearchableSelectOption, SearchableSelectItemProps } from "../../ui/primitives/SearchableSelect";
import { useDocumentFontFamilies } from "./hooks/useDocumentFontFamilies";

const CLEAR_VALUE = "__pptx_editor_font_family_clear__";

type FontFamilySelectValue = string | typeof CLEAR_VALUE;

export type FontFamilySelectProps = {
  readonly value: string;
  readonly onChange: (value: string | undefined) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly sampleText?: string;
};

function buildFontFamilyOptions(documentFamilies: readonly string[], currentValue: string): SearchableSelectOption<FontFamilySelectValue>[] {
  const options: SearchableSelectOption<FontFamilySelectValue>[] = [
    {
      value: CLEAR_VALUE,
      label: "Default",
      group: "Actions",
      keywords: ["clear", "unset", "inherit", "default"],
    },
  ];

  const normalizedCurrent = currentValue.trim();
  const familySet = new Set(documentFamilies);
  if (normalizedCurrent !== "" && !familySet.has(normalizedCurrent)) {
    options.push({
      value: normalizedCurrent,
      label: normalizedCurrent,
      group: "Current",
      keywords: [normalizedCurrent],
    });
  }

  const genericFamilies = ["system-ui", "sans-serif", "serif", "monospace", "cursive", "fantasy"] as const;
  for (const family of genericFamilies) {
    options.push({
      value: family,
      label: family,
      group: "Generic",
      keywords: [family],
    });
  }

  for (const family of documentFamilies) {
    options.push({
      value: family,
      label: family,
      group: "Fonts",
      keywords: [family],
    });
  }

  return options;
}

const optionWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
};

const optionLabelStyle: CSSProperties = {
  fontSize: "12px",
  opacity: 0.9,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const optionPreviewStyle: CSSProperties = {
  fontSize: "14px",
  opacity: 0.95,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function renderFontItem(sampleText: string) {
  return function FontItem({ option }: SearchableSelectItemProps<FontFamilySelectValue>) {
    if (option.value === CLEAR_VALUE) {
      return option.label;
    }
    return (
      <div style={optionWrapStyle}>
        <div style={optionLabelStyle}>{option.label}</div>
        <div style={{ ...optionPreviewStyle, fontFamily: option.value }}>{sampleText}</div>
      </div>
    );
  };
}

function renderFontValue(option: SearchableSelectOption<FontFamilySelectValue>) {
  if (option.value === CLEAR_VALUE) {
    return option.label;
  }
  return <span style={{ fontFamily: option.value }}>{option.label}</span>;
}

/**
 * Font family selector using `document.fonts` as the primary source.
 */
export function FontFamilySelect({
  value,
  onChange,
  disabled,
  className,
  style,
  placeholder = "Family",
  searchPlaceholder = "Search fonts...",
  sampleText = "AaBbCc",
}: FontFamilySelectProps) {
  const documentFamilies = useDocumentFontFamilies();

  const options = useMemo(
    () => buildFontFamilyOptions(documentFamilies, value),
    [documentFamilies, value]
  );

  const handleChange = (next: FontFamilySelectValue) => {
    if (next === CLEAR_VALUE) {
      onChange(undefined);
      return;
    }
    const normalized = next.trim();
    onChange(normalized === "" ? undefined : normalized);
  };

  return (
    <SearchableSelect<FontFamilySelectValue>
      value={value as FontFamilySelectValue}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      className={className}
      style={style}
      dropdownWidth={360}
      renderItem={renderFontItem(sampleText)}
      renderValue={renderFontValue}
    />
  );
}
