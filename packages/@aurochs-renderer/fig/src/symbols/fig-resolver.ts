/**
 * @file FigResolver — INSTANCE → SYMBOL 解決のドメインオブジェクト
 *
 * 責務:
 *  1. SYMBOL 依存関係グラフを構築し、ボトムアップで pre-resolve した
 *     キャッシュを保持
 *  2. style registry の保持
 *  3. 解決ロジック本体は @aurochs/fig/symbols の `resolveInstanceNode`
 *     (SSoT) に完全委譲する。このラッパは「symbolMap と
 *     resolvedCache と styleRegistry を毎回渡すのを省略する」ためだけに
 *     存在する。
 *
 * SSoT方針:
 *  pre-resolution / dependency graph / clone-and-expand は全て
 *  `@aurochs/fig/symbols/symbol-pre-resolver.preResolveSymbols` に
 *  集約済み。ここでローカル実装してはいけない。
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigGuid, FigBlob } from "@aurochs/fig/parser";
import {
  resolveInstanceNode,
  resolveInstanceReferences,
  resolveSymbolGuidStr,
  buildFigStyleRegistry,
  preResolveSymbols,
  type ResolvedInstanceNode,
  type InstanceResolution,
} from "@aurochs/fig/symbols";

// =============================================================================
// Public types
// =============================================================================

export type { ResolvedInstanceNode, InstanceResolution } from "@aurochs/fig/symbols";

/**
 * INSTANCE → SYMBOL 解決のドメインオブジェクト。
 */
export type FigResolver = {
  /** INSTANCE ノードを解決済みの node + children に変換する */
  readonly resolveInstance: (node: FigNode) => ResolvedInstanceNode;
  /** GUID から SYMBOL ノードを検索（localID フォールバック付き） */
  readonly resolveSymbol: (guid: FigGuid) => { node: FigNode; guidStr: string } | undefined;
  /** INSTANCE の参照先 SYMBOL を解決（effective + all deps） */
  readonly resolveReferences: (node: FigNode) => InstanceResolution;
  /** 生成時の警告（循環依存等） */
  readonly warnings: readonly string[];
};

// =============================================================================
// Factory
// =============================================================================

/**
 * INSTANCE → SYMBOL 解決のドメインオブジェクトを生成する。
 *
 * 生成時に SYMBOL 依存関係をトポロジカルソートし、ネストされた INSTANCE を
 * ボトムアップで事前展開する（override は未適用 — instance-specific なので
 * resolve 時に適用される）。
 *
 * 利用側は `resolver.resolveInstance(node)` のみ呼ぶ。
 */
export function createFigResolver(
  symbolMap: ReadonlyMap<string, FigNode>,
  /**
   * Optional blob array forwarded into the symbol resolver so
   * GUID translation can decode fillGeometry blobs for size
   * disambiguation. Callers that have `blobs` available (renderer,
   * tree-to-document) should pass them.
   */
  blobs?: readonly FigBlob[],
): FigResolver {
  const warnings: string[] = [];
  const styleRegistry = buildFigStyleRegistry(symbolMap);
  const resolvedSymbolCache = preResolveSymbols(symbolMap, { warnings });

  function resolveInstance(node: FigNode): ResolvedInstanceNode {
    return resolveInstanceNode(node, { symbolMap, resolvedSymbolCache, styleRegistry, blobs });
  }

  function resolveSymbol(guid: FigGuid): { node: FigNode; guidStr: string } | undefined {
    return resolveSymbolGuidStr(guid, symbolMap);
  }

  function resolveReferences(node: FigNode): InstanceResolution {
    return resolveInstanceReferences(node, symbolMap);
  }

  return {
    resolveInstance,
    resolveSymbol,
    resolveReferences,
    warnings,
  };
}
