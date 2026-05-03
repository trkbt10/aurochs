/** @file Editable SVG path data helpers for fig vector path tools. */

import { sampleCubicBezier, type VectorPathPoint, type VectorPathSegmentLine } from "./geometry";

export type EditablePathCommandType = "M" | "L" | "Q" | "C" | "Z";

export type EditablePathCommand = {
  readonly type: EditablePathCommandType;
  readonly values: readonly number[];
};

export type EditablePathPoint = {
  readonly valueIndex: number;
  readonly x: number;
  readonly y: number;
  readonly role: "anchor" | "control";
};

export type EditableVectorPathOperation =
  | { readonly type: "insert-point-at-nearest-segment"; readonly point: VectorPathPoint }
  | {
      readonly type: "move-command-point";
      readonly commandIndex: number;
      readonly valueIndex: number;
      readonly point: VectorPathPoint;
    }
  | { readonly type: "convert-segment-to-curve"; readonly commandIndex: number }
  | { readonly type: "convert-segment-to-line"; readonly commandIndex: number }
  | { readonly type: "delete-anchor"; readonly commandIndex: number }
  | { readonly type: "set-closed"; readonly closed: boolean };

const commandParamLabels: Record<EditablePathCommandType, readonly string[]> = {
  M: ["X", "Y"],
  L: ["X", "Y"],
  Q: ["X1", "Y1", "X", "Y"],
  C: ["X1", "Y1", "X2", "Y2", "X", "Y"],
  Z: [],
};

type EditableInsertionTarget =
  | {
      readonly kind: "command";
      readonly commandIndex: number;
      readonly start: VectorPathPoint;
      readonly point: VectorPathPoint;
      readonly t: number;
      readonly distance: number;
    }
  | {
      readonly kind: "close";
      readonly commandIndex: number;
      readonly point: VectorPathPoint;
      readonly distance: number;
    };

/** Parse a limited absolute M/L/Q/C/Z path string into editable commands. */
export function parseEditablePathData(data: string): readonly EditablePathCommand[] | undefined {
  const tokens = data.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi);
  if (!tokens) {
    return [];
  }
  return parsePathTokens(tokens, 0, []);
}

/** Serialize editable path commands back to an absolute SVG path string. */
export function serializeEditablePathData(commands: readonly EditablePathCommand[]): string {
  return commands
    .map((command) => [command.type, ...normalizeCommandValues(command.type, command.values)].join(" "))
    .join(" ");
}

/** Scale all path command coordinates around the local origin. */
export function scaleEditablePathData(
  data: string,
  scaleX: number,
  scaleY: number,
): string {
  const commands = parseEditablePathData(data);
  if (!commands) {
    return data;
  }
  return serializeEditablePathData(commands.map((command) => ({
    ...command,
    values: normalizeCommandValues(command.type, command.values).map((value, index) => (
      index % 2 === 0 ? value * scaleX : value * scaleY
    )),
  })));
}

/** Return the final endpoint of a command, if it has one. */
export function getEditableCommandEndpoint(command: EditablePathCommand): { readonly x: number; readonly y: number } | undefined {
  const anchor = getEditableCommandPoints(command).find((point) => point.role === "anchor");
  return anchor ? { x: anchor.x, y: anchor.y } : undefined;
}

/** Return the value index for a command's anchor point. */
export function getEditableCommandAnchorValueIndex(command: EditablePathCommand): number | undefined {
  return getEditableCommandPoints(command).find((point) => point.role === "anchor")?.valueIndex;
}

/** Return editable points for command anchors and Bezier controls. */
export function getEditableCommandPoints(command: EditablePathCommand): readonly EditablePathPoint[] {
  const values = normalizeCommandValues(command.type, command.values);
  switch (command.type) {
    case "M":
    case "L":
      return [{ valueIndex: 0, x: values[0] ?? 0, y: values[1] ?? 0, role: "anchor" }];
    case "Q":
      return [
        { valueIndex: 0, x: values[0] ?? 0, y: values[1] ?? 0, role: "control" },
        { valueIndex: 2, x: values[2] ?? 0, y: values[3] ?? 0, role: "anchor" },
      ];
    case "C":
      return [
        { valueIndex: 0, x: values[0] ?? 0, y: values[1] ?? 0, role: "control" },
        { valueIndex: 2, x: values[2] ?? 0, y: values[3] ?? 0, role: "control" },
        { valueIndex: 4, x: values[4] ?? 0, y: values[5] ?? 0, role: "anchor" },
      ];
    case "Z":
      return [];
  }
}

