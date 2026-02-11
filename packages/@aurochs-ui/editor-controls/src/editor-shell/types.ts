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

/**
 * Panel definition for EditorShell.
 */
export type EditorPanel = {
  /** パネル識別子 */
  readonly id: string;
  /** パネルコンテンツ */
  readonly content: ReactNode;
  /** パネル位置 */
  readonly position: "left" | "right";
  /** デスクトップモードでの幅 (default: left="200px", right="280px") */
  readonly size?: string;
  /** リサイズ可能か (default: true) */
  readonly resizable?: boolean;
  readonly minSize?: number;
  readonly maxSize?: number;
  /** スクロール可能か */
  readonly scrollable?: boolean;
  /** ドロワーモードでのラベル (省略時はデフォルト) */
  readonly drawerLabel?: string;
  /** パネル内側のスタイル */
  readonly style?: CSSProperties;
};

export type EditorShellProps = {
  /** ツールバー (上部固定) */
  readonly toolbar?: ReactNode;
  /** パネル定義の配列 */
  readonly panels?: EditorPanel[];
  /** 中央コンテンツ (必須) */
  readonly children: ReactNode;
  /** 下部バー (シートタブ等) */
  readonly bottomBar?: ReactNode;
  /** レスポンシブ breakpoints のオーバーライド */
  readonly breakpoints?: EditorLayoutBreakpoints;
  readonly style?: CSSProperties;
  readonly className?: string;
};
