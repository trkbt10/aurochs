/**
 * @file Zoom control component with +/- buttons and a range slider.
 */

import { useCallback } from "react";

export type ZoomControlProps = {
  readonly zoom: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onZoomChange: (zoom: number) => void;
};

export function ZoomControl({ zoom, min, max, step = 5, onZoomChange }: ZoomControlProps): React.JSX.Element {
  const clamp = useCallback(
    (value: number) => Math.max(min, Math.min(max, value)),
    [min, max],
  );

  return (
    <div className="zoom-control">
      <vscode-button
        id="btn-zoom-out"
        icon="remove"
        icon-only
        secondary
        onClick={() => onZoomChange(clamp(zoom - 10))}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={zoom}
        step={step}
        onChange={(e) => onZoomChange(clamp(Number(e.target.value)))}
      />
      <vscode-button
        id="btn-zoom-in"
        icon="add"
        icon-only
        secondary
        onClick={() => onZoomChange(clamp(zoom + 10))}
      />
      <span>{zoom}%</span>
    </div>
  );
}
