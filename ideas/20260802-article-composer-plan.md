# 記事コンポーザー(記事作成ページ)設計プラン (2026-08-02)

要望: 記事作成ページを作り、プリフロップ/フロップ/ターン/リバーの各ストリートごとにテーブル可視化図(PokerTable)を挿入できるようにする。挿入メニューにはポジションごとのレンジ表(HandRangeChart)も含める。

## 1. 全体方針

### 1.1 成果物は「MDXファイル」— バックエンドは作らない

このサイトは静的ビルド(Astro + git)なので、ブラウザ上のコンポーザーが直接記事を保存・公開することはできない。コンポーザーの最終出力は**完成したMDXテキスト**とし、以下の2通りで受け渡す:

- **「MDXをコピー」**: クリップボードへ(既存ハンド図エディタと同じUX)
- **「.mdxをダウンロード」**: `{slug}.mdx`ファイルとして保存 → `src/content/articles/`に置いてcommitするだけ

frontmatter(title/description/emoji/category/tags/publishedAt)もフォームから生成してMDXに含めるため、**手書きゼロで記事1本分のファイルが完成**する。編集途中のデータはlocalStorageに自動保存(Zennの「保存済み」相当)し、リロードしても消えない。

### 1.2 ブロックベース構造 + ストリートテンプレート

記事を「ブロックの並び」としてモデル化する。ただし自由配置ではなく、**ハンドレビュー記事のテンプレート構造(既存3記事で実証済み)をセクションとして固定**し、各セクションの中にブロックを追加していく:

```
┌ frontmatterフォーム (タイトル/説明/絵文字/カテゴリ/タグ/slug)
├ セクション: 状況設定      ← フォーマット/スタック/ポジション/相手イメージの定型フォーム
├ セクション: プリフロップ   ← テキスト + [挿入▼]
├ セクション: フロップ      ← テキスト + [挿入▼]
├ セクション: ターン        ← テキスト + [挿入▼]
├ セクション: リバー        ← テキスト + [挿入▼]
├ セクション: 結果と振り返り ← テキスト(箇条書き)
└ セクション: 学び          ← 1行テキスト
```

- 各ストリートセクションはON/OFF可能(プリフロップで終わったハンドならフロップ以降を無効化)
- 「戦略解説」カテゴリ選択時はストリート構造なしの汎用モード(セクション見出し自由+同じ挿入メニュー)

### 1.3 核となる設計: ハンドタイムライン(ストリート間の状態引き継ぎ)

**ストリートごとに図を1から入力し直すのは苦痛**なので、1つのハンド状態を時系列で持ち、各ストリートの図は前のストリートから自動導出する:

```
HandTimeline {
  seats: { position, 初期stack }[]         // 全ストリート共通
  hero: Position
  streets: {
    preflop: { bets: {pos: 額}, folded: Position[] }
    flop:    { board: [c1,c2,c3], bets, folded, active }
    turn:    { board: [c4], ... }
    river:   { board: [c5], ... }
  }
}
```

導出ルール(ストリート遷移時):
- **ポット** = 前ストリートのポット + 前ストリートの全ベット合計(自動。手動上書き可)
- **スタック** = 初期スタック − そのポジションの累計ベット
- **フォールド**したプレイヤーは以降のストリートでも折りたたみ状態を維持(図から消すか薄く表示かは既存PokerTableのfolded表示を使用)
- **ボード**は累積(フロップ3枚 → ターンで+1 → リバーで+1)。ターンのセクションでは4枚目だけ入力すればよい

つまり**プリフロップの図を作れば、フロップの図は「ボード3枚とベット額を足すだけ」で完成**する。これが「ストリートごとに図を挿入したい」という要望に対する最適解で、Zennにも既存ハンド図エディタにもない、この記事ドメイン専用の入力短縮になる。

## 2. 挿入メニュー(Zennの「+」モーダル相当)

各セクションの[挿入▼]ボタンで開くモーダル。選択肢:

