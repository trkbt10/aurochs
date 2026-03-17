/**
 * @file FontFamilySelect - Font family selector
 *
 * Uses Local Font Access API (queryLocalFonts) for system fonts
 * and document.fonts for web fonts / embedded fonts.
 * No external catalog required.
 */

import { useMemo, type CSSProperties } from "react";
import { SearchableSelect } from "@aurochs-ui/ui-components/primitives";
import type {
  SearchableSelectOption,
  SearchableSelectItemProps,
} from "@aurochs-ui/ui-components/primitives/SearchableSelect";
import { useDocumentFontFamilies } from "./useDocumentFontFamilies";
import { useLocalFonts, type LocalFontFamily } from "./useLocalFonts";

const CLEAR_VALUE = "__font_select_clear__";

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
  /** Auto-request local fonts on mount. Default: true. */
  readonly autoRequestLocalFonts?: boolean;
  /** Extra font families to include (e.g. workbook fonts). Shown in "Additional" group. */
  readonly additionalFamilies?: readonly string[];
};

function uniqueFamilies(families: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const family of families) {
    const normalized = family.trim();
    if (normalized === "" || seen.has(normalized)) { continue; }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function buildOptions({
  loadedFamilies,
  localFontFamilies,
  additionalFamilies,
  currentValue,
}: {
  loadedFamilies: readonly string[];
  localFontFamilies: readonly LocalFontFamily[];
  additionalFamilies: readonly string[];
  currentValue: string;
}): SearchableSelectOption<FontFamilySelectValue>[] {
  const options: SearchableSelectOption<FontFamilySelectValue>[] = [
    { value: CLEAR_VALUE, label: "Default", group: "Actions", keywords: ["clear", "unset", "inherit", "default"] },
  ];

  // Current value if not in any list
  const allFamilyNames = new Set([
    ...loadedFamilies.map((f) => f.trim()),
    ...localFontFamilies.map((f) => f.family.trim()),
    ...additionalFamilies.map((f) => f.trim()),
  ]);
  const normalizedCurrent = currentValue.trim();
  if (normalizedCurrent !== "" && !allFamilyNames.has(normalizedCurrent)) {
    options.push({ value: normalizedCurrent, label: normalizedCurrent, group: "Current", keywords: [normalizedCurrent] });
  }

  // Generic CSS families
  const genericFamilies = ["system-ui", "sans-serif", "serif", "monospace", "cursive", "fantasy"] as const;
  for (const family of genericFamilies) {
    options.push({ value: family, label: family, group: "Generic", keywords: [family] });
  }

  // Additional families (e.g. workbook fonts, document-embedded fonts from caller)
  const additionalSet = new Set<string>();
  for (const family of uniqueFamilies(additionalFamilies)) {
    additionalSet.add(family.trim());
    options.push({ value: family, label: family, group: "Additional", keywords: [family] });
  }

  // Document-loaded fonts (web fonts, embedded fonts)
  for (const family of uniqueFamilies(loadedFamilies)) {
    if (additionalSet.has(family.trim())) { continue; }
    options.push({ value: family, label: family, group: "Document", keywords: [family] });
  }

  // Local system fonts (from queryLocalFonts API)
  const loadedSet = new Set(loadedFamilies.map((f) => f.trim()));
  for (const lf of localFontFamilies) {
    if (loadedSet.has(lf.family.trim()) || additionalSet.has(lf.family.trim())) { continue; }
    options.push({ value: lf.family, label: lf.family, group: "System", keywords: [lf.family, ...lf.styles] });
  }

  return options;
}

// Rendering

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
    if (option.value === CLEAR_VALUE) { return option.label; }
    return (
      <div style={optionWrapStyle}>
        <div style={optionLabelStyle}>{option.label}</div>
        <div style={{ ...optionPreviewStyle, fontFamily: option.value }}>{sampleText}</div>
      </div>
    );
  };
}

function renderFontValue(option: SearchableSelectOption<FontFamilySelectValue>) {
  if (option.value === CLEAR_VALUE) { return option.label; }
  return <span style={{ fontFamily: option.value }}>{option.label}</span>;
}

/**
 * Font family selector using document.fonts + Local Font Access API.
 * Automatically requests local fonts on mount (configurable).
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
  autoRequestLocalFonts = true,
  additionalFamilies = [],
}: FontFamilySelectProps) {
  const documentFamilies = useDocumentFontFamilies();
  const { families: localFamilies, requestFonts, status } = useLocalFonts();

  // Auto-request local fonts on first render
  useMemo(() => {
    if (autoRequestLocalFonts && status === "idle") {
      void requestFonts();
    }
  }, [autoRequestLocalFonts, status, requestFonts]);

  const options = useMemo(
    () => buildOptions({ loadedFamilies: documentFamilies, localFontFamilies: localFamilies, additionalFamilies, currentValue: value }),
    [documentFamilies, localFamilies, additionalFamilies, value],
  );

  const handleChange = (next: FontFamilySelectValue) => {
    if (next === CLEAR_VALUE) { onChange(undefined); return; }
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
      virtualization={{ itemHeight: 44, headerHeight: 22, overscan: 10 }}
      renderItem={renderFontItem(sampleText)}
      renderValue={renderFontValue}
    />
  );
}
