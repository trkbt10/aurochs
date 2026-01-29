/**
 * @file Canvas controls toolbar
 *
 * Zoom buttons, zoom selector, and ruler/snap settings.
 */

import { useMemo, type CSSProperties } from "react";
import { Button } from "@oxen-ui/ui-components/primitives/Button";
import { Select } from "@oxen-ui/ui-components/primitives/Select";
import { Toggle } from "@oxen-ui/ui-components/primitives/Toggle";
import { Popover } from "@oxen-ui/ui-components/primitives/Popover";
import { AddIcon, LineIcon, SettingsIcon } from "@oxen-ui/ui-components/icons";
import {
  getClosestZoomIndex,
  getNextZoomValue,
  getSnapOptions,
  getZoomOptions,
  ZOOM_STEPS,
  FIT_ZOOM_VALUE,
  isFitMode,
  type ZoomMode,
} from "./canvas-controls";

export type CanvasControlsProps = {
  /** Current zoom mode ('fit' or a fixed zoom value) */
  readonly zoomMode: ZoomMode;
  /** Callback when zoom mode changes */
  readonly onZoomModeChange: (mode: ZoomMode) => void;
  /** Current display zoom value (used when in fit mode to show actual zoom) */
  readonly displayZoom: number;
  readonly showRulers: boolean;
  readonly onShowRulersChange: (value: boolean) => void;
  readonly snapEnabled: boolean;
  readonly onSnapEnabledChange: (value: boolean) => void;
  readonly snapStep: number;
  readonly onSnapStepChange: (value: number) => void;
};

const toolbarControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginLeft: "auto",
};

const zoomButtonStyle: CSSProperties = {
  padding: "4px 6px",
};

const zoomSelectStyle: CSSProperties = {
  minWidth: "92px",
};

const settingsSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: "200px",
};

const settingsRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

/**
 * Toolbar section for canvas zoom and snapping settings.
 */
export function CanvasControls({
  zoomMode,
  onZoomModeChange,
  displayZoom,
  showRulers,
  onShowRulersChange,
  snapEnabled,
  onSnapEnabledChange,
  snapStep,
  onSnapStepChange,
}: CanvasControlsProps) {
  // Determine the select value based on zoom mode
  let zoomSelectValue = FIT_ZOOM_VALUE;
  if (!isFitMode(zoomMode)) {
    zoomSelectValue = `${Math.round(ZOOM_STEPS[getClosestZoomIndex(zoomMode)] * 100)}`;
  }
  const zoomOptions = useMemo(() => getZoomOptions(true), []);
  const snapOptions = useMemo(() => getSnapOptions(), []);

  // Handle zoom in/out buttons - these always switch to fixed zoom mode
  const handleZoomIn = () => {
    const currentZoom = isFitMode(zoomMode) ? displayZoom : zoomMode;
    onZoomModeChange(getNextZoomValue(currentZoom, "in"));
  };

  const handleZoomOut = () => {
    const currentZoom = isFitMode(zoomMode) ? displayZoom : zoomMode;
    onZoomModeChange(getNextZoomValue(currentZoom, "out"));
  };

  return (
    <div style={toolbarControlsStyle}>
      <Button
        variant="ghost"
        onClick={handleZoomIn}
        title="Zoom In"
        style={zoomButtonStyle}
      >
        <AddIcon size={16} />
      </Button>
      <Button
        variant="ghost"
        onClick={handleZoomOut}
        title="Zoom Out"
        style={zoomButtonStyle}
      >
        <LineIcon size={16} />
      </Button>
      <div style={{ width: "110px" }}>
        <Select
          value={zoomSelectValue}
          options={zoomOptions}
          onChange={(value) => {
            if (value === FIT_ZOOM_VALUE) {
              onZoomModeChange("fit");
              return;
            }
            const nextZoom = Number(value) / 100;
            if (!Number.isNaN(nextZoom)) {
              onZoomModeChange(nextZoom);
            }
          }}
          style={zoomSelectStyle}
        />
      </div>
      <Popover
        trigger={
          <Button variant="ghost" title="View Settings" style={zoomButtonStyle}>
            <SettingsIcon size={16} />
          </Button>
        }
      >
        <div style={settingsSectionStyle}>
          <div style={settingsRowStyle}>
            <span>Rulers</span>
            <Toggle checked={showRulers} onChange={onShowRulersChange} />
          </div>
          <div style={settingsRowStyle}>
            <span>Snap to ruler</span>
            <Toggle checked={snapEnabled} onChange={onSnapEnabledChange} />
          </div>
          <div style={settingsRowStyle}>
            <span>Snap step</span>
            <div style={{ width: "110px" }}>
              <Select
                value={`${snapStep}`}
                options={snapOptions}
                onChange={(value) => {
                  const nextStep = Number(value);
                  if (!Number.isNaN(nextStep) && nextStep > 0) {
                    onSnapStepChange(nextStep);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Popover>
    </div>
  );
}
