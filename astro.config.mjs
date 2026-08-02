// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { remarkGlossary } from './src/lib/markdown/remark-glossary.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://poker-notes.sora22-code.workers.dev',
  output: 'static',
  integrations: [react(), mdx()],

  markdown: {
    remarkPlugins: [remarkGlossary],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
