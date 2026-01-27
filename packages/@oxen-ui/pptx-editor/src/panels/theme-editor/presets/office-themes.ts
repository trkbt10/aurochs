/**
 * @file Office theme presets
 *
 * Built-in theme presets based on Microsoft Office default themes.
 */

import type { ThemePreset } from "../types";

/**
 * Office default theme preset.
 */
export const OFFICE_THEME: ThemePreset = {
  id: "office",
  name: "Office",
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "44546A",
    lt2: "E7E6E6",
    accent1: "4472C4",
    accent2: "ED7D31",
    accent3: "A5A5A5",
    accent4: "FFC000",
    accent5: "5B9BD5",
    accent6: "70AD47",
    hlink: "0563C1",
    folHlink: "954F72",
  },
  fontScheme: {
    majorFont: { latin: "Calibri Light", eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: "Calibri", eastAsian: undefined, complexScript: undefined },
  },
};

/**
 * Apex theme preset.
 */
export const APEX_THEME: ThemePreset = {
  id: "apex",
  name: "Apex",
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "69676D",
    lt2: "C9C2D1",
    accent1: "CEB966",
    accent2: "9CB084",
    accent3: "6BB1C9",
    accent4: "6585CF",
    accent5: "7E6BC9",
    accent6: "A379BB",
    hlink: "410082",
    folHlink: "932968",
  },
  fontScheme: {
    majorFont: { latin: "Lucida Sans", eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: "Book Antiqua", eastAsian: undefined, complexScript: undefined },
  },
};

/**
 * Flow theme preset.
 */
export const FLOW_THEME: ThemePreset = {
  id: "flow",
  name: "Flow",
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "04617B",
    lt2: "DBF5F9",
    accent1: "0F6FC6",
    accent2: "009DD9",
    accent3: "0BD0D9",
    accent4: "10CF9B",
    accent5: "7CCA62",
    accent6: "A5C249",
    hlink: "E2D700",
    folHlink: "85DFD0",
  },
  fontScheme: {
    majorFont: { latin: "Calibri", eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: "Constantia", eastAsian: undefined, complexScript: undefined },
  },
};

/**
 * Metro theme preset.
 */
export const METRO_THEME: ThemePreset = {
  id: "metro",
  name: "Metro",
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "4E5B6F",
    lt2: "D6ECFF",
    accent1: "7FD13B",
    accent2: "EA157A",
    accent3: "FEB80A",
    accent4: "00ADDC",
    accent5: "738AC8",
    accent6: "1AB39F",
    hlink: "EB8803",
    folHlink: "5F7791",
  },
  fontScheme: {
    majorFont: { latin: "Consolas", eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: "Corbel", eastAsian: undefined, complexScript: undefined },
  },
};

/**
 * Equity theme preset.
 */
export const EQUITY_THEME: ThemePreset = {
  id: "equity",
  name: "Equity",
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "696464",
    lt2: "E9E5DC",
    accent1: "D34817",
    accent2: "9B2D1F",
    accent3: "A28E6A",
    accent4: "956251",
    accent5: "918485",
    accent6: "855D5D",
    hlink: "CC9900",
    folHlink: "96A9A9",
  },
  fontScheme: {
    majorFont: { latin: "Franklin Gothic Book", eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: "Perpetua", eastAsian: undefined, complexScript: undefined },
  },
};

/**
 * Concourse theme preset.
 */
export const CONCOURSE_THEME: ThemePreset = {
  id: "concourse",
  name: "Concourse",
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "464646",
    lt2: "DEF5FA",
    accent1: "2DA2BF",
    accent2: "DA1F28",
    accent3: "EB641B",
    accent4: "39639D",
    accent5: "474B78",
    accent6: "7D3C4A",
    hlink: "FF8021",
    folHlink: "5A1F5D",
  },
  fontScheme: {
    majorFont: { latin: "Lucida Sans Unicode", eastAsian: undefined, complexScript: undefined },
    minorFont: { latin: "Lucida Sans Unicode", eastAsian: undefined, complexScript: undefined },
  },
};

/**
 * All available theme presets.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  OFFICE_THEME,
  APEX_THEME,
  FLOW_THEME,
  METRO_THEME,
  EQUITY_THEME,
  CONCOURSE_THEME,
];
