/** @file INSTANCE self-override controls. */

import {
  parseId,
  type FigDesignDocument,
  type FigDesignNode,
  type FigNodeId,
  type SymbolOverride,
} from "@aurochs/fig/domain";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { createPropertyPrimaryUpdateAction, type PropertyMutationTarget } from "../property-mutation-target";

type InstanceOverridesSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly document: FigDesignDocument;
  readonly dispatch: (action: FigEditorAction) => void;
};

/** Edit self-overrides that the renderer already resolves through SymbolOverride SoT. */
export function InstanceOverridesSection({ node, target, document, dispatch }: InstanceOverridesSectionProps) {
  if (node.type !== "INSTANCE" || !node.symbolId) {
    return null;
  }

  const override = findSelfOverride(node);
  const opacity = Math.round((override?.opacity ?? node.opacity) * 100);
  const childTargets = collectOverrideTargets(node, document);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldRow>
        <FieldGroup label="Opacity override" inline labelWidth={104}>
          <Input
            type="text"
            ariaLabel="Instance override opacity"
            value={opacity}
            suffix="%"
            width={80}
            onChange={(value) => {
              const parsed = parsePercentInput(value);
              if (parsed === undefined) {
                return;
              }
              dispatch(createPropertyPrimaryUpdateAction({
                target,
                updater: (current) => updateSelfOverrideOpacity(current, parsed / 100),
              }));
            }}
          />
        </FieldGroup>
      </FieldRow>
      {childTargets.map((childTarget) => {
        const childOverride = findOverrideByPath(node.overrides ?? [], childTarget.path);
        const childOpacity = Math.round((childOverride?.opacity ?? childTarget.node.opacity) * 100);
        return (
          <FieldRow key={childTarget.path.join("/")}>
            <FieldGroup label={childTarget.label} inline labelWidth={160}>
              <Input
                type="text"
                ariaLabel={`Override ${childTarget.node.name} opacity`}
                value={childOpacity}
                suffix="%"
                width={80}
                onChange={(value) => {
                  const parsed = parsePercentInput(value);
                  if (parsed === undefined) {
                    return;
                  }
                  dispatch(createPropertyPrimaryUpdateAction({
                    target,
                    updater: (current) => updatePathOverrideOpacity(current, childTarget.path, parsed / 100),
                  }));
                }}
              />
            </FieldGroup>
          </FieldRow>
        );
      })}
    </div>
  );
}

type OverrideTarget = {
  readonly path: readonly FigNodeId[];
  readonly node: FigDesignNode;
  readonly label: string;
};

function collectOverrideTargets(node: FigDesignNode, document: FigDesignDocument): readonly OverrideTarget[] {
  if (!node.symbolId) {
    return [];
  }
  const symbol = document.components.get(node.symbolId);
  if (!symbol?.children || symbol.children.length === 0) {
    return [];
  }
  return collectTargetsFromChildren({ children: symbol.children, document, prefix: [], labelPrefix: "" });
}

function collectTargetsFromChildren({
  children,
  document,
  prefix,
  labelPrefix,
}: {
  readonly children: readonly FigDesignNode[];
  readonly document: FigDesignDocument;
  readonly prefix: readonly FigNodeId[];
  readonly labelPrefix: string;
}): readonly OverrideTarget[] {
  return children.flatMap((child) => {
    const path = [...prefix, child.id];
    const label = labelPrefix ? `${labelPrefix} / ${child.name}` : child.name;
    const nestedSymbol = child.type === "INSTANCE" && child.symbolId ? document.components.get(child.symbolId) : undefined;
    const nestedTargets = nestedSymbol?.children
      ? collectTargetsFromChildren({ children: nestedSymbol.children, document, prefix: path, labelPrefix: label })
      : [];
    return [{ path, node: child, label }, ...nestedTargets];
  });
}

function parsePercentInput(value: string | number): number | undefined {
  const raw = String(value).trim();
  if (raw.length === 0) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function findSelfOverride(node: FigDesignNode): SymbolOverride | undefined {
  return node.overrides?.find((override) => {
    const first = override.guidPath.guids[0];
    if (!first) {
      return false;
    }
    const key = `${first.sessionID}:${first.localID}`;
    return key === node.symbolId;
  });
}

function updateSelfOverrideOpacity(node: FigDesignNode, opacity: number): FigDesignNode {
  if (node.type !== "INSTANCE" || !node.symbolId) {
    return node;
  }

  const symbolId = node.symbolId;
  const normalized = Math.max(0, Math.min(1, opacity));
  const overrides = node.overrides ?? [];
  const next = overrides.map((override) => {
    if (!targetsSymbolFrame(override, symbolId)) {
      return override;
    }
    return { ...override, opacity: normalized };
  });
  const hasSelfOverride = overrides.some((override) => targetsSymbolFrame(override, symbolId));

  return {
    ...node,
    overrides: hasSelfOverride ? next : [...next, createSelfOverride(symbolId, normalized)],
  };
}

function updatePathOverrideOpacity(
  node: FigDesignNode,
  path: readonly FigNodeId[],
  opacity: number,
): FigDesignNode {
  if (node.type !== "INSTANCE" || !node.symbolId) {
    return node;
  }
  const normalized = Math.max(0, Math.min(1, opacity));
  const overrides = node.overrides ?? [];
  const next = overrides.map((override) => {
    if (!sameGuidPath(override, path)) {
      return override;
    }
    return { ...override, opacity: normalized };
  });
  const hasOverride = overrides.some((override) => sameGuidPath(override, path));
  return {
    ...node,
    overrides: hasOverride ? next : [...next, createPathOverride(path, normalized)],
  };
}

function targetsSymbolFrame(override: SymbolOverride, symbolId: FigNodeId): boolean {
  const first = override.guidPath.guids[0];
  if (!first) {
    return false;
  }
  const key = `${first.sessionID}:${first.localID}`;
  return key === symbolId;
}

function createSelfOverride(symbolId: FigNodeId, opacity: number): SymbolOverride {
  const parsed = parseId(symbolId);
  return {
    guidPath: { guids: [{ sessionID: parsed.sessionID, localID: parsed.localID }] },
    opacity,
  };
}

function createPathOverride(path: readonly FigNodeId[], opacity: number): SymbolOverride {
  if (path.length === 0) {
    throw new Error("Override path requires at least one target id.");
  }
  return {
    guidPath: {
      guids: path.map((id) => {
        const parsed = parseId(id);
        return { sessionID: parsed.sessionID, localID: parsed.localID };
      }),
    },
    opacity,
  };
}

function findOverrideByPath(overrides: readonly SymbolOverride[], path: readonly FigNodeId[]): SymbolOverride | undefined {
  return overrides.find((override) => sameGuidPath(override, path));
}

function sameGuidPath(override: SymbolOverride, path: readonly FigNodeId[]): boolean {
  const guids = override.guidPath.guids;
  if (guids.length !== path.length) {
    return false;
  }
  return guids.every((guid, index) => {
    const id = path[index];
    if (!id) {
      return false;
    }
    return `${guid.sessionID}:${guid.localID}` === id;
  });
}
