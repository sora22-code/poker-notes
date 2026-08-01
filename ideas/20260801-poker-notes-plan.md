# poker-notes プロジェクトプラン (2026-08-01)

## 1. プロジェクト名の提案
第一候補: poker-notes（採用）。第二候補: out-of-position。

## 2. 技術スタック
Astro 5 + MDX + React（アイランド）+ Tailwind CSS 4 + Cloudflare Workers。理由: メディアの本質は静的コンテンツが9割でAstroが最適、アイランドアーキテクチャがPokerTable/EquityCalculatorのみインタラクティブという要件に合致、Content CollectionsでZenn同等の記事管理体験を実現できる、既存のCloudflare運用実績と親和性が高い。

## 3. ディレクトリ構成案
```
poker-notes/
├── src/
│   ├── content/
│   │   ├── articles/
│   │   └── config.ts
│   ├── components/
│   │   ├── poker/
│   │   │   ├── PokerTable.tsx
│   │   │   ├── Seat.tsx
│   │   │   ├── PlayingCard.tsx
│   │   │   ├── HandRangeChart.tsx
│   │   │   ├── EquityCalculator.tsx
│   │   │   └── ActionLine.tsx
│   │   ├── article/
│   │   │   ├── Message.astro
│   │   │   ├── Accordion.astro
│   │   │   └── Toc.astro
│   │   └── ui/
│   │       ├── Header.astro / Footer.astro
│   │       ├── ArticleCard.astro
│   │       └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── poker/
│   │   │   ├── types.ts
│   │   │   ├── deck.ts
│   │   │   ├── range.ts
│   │   │   ├── evaluator.ts
│   │   │   └── equity.ts
│   │   └── workers/
│   │       └── equity.worker.ts
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── articles/[slug].astro
│   │   └── tags/[tag].astro
│   └── styles/global.css
├── public/
├── astro.config.mjs
├── wrangler.jsonc
├── README.md
└── package.json
```

## 4. コンポーネント設計
### PokerTable
Props: `{ players: { position, stack, cards?, bet?, isHero?, isActive? }[], board?, pot, street?, caption? }`。訓練用UIから説明図用に再設計。明るい配色: オフホワイト背景+パステルグリーンのテーブル面+深緑ボーダー、白背景の座席カード（ヒーロー=青枠、手番=アンバー枠、フォールド=グレーアウト）、ポット=グリーンバッジ/ベット=ブルーバッジ、4色デック。アクション履歴は別コンポーネント`ActionLine`に分離。

### HandRangeChart
Props: `{ title?, ranges: { label, color?, hands }[], highlight?, interactive? }`。169セルの13x13グリッド。レンジ記法パーサ(`lib/poker/range.ts`)を中核とし、EquityCalculatorと共有。

### EquityCalculator
Props: `{ hands?: string[], board?, iterations?, readonly? }`。`lib/poker/evaluator.ts`(7枚役判定)+モンテカルロで自前実装、Web Workerで実行しUIをブロックしない。

## 5. デザインシステム
ライト基調（背景`#F1F5F9`系、カード白）、アクセントは青〜ティール系。CSS変数によるdesign token、`html.dark`でダークモード反転。タイポグラフィはsystem-ui+Noto Sans JP、本文16px/行間1.8。記事カードは絵文字アイコン+タイトル+日付+タグ、トップページは「戦略解説/ハンドレビュー」2タブ構成。記事詳細は中央本文(max-width約720px)+右サイド追従目次。コードブロックはShikiでダーク背景+ファイル名タブ+コピーボタン。

## 6. 初期記事
テンプレート構成: 状況設定→プリフロップ→フロップ/ターン/リバー→結果と振り返り→学び（1行サマリ）。1本目: 「BTN 2.5BBオープンにBBでAJoをどう守るか」。

## 7. マイルストーン
Phase0(基盤)→Phase1(メディア成立)→Phase2(ドメインロジック、Phase1と並行可)→Phase3(ポーカーコンポーネント)→Phase4(コンテンツ+公開)

## 8. GitHub運用
`gh repo create sora22-code/poker-notes --public`。README整備。mainブランチ本番、feat/*・article/*ブランチ運用。
