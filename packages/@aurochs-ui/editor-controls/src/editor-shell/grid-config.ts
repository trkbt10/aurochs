/**
 * @file Grid config builder for EditorShell
 *
 * Generates PanelLayoutConfig from panel presence and sizing options.
 */

import type { PanelLayoutConfig, GridTrack } from "react-panel-layout";

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

const DEFAULT_LEFT_SIZE = "200px";
const DEFAULT_RIGHT_SIZE = "280px";

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
      size: options.leftSize ?? DEFAULT_LEFT_SIZE,
      resizable: options.leftResizable ?? true,
      minSize: options.leftMinSize ?? 150,
      maxSize: options.leftMaxSize ?? 350,
    });
  }

  areas.push("center");
  columns.push({ size: "1fr" });

  if (options.hasRight) {
    areas.push("right");
    columns.push({
      size: options.rightSize ?? DEFAULT_RIGHT_SIZE,
      resizable: options.rightResizable ?? true,
      minSize: options.rightMinSize ?? 200,
      maxSize: options.rightMaxSize ?? 500,
    });
  }

  return {
    areas: [areas],
    rows: [{ size: "1fr" }],
    columns,
    gap: "0px",
  };
}
