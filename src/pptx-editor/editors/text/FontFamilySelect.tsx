/**
 * @file FontFamilySelect - Font family selector based on document.fonts
 *
 * Uses SearchableSelect (same UX as the existing searchable select UI)
 * and renders each option in its own font for easier discovery.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SearchableSelect } from "../../ui/primitives";
import type { SearchableSelectOption, SearchableSelectItemProps } from "../../ui/primitives/SearchableSelect";
import { useDocumentFontFamilies } from "./hooks/useDocumentFontFamilies";
import { useEditorConfig } from "../../context/editor/EditorConfigContext";
import type { FontCatalog } from "../../fonts/types";

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
  /** Optional injected catalog override (defaults to EditorConfig.fontCatalog) */
  readonly fontCatalog?: FontCatalog;
};

function isFamilyLoaded(family: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  // Using a generic size; only presence matters.
  return document.fonts.check(`12px "${family.replaceAll('"', '\\"')}"`);
}

function uniqueFamilies(families: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const family of families) {
    const normalized = family.trim();
    if (normalized === "" || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function buildFontFamilyOptions(
  loadedFamilies: readonly string[],
  catalogFamilies: readonly string[],
  currentValue: string,
  catalogLabel: string
): SearchableSelectOption<FontFamilySelectValue>[] {
  const options: SearchableSelectOption<FontFamilySelectValue>[] = [
    {
      value: CLEAR_VALUE,
      label: "Default",
      group: "Actions",
      keywords: ["clear", "unset", "inherit", "default"],
    },
  ];

  const normalizedCurrent = currentValue.trim();
  const familySet = new Set(
    [...loadedFamilies, ...catalogFamilies].map((family) => family.trim()).filter((family) => family !== "")
  );
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

  for (const family of uniqueFamilies(loadedFamilies)) {
    options.push({
      value: family,
      label: family,
      group: "Loaded",
      keywords: [family],
    });
  }

  const loadedSet = new Set(loadedFamilies.map((f) => f.trim()));
  for (const family of uniqueFamilies(catalogFamilies)) {
    if (loadedSet.has(family)) {
      continue;
    }
    options.push({
      value: family,
      label: family,
      group: catalogLabel,
      keywords: [family],
      hiddenWhenEmptySearch: true,
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
  fontCatalog: fontCatalogOverride,
}: FontFamilySelectProps) {
  const { fontCatalog: fontCatalogFromContext } = useEditorConfig();
  const fontCatalog = fontCatalogOverride ?? fontCatalogFromContext;
  const documentFamilies = useDocumentFontFamilies();
  const [catalogFamilies, setCatalogFamilies] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!fontCatalog) {
      setCatalogFamilies([]);
      return;
    }

    const canceled = { value: false };
    Promise.resolve(fontCatalog.listFamilies())
      .then((families) => {
        if (!canceled.value) {
          setCatalogFamilies(families);
        }
      })
      .catch(() => {
        if (!canceled.value) {
          setCatalogFamilies([]);
        }
      });

    return () => {
      canceled.value = true;
    };
  }, [fontCatalog]);

  const options = useMemo(
    () => buildFontFamilyOptions(documentFamilies, catalogFamilies, value, fontCatalog?.label ?? "Catalog"),
    [documentFamilies, catalogFamilies, value, fontCatalog?.label]
  );

  const catalogSet = useMemo(() => new Set(catalogFamilies.map((f) => f.trim())), [catalogFamilies]);

  const handleChange = (next: FontFamilySelectValue) => {
    if (next === CLEAR_VALUE) {
      onChange(undefined);
      return;
    }
    const normalized = next.trim();
    if (normalized === "") {
      onChange(undefined);
      return;
    }

    const shouldAttemptLoad = !!fontCatalog && catalogSet.has(normalized) && !isFamilyLoaded(normalized);
    if (shouldAttemptLoad) {
      void fontCatalog.ensureFamilyLoaded(normalized)
        .catch(() => false)
        .finally(() => {
          onChange(normalized);
        });
      return;
    }

    onChange(normalized);
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