| 選択肢 | 生成されるMDX | 入力UI |
|---|---|---|
| **テーブル図** | `<PokerTable ... />` | ハンドタイムラインから該当ストリートの状態を初期値としてプリフィル。微調整のみ(§1.3) |
| **レンジ表(ポジション別プリセット)** | `<HandRangeChart ... />` | §2.1のプリセットから選択 → レンジ文字列は編集可能 → 169グリッドでライブプレビュー |
| **アクションライン** | `<ActionLine ... />` | ポジション+アクション+額の行を追加していく簡易フォーム。ここで入力したベット/フォールドは**ハンドタイムラインにも反映**(図と履歴の二重入力を排除) |
| **エクイティ計算機** | `<EquityCalculator ... />` | ハンド/レンジ+ボード(タイムラインから自動)+iterations |
| **メッセージ** | `<Message type>` | info/alert選択+本文 |
| **アコーディオン** | `<Accordion title>` | タイトル+本文 |

### 2.1 ポジション別レンジプリセット: `src/lib/poker/presets.ts`

既存記事で検証済みのレンジ文字列を名前付き定数として一元管理する(現状は記事にコピペで散在):

```ts
export interface RangePreset {
  id: string;            // 'btn-open'
  label: string;         // 'BTN オープンレンジ (約29%)'
  color: string;         // 'var(--color-poker-raise)'
  hands: string;         // '22+, A2s+, K2s+, ...'
}
// UTGオープン(15%) / HJオープン(19%) / COオープン(27%) / BTNオープン(29%) /
// SBオープン(31%) / BB防衛vsBTN(19%) を初期収録。comboCount()で%を自動検算
```

- 挿入UIは「ポジションを選ぶ → プリセットが入る → 必要なら文字列を編集 → プレビュー確認 → 挿入」
- 複数レンジの重ね合わせ(例: BTNオープン vs BB防衛)もチェックボックスで選択可
- プリセットを一元化することで、**既存記事のレンジ表もここを参照するリファクタが将来可能**になり、レンジ見直し時に全記事へ一括反映できる

## 3. 画面構成

```
/tools/article-composer
+--------------------------------+--------------------------------+
| 左: 編集                        | 右: プレビュー (sticky)          |
|                                |                                |
| [frontmatterフォーム]           |  記事ヘッダ(絵文字+タイトル+タグ)  |
|                                |                                |
| ▼ 状況設定 (定型フォーム)         |  本文プレビュー:                 |
| ▼ プリフロップ                   |   - テキスト → markdownレンダ    |
|   [テキストエリア]               |   - ウィジェット → 実物のReact    |
|   [🃏図] [📊レンジ] [→アクション] |     コンポーネントで描画          |
|   [挿入▼]                      |                                |
| ▼ フロップ ...                  |  [MDXをコピー] [.mdxをDL]        |
+--------------------------------+--------------------------------+
```

- テキストブロックのプレビューは`marked`(軽量markdownパーサ)でレンダリング。ウィジェットブロックは実物コンポーネントなので**プレビュー=本番と同一の見た目**が保証される(ブロックベースにした最大の利点)
- 用語ホバー(glossary)はビルド時のremark処理なのでプレビューでは適用されない → プレビュー欄外に注記を出すだけでよい
- モバイルは1カラム(編集の下にプレビュー)

## 4. ファイル構成と再利用