/** Apply one path editing user operation to parsed commands. */
export function applyEditableVectorPathOperation(
  commands: readonly EditablePathCommand[],
  operation: EditableVectorPathOperation,
): readonly EditablePathCommand[] {
  switch (operation.type) {
    case "insert-point-at-nearest-segment":
      return insertEditableLineAtNearestSegment(commands, operation.point);
    case "move-command-point":
      return replaceEditableCommandPoint({
        commands,
        commandIndex: operation.commandIndex,
        valueIndex: operation.valueIndex,
        point: operation.point,
      });
    case "convert-segment-to-curve":
      return convertEditableSegmentToCurve(commands, operation.commandIndex);
    case "convert-segment-to-line":
      return convertEditableSegmentToLine(commands, operation.commandIndex);
    case "delete-anchor":
      return deleteEditableAnchorCommand(commands, operation.commandIndex);
    case "set-closed":
      return setEditablePathClosed(commands, operation.closed);
  }
}

/** Replace a command point while preserving its command type. */
export function replaceEditableCommandPoint({
  commands,
  commandIndex,
  valueIndex,
  point,
}: {
  readonly commands: readonly EditablePathCommand[];
  readonly commandIndex: number;
  readonly valueIndex: number;
  readonly point: { readonly x: number; readonly y: number };
}): readonly EditablePathCommand[] {
  const command = commands[commandIndex];
  const target = command ? getEditableCommandPoints(command).find((candidate) => candidate.valueIndex === valueIndex) : undefined;
  if (!command || !target) {
    return commands;
  }
  const delta = { x: point.x - target.x, y: point.y - target.y };
  const isAnchorMove = target.role === "anchor";
  return commands.map((command, index) => {
    if (index === commandIndex) {
      const values = [...normalizeCommandValues(command.type, command.values)];
      if (valueIndex + 1 >= values.length) {
        return command;
      }
      values[valueIndex] = point.x;
      values[valueIndex + 1] = point.y;
      return {
        ...command,
        values: resolveMovedCommandPointValues({
          type: command.type,
          values,
          anchorValueIndex: valueIndex,
          delta,
          isAnchorMove,
        }),
      };
    }
    if (isAnchorMove && index === commandIndex + 1) {
      return translateOutgoingControlForAnchorMove(command, delta);
    }
    return command;
  });
}

/** Replace a command endpoint while preserving its command type and controls. */
export function replaceEditableCommandEndpoint(
  commands: readonly EditablePathCommand[],
  commandIndex: number,
  point: { readonly x: number; readonly y: number },
): readonly EditablePathCommand[] {
  const command = commands[commandIndex];
  const endpoint = command ? getEditableCommandPoints(command).find((candidate) => candidate.role === "anchor") : undefined;
  if (!endpoint) {
    return commands;
  }
  return replaceEditableCommandPoint({ commands, commandIndex, valueIndex: endpoint.valueIndex, point });
}

/** Insert a line command after the segment nearest to the provided point. */
export function insertEditableLineAtNearestSegment(
  commands: readonly EditablePathCommand[],
  point: { readonly x: number; readonly y: number },
): readonly EditablePathCommand[] {
  const target = findNearestInsertionTarget(commands, point);
  if (!target) {
    return commands;
  }
  if (target.kind === "close") {
    return [
      ...commands.slice(0, target.commandIndex),
      { type: "L", values: [target.point.x, target.point.y] },
      ...commands.slice(target.commandIndex),
    ];
  }
  const command = commands[target.commandIndex];
  if (!command) {
    return commands;
  }
  if (command.type === "L") {
    return [
      ...commands.slice(0, target.commandIndex),
      { type: "L", values: [target.point.x, target.point.y] },
      command,
      ...commands.slice(target.commandIndex + 1),
    ];
  }
  if (command.type === "C") {
    return [
      ...commands.slice(0, target.commandIndex),
      ...splitEditableCubicSegment(target.start, command, target.t),
      ...commands.slice(target.commandIndex + 1),
    ];
  }
  if (command.type === "Q") {
    return [
      ...commands.slice(0, target.commandIndex),
      ...splitEditableQuadraticSegment(target.start, command, target.t),
      ...commands.slice(target.commandIndex + 1),
    ];
  }
  return commands;
}

