# XLSX AutoFilter 完全実装計画

## 背景と今回のセッションで得た知見

### SoT（Single Source of Truth）の原則

今回のセッションで最も重要だった教訓：

1. **色解決のSoTは `@aurochs-office/xlsx/domain/style/color-resolver.ts`** — エディタとSVGレンダラーで別実装だったものを統合した。新規コードは必ずここを使うこと。
2. **テーマカラーのフォールバックは ECMA-376 Annex D のデフォルトOfficeテーマ** — `colorScheme` が undefined でも `DEFAULT_THEME_COLOR_SCHEME` で解決される。`undefined` で逃げない。
3. **SVG属性の組み立ては `@aurochs/xml` の `el()` / `selfClosingEl()`** — テンプレートリテラルでの属性値埋め込みは禁止。引用符衝突バグの原因になる。
4. **`ResolvedFont.families: readonly string[]`** — フォントファミリはフォールバックチェーンとして配列で表現。`name: string` ではない。
5. **`FontSpec.supplementalFonts`** — テーマの script 別フォント（`<a:font script="Jpan">`）が格納される。`eastAsian` が空の場合のフォールバック。
6. **パーサーとドメインの乖離検出** — ドメイン型にフィールドがあるのにパーサーが埋めていないパターンが複数あった。新規実装時は型定義→パーサー→レンダラーの順で確実に繋げること。

### コーディング原則（CLAUDE.md より）

- シンプル・簡単は禁止。正しく書くことを最優先。
- 書くコードの全行に根拠を持つ。根拠のない実装をしない。
- 固定値を見たら「なぜその値か」を追跡する。
- TDDで進める。テストが先、実装が後。

---

## ECMA-376 仕様根拠

### AutoFilter (§18.3.1.2)

`<autoFilter ref="A1:H58">` はワークシート内のデータ範囲にフィルタリング機能を設定する。

- `ref` 属性: フィルター対象のセル範囲（ヘッダー行を含む）
- 子要素 `<filterColumn>`: 列ごとのフィルター条件
- 子要素 `<sortState>`: ソート状態

### filterColumn (§18.3.2.7)

```xml
<filterColumn colId="2">
  <filters blank="1">
    <filter val="進行中"/>
  </filters>
</filterColumn>
```

- `colId`: 0-based の列インデックス（autoFilter の ref 内での相対位置）
- `hiddenButton`: ドロップダウンボタンを非表示にするか
- `showButton`: ドロップダウンボタンを表示するか（デフォルト true）
- 子要素: `<filters>`, `<customFilters>`, `<top10>`, `<dynamicFilter>`, `<colorFilter>`, `<iconFilter>` のいずれか

### filters (§18.3.2.6)

値リストによるフィルタリング。`blank="1"` で空セルも含める。

### customFilters (§18.3.2.2)

演算子ベースのフィルタリング。`and="1"` で AND 条件、省略時は OR。

```xml
<customFilters>
  <customFilter operator="greaterThan" val="100"/>
</customFilters>
```

演算子: `equal`, `lessThan`, `lessThanOrEqual`, `notEqual`, `greaterThanOrEqual`, `greaterThan`

### sortState (§18.3.1.92)

```xml
<sortState ref="A2:H58">
  <sortCondition ref="A2:A58" descending="1"/>
</sortState>
```

- `ref`: ソート対象範囲（ヘッダー行を除く）
- `caseSensitive`: 大文字小文字を区別するか
- `sortCondition`: 各ソートキーの設定
  - `ref`: ソートキーの列範囲
  - `descending`: 降順ソートか（デフォルト false = 昇順）

### sheetPr filterMode (§18.3.1.84)

`<sheetPr filterMode="1"/>` — フィルターが適用されている（hidden rows が存在する）ことを示す。

### Row hidden 属性 (§18.3.1.73)

`<row r="3" hidden="1">` — フィルタリングにより非表示になった行。
autoFilter を適用すると、条件に合わない行の `hidden` 属性が `true` に設定される。

---

## 現在の実装状態

### 実装済み

| コンポーネント | ファイル | 状態 |
|---|---|---|
| ドメイン型 | `@aurochs-office/xlsx/domain/auto-filter.ts` | 完全定義 |
| XMLパーサー | `xlsx/parser/worksheet.ts` | autoFilter, filterColumn, sortState パース済み |
| Mutation | `xlsx-editor/sheet/auto-filter-mutation.ts` | set/clear のみ |
| Reducer | `xlsx-editor/context/.../auto-filter-handlers.ts` | SET_AUTO_FILTER のみ |
| 設定パネル | `xlsx-editor/components/sheet-panel/.../AutoFilterSection.tsx` | 範囲表示、適用/解除ボタン |
| Hidden rows | `xlsx-editor/selectors/sheet-layout.ts` | `row.hidden` で高さ0に |

