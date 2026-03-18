/**
 * @file ToolbarPopoverButton — toolbar button that opens a popover panel
 *
 * Generic foundation for any toolbar button + popover combination.
 * Content is injected via children (DI pattern).
 *
 * Usage:
 *   <ToolbarPopoverButton icon={<TypeIcon />} label="Text" disabled={!hasText}>
 *     <TextFormattingEditor value={fmt} onChange={handleChange} />
 *   </ToolbarPopoverButton>
 *
 *   <ToolbarPopoverButton icon={<LineSwatch line={line} />} label="Line" swatch>
 *     <LineEditor value={line} onChange={handleLineChange} />
 *   </ToolbarPopoverButton>
 */

import type { ReactNode, CSSProperties } from "react";
import { Popover } from "@aurochs-ui/ui-components/primitives";
import { ToolbarButton, TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { ToolbarButtonSize } from "@aurochs-ui/ui-components/primitives/ToolbarButton";

export type PopoverPlacement = {
  /** Horizontal alignment. Default: "start". */
  readonly align?: "start" | "center" | "end";
  /** Preferred side. Default: "bottom". */
  readonly side?: "top" | "bottom" | "left" | "right";
};

export type ToolbarPopoverButtonProps = {
  /** Icon element shown in the trigger button. */
  readonly icon: ReactNode;
  /** Accessible label / tooltip for the trigger button. */
  readonly label: string;
  /** Popover content — the editor panel to display. */
  readonly children: ReactNode;
  /** Disable the trigger button and popover. */
  readonly disabled?: boolean;
  /** Button size. Default: "sm". */
  readonly size?: ToolbarButtonSize;
  /** If true, render `icon` directly as the trigger (for custom swatches). */
  readonly swatch?: boolean;
  /** Fixed width for the popover panel. */
  readonly panelWidth?: number | string;
  /** Popover alignment. Default: "start". */
  readonly align?: PopoverPlacement["align"];
  /** Popover side. Default: "bottom". */
  readonly side?: PopoverPlacement["side"];
  /** Active/pressed state for the trigger button. */
  readonly active?: boolean;
};

const defaultPanelWidth = 260;

function buildSwatchStyle(disabled: boolean | undefined): CSSProperties {
  return {
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function buildTrigger(opts: {
  swatch: boolean | undefined;
  icon: ReactNode;
  label: string;
  disabled: boolean | undefined;
  size: ToolbarButtonSize;
  active: boolean | undefined;
}): ReactNode {
  if (opts.swatch) {
    return (
      <div style={buildSwatchStyle(opts.disabled)} title={opts.label}>
        {opts.icon}
      </div>
    );
  }
  return (
    <ToolbarButton
      icon={opts.icon}
      label={opts.label}
      onClick={() => {
        /* handled by Popover */
      }}
      disabled={opts.disabled}
      size={opts.size}
      active={opts.active}
    />
  );
}

/**
 * A toolbar button that opens a popover with arbitrary editor content.
 *
 * The popover content is provided via `children` — this component owns
 * only the trigger/popover chrome, not the editor logic.
 */
export function ToolbarPopoverButton({
  icon,
  label,
  children,
  disabled,
  size = "sm",
  swatch,
  panelWidth,
  align = "start",
  side = "bottom",
  active,
}: ToolbarPopoverButtonProps) {
  const width = panelWidth ?? defaultPanelWidth;

  const trigger = buildTrigger({ swatch, icon, label, disabled, size, active });

  return (
    <Popover trigger={trigger} align={align} side={side} disabled={disabled} padding="0">
      <div style={{ width }}>
        {children}
      </div>
    </Popover>
  );
}

/** Re-export icon constants for convenience (trigger icon sizing). */
export const POPOVER_ICON_SIZE = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
export const POPOVER_STROKE_WIDTH = iconTokens.strokeWidth;
