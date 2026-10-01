# poker-notes

エンジニア向けのNLH(ノーリミットホールデム)技術記事メディア。実戦で上手くいったプレー、あるいは反省すべきプレーを言語化し、プリフロップからリバーまでの判断をテーブル図・レンジ表・エクイティ計算を交えて解説するブログです。

Astro 7 + MDX + React（アイランド）+ Tailwind CSS 4 で構築し、Cloudflare Workers (Static Assets) にデプロイする想定です。

## 技術スタック

- [Astro](https://astro.build) — 静的サイト生成 + Content Collections
- `@astrojs/mdx` — MDX記事内でReactコンポーネントを利用
- `@astrojs/react` — PokerTable / HandRangeChart / EquityCalculator などのアイランド
- Tailwind CSS 4 — CSS変数によるデザイントークンと組み合わせ
- Cloudflare Workers (Static Assets) — `wrangler.jsonc` でデプロイ設定を用意（実デプロイは別途 `wrangler deploy`）

## ローカル起動

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # ./dist に静的ビルド
npm run preview   # ビルド済みサイトをローカルでプレビュー
npm run og        # 記事のOGP画像 (public/og/*.png) を再生成
```

## ディレクトリ構成

```
src/
├── content/articles/     # 記事本体 (MDX)。フロントマターは src/content.config.ts で定義
├── components/
│   ├── poker/             # ポーカー表示コンポーネント（PokerTable, HandRangeChart, EquityCalculator...）
│   ├── article/            # 記事内で使う装飾コンポーネント（Message, Accordion, CodeFile, Toc）
│   ├── tools/              # 執筆ツール（記事コンポーザー、ハンド図エディタ）
│   └── ui/                 # サイト共通UI（Header, Footer, ArticleCard, ThemeToggle）
├── lib/
│   ├── poker/               # 純粋なドメインロジック（nlh=ハンドエンジン, cards, range, evaluator, equity, presets）
│   ├── composer/            # 記事コンポーザーの下書きモデルとMDX生成
│   └── workers/              # EquityCalculator が使う Web Worker
├── layouts/                 # BaseLayout / ArticleLayout
└── pages/                   # index, articles/[slug], tags/[tag]
```

`lib/poker/` はUIから独立した純粋関数群です。`components/poker/` はその上に乗る表示層で、React state・DOM・Web Workerはここに閉じ込めています。

## 記事の書き方

### おすすめ: 記事コンポーザーで書く

`/tools/article-composer`（ヘッダーの「ツール」から）で、MDXを手書きせずに1本の記事を作れます。

1. ハンド設定: キャッシュ/トーナメント、6-max/9-max、ステークス、スタック(全員共通+プレイヤーごとの上書き)、Hero/Villainのポジションとハンド
2. 各ストリート: ボードを入れ、アクションをボタンで入力(「フォールドで進める」「2.5x」「50%」などのショートカットあり)しながら本文を書く。アクションライン・テーブル図・状況設定はアクションから自動生成され、ポットとスタックも自動計算される
3. 記事情報: タイトル・説明・スラッグ(ハンドから自動生成可)・タグ(ハンドから提案)
4. 「.mdxをダウンロード」したファイルを `src/content/articles/` に置いてcommit

金額はすべてbb単位で、SB 0.5bb / BB 1bb(トーナメントはBBアンティも)が自動で置かれます。ベット/レイズ額は「そのストリートでその人が出す合計」です。入力内容はブラウザに自動保存されます。図1枚分のMDXだけ欲しい場合は `/tools/hand-editor` を使います。

### フロントマター

```yaml
---
title: "記事タイトル"
description: "一覧・OGPに使う説明文"
emoji: "🃏"
category: "strategy" # または "review"
tags: ["プリフロップ", "BB防衛"]
publishedAt: 2026-08-01
updatedAt: 2026-08-05   # 省略可
game:                    # 省略可。記事カードと記事ヘッダーに「NLH 6-max キャッシュ · NL50 · 100bb」と表示
  format: "cash"         # または "tournament"
  tableSize: 6           # 6 または 9
  stakes: "NL50"         # 省略可
  effectiveStack: 100    # bb。省略可
draft: false             # true にすると一覧・ビルド対象から除外
---
```

推奨する記事構成（ハンドレビュー系）:

1. 状況設定（ゲーム、エフェクティブスタック、ポジション、Heroのハンド、相手のイメージ）
2. プリフロップの判断
3. フロップ / ターン / リバーの判断
4. 結果と振り返り
5. 学び（1行サマリ）

### レンジ記法

`lib/poker/range.ts` の `parseRange()` が解釈できる記法です。`HandRangeChart` と `EquityCalculator` はこの記法を共有しています。

| 記法 | 意味 |
| --- | --- |
| `AA` | ポケットAA |
| `AKs` / `AKo` | エース・キングのスーテッド / オフスート |
| `AK` | 両方（AKs + AKo） |
| `22+` | 22以上のポケットペア全て |
| `77-99` | 77 から 99 までのポケットペア |
| `ATs+` | ATs 以上のスーテッドAx（AJs, AQs, AKs を含む） |
| `A2s-AQs` | 同じハイカードでのスーテッドレンジ |
| `AK+` | AKs+ と AKo+ の両方をまとめて指定 |

複数トークンはカンマ区切りで並べられます: `"22+, ATs+, KQo"`

### PokerTable

局面のスナップショット図。操作UIではなく説明図として設計しているため、ボタン等のインタラクションはありません。

```mdx
<PokerTable
  client:visible
  street="flop"
  pot={9}
  board={['Ah', '7c', '3d']}
  players={[
    { position: 'BTN', stack: 95.5, bet: 2, isActive: true },
    { position: 'BB', stack: 96, isHero: true, cards: ['Ac', 'Jd'] },
  ]}
  caption="A-7-3 レインボー。"
/>
```

`players[].position` は `UTG | UTG1 | UTG2 | LJ | HJ | CO | BTN | SB | BB`。`isHero` を付けたプレイヤーがテーブル下部中央に自動配置されます。 金額(stack/bet/pot)はbb単位で、表示にも「bb」が付きます。7人以上のときは座席が自動でコンパクト表示になります。

### ActionLine

ストリートのアクション履歴。`action` は `fold | check | call | bet | raise | allin`、`amount` はそのストリートでの合計額(bb)です。

```mdx
<ActionLine
  street="Preflop"
  actions={[
    { position: 'BTN', action: 'raise', amount: 2.5 },
    { position: 'SB', action: 'fold' },
    { position: 'BB', action: 'call', amount: 2.5 },
  ]}
/>
```

### HandRangeChart

169マスのレンジグリッド。`hands` に上記のレンジ記法を渡します。

```mdx
<HandRangeChart
  client:visible
  title="BTN 2.5bb オープンレンジ"
  ranges={[
    { label: 'オープン', color: 'var(--color-poker-raise)', hands: '22+, A2s+, ATo+, KQo' },
  ]}
  highlight={['AJo']}
  interactive={true}
/>
```

### EquityCalculator

`lib/poker/evaluator.ts`（7枚役判定）と `lib/poker/equity.ts`（モンテカルロ）を Web Worker (`lib/workers/equity.worker.ts`) 上で実行し、UIをブロックせずに計算します。`hands` の各要素は具体的な2枚のコンボ（例: `"AcJd"`）でもレンジ記法（例: `"QQ+, AK"`）でも構いません。

```mdx
<EquityCalculator
  client:visible
  readonly={true}
  iterations={20000}
  hands={['AcJd', 'QQ+, AK, AJ+']}
  board={['Ah', '7c', '3d']}
/>
```

`readonly` を外すと、ハンド・ボードを編集して再計算できるインタラクティブな計算機になります。

### 専門用語のホバー解説（自動）

`src/lib/glossary.ts` に登録した専門用語(BTN/SB/BBなどのポジション名、エクイティ、ポットオッズ、レンジ等)は、記事本文中に出現すると**自動的に**ホバー/タップ/キーボードフォーカスで定義がポップオーバー表示されます。手動でのタグ付けは不要です。見出し・コードブロック・リンク内は対象外、同じ用語は記事内で初出のみラップされます。

新しい専門用語を追加したい場合は `src/lib/glossary.ts` の `GLOSSARY` 配列にエントリを追加するだけで、既存記事・新規記事の両方に自動反映されます(再ビルドは必要です)。

## デプロイ

`wrangler.jsonc` は Cloudflare Workers の Static Assets 機能を使い、`npm run build` の出力 (`./dist`) をそのまま配信する設定です。

```sh
npm run build
npx wrangler deploy   # 別途 Cloudflare アカウントの認証が必要
```

## OGP画像

`scripts/generate-og-images.mjs` が `satori` + `@resvg/resvg-js` で各記事のOGP画像を生成し、`public/og/<slug>.png` に出力します。記事を追加・更新したら `npm run og` を実行してください。
