/**
 * @file Canvas controls toolbar
 *
 * Zoom controls, ruler/snap settings.
 */

import { useMemo, type CSSProperties } from "react";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import { Popover } from "@aurochs-ui/ui-components/primitives/Popover";
import { SettingsIcon } from "@aurochs-ui/ui-components/icons";
import { ZoomControls, isFitMode, type ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { getSnapOptions } from "./canvas-controls";

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
  const snapOptions = useMemo(() => getSnapOptions(), []);

  // When in fit mode, use displayZoom for zoom in/out calculations
  const currentZoom = isFitMode(zoomMode) ? displayZoom : zoomMode;

  return (
    <div style={toolbarControlsStyle}>
      <ZoomControls
        zoom={currentZoom}
        onZoomChange={(next) => onZoomModeChange(next)}
        includeFit
        fitMode={isFitMode(zoomMode)}
        onFitModeChange={(fit) => {
          if (fit) {
            onZoomModeChange("fit");
          }
        }}
      />
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
