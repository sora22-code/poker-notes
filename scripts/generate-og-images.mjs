import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'src/content/articles');
const OUT_DIR = path.join(ROOT, 'public/og');

const FONT_DIR = path.join(ROOT, 'node_modules/@fontsource/noto-sans-jp/files');
const fontRegular = readFileSync(path.join(FONT_DIR, 'noto-sans-jp-japanese-400-normal.woff'));
const fontBold = readFileSync(path.join(FONT_DIR, 'noto-sans-jp-japanese-700-normal.woff'));

const CATEGORY_LABEL = { strategy: '戦略解説', review: 'ハンドレビュー' };
const CATEGORY_COLOR = { strategy: '#2563eb', review: '#d97706' };

function ogTemplate({ title, emoji, category }) {
  const catColor = CATEGORY_COLOR[category] ?? '#2563eb';
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        backgroundColor: '#f1f5f9',
        backgroundImage: 'linear-gradient(135deg, #f1f5f9 0%, #dbeafe 100%)',
        fontFamily: 'Noto Sans JP',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '16px' },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: 40, fontWeight: 800, color: '#0f172a', display: 'flex' },
                  children: '🃏 poker-notes',
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '24px' },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: 96, display: 'flex' },
                  children: emoji,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 56,
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.35,
                    display: 'flex',
                    maxWidth: '1000px',
                  },
                  children: title,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 28,
              fontWeight: 700,
              color: '#ffffff',
              background: catColor,
              padding: '10px 24px',
              borderRadius: '999px',
              alignSelf: 'flex-start',
            },
            children: CATEGORY_LABEL[category] ?? category,
          },
        },
      ],
    },
  };
}

async function renderOg({ title, emoji, category }) {
  const svg = await satori(ogTemplate({ title, emoji, category }), {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Noto Sans JP', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Noto Sans JP', data: fontBold, weight: 800, style: 'normal' },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const defaultPng = await renderOg({
    title: '実戦のプリフロップ / ポストフロップ判断を言語化する',
    emoji: '🃏',
    category: 'strategy',
  });
  writeFileSync(path.join(OUT_DIR, 'default.png'), defaultPng);
  console.log('generated public/og/default.png');

  const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'));
  for (const file of files) {
    const raw = readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
    const { data } = matter(raw);
    const slug = file.replace(/\.mdx$/, '');
    const png = await renderOg({ title: data.title, emoji: data.emoji ?? '🃏', category: data.category ?? 'strategy' });
    writeFileSync(path.join(OUT_DIR, `${slug}.png`), png);
    console.log(`generated public/og/${slug}.png`);
  }
}

main();
