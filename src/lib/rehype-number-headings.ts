import type { Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that prefixes every post heading with its section number:
 * h2 "1", h3 "1.2", h4 "1.2.3". The h1 is the post title from the layout and
 * is never part of the markdown, so numbering starts at h2. A skipped level
 * (an h4 directly under an h2) is numbered with a 0, as in "1.0.1".
 *
 * The number sits in its own span so global.css can keep it quieter than the
 * heading text. Headings rendered by the MDX components are not part of this
 * tree and stay unnumbered.
 */
export default function rehypeNumberHeadings() {
	return (tree: Root) => {
		const counters: number[] = [];
		visit(tree, 'element', (node) => {
			if (!/^h[2-6]$/.test(node.tagName)) {
				return;
			}
			const level = Number(node.tagName[1]) - 2;
			for (let index = counters.length; index <= level; index++) {
				counters[index] = 0;
			}
			counters[level] += 1;
			counters.length = level + 1;
			node.children.unshift({
				type: 'element',
				tagName: 'span',
				properties: { className: ['heading-number'] },
				children: [{ type: 'text', value: `${counters.join('.')} ` }],
			});
		});
	};
}
