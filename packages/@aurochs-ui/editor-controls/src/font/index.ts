/**
 * @file Font module barrel
 *
 * Local Font Access API + document.fonts based font selection.
 * FontCatalog (external catalog injection) has been removed.
 */

// Component
export { FontFamilySelect, type FontFamilySelectProps } from "./FontFamilySelect";

// Hooks
export { useDocumentFontFamilies } from "./useDocumentFontFamilies";
export { useLocalFonts, type LocalFontData, type LocalFontFamily, type LocalFontsStatus, type UseLocalFontsResult } from "./useLocalFonts";
export { useFontOptions, type FontOption, type UseFontOptionsResult } from "./useFontOptions";