### 未実装

| 機能 | 必要なファイル | 説明 |
|---|---|---|
| フィルターボタンUI | `header-layer.tsx` に追加 | 列ヘッダーにドロップダウンボタンを表示 |
| フィルタードロップダウンメニュー | 新規コンポーネント | フィルター条件の選択UI |
| ソート実行ロジック | 新規（domain/mutation） | 行の並べ替え |
| フィルター評価ロジック | 新規（domain層） | フィルター条件に基づく行の表示/非表示判定 |
| フィルター適用 mutation | `auto-filter-mutation.ts` 拡張 | filterColumn の設定 + row hidden の更新 |
| ソートUI | ドロップダウンメニュー内 | 昇順/降順ソートボタン |
| フィルター状態の視覚表示 | `header-layer.tsx` | アクティブフィルターのアイコン変更 |

---

## 実装計画

### Phase 1: フィルター評価エンジン（ドメイン層）

**ファイル**: `@aurochs-office/xlsx/src/domain/auto-filter-evaluator.ts`（新規）

フィルター条件をセル値に対して評価する純粋関数群。UIに依存しない。

```typescript
/**
 * Evaluate whether a cell value matches a filter condition.
 *
 * @see ECMA-376 Part 4, Section 18.3.2 (AutoFilter)
 */
export function evaluateFilter(
  filter: XlsxFilterType,
  cellValue: CellValue,
): boolean;

/**
 * Evaluate which rows should be visible given the current autoFilter configuration.
 * Returns a Set of 1-based row numbers that should be hidden.
 *
 * @param autoFilter - The autoFilter configuration
 * @param sheet - The worksheet (for cell data access)
 * @returns Set of row numbers (1-based) to hide
 */
export function evaluateAutoFilter(
  autoFilter: XlsxAutoFilter,
  sheet: XlsxWorksheet,
): ReadonlySet<number>;
```

#### テストケース（TDD: テストを先に書く）

```
- filters: 値リスト一致
  - 単一値マッチ
  - 複数値マッチ（OR）
  - blank=true で空セルマッチ
  - 値なしセルの扱い
- customFilters: 演算子ベース
  - equal / notEqual
  - lessThan / lessThanOrEqual
  - greaterThan / greaterThanOrEqual
  - AND / OR 条件
  - 数値比較 vs 文字列比較
- top10: 上位/下位N件
  - top=true (上位)
  - top=false (下位)
  - percent=true (パーセント)
- dynamicFilter: 動的条件
  - aboveAverage / belowAverage
  - today / thisWeek / thisMonth / thisYear
- 複数列の組み合わせ（全列 AND）
- autoFilter ref 範囲外の行は対象外
- ヘッダー行（ref の最初の行）は常に表示
```

### Phase 2: ソート実行ロジック（ドメイン層）

**ファイル**: `@aurochs-office/xlsx/src/domain/mutation/sort.ts`（新規）

```typescript
/**
 * Sort worksheet rows by the given sort conditions.
 *
 * Reorders rows within the autoFilter data range (excluding header row).
 * Does NOT modify cell references in formulas (this is a display-level sort).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.92 (sortState)
 */
export function sortWorksheetRows(
  worksheet: XlsxWorksheet,
  sortState: XlsxSortState,
  autoFilterRef: CellRange,
): XlsxWorksheet;
```

#### ソートの仕様（ECMA-376 §18.3.1.92 準拠）

1. ソート対象は autoFilter ref のデータ範囲（ヘッダー行を除く）
2. 複数の sortCondition がある場合、先頭の条件が第一ソートキー
3. 空セルは常に末尾に配置
4. 数値 < テキスト < エラー の順（Excel準拠）
5. テキストのソートは `caseSensitive` を考慮

#### テストケース

```
- 単一列の昇順ソート
- 単一列の降順ソート
- 複数列ソート（第1キー同値時に第2キーで判定）
- 空セルの末尾配置
- 数値とテキストの混在ソート
- ソート後の row hidden 状態の保持
- ソート対象外の行（autoFilter 範囲外）は不変
```

### Phase 3: フィルター適用 Mutation

**ファイル**: `xlsx-editor/sheet/auto-filter-mutation.ts` を拡張

