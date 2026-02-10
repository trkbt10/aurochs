/**
 * @file Editor shell type definitions
 *
 * Shared types for responsive editor layout and shell configuration.
 */

import type { CSSProperties, ReactNode } from "react";

export type EditorLayoutMode = "desktop" | "tablet" | "mobile";

export type EditorLayoutBreakpoints = {
  /** Width at or below this is treated as mobile (px). */
  readonly mobileMaxWidth: number;
  /** Width at or below this (and above mobileMaxWidth) is treated as tablet (px). */
  readonly tabletMaxWidth: number;
};

export type EditorShellPanel = {
  readonly content: ReactNode;
  /** Grid mode での幅 (default: left="200px", right="280px") */
  readonly size?: string;
  /** リサイズ可能か (default: true) */
  readonly resizable?: boolean;
  readonly minSize?: number;
  readonly maxSize?: number;
  /** タブレット/モバイルでの drawer トグルボタンのラベル */
  readonly drawerLabel?: string;
  /** スクロール可能か */
  readonly scrollable?: boolean;
  /** パネル内側のスタイル */
  readonly style?: CSSProperties;
};

export type EditorShellProps = {
  /** ツールバー (上部固定) */
  readonly toolbar?: ReactNode;
  /** 左パネル (サムネイル等) */
  readonly leftPanel?: EditorShellPanel;
  /** 中央コンテンツ (必須) */
  readonly children: ReactNode;
  /** 右パネル (インスペクタ/フォーマット等) */
  readonly rightPanel?: EditorShellPanel;
  /** 下部バー (シートタブ等) */
  readonly bottomBar?: ReactNode;
  /** レスポンシブ breakpoints のオーバーライド */
  readonly breakpoints?: EditorLayoutBreakpoints;
  readonly style?: CSSProperties;
  readonly className?: string;
};
