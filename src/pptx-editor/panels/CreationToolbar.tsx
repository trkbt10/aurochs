/**
 * @file Creation toolbar component
 *
 * Toolbar for creating new shapes, text boxes, and other elements.
 * Uses lucide-react icons for consistent visual design.
 */

import { useCallback, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import type { CreationMode } from "../context/presentation/editor/types";
import { ToolbarButton } from "../ui/toolbar/index";
import { Popover } from "../ui/primitives/Popover";
import { Button } from "../ui/primitives/Button";
import {
  SelectIcon,
  RectIcon,
  RoundRectIcon,
  EllipseIcon,
  TriangleIcon,
  RightArrowIcon,
  TextBoxIcon,
  LineIcon,
  PenIcon,
  PencilIcon,
  TableIcon,
  ChartIcon,
  DiagramIcon,
  ChevronDownIcon,
} from "../ui/icons/index";
import { colorTokens, radiusTokens } from "../ui/design-tokens/index";

// =============================================================================
// Types
// =============================================================================

export type CreationToolbarProps = {
  /** Current creation mode */
  readonly mode: CreationMode;
  /** Called when mode changes */
  readonly onModeChange: (mode: CreationMode) => void;
  /** Disabled state */
  readonly disabled?: boolean;
  /** Visual style */
  readonly appearance?: "panel" | "floating";
};

type ToolDefinition = {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly mode: CreationMode;
};

type PopoverOption = {
  readonly id: string;
  readonly label: string;
  readonly mode: CreationMode;
};

type PopoverToolDefinition = {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly defaultMode: CreationMode;
  readonly options: readonly PopoverOption[];
};

type ToolbarGroup =
  | { readonly type: "tools"; readonly tools: readonly ToolDefinition[] }
  | { readonly type: "popover"; readonly tools: readonly PopoverToolDefinition[] };

// =============================================================================
// Styles
// =============================================================================

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "4px",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.md,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
};

const floatingToolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "6px",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.lg,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
};

const separatorStyle: CSSProperties = {
  width: "1px",
  height: "24px",
  backgroundColor: `var(--border-strong, ${colorTokens.border.strong})`,
  margin: "0 4px",
};

const groupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const splitGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
};

const splitDividerStyle: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: `var(--border-strong, ${colorTokens.border.strong})`,
};

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: "180px",
};

const popoverSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const popoverHeaderStyle: CSSProperties = {
  fontSize: "12px",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const popoverButtonStyle: CSSProperties = {
  justifyContent: "flex-start",
  width: "100%",
};


// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS: readonly ToolDefinition[] = [
  // Selection
  {
    id: "select",
    icon: SelectIcon,
    label: "Select (V)",
    mode: { type: "select" },
  },
  // Basic shapes
  {
    id: "rect",
    icon: RectIcon,
    label: "Rectangle (R)",
    mode: { type: "shape", preset: "rect" },
  },
  {
    id: "roundRect",
    icon: RoundRectIcon,
    label: "Rounded Rectangle",
    mode: { type: "shape", preset: "roundRect" },
  },
  {
    id: "ellipse",
    icon: EllipseIcon,
    label: "Ellipse (O)",
    mode: { type: "shape", preset: "ellipse" },
  },
  {
    id: "triangle",
    icon: TriangleIcon,
    label: "Triangle",
    mode: { type: "shape", preset: "triangle" },
  },
  // Arrows
  {
    id: "rightArrow",
    icon: RightArrowIcon,
    label: "Right Arrow",
    mode: { type: "shape", preset: "rightArrow" },
  },
  // Text
  {
    id: "textbox",
    icon: TextBoxIcon,
    label: "Text Box (T)",
    mode: { type: "textbox" },
  },
  // Connector
  {
    id: "connector",
    icon: LineIcon,
    label: "Line (L)",
    mode: { type: "connector" },
  },
  // Table
  {
    id: "table",
    icon: TableIcon,
    label: "Table",
    mode: { type: "table", rows: 2, cols: 2 },
  },
  // Path drawing
  {
    id: "pen",
    icon: PenIcon,
    label: "Pen Tool (P)",
    mode: { type: "pen" },
  },
  {
    id: "pencil",
    icon: PencilIcon,
    label: "Pencil Tool (N)",
    mode: { type: "pencil", smoothing: "medium" },
  },
];

const CHART_OPTIONS: readonly PopoverOption[] = [
  { id: "bar", label: "Bar Chart", mode: { type: "chart", chartType: "bar" } },
  { id: "line", label: "Line Chart", mode: { type: "chart", chartType: "line" } },
  { id: "pie", label: "Pie Chart", mode: { type: "chart", chartType: "pie" } },
];

const CHART_DEFAULT_MODE: CreationMode = { type: "chart", chartType: "bar" };

const DIAGRAM_OPTIONS: readonly PopoverOption[] = [
  { id: "process", label: "Process", mode: { type: "diagram", diagramType: "process" } },
  { id: "cycle", label: "Cycle", mode: { type: "diagram", diagramType: "cycle" } },
  { id: "hierarchy", label: "Hierarchy", mode: { type: "diagram", diagramType: "hierarchy" } },
  { id: "relationship", label: "Relationship", mode: { type: "diagram", diagramType: "relationship" } },
];