```typescript
/**
 * Apply a filter condition to a specific column.
 * Updates filterColumn and recalculates row visibility.
 */
export function setFilterColumn(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  colId: number,
  filter: XlsxFilterType | undefined,
): XlsxWorkbook;

/**
 * Apply sort to the autoFilter range.
 * Reorders rows and updates sortState.
 */
export function applySort(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  sortCondition: XlsxSortCondition,
): XlsxWorkbook;

/**
 * Clear all filters (but keep autoFilter range).
 * Shows all hidden rows.
 */
export function clearAllFilters(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook;
```

**Reducer アクション追加**:

```typescript
| { type: "SET_FILTER_COLUMN"; sheetIndex: number; colId: number; filter: XlsxFilterType | undefined }
| { type: "APPLY_SORT"; sheetIndex: number; sortCondition: XlsxSortCondition }
| { type: "CLEAR_ALL_FILTERS"; sheetIndex: number }
```

### Phase 4: フィルターボタン UI

**ファイル**: `xlsx-editor/components/sheet-grid/header-layer.tsx` を拡張

#### 表示条件

autoFilter が有効な場合、autoFilter.ref の範囲内の列ヘッダーにドロップダウンボタンを表示。

```
autoFilter.ref = A1:H58 の場合:
  列 A〜H のヘッダーにボタン表示
  列 I 以降にはボタンなし
```

#### ボタンの状態

| 状態 | アイコン | 条件 |
|---|---|---|
| フィルターなし | ▼（ドロップダウン矢印） | filterColumn が未設定 or filter が undefined |
| フィルター適用中 | ▼+フィルターアイコン | filterColumn.filter が設定されている |
| ソート昇順 | ▲ | sortState の sortCondition がこの列を参照し descending=false |
| ソート降順 | ▼ | sortState の sortCondition がこの列を参照し descending=true |
| ボタン非表示 | なし | filterColumn.hiddenButton=true |

#### レンダリング位置

既存の列ヘッダー構造を利用:

```tsx
// header-layer.tsx の列ヘッダーループ内
<div key={col0} style={{ ...columnHeaderStyle, ... }}>
  <span>{label}</span>
  {/* AutoFilter ドロップダウンボタン — 新規追加 */}
  {isAutoFilterColumn && !isHiddenButton && (
    <AutoFilterButton
      colId={relativeColId}
      hasActiveFilter={hasActiveFilter}
      sortDirection={sortDirection}
      onClick={() => onAutoFilterButtonClick(col1)}
    />
  )}
  {/* 既存のリサイズハンドル */}
  <div style={{ ...resizeHandleStyle }} onPointerDown={...} />
</div>
```

#### AutoFilterButton コンポーネント

**ファイル**: `xlsx-editor/components/sheet-grid/auto-filter-button.tsx`（新規）

```tsx
type AutoFilterButtonProps = {
  readonly hasActiveFilter: boolean;
  readonly sortDirection: "ascending" | "descending" | undefined;
  readonly onClick: () => void;
};
```

- 16x16px のボタン
- 列ヘッダーの右端に配置（リサイズハンドルの左）
- hover で背景色変化
- クリックでドロップダウンメニュー表示

### Phase 5: フィルタードロップダウンメニュー

**ファイル**: `xlsx-editor/components/sheet-grid/auto-filter-dropdown.tsx`（新規）

#### メニュー構造（Excel準拠）

```
┌──────────────────────┐
│ 昇順でソート (A→Z)    │
│ 降順でソート (Z→A)    │
├──────────────────────┤
│ □ (すべて選択)        │
│ ☑ 進行中              │
│ ☑ 進行中\n随時        │
│ ☑ 完了                │
│ □ (空白セル)          │
├──────────────────────┤
│ [OK]  [キャンセル]     │
└──────────────────────┘
```

#### 表示位置

- ボタンの直下に表示
- 列ヘッダーの幅に合わせる（最小幅 200px）
- 画面端でははみ出さないように位置調整
- frozen pane を考慮（zIndex 管理）

#### 状態管理

```typescript
// sheet-grid-layers.tsx または cell-viewport.tsx に状態を追加
const [autoFilterDropdown, setAutoFilterDropdown] = useState<{
  readonly colIndex: number;  // 1-based column index
  readonly anchorRect: DOMRect; // ボタンの位置（ドロップダウンの配置基準）
} | null>(null);
```

#### 値リストの構築

autoFilter 列のデータ範囲からユニークな値を収集:

```typescript
function collectUniqueValues(
  sheet: XlsxWorksheet,
  autoFilter: XlsxAutoFilter,
  colIndex: number,
): readonly string[];
```

- autoFilter.ref のデータ範囲（ヘッダー行を除く）を走査
- 列のセル値を文字列化してユニーク化
- 自然順ソート（数値は数値順、テキストは辞書順）
- 空セルがあれば `(空白セル)` を末尾に追加