/** Insert a line command before the closing command when one exists. */
export function insertEditableLineBeforeClose(
  commands: readonly EditablePathCommand[],
  point: { readonly x: number; readonly y: number },
): readonly EditablePathCommand[] {
  return insertEditableLineAtNearestSegment(commands, point);
}

/** Convert a line-like segment ending at commandIndex to a cubic Bezier segment. */
export function convertEditableSegmentToCurve(
  commands: readonly EditablePathCommand[],
  commandIndex: number,
): readonly EditablePathCommand[] {
  const command = commands[commandIndex];
  const previous = getPreviousEndpoint(commands, commandIndex);
  const end = command ? getEditableCommandEndpoint(command) : undefined;
  if (!command || !previous || !end || (command.type !== "L" && command.type !== "M")) {
    return commands;
  }
  if (command.type === "M") {
    return commands;
  }
  const dx = end.x - previous.x;
  const dy = end.y - previous.y;
  const curve: EditablePathCommand = {
    type: "C",
    values: [
      previous.x + dx / 3,
      previous.y + dy / 3,
      previous.x + dx * 2 / 3,
      previous.y + dy * 2 / 3,
      end.x,
      end.y,
    ],
  };
  return commands.map((candidate, index) => index === commandIndex ? curve : candidate);
}

/** Convert a curve segment ending at commandIndex to a straight line. */
export function convertEditableSegmentToLine(
  commands: readonly EditablePathCommand[],
  commandIndex: number,
): readonly EditablePathCommand[] {
  const command = commands[commandIndex];
  const end = command ? getEditableCommandEndpoint(command) : undefined;
  if (!command || !end || (command.type !== "C" && command.type !== "Q")) {
    return commands;
  }
  return commands.map((candidate, index) => (
    index === commandIndex ? { type: "L", values: [end.x, end.y] } : candidate
  ));
}

/** Delete an editable anchor command while preserving a valid subpath start. */
export function deleteEditableAnchorCommand(
  commands: readonly EditablePathCommand[],
  commandIndex: number,
): readonly EditablePathCommand[] {
  const command = commands[commandIndex];
  if (!command || command.type === "Z") {
    return commands;
  }
  const anchorCount = commands.filter((candidate) => getEditableCommandEndpoint(candidate)).length;
  if (anchorCount <= 2) {
    return commands;
  }
  if (command.type === "M") {
    const nextAnchorIndex = commands.findIndex((candidate, index) => index > commandIndex && getEditableCommandEndpoint(candidate));
    const nextAnchor = nextAnchorIndex >= 0 ? getEditableCommandEndpoint(commands[nextAnchorIndex]!) : undefined;
    if (!nextAnchor) {
      return commands;
    }
    const replacement: EditablePathCommand = { type: "M", values: [nextAnchor.x, nextAnchor.y] };
    return commands
      .map((candidate, index) => index === commandIndex ? replacement : candidate)
      .filter((_candidate, index) => index !== nextAnchorIndex);
  }
  return commands.filter((_candidate, index) => index !== commandIndex);
}

/** Toggle the current path between open and closed. */
export function setEditablePathClosed(
  commands: readonly EditablePathCommand[],
  closed: boolean,
): readonly EditablePathCommand[] {
  const hasClose = commands.some((command) => command.type === "Z");
  if (closed && !hasClose) {
    return [...commands, { type: "Z", values: [] }];
  }
  if (!closed && hasClose) {
    return commands.filter((command) => command.type !== "Z");
  }
  return commands;
}

