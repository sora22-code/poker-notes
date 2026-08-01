# poker-notes

エンジニア向けのポーカー技術記事メディア。実戦で上手くいったプレー、あるいは反省すべきプレーを言語化し、プリフロップからポストフロップまでの判断をレンジ表やエクイティ計算を交えて解説するブログです。

Astro 5系 + MDX + React（アイランド）+ Tailwind CSS 4 で構築し、Cloudflare Workers (Static Assets) にデプロイする想定です。

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
│   └── ui/                 # サイト共通UI（Header, Footer, ArticleCard, ThemeToggle）
├── lib/
│   ├── poker/               # 純粋なドメインロジック（types, deck, range, evaluator, equity）
│   └── workers/              # EquityCalculator が使う Web Worker
├── layouts/                 # BaseLayout / ArticleLayout
└── pages/                   # index, articles/[slug], tags/[tag]
```

`lib/poker/` はUIから独立した純粋関数群です。`components/poker/` はその上に乗る表示層で、React state・DOM・Web Workerはここに閉じ込めています。

## 記事の書き方

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
draft: false             # true にすると一覧・ビルド対象から除外
---
```

推奨する記事構成（ハンドレビュー系）:

1. 状況設定（フォーマット、スタック、ポジション、相手のイメージ）
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

`players[].position` は `UTG | UTG1 | UTG2 | LJ | HJ | CO | BTN | SB | BB`。`isHero` を付けたプレイヤーがテーブル下部中央に自動配置されます。

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

## デプロイ

`wrangler.jsonc` は Cloudflare Workers の Static Assets 機能を使い、`npm run build` の出力 (`./dist`) をそのまま配信する設定です。

```sh
npm run build
npx wrangler deploy   # 別途 Cloudflare アカウントの認証が必要
```

## OGP画像

`scripts/generate-og-images.mjs` が `satori` + `@resvg/resvg-js` で各記事のOGP画像を生成し、`public/og/<slug>.png` に出力します。記事を追加・更新したら `npm run og` を実行してください。
