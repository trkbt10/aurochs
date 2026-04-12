/**
 * @file Instance (component instance) node builder
 */

import { createTranslationMatrix } from "../../matrix";
import type { Color, Paint } from "../types";
import type { InstanceNodeData } from "./types";
import {
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  CONSTRAINT_TYPE_VALUES,
  toEnumValue,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
} from "../../constants";

type SymbolID = { sessionID: number; localID: number };

/** Normalize symbol ID to full GUID format */
function normalizeSymbolID(symbolID: number | SymbolID): SymbolID {
  if (typeof symbolID === "number") {
    return { sessionID: 1, localID: symbolID };
  }
  return symbolID;
}

/** Build fill paints override from color */
function buildFillPaintsOverride(fillColor: Color | undefined): Paint[] | undefined {
  if (!fillColor) {
    return undefined;
  }
  return [{ type: { value: 0, name: "SOLID" }, color: fillColor, opacity: 1, visible: true, blendMode: { value: 1, name: "NORMAL" } }];
}

/** Return array if non-empty, otherwise undefined */
function optionalArray<T>(arr: readonly T[]): readonly T[] | undefined {
  return arr.length > 0 ? arr : undefined;
}

/** Instance node builder instance */
export type InstanceNodeBuilder = {
  name: (name: string) => InstanceNodeBuilder;
  size: (width: number, height: number) => InstanceNodeBuilder;
  position: (x: number, y: number) => InstanceNodeBuilder;
  visible: (v: boolean) => InstanceNodeBuilder;
  opacity: (o: number) => InstanceNodeBuilder;
  overrideBackground: (c: Color) => InstanceNodeBuilder;
  overrideSymbol: (symbolID: number | SymbolID) => InstanceNodeBuilder;
  addPropertyReference: (ref: string) => InstanceNodeBuilder;
  positioning: (mode: StackPositioning) => InstanceNodeBuilder;
  primarySizing: (sizing: StackSizing) => InstanceNodeBuilder;
  counterSizing: (sizing: StackSizing) => InstanceNodeBuilder;
  horizontalConstraint: (constraint: ConstraintType) => InstanceNodeBuilder;
  verticalConstraint: (constraint: ConstraintType) => InstanceNodeBuilder;
  build: () => InstanceNodeData;
};

/** Create an instance node builder */
function createInstanceNodeBuilder(localID: number, parentID: number, symbolID: number | SymbolID): InstanceNodeBuilder {
  const state = {
    name: "Instance",
    symbolID: normalizeSymbolID(symbolID),
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
    fillColor: undefined as Color | undefined,
    componentPropertyRefs: [] as string[],
    overriddenSymbolID: undefined as SymbolID | undefined,
    stackPositioning: undefined as StackPositioning | undefined,
    stackPrimarySizing: undefined as StackSizing | undefined,
    stackCounterSizing: undefined as StackSizing | undefined,
    horizontalConstraint: undefined as ConstraintType | undefined,
    verticalConstraint: undefined as ConstraintType | undefined,
  };

  const builder: InstanceNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },
    /** Override the background color of this instance */
    overrideBackground(c: Color) { state.fillColor = c; return builder; },
    /** Override the symbol reference (for variant switching) */
    overrideSymbol(sid: number | SymbolID) { state.overriddenSymbolID = normalizeSymbolID(sid); return builder; },
    /** Add a component property reference */
    addPropertyReference(ref: string) { state.componentPropertyRefs.push(ref); return builder; },
    positioning(mode: StackPositioning) { state.stackPositioning = mode; return builder; },
    primarySizing(sizing: StackSizing) { state.stackPrimarySizing = sizing; return builder; },
    counterSizing(sizing: StackSizing) { state.stackCounterSizing = sizing; return builder; },
    horizontalConstraint(constraint: ConstraintType) { state.horizontalConstraint = constraint; return builder; },
    verticalConstraint(constraint: ConstraintType) { state.verticalConstraint = constraint; return builder; },

    build(): InstanceNodeData {
      return {
        localID,
        parentID,
        name: state.name,
        symbolID: state.symbolID,
        size: { x: state.width, y: state.height },
        transform: createTranslationMatrix(state.x, state.y),
        visible: state.visible,
        opacity: state.opacity,
        fillPaints: buildFillPaintsOverride(state.fillColor),
        overriddenSymbolID: state.overriddenSymbolID,
        componentPropertyReferences: optionalArray(state.componentPropertyRefs),
        stackPositioning: toEnumValue(state.stackPositioning, STACK_POSITIONING_VALUES),
        stackPrimarySizing: toEnumValue(state.stackPrimarySizing, STACK_SIZING_VALUES),
        stackCounterSizing: toEnumValue(state.stackCounterSizing, STACK_SIZING_VALUES),
        horizontalConstraint: toEnumValue(state.horizontalConstraint, CONSTRAINT_TYPE_VALUES),
        verticalConstraint: toEnumValue(state.verticalConstraint, CONSTRAINT_TYPE_VALUES),
      };
    },
  };

  return builder;
}

/**
 * Create a new Instance (component instance) builder
 * @param localID Local ID for this node
 * @param parentID Parent node ID
 * @param symbolID ID of the symbol to instantiate (number uses sessionID=1, or provide full GUID)
 */
export function instanceNode(
  localID: number,
  parentID: number,
  symbolID: number | { sessionID: number; localID: number }
): InstanceNodeBuilder {
  return createInstanceNodeBuilder(localID, parentID, symbolID);
}
