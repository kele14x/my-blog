// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeNumberHeadings from './src/lib/rehype-number-headings.ts';

// https://astro.build/config
export default defineConfig({
	// Used for RSS, sitemap, and canonical URLs
	site: 'https://kele14.com',
	integrations: [mdx(), sitemap()],
	markdown: {
		processor: unified({
			remarkPlugins: [remarkMath],
			rehypePlugins: [rehypeNumberHeadings, rehypeKatex],
		}),
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			// Emit only --shiki-light/--shiki-dark CSS variables (no inline
			// colors); global.css picks the palette from data-theme.
			defaultColor: false,
			transformers: [
				{
					name: 'line-numbers',
					line(node, line) {
						node.children.unshift({
							type: 'element',
							tagName: 'span',
							properties: { class: 'line-number', 'aria-hidden': 'true' },
							children: [{ type: 'text', value: String(line) }],
						});
					},
				},
			],
		},
	},
});
