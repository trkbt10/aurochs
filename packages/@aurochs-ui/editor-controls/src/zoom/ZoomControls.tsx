/**
 * @file ZoomControls
 *
 * Shared zoom in/out buttons + zoom select dropdown.
 */

import { useMemo, type CSSProperties } from "react";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { AddIcon, LineIcon } from "@aurochs-ui/ui-components/icons";
import { getClosestZoomIndex, getNextZoomValue, getZoomOptions, ZOOM_STEPS, FIT_ZOOM_VALUE } from "./zoom-steps";

export type ZoomControlsProps = {
  /** Current zoom value (decimal, e.g. 1 = 100%) */
  readonly zoom: number;
  /** Callback when zoom changes */
  readonly onZoomChange: (next: number) => void;
  /** Whether to include a "Fit" option in the dropdown */
  readonly includeFit?: boolean;
  /** Whether currently in fit mode (shows "Fit" in dropdown) */
  readonly fitMode?: boolean;
  /** Callback when fit mode is requested */
  readonly onFitModeChange?: (fit: boolean) => void;
  readonly disabled?: boolean;
};

const zoomButtonStyle: CSSProperties = {
  padding: "4px 6px",
};

const zoomSelectStyle: CSSProperties = {
  minWidth: "92px",
};

/** Get the select value string for the current zoom state */
function resolveZoomSelectValue(zoom: number, fitMode: boolean): string {
  if (fitMode) {
    return FIT_ZOOM_VALUE;
  }
  return `${Math.round(ZOOM_STEPS[getClosestZoomIndex(zoom)] * 100)}`;
}

/**
 * Zoom in/out buttons + zoom select dropdown.
 */
export function ZoomControls({
  zoom,
  onZoomChange,
  includeFit = false,
  fitMode = false,
  onFitModeChange,
  disabled,
}: ZoomControlsProps) {
  const zoomSelectValue = resolveZoomSelectValue(zoom, fitMode);
  const zoomOptions = useMemo(() => getZoomOptions(includeFit), [includeFit]);

  const handleZoomIn = () => {
    onZoomChange(getNextZoomValue(zoom, "in"));
  };

  const handleZoomOut = () => {
    onZoomChange(getNextZoomValue(zoom, "out"));
  };

  return (
    <>
      <Button variant="ghost" onClick={handleZoomIn} title="Zoom In" style={zoomButtonStyle} disabled={disabled}>
        <AddIcon size={16} />
      </Button>
      <Button variant="ghost" onClick={handleZoomOut} title="Zoom Out" style={zoomButtonStyle} disabled={disabled}>
        <LineIcon size={16} />
      </Button>
      <div style={{ width: "110px" }}>
        <Select
          value={zoomSelectValue}
          options={zoomOptions}
          onChange={(value) => {
            if (value === FIT_ZOOM_VALUE) {
              onFitModeChange?.(true);
              return;
            }
            const nextZoom = Number(value) / 100;
            if (!Number.isNaN(nextZoom)) {
              onFitModeChange?.(false);
              onZoomChange(nextZoom);
            }
          }}
          disabled={disabled}
          style={zoomSelectStyle}
        />
      </div>
    </>
  );
}