/** Return visual control lines for cubic/quadratic handles. */
export function getEditableControlLines(commands: readonly EditablePathCommand[]): readonly VectorPathSegmentLine[] {
  return commands.flatMap((command, commandIndex) => {
    const previous = getPreviousEndpoint(commands, commandIndex);
    const end = getEditableCommandEndpoint(command);
    switch (command.type) {
      case "Q": {
        const control = { x: command.values[0] ?? 0, y: command.values[1] ?? 0 };
        return end ? [{ key: `${commandIndex}:q`, from: control, to: end }] : [];
      }
      case "C": {
        const firstControl = { x: command.values[0] ?? 0, y: command.values[1] ?? 0 };
        const secondControl = { x: command.values[2] ?? 0, y: command.values[3] ?? 0 };
        const lines: VectorPathSegmentLine[] = [];
        if (previous) {
          lines.push({ key: `${commandIndex}:c1`, from: previous, to: firstControl });
        }
        if (end) {
          lines.push({ key: `${commandIndex}:c2`, from: secondControl, to: end });
        }
        return lines;
      }
      case "M":
      case "L":
      case "Z":
        return [];
    }
  });
}

function commandParamCount(type: EditablePathCommandType): number {
  return commandParamLabels[type].length;
}

function normalizeCommandValues(type: EditablePathCommandType, values: readonly number[]): readonly number[] {
  const count = commandParamCount(type);
  return Array.from({ length: count }, (_, index) => values[index] ?? 0);
}

function translateIncomingControlForAnchorMove({
  type,
  values,
  anchorValueIndex,
  delta,
}: {
  readonly type: EditablePathCommandType;
  readonly values: readonly number[];
  readonly anchorValueIndex: number;
  readonly delta: VectorPathPoint;
}): readonly number[] {
  if (type === "C" && anchorValueIndex === 4) {
    return translateCommandValuePair(values, 2, delta);
  }
  if (type === "Q" && anchorValueIndex === 2) {
    return translateCommandValuePair(values, 0, delta);
  }
  return values;
}

function resolveMovedCommandPointValues({
  type,
  values,
  anchorValueIndex,
  delta,
  isAnchorMove,
}: {
  readonly type: EditablePathCommandType;
  readonly values: readonly number[];
  readonly anchorValueIndex: number;
  readonly delta: VectorPathPoint;
  readonly isAnchorMove: boolean;
}): readonly number[] {
  if (!isAnchorMove) {
    return values;
  }
  return translateIncomingControlForAnchorMove({
    type,
    values,
    anchorValueIndex,
    delta,
  });
}

function translateOutgoingControlForAnchorMove(
  command: EditablePathCommand,
  delta: VectorPathPoint,
): EditablePathCommand {
  if (command.type !== "C" && command.type !== "Q") {
    return command;
  }
  return {
    ...command,
    values: translateCommandValuePair(normalizeCommandValues(command.type, command.values), 0, delta),
  };
}

function translateCommandValuePair(
  values: readonly number[],
  valueIndex: number,
  delta: VectorPathPoint,
): readonly number[] {
  if (valueIndex + 1 >= values.length) {
    return values;
  }
  return values.map((value, index) => {
    if (index === valueIndex) {
      return value + delta.x;
    }
    if (index === valueIndex + 1) {
      return value + delta.y;
    }
    return value;
  });
}

function getPreviousEndpoint(
  commands: readonly EditablePathCommand[],
  commandIndex: number,
): { readonly x: number; readonly y: number } | undefined {
  for (let index = commandIndex - 1; index >= 0; index -= 1) {
    const endpoint = getEditableCommandEndpoint(commands[index]!);
    if (endpoint) {
      return endpoint;
    }
  }
  return undefined;
}

function findNearestInsertionTarget(
  commands: readonly EditablePathCommand[],
  point: { readonly x: number; readonly y: number },
): EditableInsertionTarget | undefined {
  const closeIndex = commands.findIndex((candidate) => candidate.type === "Z");
  const best = commands.reduce<EditableInsertionTarget | undefined>(
    (acc, command, commandIndex) => {
      const previous = getPreviousEndpoint(commands, commandIndex);
      const end = getEditableCommandEndpoint(command);
      if (commandIndex === 0 || command.type === "Z" || !previous || !end) {
        return acc;
      }
      const target = resolveCommandInsertionTarget({
        command,
        commandIndex,
        point,
        previous,
      });
      if (!target || (acc && target.distance >= acc.distance)) {
        return acc;
      }
      return target;
    },
    undefined,
  );
  if (closeIndex !== -1) {
    const start = getEditableCommandEndpoint(commands.find((command) => command.type === "M") ?? commands[0]!);
    const end = getPreviousEndpoint(commands, closeIndex);
    if (start && end) {
      const lineProjection = projectPointToLineSegment({ point, start: end, end: start });
      if (!best || lineProjection.distance < best.distance) {
        return {
          kind: "close",
          commandIndex: closeIndex,
          point: lineProjection.point,
          distance: lineProjection.distance,
        };
      }
    }
  }
  return best;
}