#### チェックボックスの初期状態

- filterColumn が未設定 → 全チェック
- filterColumn.filter.type === "filters" → filter.values に含まれる値のみチェック
- filter.blank === true → 空白セルもチェック

### Phase 6: 統合とテスト

#### コンポーネントテスト

```
- AutoFilterButton: 各状態のレンダリング
- AutoFilterDropdown: 値リスト表示、チェック操作、ソート操作
- header-layer: autoFilter 有効時のボタン表示
- cell-viewport: ドロップダウン表示/非表示
- frozen pane 内のヘッダー行でのフィルターボタン動作
```

#### Integration テスト

```
- ファイルロード → autoFilter 表示 → フィルター操作 → 行の表示/非表示
- ソート操作 → 行の並べ替え
- フィルター解除 → 全行表示
- Undo/Redo でのフィルター状態復元
```

---

## アーキテクチャ注意事項

### レイヤー分離

```
ドメイン層（@aurochs-office/xlsx）
  ├── domain/auto-filter.ts          — 型定義（実装済み）
  ├── domain/auto-filter-evaluator.ts — フィルター評価（新規）
  ├── domain/mutation/sort.ts         — ソート実行（新規）
  └── parser/worksheet.ts            — XML パース（実装済み）

エディタ層（@aurochs-ui/xlsx-editor）
  ├── sheet/auto-filter-mutation.ts   — Mutation（拡張）
  ├── context/.../auto-filter-handlers.ts — Reducer（拡張）
  ├── selectors/auto-filter-values.ts — 値リスト収集（新規）
  ├── components/sheet-grid/
  │   ├── auto-filter-button.tsx      — ボタンUI（新規）
  │   ├── auto-filter-dropdown.tsx    — ドロップダウンUI（新規）
  │   ├── header-layer.tsx            — ボタン配置（拡張）
  │   └── cell-viewport.tsx           — ドロップダウン配置（拡張）
  └── components/sheet-panel/
      └── AutoFilterSection.tsx       — 設定パネル（拡張）
```

### 色・フォント解決

フィルターUIコンポーネントでセル値を表示する場合、色解決は必ず:
- `@aurochs-office/xlsx/domain/style/color-resolver.ts` の `resolveXlsxColor()` を使う
- `colorScheme` は `workbook.theme?.colorScheme` から取得
- colorScheme が undefined でも `DEFAULT_THEME_COLOR_SCHEME` にフォールバックされる

### SVG要素の構築

フィルターアイコンやドロップダウン内のSVGアイコンを作る場合:
- `@aurochs/xml` の `el()` / `selfClosingEl()` を使う
- テンプレートリテラルで属性値を埋め込まない

### Hidden Rows の管理

フィルター適用時の行表示/非表示:
- `sheet-layout.ts` の `buildRowSegments()` が `row.hidden` を見て高さ0に設定
- フィルター mutation で `row.hidden` を更新すれば、レイアウト計算は自動的に反映される
- **重要**: フィルター解除時は hidden を false に戻す。ただしユーザーが手動で隠した行との区別が必要
  - ECMA-376 では `filterMode="1"` がフィルターによる非表示を示す
  - 手動非表示と区別するために、`sheetPr.filterMode` の管理も必要

### Undo/Redo

- 既存の `pushHistory()` パターンに従う
- フィルター適用は「filterColumn 設定 + row hidden 更新」を一つの mutation として扱う
- ソートは行の並べ替えを一つの mutation として扱う

### イベントハンドリング

- ドロップダウンメニューはクリック外で閉じる（`useEffect` + document click listener）
- Escape キーで閉じる
- 既存の selection/editing との競合を避ける（ドロップダウン open 中は cell selection を無効化しない）

### パフォーマンス考慮

- 値リストの構築は `useMemo` でメモ化
- フィルター評価は行数 × 列数のオーダー — 100万行でも高速に動く必要がある
- ソートは JavaScript の `Array.prototype.sort` で十分（stable sort が保証される）

---

## 実装順序の推奨

1. **Phase 1** — フィルター評価エンジン（TDD: テスト→実装）
2. **Phase 2** — ソート実行ロジック（TDD: テスト→実装）
3. **Phase 3** — Mutation + Reducer 拡張
4. **Phase 4** — フィルターボタン UI（header-layer 拡張）
5. **Phase 5** — ドロップダウンメニュー
6. **Phase 6** — 統合テスト + エッジケース

Phase 1-2 はドメイン層のみで UI に依存しないため、テストしやすい。
Phase 3 は Phase 1-2 の関数を mutation 内で呼び出す。
Phase 4-5 は UI 層で、Phase 3 の mutation を dispatch する。
