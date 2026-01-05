/**
 * @file Canvas controls toolbar
 *
 * Zoom buttons, zoom selector, and ruler/snap settings.
 */

import { useMemo, type CSSProperties } from "react";
import { Button } from "../ui/primitives/Button";
import { Select } from "../ui/primitives/Select";
import { Toggle } from "../ui/primitives/Toggle";
import { Popover } from "../ui/primitives/Popover";
import { AddIcon, LineIcon, SettingsIcon } from "../ui/icons";
import { getClosestZoomIndex, getNextZoomValue, getSnapOptions, getZoomOptions, ZOOM_STEPS } from "./canvas-controls";

export type CanvasControlsProps = {
  readonly zoom: number;
  readonly onZoomChange: (value: number) => void;
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
  zoom,
  onZoomChange,
  showRulers,
  onShowRulersChange,
  snapEnabled,
  onSnapEnabledChange,
  snapStep,
  onSnapStepChange,
}: CanvasControlsProps) {
  const zoomIndex = getClosestZoomIndex(zoom);
  const zoomSelectValue = `${Math.round(ZOOM_STEPS[zoomIndex] * 100)}`;
  const zoomOptions = useMemo(() => getZoomOptions(), []);
  const snapOptions = useMemo(() => getSnapOptions(), []);

  return (
    <div style={toolbarControlsStyle}>
      <Button
        variant="ghost"
        onClick={() => onZoomChange(getNextZoomValue(zoom, "in"))}
        title="Zoom In"
        style={zoomButtonStyle}
      >
        <AddIcon size={16} />
      </Button>
      <Button
        variant="ghost"
        onClick={() => onZoomChange(getNextZoomValue(zoom, "out"))}
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
            const nextZoom = Number(value) / 100;
            if (!Number.isNaN(nextZoom)) {
              onZoomChange(nextZoom);
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