function resolveCommandInsertionTarget({
  command,
  commandIndex,
  point,
  previous,
}: {
  readonly command: EditablePathCommand;
  readonly commandIndex: number;
  readonly point: VectorPathPoint;
  readonly previous: VectorPathPoint;
}): EditableInsertionTarget | undefined {
  if (command.type === "L") {
    const end = getEditableCommandEndpoint(command);
    if (!end) {
      return undefined;
    }
    const lineProjection = projectPointToLineSegment({ point, start: previous, end });
    return {
      kind: "command",
      commandIndex,
      start: previous,
      point: lineProjection.point,
      t: lineProjection.t,
      distance: lineProjection.distance,
    };
  }
  if (command.type === "C") {
    return findNearestCubicInsertionTarget({ command, commandIndex, point, previous });
  }
  if (command.type === "Q") {
    return findNearestQuadraticInsertionTarget({ command, commandIndex, point, previous });
  }
  return undefined;
}

function projectPointToLineSegment({
  point,
  start,
  end,
}: {
  readonly point: VectorPathPoint;
  readonly start: VectorPathPoint;
  readonly end: VectorPathPoint;
}): { readonly point: VectorPathPoint; readonly t: number; readonly distance: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return { point: start, t: 0, distance: Math.hypot(point.x - start.x, point.y - start.y) };
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projection = { x: start.x + t * dx, y: start.y + t * dy };
  return { point: projection, t, distance: Math.hypot(point.x - projection.x, point.y - projection.y) };
}

function findNearestCubicInsertionTarget({
  command,
  commandIndex,
  point,
  previous,
}: {
  readonly command: EditablePathCommand;
  readonly commandIndex: number;
  readonly point: VectorPathPoint;
  readonly previous: VectorPathPoint;
}): EditableInsertionTarget | undefined {
  const values = normalizeCommandValues(command.type, command.values);
  const samples = [
    previous,
    ...sampleCubicBezier({
      start: previous,
      control1: { x: values[0] ?? 0, y: values[1] ?? 0 },
      control2: { x: values[2] ?? 0, y: values[3] ?? 0 },
      end: { x: values[4] ?? 0, y: values[5] ?? 0 },
    }),
  ];
  const nearest = findNearestSampledSegment({ point, samples });
  if (!nearest) {
    return undefined;
  }
  return {
    kind: "command",
    commandIndex,
    start: previous,
    point: nearest.point,
    t: nearest.t,
    distance: nearest.distance,
  };
}

function findNearestQuadraticInsertionTarget({
  command,
  commandIndex,
  point,
  previous,
}: {
  readonly command: EditablePathCommand;
  readonly commandIndex: number;
  readonly point: VectorPathPoint;
  readonly previous: VectorPathPoint;
}): EditableInsertionTarget | undefined {
  const values = normalizeCommandValues(command.type, command.values);
  const samples = [
    previous,
    ...sampleQuadraticBezier({
      start: previous,
      control: { x: values[0] ?? 0, y: values[1] ?? 0 },
      end: { x: values[2] ?? 0, y: values[3] ?? 0 },
    }),
  ];
  const nearest = findNearestSampledSegment({ point, samples });
  if (!nearest) {
    return undefined;
  }
  return {
    kind: "command",
    commandIndex,
    start: previous,
    point: nearest.point,
    t: nearest.t,
    distance: nearest.distance,
  };
}

