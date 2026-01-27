/**
 * @file FontFamilySelect - Font family selector based on document.fonts
 *
 * Uses SearchableSelect (same UX as the existing searchable select UI)
 * and renders each option in its own font for easier discovery.
 */

import { useMemo, type CSSProperties } from "react";
import { SearchableSelect } from "@oxen-ui/ui-components/primitives";
import type { SearchableSelectOption, SearchableSelectItemProps } from "@oxen-ui/ui-components/primitives/SearchableSelect";
import { useDocumentFontFamilies } from "./hooks/useDocumentFontFamilies";
import { useFontCatalogFamilies } from "./hooks/useFontCatalogFamilies";
import { useEditorConfig } from "../../context/editor/EditorConfigContext";
import type { FontCatalog, FontCatalogFamilyRecord } from "../../fonts/types";

const CLEAR_VALUE = "__pptx_editor_font_family_clear__";
const CATALOG_HINT_VALUE = "__pptx_editor_font_family_catalog_hint__";
const CATALOG_LOADING_VALUE = "__pptx_editor_font_family_catalog_loading__";
const CATALOG_ERROR_VALUE = "__pptx_editor_font_family_catalog_error__";
const CATALOG_STATUS_VALUE = "__pptx_editor_font_family_catalog_status__";

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
  catalogRecords: readonly FontCatalogFamilyRecord[],
  currentValue: string,
  catalogLabel: string,
  showCatalogHint: boolean,
  catalogStatus: "idle" | "loading" | "loaded" | "error",
  catalogErrorMessage: string | null
): SearchableSelectOption<FontFamilySelectValue>[] {
  const categoryLabels: Record<string, string> = {
    "sans-serif": "Sans Serif",
    serif: "Serif",
    display: "Display",
    handwriting: "Handwriting",
    monospace: "Monospace",
  };
  const categoryOrder = ["sans-serif", "serif", "display", "handwriting", "monospace"] as const;

  const catalogFamilies = catalogRecords.map((record) => record.family);
  const categoryByFamily = new Map<string, string>();
  for (const record of catalogRecords) {
    const category = record.tags?.[0];
    if (typeof category === "string" && category.trim() !== "") {
      categoryByFamily.set(record.family, category.trim());
    }
  }

  function getCatalogStatusLabel(): string {
    if (catalogStatus === "loading") {
      return `${catalogLabel}: Loading…`;
    }
    if (catalogStatus === "loaded") {
      return `${catalogLabel}: Ready (${catalogFamilies.length})`;
    }
    if (catalogStatus === "error") {
      return `${catalogLabel}: Failed`;
    }
    return `${catalogLabel}: Idle`;
  }

  const options: SearchableSelectOption<FontFamilySelectValue>[] = [
    {
      value: CLEAR_VALUE,
      label: "Default",
      group: "Actions",
      keywords: ["clear", "unset", "inherit", "default"],
    },
  ];

  if (showCatalogHint) {
    options.push({
      value: CATALOG_STATUS_VALUE,
      label: getCatalogStatusLabel(),
      disabled: true,
      group: "Actions",
      keywords: ["catalog", "status", catalogLabel, catalogStatus],
    });
  }

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

  if (showCatalogHint) {
    options.push({
      value: CATALOG_HINT_VALUE,
      label: "Scroll or type to search…",
      disabled: true,
      group: catalogLabel,
      keywords: ["search", "type", catalogLabel],
    });
  }

  if (showCatalogHint && catalogStatus === "loading") {
    options.push({
      value: CATALOG_LOADING_VALUE,
      label: "Loading…",
      disabled: true,
      group: catalogLabel,
      keywords: ["loading", catalogLabel],
    });
  }

  if (showCatalogHint && catalogStatus === "error") {
    const msg = catalogErrorMessage?.trim() ? `: ${catalogErrorMessage.trim()}` : "";
    options.push({
      value: CATALOG_ERROR_VALUE,
      label: `Failed to load font catalog${msg}`,
      disabled: true,
      group: catalogLabel,
      keywords: ["error", "failed", catalogLabel],
    });
  }

  if (showCatalogHint && catalogStatus === "loaded") {
    const loadedSet = new Set(loadedFamilies.map((f) => f.trim()));
    const groupedByCategory = new Map<string, string[]>();
    const uncategorized: string[] = [];

    for (const family of uniqueFamilies(catalogFamilies)) {
      if (loadedSet.has(family)) {
        continue;
      }
      const category = categoryByFamily.get(family);
      if (!category) {
        uncategorized.push(family);
        continue;
      }
      const list = groupedByCategory.get(category);
      if (list) {
        list.push(family);
      } else {
        groupedByCategory.set(category, [family]);
      }
    }

    const orderedCategories = [
      ...categoryOrder.filter((key) => groupedByCategory.has(key)),
      ...Array.from(groupedByCategory.keys())
        .filter((key) => !categoryOrder.includes(key as (typeof categoryOrder)[number]))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    ];

    for (const category of orderedCategories) {
      const families = groupedByCategory.get(category) ?? [];
      const categoryLabel = categoryLabels[category] ?? category;
      for (const family of families) {
        options.push({
          value: family,
          label: family,
          group: `${catalogLabel} — ${categoryLabel}`,
          tags: [category],
          keywords: [family, catalogLabel, category, categoryLabel],
        });
      }
    }

    for (const family of uncategorized) {
      options.push({
        value: family,
        label: family,
        group: catalogLabel,
        keywords: [family, catalogLabel],
      });
    }
  }

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
  const { families: catalogFamilies, records: catalogRecords, status: catalogStatus, errorMessage: catalogErrorMessage } =
    useFontCatalogFamilies(fontCatalog);

  const catalogHasCategories = useMemo(
    () => catalogRecords.some((record) => (record.tags?.[0] ?? "").trim() !== ""),
    [catalogRecords]
  );

  const options = useMemo(
    () =>
      buildFontFamilyOptions(
        documentFamilies,
        catalogRecords,
        value,
        fontCatalog?.label ?? "Catalog",
        !!fontCatalog,
        catalogStatus,
        catalogErrorMessage
      ),
    [documentFamilies, catalogRecords, value, fontCatalog?.label, catalogStatus, catalogErrorMessage, fontCatalog]
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
      virtualization={{ itemHeight: 44, headerHeight: 22, overscan: 10 }}
      tagFilter={
        catalogHasCategories
          ? {
              tags: [
                { id: "sans-serif", label: "Sans" },
                { id: "serif", label: "Serif" },
                { id: "display", label: "Display" },
                { id: "handwriting", label: "Handwriting" },
                { id: "monospace", label: "Mono" },
              ],
              allLabel: "All",
            }
          : undefined
      }
      renderItem={renderFontItem(sampleText)}
      renderValue={renderFontValue}
    />
  );
}
