/** @file Vector path editing section. */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigVectorPath } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { createPropertyPrimaryUpdateAction, type PropertyMutationTarget } from "../property-mutation-target";

type VectorPathSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

const windingOptions: readonly SelectOption<string>[] = [
  { value: "NONZERO", label: "Non-zero" },
  { value: "EVENODD", label: "Even-odd" },
];

const rowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "4px 0",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 64,
  resize: "vertical",
  fontFamily: "monospace",
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  backgroundColor: colorTokens.background.tertiary,
  border: `1px solid ${colorTokens.border.primary}`,
  borderRadius: 4,
  padding: 6,
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  border: `1px dashed ${colorTokens.border.primary}`,
  background: "none",
  borderRadius: 4,
  padding: "4px 8px",
  color: colorTokens.text.secondary,
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
};

const commandRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "64px 1fr",
  gap: 6,
  alignItems: "start",
};

const commandFieldsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 4,
};

const removeButtonStyle: CSSProperties = {
  border: "none",
  background: "none",
  color: colorTokens.text.tertiary,
  cursor: "pointer",
  lineHeight: 0,
  padding: 2,
};

function windingName(path: FigVectorPath): string {
  const rule = path.windingRule;
  if (!rule) { return "NONZERO"; }
  return typeof rule === "string" ? rule : rule.name;
}

function makePath(): FigVectorPath {
  return {
    windingRule: "NONZERO",
    data: "M 0 0 L 100 0 L 100 100 L 0 100 Z",
  };
}

type EditableCommandType = "M" | "L" | "Q" | "C" | "Z";
type EditableCommand = {
  readonly type: EditableCommandType;
  readonly values: readonly number[];
};

const commandOptions: readonly SelectOption<EditableCommandType>[] = [
  { value: "M", label: "Move" },
  { value: "L", label: "Line" },
  { value: "Q", label: "Quad" },
  { value: "C", label: "Cubic" },
  { value: "Z", label: "Close" },
];

const commandParamLabels: Record<EditableCommandType, readonly string[]> = {
  M: ["X", "Y"],
  L: ["X", "Y"],
  Q: ["X1", "Y1", "X", "Y"],
  C: ["X1", "Y1", "X2", "Y2", "X", "Y"],
  Z: [],
};

function commandParamCount(type: EditableCommandType): number {
  return commandParamLabels[type].length;
}

function normalizeCommandValues(type: EditableCommandType, values: readonly number[]): readonly number[] {
  const count = commandParamCount(type);
  return Array.from({ length: count }, (_, index) => values[index] ?? 0);
}

function parsePathData(data: string): readonly EditableCommand[] | undefined {
  const tokens = data.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi);
  if (!tokens) {
    return [];
  }
  return parsePathTokens(tokens, 0, []);
}

function parsePathTokens(
  tokens: readonly string[],
  index: number,
  commands: readonly EditableCommand[],
): readonly EditableCommand[] | undefined {
  if (index >= tokens.length) {
    return commands;
  }
  const type = tokens[index]?.toUpperCase() as EditableCommandType | undefined;
  if (!type || !commandParamLabels[type]) {
    return undefined;
  }
  const count = commandParamCount(type);
  const values = tokens.slice(index + 1, index + 1 + count);
  if (values.length !== count || values.some((token) => /[A-Za-z]/.test(token))) {
    return undefined;
  }
  const command: EditableCommand = { type, values: values.map(Number) };
  return parsePathTokens(tokens, index + count + 1, [...commands, command]);
}

function serializePathData(commands: readonly EditableCommand[]): string {
  return commands
    .map((command) => [command.type, ...normalizeCommandValues(command.type, command.values)].join(" "))
    .join(" ");
}

function insertCommand(commands: readonly EditableCommand[], command: EditableCommand): readonly EditableCommand[] {
  const closeIndex = commands.findIndex((c) => c.type === "Z");
  if (closeIndex === -1) {
    return [...commands, command];
  }
  return [...commands.slice(0, closeIndex), command, ...commands.slice(closeIndex)];
}