const DIAGRAM_DEFAULT_MODE: CreationMode = { type: "diagram", diagramType: "process" };

const POPOVER_TOOLS: readonly PopoverToolDefinition[] = [
  {
    id: "chart",
    icon: ChartIcon,
    label: "Chart",
    defaultMode: CHART_DEFAULT_MODE,
    options: CHART_OPTIONS,
  },
  {
    id: "diagram",
    icon: DiagramIcon,
    label: "Diagram",
    defaultMode: DIAGRAM_DEFAULT_MODE,
    options: DIAGRAM_OPTIONS,
  },
];

// Group tools by category for separators
const TOOL_GROUPS: readonly ToolbarGroup[] = [
  { type: "tools", tools: TOOLS.slice(0, 1) }, // Select
  { type: "tools", tools: TOOLS.slice(1, 5) }, // Basic shapes
  { type: "tools", tools: TOOLS.slice(5, 6) }, // Arrows
  { type: "tools", tools: TOOLS.slice(6, 7) }, // Text
  { type: "tools", tools: TOOLS.slice(7, 8) }, // Connector
  { type: "tools", tools: TOOLS.slice(8, 9) }, // Table
  { type: "popover", tools: POPOVER_TOOLS }, // Chart/Diagram
  { type: "tools", tools: TOOLS.slice(9, 11) }, // Path drawing (Pen, Pencil)
];

// =============================================================================
// Helper Functions
// =============================================================================

function isSameMode(a: CreationMode, b: CreationMode): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "shape" && b.type === "shape") {
    return a.preset === b.preset;
  }
  if (a.type === "table" && b.type === "table") {
    return a.rows === b.rows && a.cols === b.cols;
  }
  if (a.type === "chart" && b.type === "chart") {
    return a.chartType === b.chartType;
  }
  if (a.type === "diagram" && b.type === "diagram") {
    return a.diagramType === b.diagramType;
  }
  // For pencil mode, we only compare the type (smoothing can be different)
  // This ensures the button stays active regardless of smoothing level
  return true;
}

function isPopoverActive(toolId: string, mode: CreationMode): boolean {
  if (toolId === "chart") {
    return mode.type === "chart";
  }
  if (toolId === "diagram") {
    return mode.type === "diagram";
  }
  return false;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Toolbar for creating new shapes and elements
 */
export function CreationToolbar({
  mode,
  onModeChange,
  disabled = false,
  appearance = "panel",
}: CreationToolbarProps) {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const handleClick = useCallback(
    (toolMode: CreationMode) => {
      if (!disabled) {
        onModeChange(toolMode);
      }
    },
    [disabled, onModeChange]
  );

  const handlePopoverSelect = useCallback(
    (toolMode: CreationMode) => {
      if (!disabled) {
        onModeChange(toolMode);
        setOpenPopoverId(null);
      }
    },
    [disabled, onModeChange]
  );

  const handleDefaultSelect = useCallback(
    (toolMode: CreationMode) => {
      if (!disabled) {
        onModeChange(toolMode);
        setOpenPopoverId(null);
      }
    },
    [disabled, onModeChange]
  );

  const appliedStyle = appearance === "floating" ? floatingToolbarStyle : toolbarStyle;

  return (
    <div style={appliedStyle}>
      {TOOL_GROUPS.map((group, groupIndex) => {
        if (group.type === "tools") {
          return (
            <div key={groupIndex} style={groupStyle}>
              {groupIndex > 0 && <div style={separatorStyle} />}
              {group.tools.map((tool) => {
                const isActive = isSameMode(mode, tool.mode);
                return (
                  <ToolbarButton
                    key={tool.id}
                    icon={tool.icon}
                    label={tool.label}
                    active={isActive}
                    disabled={disabled}
                    onClick={() => handleClick(tool.mode)}
                    size="lg"
                  />
                );
              })}
            </div>
          );
        }

        return (
          <div key={groupIndex} style={groupStyle}>
            {groupIndex > 0 && <div style={separatorStyle} />}
            {group.tools.map((tool) => {
              const isActive = isPopoverActive(tool.id, mode);
              const isOpen = openPopoverId === tool.id;
              return (
                <div key={tool.id} style={splitGroupStyle}>
                  <ToolbarButton
                    icon={tool.icon}
                    label={tool.label}
                    active={isActive}
                    disabled={disabled}
                    onClick={() => handleDefaultSelect(tool.defaultMode)}
                    size="lg"
                  />
                  <div style={splitDividerStyle} />
                  <Popover
                    open={isOpen}
                    onOpenChange={(open) => setOpenPopoverId(open ? tool.id : null)}
                    disabled={disabled}
                    trigger={
                      <ToolbarButton
                        icon={ChevronDownIcon}
                        label={`${tool.label} options`}
                        active={false}
                        disabled={disabled}
                        onClick={() => undefined}
                        size="tiny"
                      />
                    }
                  >
                    <div style={popoverContentStyle}>
                      <div style={popoverHeaderStyle}>{tool.label}</div>
                      <div style={popoverSectionStyle}>
                        {tool.options.map((option) => (
                          <Button
                            key={option.id}
                            variant="secondary"
                            style={popoverButtonStyle}
                            onClick={() => handlePopoverSelect(option.mode)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Popover>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