```
src/
├── pages/tools/article-composer.astro     # ページ(client:load 1アイランド)
├── components/tools/
│   ├── HandEditor.tsx                     # 既存。内部をTableStateFormに委譲するよう薄く改修
│   └── composer/
│       ├── ArticleComposer.tsx            # ルート。状態管理+localStorage自動保存
│       ├── FrontmatterForm.tsx
│       ├── SituationForm.tsx              # 状況設定の定型フォーム
│       ├── StreetSection.tsx              # ストリート1つ分(テキスト+ブロック列+挿入)
│       ├── InsertMenu.tsx                 # 挿入モーダル
│       ├── TableStateForm.tsx             # ★HandEditorから抽出した共通フォーム(value/onChange型)
│       ├── RangeInsertForm.tsx            # プリセット選択+編集+プレビュー
│       ├── ActionLineForm.tsx
│       ├── EquityInsertForm.tsx
│       └── PreviewPane.tsx
└── lib/
    ├── poker/presets.ts                   # ★ポジション別レンジプリセット
    └── composer/
        ├── types.ts                       # ArticleDraft / Section / Block(判別可能union)
        ├── timeline.ts                    # ★ハンドタイムライン→各ストリートのPokerTable props導出
        ├── serialize.ts                   # ArticleDraft → 完全なMDX文字列(frontmatter+import文+本文)
        └── storage.ts                     # localStorage draft保存/復元
```

再利用ポイント:
- **TableStateForm**: 既存HandEditor(532行)のフォーム部分を抽出し、HandEditorページとコンポーザー両方で使う。MDX生成関数(generateCode)も`lib/composer/serialize.ts`へ移動して共通化
- **serialize.tsのimport文自動生成**: 記事内で使われたブロック種別を集計し、必要なimportだけをMDX冒頭に出力(不要importなし)
- PokerTable/HandRangeChart/EquityCalculator/ActionLineは変更不要

## 5. データモデル(要点)

```ts
type Block =
  | { kind: 'text'; markdown: string }
  | { kind: 'table'; streetRef?: Street; state: TableState }   // streetRefがあればタイムライン連動
  | { kind: 'range'; title: string; ranges: RangeGroup[]; highlight?: string[] }
  | { kind: 'actions'; street: string; steps: ActionStep[] }
  | { kind: 'equity'; hands: string[]; board?: string[]; iterations: number }
  | { kind: 'message'; type: 'info' | 'alert'; body: string }
  | { kind: 'accordion'; title: string; body: string };

interface ArticleDraft {
  frontmatter: { title; description; emoji; category; tags; slug; publishedAt };
  situation: { format; stacks; heroPos; villainPos; villainImage };
  timeline: HandTimeline;                  // §1.3
  sections: { id: SectionId; enabled: boolean; blocks: Block[] }[];
  updatedAt: number;                       // localStorage自動保存用
}
```

シリアライズは決定的(同じdraft→同じMDX)にし、生成MDXは既存3記事と同じ書式(インデント・クォート)に揃える。

## 6. 実装フェーズ

| Phase | 内容 |
|---|---|
| **C-1 (MVP)** | presets.ts / timeline.ts / serialize.ts、コンポーザーページ、frontmatter+状況設定フォーム、ストリートセクション+テキストブロック、**テーブル図挿入(タイムライン連動)**、**レンジ表挿入(ポジションプリセット)**、MDXコピー/DL、localStorage自動保存 |
| **C-2** | アクションライン挿入(タイムライン双方向連動)、エクイティ/メッセージ/アコーディオン挿入、markedによる本文プレビュー、ブロックの並べ替え/削除UI |
| **C-3** | 複数下書き管理、戦略解説モード(自由セクション)、既存記事のレンジ表をpresets.ts参照へリファクタ |

C-1完了時点で「フォーム入力だけで、ストリートごとの図とレンジ表が入った記事1本のMDXが完成する」状態になる。

## 7. 判断メモ(採用しなかった選択肢)

- **GitHub API直接コミット**: 認証・権限・エラー処理の複雑さに対しリターンが薄い。DL+commitで十分速い
- **dev専用のファイル書き込みAPI**: Astro devサーバーのエンドポイントで`src/content/articles/`へ直接保存する案。魅力的だが本番サイトで動かないツールになる。C-3以降の検討事項として保留
- **contenteditableのWYSIWYG**: Markdown+ブロックのハイブリッドで十分。WYSIWYGはシリアライズの複雑さが跳ね上がる
- **本文の完全ライブプレビュー(remark+MDXをブラウザで実行)**: ビルドパイプラインの再現はコストが大きい。ブロック単位プレビュー(ウィジェットは実物)で実用上同等の確認ができる