function findNearestSampledSegment({
  point,
  samples,
}: {
  readonly point: VectorPathPoint;
  readonly samples: readonly VectorPathPoint[];
}): { readonly point: VectorPathPoint; readonly t: number; readonly distance: number } | undefined {
  if (samples.length < 2) {
    return undefined;
  }
  const segmentCount = samples.length - 1;
  return samples.slice(1).reduce<{ readonly point: VectorPathPoint; readonly t: number; readonly distance: number } | undefined>(
    (best, end, index) => {
      const projection = projectPointToLineSegment({ point, start: samples[index]!, end });
      const candidate = {
        point: projection.point,
        t: (index + projection.t) / segmentCount,
        distance: projection.distance,
      };
      if (best && best.distance <= candidate.distance) {
        return best;
      }
      return candidate;
    },
    undefined,
  );
}

function sampleQuadraticBezier({
  start,
  control,
  end,
  steps = 32,
}: {
  readonly start: VectorPathPoint;
  readonly control: VectorPathPoint;
  readonly end: VectorPathPoint;
  readonly steps?: number;
}): readonly VectorPathPoint[] {
  if (steps < 1) {
    throw new Error("Quadratic Bezier sampling requires at least one step");
  }
  return Array.from({ length: steps }, (_value, index) => {
    const t = (index + 1) / steps;
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT ** 2 * start.x + 2 * oneMinusT * t * control.x + t ** 2 * end.x,
      y: oneMinusT ** 2 * start.y + 2 * oneMinusT * t * control.y + t ** 2 * end.y,
    };
  });
}

function splitEditableCubicSegment(
  start: VectorPathPoint,
  command: EditablePathCommand,
  t: number,
): readonly [EditablePathCommand, EditablePathCommand] {
  const values = normalizeCommandValues(command.type, command.values);
  const control1 = { x: values[0] ?? 0, y: values[1] ?? 0 };
  const control2 = { x: values[2] ?? 0, y: values[3] ?? 0 };
  const end = { x: values[4] ?? 0, y: values[5] ?? 0 };
  const startControl = lerpPoint(start, control1, t);
  const middleControl = lerpPoint(control1, control2, t);
  const endControl = lerpPoint(control2, end, t);
  const firstControl2 = lerpPoint(startControl, middleControl, t);
  const secondControl1 = lerpPoint(middleControl, endControl, t);
  const split = lerpPoint(firstControl2, secondControl1, t);
  return [
    { type: "C", values: [startControl.x, startControl.y, firstControl2.x, firstControl2.y, split.x, split.y] },
    { type: "C", values: [secondControl1.x, secondControl1.y, endControl.x, endControl.y, end.x, end.y] },
  ];
}

function splitEditableQuadraticSegment(
  start: VectorPathPoint,
  command: EditablePathCommand,
  t: number,
): readonly [EditablePathCommand, EditablePathCommand] {
  const values = normalizeCommandValues(command.type, command.values);
  const control = { x: values[0] ?? 0, y: values[1] ?? 0 };
  const end = { x: values[2] ?? 0, y: values[3] ?? 0 };
  const firstControl = lerpPoint(start, control, t);
  const secondControl = lerpPoint(control, end, t);
  const split = lerpPoint(firstControl, secondControl, t);
  return [
    { type: "Q", values: [firstControl.x, firstControl.y, split.x, split.y] },
    { type: "Q", values: [secondControl.x, secondControl.y, end.x, end.y] },
  ];
}

function lerpPoint(start: VectorPathPoint, end: VectorPathPoint, t: number): VectorPathPoint {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function parsePathTokens(
  tokens: readonly string[],
  index: number,
  commands: readonly EditablePathCommand[],
): readonly EditablePathCommand[] | undefined {
  if (index >= tokens.length) {
    return commands;
  }
  const type = tokens[index]?.toUpperCase() as EditablePathCommandType | undefined;
  if (!type || !commandParamLabels[type]) {
    return undefined;
  }
  const count = commandParamCount(type);
  const values = tokens.slice(index + 1, index + 1 + count);
  if (values.length !== count || values.some((token) => /[A-Za-z]/.test(token))) {
    return undefined;
  }
  const command: EditablePathCommand = { type, values: values.map(Number) };
  return parsePathTokens(tokens, index + count + 1, [...commands, command]);
}