function replaceCommandType(
  commands: readonly EditableCommand[],
  commandIndex: number,
  nextType: EditableCommandType,
): readonly EditableCommand[] {
  return commands.map((cmd, i) => {
    if (i !== commandIndex) {
      return cmd;
    }
    return { type: nextType, values: normalizeCommandValues(nextType, cmd.values) };
  });
}

/** Edits SVG path data stored on VECTOR-like fig nodes. */
export function VectorPathSection({ node, target, dispatch }: VectorPathSectionProps) {
  const paths = node.vectorPaths ?? [];

  const updatePaths = useCallback(
    (updater: (paths: readonly FigVectorPath[]) => readonly FigVectorPath[]) => {
      dispatch(createPropertyPrimaryUpdateAction({
        target,
        updater: (current) => ({ ...current, vectorPaths: updater(current.vectorPaths ?? []) }),
      }));
    },
    [dispatch, target],
  );

  const updatePath = useCallback(
    (index: number, updater: (path: FigVectorPath) => FigVectorPath) => {
      updatePaths((current) => current.map((path, i) => i === index ? updater(path) : path));
    },
    [updatePaths],
  );

  const parsedPaths = useMemo(
    () => paths.map((path) => parsePathData(path.data ?? "")),
    [paths],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {paths.map((path, index) => (
        <div key={index} style={rowStyle}>
          <div style={headerStyle}>
            <Select
              value={windingName(path)}
              onChange={(value) => updatePath(index, (current) => ({ ...current, windingRule: value }))}
              options={windingOptions}
              ariaLabel={`Path ${index + 1} winding rule`}
            />
            <button type="button" title="Remove path" style={removeButtonStyle} onClick={() => updatePaths((current) => current.filter((_, i) => i !== index))}>
              <CloseIcon size={12} />
            </button>
          </div>
          <textarea
            aria-label={`Path ${index + 1} data`}
            value={path.data ?? ""}
            onChange={(e) => updatePath(index, (current) => ({ ...current, data: e.currentTarget.value }))}
            style={textareaStyle}
          />
          {parsedPaths[index] && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {parsedPaths[index]!.map((command, commandIndex) => (
                <div key={commandIndex} style={commandRowStyle}>
                  <Select
                    value={command.type}
                    onChange={(nextType) => updatePath(index, (current) => {
                      const commands = parsePathData(current.data ?? "") ?? [];
                      const nextCommands = replaceCommandType(commands, commandIndex, nextType);
                      return { ...current, data: serializePathData(nextCommands) };
                    })}
                    options={commandOptions}
                    ariaLabel={`Path ${index + 1} command ${commandIndex + 1} type`}
                  />
                  <div style={commandFieldsStyle}>
                    {commandParamLabels[command.type].map((label, valueIndex) => (
                      <Input
                        key={`${commandIndex}-${label}`}
                        type="number"
                        ariaLabel={`Path ${index + 1} command ${commandIndex + 1} ${label}`}
                        value={command.values[valueIndex] ?? 0}
                        suffix={label}
                        onChange={(value) => updatePath(index, (current) => {
                          const commands = parsePathData(current.data ?? "") ?? [];
                          const nextCommands = commands.map((cmd, i) => {
                            if (i !== commandIndex) { return cmd; }
                            const values = [...normalizeCommandValues(cmd.type, cmd.values)];
                            values[valueIndex] = value as number;
                            return { ...cmd, values };
                          });
                          return { ...current, data: serializePathData(nextCommands) };
                        })}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => updatePath(index, (current) => {
                    const commands = parsePathData(current.data ?? "") ?? [];
                    return { ...current, data: serializePathData(insertCommand(commands, { type: "L", values: [100, 100] })) };
                  })}
                >
                  Add point
                </button>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => updatePath(index, (current) => {
                    const commands = parsePathData(current.data ?? "") ?? [];
                    return { ...current, data: serializePathData(insertCommand(commands, { type: "C", values: [25, 25, 75, 75, 100, 100] })) };
                  })}
                >
                  Add cubic
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" style={buttonStyle} onClick={() => updatePaths((current) => [...current, makePath()])}>
        <AddIcon size={12} />
        Add path
      </button>
    </div>
  );
}
