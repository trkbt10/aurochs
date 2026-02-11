/**
 * @file Grid config builder for EditorShell
 *
 * Generates PanelLayoutConfig from panel presence and sizing options.
 */

import type { PanelLayoutConfig, GridTrack } from "react-panel-layout";
import { editorShellTokens } from "@aurochs-ui/ui-components/design-tokens";

export type EditorGridConfigOptions = {
  readonly hasLeft: boolean;
  readonly hasRight: boolean;
  readonly leftSize?: string;
  readonly leftMinSize?: number;
  readonly leftMaxSize?: number;
  readonly leftResizable?: boolean;
  readonly rightSize?: string;
  readonly rightMinSize?: number;
  readonly rightMaxSize?: number;
  readonly rightResizable?: boolean;
};

const { panel } = editorShellTokens;

/**
 * Builds a PanelLayoutConfig for EditorShell based on which panels are present.
 *
 * Grid areas:
 * - "left" — left panel
 * - "center" — center content (always present, 1fr)
 * - "right" — right panel
 */
export function buildEditorGridConfig(options: EditorGridConfigOptions): PanelLayoutConfig {
  const areas: string[] = [];
  const columns: GridTrack[] = [];

  if (options.hasLeft) {
    areas.push("left");
    columns.push({
      size: options.leftSize ?? panel.leftSize,
      resizable: options.leftResizable ?? true,
      minSize: options.leftMinSize ?? panel.leftMinSize,
      maxSize: options.leftMaxSize ?? panel.leftMaxSize,
    });
  }

  areas.push("center");
  columns.push({ size: "1fr" });

  if (options.hasRight) {
    areas.push("right");
    columns.push({
      size: options.rightSize ?? panel.rightSize,
      resizable: options.rightResizable ?? true,
      minSize: options.rightMinSize ?? panel.rightMinSize,
      maxSize: options.rightMaxSize ?? panel.rightMaxSize,
    });
  }

  return {
    areas: [areas],
    rows: [{ size: "1fr" }],
    columns,
    gap: "0px",
  };
}
